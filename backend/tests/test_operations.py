import os
import sys
import uuid
from pathlib import Path
import pytest
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from test_roof import roof_payload

async def setup(c):
    token = (await c.post('/api/v1/auth/login', data={'username':'demo@solvanta.energy','password':'Solvanta2026!'})).json()['access_token']
    h = {'Authorization':'Bearer '+token}
    building = (await c.get('/api/v1/buildings', headers=h)).json()[0]['id']
    await c.put(f'/api/v1/buildings/{building}/roof', headers=h, json=roof_payload())
    response = await c.post(f'/api/v1/buildings/{building}/simulations', headers=h, json={})
    assert response.status_code == 201, response.text
    return token, h, building, response.json()

@pytest.mark.asyncio
async def test_gateway_engines_and_pending_proposal(async_client):
    c=async_client;_,h,b,run=await setup(c)
    registry=(await c.get('/api/v1/operations/tools',headers=h)).json()
    assert len(registry['tools'])==9
    async def call(name,args):
        r=await c.post('/api/v1/operations/tools/'+name,headers=h,json=args)
        assert r.status_code==200,r.text
        return r.json()
    for entry in registry['tools']:
        name=entry['name'];args={'building_id':b} if name in ['get_building_profile','get_energy_anomalies'] else {'scenario_id':run['id']}
        if name=='compare_energy_configurations':args['variations']=[0,1,2]
        result=await call(name,args)
        assert result['building_id']==b and result['units']['energy']=='kWh'
        if name=='run_outage_simulation':assert result['data']['result']==run['result'] and result['record_id']
        if name=='optimize_appliance_schedule':assert result['data']['validated'] and result['record_id']
        if name=='propose_energy_plan':
            assert result['data']['state']=='PENDING_APPROVAL' and result['data']['run_id'] is None
            actions=(await c.get(f"/api/v1/buildings/{b}/plans/{result['record_id']}/audit",headers=h)).json()
            assert [a['action'] for a in actions]==['create','submit']

@pytest.mark.asyncio
async def test_gateway_rejects_invalid_and_cross_tenant_arguments(async_client):
    c=async_client;_,h,b,run=await setup(c);url='/api/v1/operations/tools/'
    assert (await c.get('/api/v1/operations/tools')).status_code==401
    for name,args in [('get_energy_scenario',{'scenario_id':'invalid'}),('get_energy_scenario',{'scenario_id':run['id'],'user_id':'admin'}),('compare_energy_configurations',{'scenario_id':run['id'],'variations':[3]})]:
        assert (await c.post(url+name,headers=h,json=args)).status_code==422
    assert (await c.post(url+'approve_energy_plan',headers=h,json={})).status_code==422
    assert (await c.post(url+'get_energy_scenario',headers=h,json={'scenario_id':str(uuid.uuid4())})).status_code==404
    email=f'{uuid.uuid4()}@example.com'
    await c.post('/api/v1/auth/register',json={'email':email,'password':'Password123!','full_name':'Other'})
    token=(await c.post('/api/v1/auth/login',data={'username':email,'password':'Password123!'})).json()['access_token']
    other={'Authorization':'Bearer '+token}
    for name,args in [('get_building_profile',{'building_id':b}),('run_outage_simulation',{'scenario_id':run['id']}),('propose_energy_plan',{'scenario_id':run['id']})]:
        assert (await c.post(url+name,headers=other,json=args)).status_code==403

@pytest.mark.asyncio
async def test_real_stdio_client_schema_execution_and_errors(async_client):
    token,h,b,run=await setup(async_client)
    parameters=StdioServerParameters(command=sys.executable,args=['-m','app.mcp_server'],cwd=str(Path(__file__).resolve().parents[1]),env=dict(os.environ,SOLVANTA_MCP_TOKEN=token))
    async with stdio_client(parameters) as (read,write):
        async with ClientSession(read,write) as session:
            await session.initialize();tools=(await session.list_tools()).tools
            assert len(tools)==9 and all(t.outputSchema for t in tools)
            result=await session.call_tool('run_outage_simulation',{'scenario_id':run['id']})
            assert not result.isError and result.structuredContent['data']['result']==run['result']
            invalid=await session.call_tool('get_energy_scenario',{'scenario_id':'bad'})
            assert invalid.isError
            unknown=await session.call_tool('approve_energy_plan',{})
            assert unknown.isError
    parameters.env['SOLVANTA_MCP_TOKEN']='forged-token'
    async with stdio_client(parameters) as (read,write):
        async with ClientSession(read,write) as session:
            await session.initialize()
            result=await session.call_tool('get_building_profile',{'building_id':b})
            assert result.isError and '401' in result.content[0].text
