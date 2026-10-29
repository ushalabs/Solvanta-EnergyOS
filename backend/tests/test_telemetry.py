import copy,uuid
import pytest
from app.services.telemetry import SimulationProvider,detect
from app.services.simulation import simulate
from app.schemas.simulation import SimulationInput
from test_simulation import plant
from test_roof import roof_payload

def result():return simulate(plant(),[1]*96,[.2]*96,[2]*96,SimulationInput())

@pytest.mark.parametrize('fixture,code',[('none',None),('pv_dropout','pv_mismatch'),('battery_drain','battery_mismatch'),('load_spike','load_mismatch')])
def test_known_fixture_evidence(fixture,code):
 r=result();provider=SimulationProvider(r,fixture);observed=provider.samples()
 assert observed==provider.samples()
 incidents=detect(r,observed)
 assert [i['code'] for i in incidents]==([code] if code else [])
 if code:
  assert incidents[0]['source']=='SIMULATED' and len(incidents[0]['evidence'])>=2
  assert all(abs(e['residual'])>e['threshold'] for e in incidents[0]['evidence'])

def test_invalid_observations_and_unavailable_fixture():
 r=result();samples=SimulationProvider(r).samples();samples[0]['pv_kw']=float('nan')
 with pytest.raises(ValueError):detect(r,samples)
 r['trace'][0]['minute']=1
 with pytest.raises(ValueError,match='aligned'):detect(r,SimulationProvider(result()).samples())
 zero=result()
 for p in zero['trace']:p['pv_kw']=0
 with pytest.raises(ValueError,match='daytime'):SimulationProvider(zero,'pv_dropout').samples()

@pytest.mark.asyncio
async def test_telemetry_incident_workflow_and_post_plan_check(async_client):
 c=async_client;token=(await c.post('/api/v1/auth/login',data={'username':'demo@solvanta.energy','password':'Solvanta2026!'})).json()['access_token'];h={'Authorization':'Bearer '+token}
 b=(await c.get('/api/v1/buildings',headers=h)).json()[0]['id'];base=f'/api/v1/buildings/{b}'
 await c.put(base+'/roof',headers=h,json=roof_payload())
 run=(await c.post(base+'/simulations',headers=h,json={})).json()
 telemetry=await c.post(base+'/telemetry',headers=h,json={'run_id':run['id'],'fixture':'load_spike'});assert telemetry.status_code==201,telemetry.text
 incident=telemetry.json()['incidents'][0];assert incident['source']=='SIMULATED'
 pending=(await c.get(base+'/incidents/pending',headers=h)).json();assert any(v['incident_id']==incident['id'] for v in pending)
 event=await c.post(base+'/events',headers=h,json={'event_id':'incident-'+incident['id'],'correlation_id':incident['id'],'kind':'anomaly_incident','incident_id':incident['id']});assert event.status_code==200,event.text
 p={'id':event.json()['plan_id'],'revision':event.json()['plan_revision']}
 for action in ['approve','simulate','verify']:
  r=await c.post(base+'/plans/'+p['id']+'/actions',headers=h,json={'action':action,'expected_revision':p['revision'],'idempotency_key':str(uuid.uuid4())});assert r.status_code==200,r.text;p=r.json()
 url=base+'/incidents/'+incident['id']+'/verify';payload={'plan_id':p['id'],'verification_id':str(uuid.uuid4()),'fixture':'none'}
 check=await c.post(url,headers=h,json=payload);assert check.status_code==200,check.text
 assert check.json()['state']=='MODEL_MATCH' and check.json()['source'].startswith('SIMULATED')
 assert (await c.post(url,headers=h,json=payload)).json()==check.json()
 payload['verification_id']=str(uuid.uuid4());payload['fixture']='load_spike'
 assert (await c.post(url,headers=h,json=payload)).json()['state']=='FAILED'
 assert (await c.get(base+'/telemetry')).status_code==401
 email=f'{uuid.uuid4()}@example.com';await c.post('/api/v1/auth/register',json={'email':email,'password':'Password123!','full_name':'Other'})
 token=(await c.post('/api/v1/auth/login',data={'username':email,'password':'Password123!'})).json()['access_token'];other={'Authorization':'Bearer '+token}
 assert (await c.post(base+'/telemetry',headers=other,json={'run_id':run['id']})).status_code==403
 assert (await c.get(base+'/incidents',headers=other)).status_code==403
 assert (await c.post(url,headers=other,json=payload)).status_code==403
