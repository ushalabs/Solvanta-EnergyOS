import random
import pytest
from pydantic import ValidationError
from app.schemas.simulation import Plant,SimulationInput
from app.services.simulation import simulate,load_profiles
from test_roof import roof_payload

def plant(**changes):
    return Plant(**(dict(nominal_kwh=10,usable_kwh=8,initial_soc=70,reserve_soc=20,charge_kw=4,discharge_kw=4,round_trip_efficiency=1,grid_import_kw=10,grid_export_kw=5,generator_kw=5,generator_min_minutes=30,fuel_l_kwh=.3)|changes))

def test_hand_calculated_outage():
    r=simulate(plant(),[2]*96,[1]*96,[0]*96,SimulationInput(outages=[{'start_min':0,'end_min':1440}]))
    assert r['summary']['unmet_kwh']==pytest.approx(43)
    assert r['summary']['final_soc_pct']==pytest.approx(20)
    assert r['trace'][0]['battery_end_kwh']==6.5
    assert all(t['grid_import_kw']==t['grid_export_kw']==0 for t in r['trace'])

def test_round_trip_and_curtailment():
    r=simulate(plant(initial_soc=20,round_trip_efficiency=.81),[0]*96,[0]*96,[10]*96,SimulationInput())
    assert r['trace'][0]['battery_end_kwh']==pytest.approx(2.9)
    assert r['trace'][0]['charge_kw']==4
    assert r['trace'][0]['grid_export_kw']==5
    assert r['trace'][0]['curtailed_kw']==1
    assert r['trace'][-1]['soc_pct']==pytest.approx(100)

def test_generator_minimum_and_fuel():
    r=simulate(plant(initial_soc=20),[3]+[0]*95,[3]+[0]*95,[0]*96,SimulationInput(outages=[{'start_min':0,'end_min':1440}],use_generator=True))
    assert [t['generator_kw'] for t in r['trace'][:3]]==[5,5,0]
    assert r['summary']['generator_fuel_l']==pytest.approx(.75)
    assert r['summary']['unserved_critical_kwh']==0

def test_seeded_conservation_and_bounds():
    rng=random.Random(7)
    for _ in range(25):
        p=plant(round_trip_efficiency=.8,grid_import_kw=1)
        d=[rng.random()*15 for _ in range(96)];pv=[rng.random()*12 for _ in range(96)]
        r=simulate(p,d,[x*.5 for x in d],pv,SimulationInput(outages=[{'start_min':480,'end_min':900}],use_generator=True))
        for t in r['trace']:
            assert 2-1e-8<=t['battery_end_kwh']<=10+1e-8
            assert abs(t['balance_error_kw'])<1e-8
            assert t['charge_kw']<=4 and t['discharge_kw']<=4
            assert t['charge_kw']*t['discharge_kw']==0
            assert t['battery_end_kwh']==pytest.approx(t['battery_start_kwh']+.25*(t['charge_kw']*.8**.5-t['discharge_kw']/.8**.5))

def test_invalid_and_fractional_runtime():
    with pytest.raises(ValidationError):plant(initial_soc=0)
    with pytest.raises(ValidationError):SimulationInput(outages=[{'start_min':4,'end_min':15}])
    with pytest.raises(ValueError):simulate(plant(),[float('nan')]*96,[0]*96,[0]*96,SimulationInput())
    d,c=load_profiles([dict(selected=True,earliest_min=7,required_runtime_min=20,rated_power_w=1000,critical=True)])
    assert sum(d)*.25==pytest.approx(1/3)
    assert d==c

@pytest.mark.asyncio
async def test_saved_simulation_and_auth(async_client):
    c=async_client
    token=(await c.post('/api/v1/auth/login',data={'username':'demo@solvanta.energy','password':'Solvanta2026!'})).json()['access_token']
    h={'Authorization':'Bearer '+token}; b=(await c.get('/api/v1/buildings',headers=h)).json()[0]['id'];base=f'/api/v1/buildings/{b}'
    assert (await c.put(base+'/roof',headers=h,json=roof_payload())).status_code==200
    result=await c.post(base+'/simulations',headers=h,json={'outages':[{'start_min':480,'end_min':600}]})
    assert result.status_code==201,result.text
    run=result.json();assert len(run['result']['trace'])==96
    assert (await c.get(base+'/simulations/'+run['id'],headers=h)).json()==run
    assert (await c.get(base+'/simulations')).status_code==401
    assert (await c.get(base+'/simulations/'+run['id'])).status_code==401
    assert (await c.get(base+'/simulations',headers=h)).json()[0]['id']==run['id']
