"""Live detector -> scheduled n8n incident -> approved plan -> synthetic verification."""
import importlib.util,json,time,uuid
from pathlib import Path
spec=importlib.util.spec_from_file_location('setup',Path(__file__).with_name('configure-n8n.py'));setup=importlib.util.module_from_spec(spec);spec.loader.exec_module(setup)
def verify():
 building,c=setup.configure(only='anomaly_incident');base='/api/v1/buildings/'+building
 run=c.post(base+'/simulations',json={});run.raise_for_status()
 sample=c.post(base+'/telemetry',json={'run_id':run.json()['id'],'fixture':'load_spike','seed':14});sample.raise_for_status();incident=sample.json()['incidents'][0]
 deadline=time.monotonic()+150;event=None
 while time.monotonic()<deadline:
  for e in c.get(base+'/events').json():
   if e['correlation_id']==incident['id']:event=e
  if event:break
  time.sleep(3)
 if event is None:raise RuntimeError('Scheduled n8n incident polling did not create a review event')
 action=c.post(base+'/plans/'+event['plan_id']+'/actions',json={'action':'approve','expected_revision':event['plan_revision'],'idempotency_key':str(uuid.uuid4()),'comment':'Seeded simulated incident verification'});action.raise_for_status()
 deadline=time.monotonic()+160
 while time.monotonic()<deadline:
  event=c.get(base+'/events/'+event['id']).json()
  if event['terminal']:break
  time.sleep(3)
 if event['state']!='VERIFIED':raise RuntimeError('Incident workflow did not verify: '+event['state'])
 check=c.post(base+'/incidents/'+incident['id']+'/verify',json={'plan_id':event['plan_id'],'verification_id':str(uuid.uuid4()),'fixture':'none'});check.raise_for_status()
 mismatch=c.post(base+'/incidents/'+incident['id']+'/verify',json={'plan_id':event['plan_id'],'verification_id':str(uuid.uuid4()),'fixture':'load_spike'});mismatch.raise_for_status()
 assert check.json()['state']=='MODEL_MATCH' and mismatch.json()['state']=='FAILED'
 js="""const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('/home/node/.n8n/database.sqlite',{readOnly:true});console.log(JSON.stringify(d.prepare(\"SELECT id,workflowId,status,startedAt,stoppedAt FROM execution_entity WHERE workflowId='solvanta-anomaly_incident' ORDER BY id DESC LIMIT 5\").all()));"""
 executions=json.loads(setup.docker('exec','solvanta-n8n','node','-e',js))
 evidence={'executions':executions,'source':'SIMULATED','telemetry_id':sample.json()['id'],'source_run_id':run.json()['id'],'incident_id':incident['id'],'code':incident['code'],'evidence':incident['evidence'],'event_id':event['id'],'correlation_id':event['correlation_id'],'plan_id':event['plan_id'],'plan_state':event['state'],'verification_match':check.json(),'verification_mismatch':mismatch.json()}
 target=setup.ROOT/'docs'/'evidence'/'phase14';target.mkdir(parents=True,exist_ok=True);(target/'detector-workflow.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8');print(json.dumps(evidence,indent=2))
if __name__=='__main__':verify()
