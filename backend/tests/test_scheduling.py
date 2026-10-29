import copy
import uuid
import pytest
from app.services.scheduling import solve_schedule,validate_schedule
from test_roof import roof_payload

def appliance(id='a',**kw):
 return dict(id=id,name=id,selected=True,rated_power_w=1000,priority='low',critical=False,flexible=True,required_runtime_min=2,earliest_min=0,latest_min=4,interruptible=False,max_interruptions=0)|kw

def test_optimal_priority_and_power():
 items=[appliance('critical',priority='critical'),appliance('low')]
 budget=[1000]*1440;r=solve_schedule(items,budget)
 assert r['status']=='OPTIMAL' and r['validated']
 assert r['objective']==15
 assert r['entries'][0]['segments']==[{'start_min':0,'end_min':2}]
 assert max(validate_schedule(items,budget,r['entries']))==1000

def test_continuity_and_interruptions():
 budget=[1000,0,1000]+[0]*1441;budget=budget[:1440]
 assert solve_schedule([appliance()],budget)['status']=='INFEASIBLE'
 r=solve_schedule([appliance(interruptible=True,max_interruptions=1)],budget)
 assert r['validated'] and len(r['entries'][0]['segments'])==2

def test_fixed_load_and_infeasible_explanation():
 items=[appliance('a',flexible=False),appliance('b',flexible=False)]
 r=solve_schedule(items,[1000]*1440)
 assert r['status']=='INFEASIBLE' and not r['validated'] and r['reasons']
 assert solve_schedule([appliance()],[0]*1440)['reasons'][0].startswith('a: only 0')

def test_independent_validator_rejects_tampering():
 items=[appliance()];budget=[1000]*1440;r=solve_schedule(items,budget)
 broken=copy.deepcopy(r['entries']);broken[0]['segments'][0]['end_min']=3
 with pytest.raises(ValueError,match='Runtime'):validate_schedule(items,budget,broken)
 with pytest.raises(ValueError,match='power'):validate_schedule(items,[0]*1440,r['entries'])

@pytest.mark.asyncio
async def test_schedule_save_and_access(async_client):
 c=async_client
 token=(await c.post('/api/v1/auth/login',data={'username':'demo@solvanta.energy','password':'Solvanta2026!'})).json()['access_token'];h={'Authorization':'Bearer '+token}
 existing=(await c.get('/api/v1/buildings',headers=h)).json()[0]
 data={k:existing[k] for k in ['name','pv_capacity_kwp','inverter_rating_kw','battery']};data['name']='Schedule isolated test'
 b=await c.post('/api/v1/buildings',headers=h,json=data);assert b.status_code==201,b.text
 base='/api/v1/buildings/'+b.json()['id']
 try:
  await c.put(base+'/roof',headers=h,json=roof_payload())
  payload=appliance();payload.pop('id');payload.pop('selected')
  a=await c.post(base+'/appliances',headers=h,json=payload);assert a.status_code==201,a.text
  await c.put(base+'/appliances/'+a.json()['id']+'/selection',headers=h,json={'selected':True})
  r=await c.post(base+'/schedules',headers=h,json={});assert r.status_code==200,r.text
  assert r.json()['id'] and r.json()['result']['validated']
  assert (await c.get(base+'/schedules',headers=h)).json()[0]==r.json()
  assert (await c.get(base+'/schedules')).status_code==401
  email=f'{uuid.uuid4()}@example.com';await c.post('/api/v1/auth/register',json={'email':email,'password':'Password123!','full_name':'Other'})
  other=(await c.post('/api/v1/auth/login',data={'username':email,'password':'Password123!'})).json()['access_token'];oh={'Authorization':'Bearer '+other}
  assert (await c.post(base+'/schedules',headers=oh,json={})).status_code==403
  assert (await c.get(base+'/schedules',headers=oh)).status_code==403
 finally:await c.delete(base,headers=h)
