import random
import pytest
from app.services.resilience import compare_resilience
from app.services.simulation import simulate
from app.schemas.simulation import SimulationInput
from test_simulation import plant
from test_roof import roof_payload

def snapshot():
 return dict(plant=plant(initial_soc=40,usable_kwh=8).model_dump(),options={'outages':[{'start_min':0,'end_min':1440}],'use_generator':False},pv={'source':'test zero PV','timeline':[{'ac_kw':0}]*24},appliances=[
  dict(id='noncritical',selected=True,earliest_min=0,required_runtime_min=120,rated_power_w=1000,critical=False),
  dict(id='critical',selected=True,earliest_min=120,required_runtime_min=120,rated_power_w=1000,critical=True)])

def test_hand_calculated_critical_improvement():
 r=compare_resilience(snapshot())
 assert r['baseline']['summary']['unserved_critical_kwh']==2
 assert r['optimized']['summary']['unserved_critical_kwh']==pytest.approx(0)
 assert r['critical_energy_saved_kwh']==2
 assert r['critical_coverage_pct']==100
 assert r['optimized']['summary']['unmet_kwh']==2
 assert r['actions'] and r['candidate_selected']
 assert all(a['reason'] for a in r['actions'])
 assert compare_resilience(snapshot())==r

def test_impossible_and_empty_cases():
 s=snapshot();s['plant']['initial_soc']=20
 r=compare_resilience(s);assert r['status']=='critical_shortage_remaining'
 assert r['critical_energy_saved_kwh']==0 and not r['candidate_selected']
 s['appliances']=[]
 assert compare_resilience(s)['critical_coverage_pct'] is None

def test_protected_dispatch_physics():
 rng=random.Random(10);p=plant(round_trip_efficiency=.81)
 for _ in range(15):
  demand=[rng.random()*10 for _ in range(96)];critical=[x*.7 for x in demand];pv=[rng.random()*5 for _ in range(96)]
  r=simulate(p,demand,critical,pv,SimulationInput(outages=[{'start_min':0,'end_min':1440}],use_generator=True),protect_critical=True)
  for t in r['trace']:
   assert 2-1e-8<=t['battery_end_kwh']<=10+1e-8
   assert abs(t['balance_error_kw'])<1e-8
   assert t['charge_kw']*t['discharge_kw']==0
   assert t['grid_import_kw']==t['grid_export_kw']==0
   assert t['battery_end_kwh']==pytest.approx(t['battery_start_kwh']+.25*(t['charge_kw']*.9-t['discharge_kw']/.9))

@pytest.mark.asyncio
async def test_resilience_saved_and_scoped(async_client):
 import uuid
 c=async_client
 token=(await c.post('/api/v1/auth/login',data={'username':'demo@solvanta.energy','password':'Solvanta2026!'})).json()['access_token'];h={'Authorization':'Bearer '+token}
 b=(await c.get('/api/v1/buildings',headers=h)).json()[0]['id'];base=f'/api/v1/buildings/{b}'
 await c.put(base+'/roof',headers=h,json=roof_payload())
 r=await c.post(base+'/resilience',headers=h,json={'outages':[{'start_min':480,'end_min':600}]});assert r.status_code==200,r.text
 assert (await c.get(base+'/resilience',headers=h)).json()[0]==r.json()
 assert (await c.post(base+'/resilience',json={})).status_code==401
 email=f'{uuid.uuid4()}@example.com';await c.post('/api/v1/auth/register',json={'email':email,'password':'Password123!','full_name':'Other'})
 other=(await c.post('/api/v1/auth/login',data={'username':email,'password':'Password123!'})).json()['access_token'];oh={'Authorization':'Bearer '+other}
 assert (await c.get(base+'/resilience',headers=oh)).status_code==403
 assert (await c.post(base+'/resilience',headers=oh,json={})).status_code==403
