import uuid
import pytest
from pydantic import ValidationError
from app.schemas.appliance import ApplianceInput

BASE={'name':'Water pump','rated_power_w':750,'priority':'medium','critical':False,'flexible':True,'required_runtime_min':60,'earliest_min':480,'latest_min':720,'interruptible':True,'max_interruptions':1}

@pytest.mark.parametrize('change',[{'rated_power_w':0},{'required_runtime_min':300},{'earliest_min':800},{'critical':True},{'flexible':False},{'max_interruptions':-1},{'name':'   '}])
def test_invalid_appliance(change):
    with pytest.raises(ValidationError): ApplianceInput(**(BASE|change))

@pytest.mark.asyncio
async def test_crud_selection_summary_and_tenant(async_client):
    c=async_client
    token=(await c.post('/api/v1/auth/login',data={'username':'demo@solvanta.energy','password':'Solvanta2026!'})).json()['access_token']
    h={'Authorization':'Bearer '+token}
    b=(await c.get('/api/v1/buildings',headers=h)).json()[0]['id']
    url=f'/api/v1/buildings/{b}/appliances'
    a=await c.post(url,json=BASE,headers=h)
    assert a.status_code==201,a.text
    aid=a.json()['id']
    try:
        assert (await c.get(url,headers=h)).json()['summary']['requested_kw']==0
        result=await c.put(f'{url}/{aid}/selection',json={'selected':True},headers=h)
        assert result.json()['summary']=={'requested_kw':.75,'critical_kw':0,'selected_count':1}
        assert (await c.get(url,headers=h)).json()['items'][0]['selected'] is True
        changed=BASE|{'rated_power_w':1000,'priority':'critical','critical':True}
        update=await c.put(f'{url}/{aid}',json=changed,headers=h)
        assert update.status_code==200 and update.json()['selected'] is True
        assert (await c.get(url,headers=h)).json()['summary']=={'requested_kw':1,'critical_kw':1,'selected_count':1}
        assert (await c.get(url)).status_code==401
        email=f'{uuid.uuid4()}@example.com'
        await c.post('/api/v1/auth/register',json={'email':email,'password':'Password123!','full_name':'Other'})
        other_token=(await c.post('/api/v1/auth/login',data={'username':email,'password':'Password123!'})).json()['access_token']
        other={'Authorization':'Bearer '+other_token}
        assert (await c.get(url,headers=other)).status_code==403
        assert (await c.put(f'{url}/{aid}/selection',json={'selected':False},headers=other)).status_code==403
        assert (await c.put(f'{url}/{aid}',json=BASE,headers=other)).status_code==403
        assert (await c.delete(f'{url}/{aid}',headers=other)).status_code==403
        wrong=f'/api/v1/buildings/{uuid.uuid4()}/appliances/{aid}'
        assert (await c.put(wrong,json=BASE,headers=h)).status_code==404
        assert (await c.put(f'{url}/{aid}/selection',json={'selected':False},headers=h)).json()['summary']['requested_kw']==0
    finally:
        assert (await c.delete(f'{url}/{aid}',headers=h)).status_code==204
    assert (await c.get(url,headers=h)).json()['items']==[]
