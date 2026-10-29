"""Real stdio SDK smoke test against the local Phase 15 numerical fixture."""
import asyncio
import importlib.metadata
import json
import os
from pathlib import Path
import sys
import httpx
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def verify():
    root=Path(__file__).resolve().parents[2]
    fixture=json.loads((root/'docs/evidence/phase15/integrated-demo.json').read_text(encoding='utf-8'))
    with httpx.Client(base_url=os.environ.get('SOLVANTA_API_URL','http://127.0.0.1:8000'),timeout=30) as client:
        response=client.post('/api/v1/auth/login',data={'username':'demo@solvanta.energy','password':os.environ.get('SOLVANTA_DEMO_PASSWORD','Solvanta2026!')})
        response.raise_for_status();token=response.json()['access_token']
        client.headers['Authorization']='Bearer '+token
        b=fixture['building_id'];scenario=fixture['baseline_run_id']
        response=client.get(f'/api/v1/buildings/{b}/simulations/{scenario}');response.raise_for_status();baseline=response.json()
        response=client.post(f'/api/v1/buildings/{b}/simulations',json={});response.raise_for_status();grid_scenario=response.json()['id']
    params=StdioServerParameters(command=sys.executable,args=['-m','app.mcp_server'],cwd=str(root/'backend'),env=dict(os.environ,SOLVANTA_MCP_TOKEN=token))
    report={'mcp_version':importlib.metadata.version('mcp'),'transport':'stdio','command':'python -m app.mcp_server','building_id':b,'source_scenario_id':scenario,'tools':[]}
    async with stdio_client(params) as (read,write):
        async with ClientSession(read,write) as session:
            await session.initialize();tools=(await session.list_tools()).tools
            assert len(tools)==9 and all(t.outputSchema for t in tools)
            for tool in tools:
                name=tool.name
                args={'building_id':b} if name in ['get_building_profile','get_energy_anomalies'] else {'scenario_id':grid_scenario if name=='optimize_appliance_schedule' else scenario}
                if name=='compare_energy_configurations':args['variations']=[0,1,2]
                result=await session.call_tool(name,args)
                assert not result.isError,(name,result.content)
                payload=result.structuredContent;data=payload['data']
                if name=='run_outage_simulation':assert data['result']==baseline['result']
                if name=='optimize_appliance_schedule':assert data['validated'] and payload['record_id']
                if name=='propose_energy_plan':assert data['state']=='PENDING_APPROVAL' and data['run_id'] is None
                report['tools'].append(dict(name=name,source=payload['source'],scenario_id=payload['scenario_id'],record_id=payload['record_id'],summary=data.get('result',{}).get('summary'),status=data.get('state',data.get('status')),validated=data.get('validated')))
            report['invalid_uuid_is_error']=(await session.call_tool('get_energy_scenario',{'scenario_id':'invalid'})).isError
            report['approval_tool_is_error']=(await session.call_tool('approve_energy_plan',{})).isError
    output=root/'docs/evidence/phase16/mcp-client.json';output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'tools':len(report['tools']),'simulation_matches_rest':True,'proposal':'PENDING_APPROVAL','evidence':str(output)}))

if __name__=='__main__':
    asyncio.run(verify())
