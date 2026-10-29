import pytest
from app.services.forecast import forecast
from app.schemas.simulation import SimulationInput
from test_simulation import plant
from test_roof import roof_payload

def snapshot():
 return dict(plant=plant(initial_soc=20).model_dump(),appliances=[dict(selected=True,earliest_min=0,required_runtime_min=1440,rated_power_w=1000,critical=True)],pv=dict(source='test zero irradiance',timeline=[dict(ac_kw=0) for _ in range(24)]))

def test_baseline_deterministic_risk_and_provenance():
 options=SimulationInput(outages=[dict(start_min=0,end_min=1440)])
 a=forecast(snapshot(),options);assert a==forecast(snapshot(),options)
 assert a['shortage']['critical_unmet_kwh']==24
 assert a['shortage']['first_unmet_minute']==0
 assert a['provenance']['observed_samples']==0
 assert a['evaluation']['mae'] is None and a['evaluation']['trained_model'] is False
 assert forecast(snapshot(),SimulationInput())['shortage']['level']=='none'

def test_saved_profile_persistence():
 base=forecast(snapshot(),SimulationInput())['projection']
 result=forecast(snapshot(),SimulationInput(),base,'saved-id')
 assert result['provenance']['source_run_id']=='saved-id'
 assert result['projection']['trace'][0]['load_kw']==1
 assert result['projection']['trace'][0]['battery_start_kwh']==base['trace'][-1]['battery_end_kwh']
 disabled=snapshot();disabled['plant']['generator_kw']=0
 with pytest.raises(ValueError,match='generator'):
  forecast(disabled,SimulationInput(use_generator=True),base,'saved-id')

@pytest.mark.asyncio
async def test_forecast_empty_history_fallback_and_auth(async_client):
 c=async_client
 token=(await c.post('/api/v1/auth/login',data={'username':'demo@solvanta.energy','password':'Solvanta2026!'})).json()['access_token'];h={'Authorization':'Bearer '+token}
 # A new building ensures the empty-history path is independent of other tests.
 existing=(await c.get('/api/v1/buildings',headers=h)).json()[0]
 payload={k:existing[k] for k in ['name','pv_capacity_kwp','inverter_rating_kw','battery']};payload['name']='Forecast isolated test'
 b=await c.post('/api/v1/buildings',headers=h,json=payload);assert b.status_code==201,b.text
 base='/api/v1/buildings/'+b.json()['id']
 try:
  assert (await c.put(base+'/roof',headers=h,json=roof_payload())).status_code==200
  result=await c.post(base+'/forecast',headers=h,json={'basis':'latest_run'})
  assert result.status_code==200,result.text
  assert result.json()['fallback_reason'] is not None
  assert (await c.post(base+'/forecast',json={})).status_code==401
 finally:await c.delete(base,headers=h)
