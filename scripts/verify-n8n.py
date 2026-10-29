"""Exercise production n8n webhooks, approval and rejection; save redacted evidence."""
import importlib.util,json,time,uuid,subprocess,sys
from pathlib import Path
import httpx
module=importlib.util.spec_from_file_location('n8n_setup',Path(__file__).with_name('configure-n8n.py'));setup=importlib.util.module_from_spec(module);module.loader.exec_module(setup)

def verify():
 building,c=setup.configure(reuse="--reuse" in sys.argv);base='/api/v1/buildings/'+building
 deadline=time.monotonic()+120
 while time.monotonic()<deadline:
  try:
   if httpx.get('http://127.0.0.1:5678/healthz',timeout=3).status_code==200:break
  except httpx.HTTPError:pass
  time.sleep(2)
 kinds=['shortage','daily_planner','anomaly_incident'];correlations={kind:str(uuid.uuid4()) for kind in kinds}
 for kind in kinds:
  payload={'building_id':building,'event_id':str(uuid.uuid4()),'correlation_id':correlations[kind]}
  deadline=time.monotonic()+120
  while True:
   r=httpx.post('http://127.0.0.1:5678/webhook/solvanta-'+kind,headers={'Authorization':c.headers['Authorization']},json=payload,timeout=30)
   if r.status_code!=404 or time.monotonic()>deadline:break
   time.sleep(3)
  r.raise_for_status()
 events={};deadline=time.monotonic()+120
 while len(events)<3 and time.monotonic()<deadline:
  for event in c.get(base+'/events').json():
   for kind,correlation in correlations.items():
    if event['correlation_id']==correlation:events[kind]=event
  time.sleep(2)
 if len(events)!=3:raise RuntimeError('n8n did not create all three correlated events')
 for kind,action in [('shortage','approve'),('daily_planner','reject'),('anomaly_incident','approve')]:
  event=events[kind]
  r=c.post(base+'/plans/'+event['plan_id']+'/actions',json={'action':action,'expected_revision':event['plan_revision'],'idempotency_key':str(uuid.uuid4()),'comment':'Automated local verification of seeded SIMULATED workflow'});r.raise_for_status()
 time.sleep(3)
 setup.docker('restart','solvanta-n8n')
 deadline=time.monotonic()+200;final={}
 while time.monotonic()<deadline:
  final={kind:c.get(base+'/events/'+event['id']).json() for kind,event in events.items()}
  if all(e['terminal'] for e in final.values()):break
  time.sleep(3)
 expected={'shortage':'VERIFIED','daily_planner':'REJECTED','anomaly_incident':'VERIFIED'}
 for kind,state in expected.items():
  if final[kind]['state']!=state:raise RuntimeError(f'{kind}: expected {state}, got {final[kind]["state"]}')
 # Only whitelist execution metadata, never export credential-bearing execution payloads.
 js="""const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('/home/node/.n8n/database.sqlite',{readOnly:true});console.log(JSON.stringify(db.prepare('SELECT id,workflowId,status,startedAt,stoppedAt FROM execution_entity ORDER BY id DESC LIMIT 10').all()));"""
 metadata=json.loads(setup.docker('exec','solvanta-n8n','node','-e',js))
 evidence={'restart_during_approval_wait':True,'n8n_version':setup.docker('exec','solvanta-n8n','n8n','--version').strip(),'events':[{k:v for k,v in e.items() if k in ['id','event_id','correlation_id','kind','plan_id','state','run_id']} for e in final.values()],'executions':metadata}
 out=setup.ROOT/'docs'/'evidence'/'phase13';out.mkdir(parents=True,exist_ok=True);(out/'n8n-executions.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8')
 print(json.dumps(evidence,indent=2))
if __name__=='__main__':verify()
