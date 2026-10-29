"""Reproduce a labelled local FYP-I demo through public authenticated REST calls."""
import os,json,uuid
from pathlib import Path
import httpx

def verify():
 c=httpx.Client(base_url=os.environ.get('SOLVANTA_API_URL','http://127.0.0.1:8000'),timeout=60)
 login=c.post('/api/v1/auth/login',data={'username':'demo@solvanta.energy','password':os.environ.get('SOLVANTA_DEMO_PASSWORD','Solvanta2026!')});login.raise_for_status();c.headers['Authorization']='Bearer '+login.json()['access_token']
 def request(method,path,body=None):
  r=c.request(method,path,json=body);r.raise_for_status();return r.json() if r.content else None
 prefix='/api/v1/buildings'
 # A fresh isolated site prevents accidental changes to an existing user twin.
 b=request('POST',prefix,dict(name='Integration Verification '+str(uuid.uuid4())[:8],pv_capacity_kwp=0,inverter_rating_kw=8,battery=dict(nominal_capacity_kwh=10,usable_capacity_kwh=8,initial_soc_pct=40,minimum_soc_pct=20,max_charge_kw=4,max_discharge_kw=4,round_trip_efficiency=1)))
 base=prefix+'/'+b['id']
 roof=dict(boundary=[dict(x=0,y=0),dict(x=1000,y=0),dict(x=1000,y=700),dict(x=0,y=700)],scale_points=[dict(x=0,y=0),dict(x=1000,y=0)],scale_distance_m=10)
 layout=request('PUT',base+'/roof',roof)
 request('PUT',base+'/pv',dict(module_wattage_w=550,inverter_kw=8,poa_w_m2=[0]*24))
 for name,critical,start,flexible in [('Water pump',False,0,True),('Critical supplies',True,120,False)]:
  a=request('POST',base+'/appliances',dict(name=name,rated_power_w=1000,priority='critical' if critical else 'medium',critical=critical,flexible=flexible,required_runtime_min=120,earliest_min=start,latest_min=1440,interruptible=False,max_interruptions=0))
  request('PUT',base+'/appliances/'+a['id']+'/selection',{'selected':True})
 opts={'outages':[{'start_min':0,'end_min':1440}],'use_generator':False}
 run=request('POST',base+'/simulations',opts)
 comparison=request('POST',base+'/resilience',opts)
 assert run['result']['summary']['unserved_critical_kwh']==2
 assert comparison['result']['critical_energy_saved_kwh']==2
 conflict=request('POST',base+'/schedules',opts);assert conflict['result']['status']=='INFEASIBLE'
 schedule=request('POST',base+'/schedules',{'outages':[]});assert schedule['id'] and schedule['result']['validated']
 plan=request('POST',base+'/plans',opts)
 states=[plan['state']]
 for action in ['submit','approve','simulate','verify']:
  plan=request('POST',base+'/plans/'+plan['id']+'/actions',dict(action=action,expected_revision=plan['revision'],idempotency_key=str(uuid.uuid4()),variant=0,comment='Labelled synthetic integration verification'))
  states.append(plan['state'])
 assert states==['DRAFT','PENDING_APPROVAL','APPROVED','SIMULATED','VERIFIED']
 verified_run=request('GET',base+'/simulations/'+plan['run_id'])
 telemetry=request('POST',base+'/telemetry',dict(run_id=plan['run_id'],fixture='load_spike',seed=14));assert telemetry['incidents']
 forecast=request('POST',base+'/forecast',dict(basis='latest_run',**opts));assert forecast['provenance']['source_run_id']==plan['run_id']
 audit=request('GET',base+'/plans/'+plan['id']+'/audit')
 assert [e['action'] for e in audit]==['create','submit','approve','simulate','verify']
 report=dict(source='SIMULATED ideal-efficiency zero-irradiance hand-calculated fixture',building_id=b['id'],layout_panel_count=layout['layout']['panel_count'],baseline_run_id=run['id'],baseline=run['result']['summary'],resilience_id=comparison['id'],critical_energy_saved_kwh=comparison['result']['critical_energy_saved_kwh'],infeasible_schedule_status=conflict['result']['status'],saved_schedule_id=schedule['id'],plan_id=plan['id'],plan_states=states,approved_run_id=plan['run_id'],approved_summary=verified_run['result']['summary'],telemetry_id=telemetry['id'],incident_ids=[i['id'] for i in telemetry['incidents']],forecast_source=forecast['provenance'],audit_actions=[e['action'] for e in audit])
 out=Path(__file__).resolve().parents[2]/'docs'/'evidence'/'phase15';out.mkdir(parents=True,exist_ok=True);(out/'integrated-demo.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))
 return report
if __name__=='__main__':verify()
