import pytest
from pydantic import ValidationError
from app.schemas.pv import PVInput, StringSpecs
from app.services.pv import estimate_pv
from test_roof import roof_payload

def test_pv_units_energy_and_clipping():
    p=PVInput(module_wattage_w=500,inverter_kw=8,inverter_efficiency_pct=100,losses_pct=0,poa_w_m2=[1000]*24)
    r=estimate_pv(20,p)
    assert r.dc_capacity_kwp == 10
    assert r.dc_ac_ratio == 1.25
    assert r.timeline[0].dc_kw == 10
    assert r.daily_energy_kwh == 8*24
    assert all(t.ac_kw <= 8 for t in r.timeline)

def test_zero_irradiance_and_zero_modules():
    assert estimate_pv(30,PVInput(poa_w_m2=[0]*24)).daily_energy_kwh == 0
    assert estimate_pv(0,PVInput()).daily_energy_kwh == 0
    p=estimate_pv(10,PVInput())
    assert all(p.timeline[h].ac_kw==0 for h in [0,1,2,3,4,5,18,19,20,21,22,23])

def test_losses_temperature_and_orientation():
    p=PVInput(module_wattage_w=500,inverter_kw=50,inverter_efficiency_pct=100,losses_pct=10,poa_w_m2=[1000]*24,cell_temperature_c=50)
    assert estimate_pv(20,p).timeline[0].ac_kw == pytest.approx(8.1)
    assert estimate_pv(20,PVInput(azimuth_deg=180)).daily_energy_kwh > estimate_pv(20,PVInput(azimuth_deg=0)).daily_energy_kwh
    assert estimate_pv(20,p).daily_energy_kwh == estimate_pv(20,p.model_copy(update={'azimuth_deg':0})).daily_energy_kwh

def test_string_constraints():
    specs=dict(modules_per_string=10,module_voc_v=49,module_vmp_v=41,inverter_max_dc_v=600,mppt_min_v=120,mppt_max_v=550)
    p=PVInput(string_specs=StringSpecs(**specs))
    estimate_pv(20,p)
    with pytest.raises(ValueError,match='complete'): estimate_pv(21,p)
    with pytest.raises(ValueError,match='maximum'): estimate_pv(40,PVInput(string_specs=StringSpecs(**(specs|{'modules_per_string':20}))))
    with pytest.raises(ValueError,match='MPPT'): estimate_pv(20,PVInput(string_specs=StringSpecs(**(specs|{'modules_per_string':2}))))
    with pytest.raises(ValidationError): PVInput(poa_w_m2=[-1]*24)

@pytest.mark.asyncio
async def test_pv_uses_saved_layout_and_persists(async_client):
    c=async_client
    token=(await c.post('/api/v1/auth/login',data={'username':'demo@solvanta.energy','password':'Solvanta2026!'})).json()['access_token']
    h={'Authorization':'Bearer '+token}
    b=(await c.get('/api/v1/buildings',headers=h)).json()[0]['id']
    base=f'/api/v1/buildings/{b}'
    roof=await c.put(base+'/roof',json=roof_payload(),headers=h)
    count=roof.json()['layout']['panel_count']
    payload=PVInput(module_wattage_w=500).model_dump()
    saved=await c.put(base+'/pv',json=payload,headers=h)
    assert saved.status_code==200,saved.text
    assert saved.json()['profile']['dc_capacity_kwp']==count*.5
    assert (await c.get(base+'/pv',headers=h)).json()==saved.json()
    assert (await c.get(base+'/pv')).status_code==401
