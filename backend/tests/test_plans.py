import copy,uuid
import pytest
from app.services.plans import variants,verify_result,execute_snapshot
from test_resilience import snapshot
from test_roof import roof_payload

def test_three_alternatives_and_verification():
 s=snapshot();s['pv']['inverter_kw']=8
 v=variants(s);assert len(v)==3
 assert v[1]['snapshot']['plant']['nominal_kwh']==15
 assert s['plant']['nominal_kwh']==10
 r=execute_snapshot(s);assert verify_result(s,r)==[]
 bad=copy.deepcopy(r);bad['trace'][0]['battery_end_kwh']=100
 assert 'Battery bounds violated' in verify_result(s,bad)

async def setup(c):
 t=(await c.post('/api/v1/auth/login',data={'username':'demo@solvanta.energy','password':'Solvanta2026!'})).json()['access_token'];h={'Authorization':'Bearer '+t}
 b=(await c.get('/api/v1/buildings',headers=h)).json()[0]['id'];base=f'/api/v1/buildings/{b}'
 await c.put(base+'/roof',headers=h,json=roof_payload())
 r=await c.post(base+'/plans',headers=h,json={});assert r.status_code==201,r.text
 return base,h,r.json()

@pytest.mark.asyncio
async def test_approval_idempotency_and_linked_verification(async_client):
 c=async_client;base,h,p=await setup(c);url=base+'/plans/'+p['id']+'/actions'
 async def act(action,plan,key=None):
  return await c.post(url,headers=h,json={'action':action,'expected_revision':plan['revision'],'idempotency_key':key or str(uuid.uuid4()),'variant':1})
 assert (await act('simulate',p)).status_code==409
 p=(await act('submit',p)).json();assert p['state']=='PENDING_APPROVAL' and p['selected_variant']==1
 revision=p['revision'];key=str(uuid.uuid4());r=await act('approve',p,key);assert r.status_code==200,r.text
 replay=await act('approve',p,key);assert replay.status_code==200 and replay.json()['replayed']
 assert (await act('reject',p,key)).status_code==409
 p=r.json();assert p['state']=='APPROVED'
 assert (await c.post(url,headers=h,json={'action':'approve','expected_revision':revision,'idempotency_key':str(uuid.uuid4())})).status_code==409
 p=(await act('simulate',p)).json();assert p['state']=='SIMULATED' and p['run_id']
 run=await c.get(base+'/simulations/'+p['run_id'],headers=h);assert run.status_code==200
 p=(await act('verify',p)).json();assert p['state']=='VERIFIED' and not p['verification_errors']
 assert (await c.get(base+'/plans',headers=h)).json()[0]['id']==p['id']
 events=(await c.get(base+'/plans/'+p['id']+'/audit',headers=h)).json()
 assert [e['action'] for e in events]==['create','submit','approve','simulate','verify']

@pytest.mark.asyncio
async def test_rejection_modification_expiry_and_ownership(async_client):
 from datetime import datetime,timedelta,timezone
 from app.db.session import AsyncSessionLocal
 from app.models.plan import EnergyPlan
 c=async_client;base,h,p=await setup(c);url=base+'/plans/'+p['id']+'/actions'
 async def act(action,plan):return await c.post(url,headers=h,json={'action':action,'expected_revision':plan['revision'],'idempotency_key':str(uuid.uuid4())})
 p=(await act('submit',p)).json();p=(await act('request_modification',p)).json();assert p['state']=='MODIFICATION_REQUESTED'
 p=(await act('revise',p)).json();assert p['state']=='DRAFT'
 p=(await act('submit',p)).json();p=(await act('reject',p)).json();assert p['state']=='REJECTED'
 assert (await act('simulate',p)).status_code==409
 _,_,expired=await setup(c);expired_url=base+'/plans/'+expired['id']+'/actions'
 async with AsyncSessionLocal() as db:
  record=await db.get(EnergyPlan,expired['id']);data=copy.deepcopy(record.snapshot);data['expires_at']=(datetime.now(timezone.utc)-timedelta(minutes=1)).isoformat();record.snapshot=data;await db.commit()
 assert (await c.post(expired_url,headers=h,json={'action':'submit','expected_revision':1,'idempotency_key':str(uuid.uuid4())})).status_code==409
 assert (await c.get(base+'/plans')).status_code==401
 email=f'{uuid.uuid4()}@example.com';await c.post('/api/v1/auth/register',json={'email':email,'password':'Password123!','full_name':'Other'})
 token=(await c.post('/api/v1/auth/login',data={'username':email,'password':'Password123!'})).json()['access_token'];other={'Authorization':'Bearer '+token}
 assert (await c.get(base+'/plans',headers=other)).status_code==403
 assert (await c.post(url,headers=other,json={'action':'approve','expected_revision':p['revision'],'idempotency_key':str(uuid.uuid4())})).status_code==403

@pytest.mark.asyncio
async def test_concurrent_approval_conflict(async_client):
 import asyncio
 c=async_client;base,h,p=await setup(c);url=base+'/plans/'+p['id']+'/actions'
 p=(await c.post(url,headers=h,json={'action':'submit','expected_revision':1,'idempotency_key':str(uuid.uuid4())})).json()
 responses=await asyncio.gather(*[c.post(url,headers=h,json={'action':'approve','expected_revision':p['revision'],'idempotency_key':str(uuid.uuid4())}) for _ in range(2)])
 assert sorted(r.status_code for r in responses)==[200,409]

@pytest.mark.asyncio
async def test_verification_failure_is_recorded(async_client):
 from app.db.session import AsyncSessionLocal
 from app.models.simulation import SimulationRun
 c=async_client;base,h,p=await setup(c);url=base+'/plans/'+p['id']+'/actions'
 for action in ['submit','approve','simulate']:
  r=await c.post(url,headers=h,json={'action':action,'expected_revision':p['revision'],'idempotency_key':str(uuid.uuid4())});assert r.status_code==200,r.text
  p=r.json()
 async with AsyncSessionLocal() as db:
  run=await db.get(SimulationRun,p['run_id']);result=copy.deepcopy(run.result);result['trace'][0]['battery_end_kwh']=1e6;run.result=result;await db.commit()
 r=await c.post(url,headers=h,json={'action':'verify','expected_revision':p['revision'],'idempotency_key':str(uuid.uuid4())})
 assert r.status_code==200 and r.json()['state']=='FAILED' and r.json()['verification_errors']
