"""Configure local n8n credentials and import templates; never prints bearer tokens."""
import json,os,subprocess,time,uuid
from pathlib import Path
import httpx
ROOT=Path(__file__).resolve().parents[1]
RUNTIME=ROOT/'mobile'/'.expo'/'n8n';RUNTIME.mkdir(parents=True,exist_ok=True)
SECRET=""
def docker(*args):
 r=subprocess.run(['docker',*args],capture_output=True,text=True,encoding='utf-8',errors='replace')
 if r.returncode:raise RuntimeError((r.stderr+r.stdout)[-2500:].replace(SECRET,'[REDACTED]') if SECRET else (r.stderr+r.stdout)[-2500:])
 return r.stdout

def configure(reuse=False):
 global SECRET
 c=httpx.Client(base_url='http://127.0.0.1:8000',timeout=60)
 auth=c.post('/api/v1/auth/login',data={'username':'demo@solvanta.energy','password':os.environ.get('SOLVANTA_DEMO_PASSWORD','Solvanta2026!')});auth.raise_for_status();token=auth.json()['access_token'];SECRET=token;c.headers['Authorization']='Bearer '+token
 sites=c.get('/api/v1/buildings').json();site=next((s for s in sites if s['name']=='Solvanta Automation Demo'),None)
 if site is None:
  payload={k:sites[0][k] for k in ['pv_capacity_kwp','inverter_rating_kw','battery']};payload['name']='Solvanta Automation Demo';r=c.post('/api/v1/buildings',json=payload);r.raise_for_status();site=r.json()
 base='/api/v1/buildings/'+site['id']
 if c.get(base+'/roof').status_code==404:
  roof={'boundary':[{'x':0,'y':0},{'x':1000,'y':0},{'x':1000,'y':700},{'x':0,'y':700}],'scale_points':[{'x':0,'y':0},{'x':1000,'y':0}],'scale_distance_m':10}
  c.put(base+'/roof',json=roof).raise_for_status()
 if not c.get(base+'/appliances').json()['items']:
  for name,power,critical in [('Critical refrigerator',200,True),('Water pump',750,False)]:
   a=c.post(base+'/appliances',json=dict(name=name,rated_power_w=power,priority='critical' if critical else 'medium',critical=critical,flexible=not critical,required_runtime_min=1440 if critical else 60,earliest_min=0,latest_min=1440,interruptible=False,max_interruptions=0));a.raise_for_status();c.put(base+'/appliances/'+a.json()['id']+'/selection',json={'selected':True}).raise_for_status()
 credential=RUNTIME/'auth.json';credential.write_text(json.dumps([{'id':'solvanta-backend-auth','name':'Solvanta Backend Auth','type':'httpHeaderAuth','data':{'name':'Authorization','value':'Bearer '+token}}]),encoding='utf-8')
 try:
  docker('cp',str(credential),'solvanta-n8n:/tmp/solvanta-auth.json')
  docker('exec','-u','root','solvanta-n8n','chown','node:node','/tmp/solvanta-auth.json')
  docker('exec','solvanta-n8n','n8n','import:credentials','--input=/tmp/solvanta-auth.json')
 finally:
  credential.unlink(missing_ok=True)
  docker('exec','-u','root','solvanta-n8n','rm','-f','/tmp/solvanta-auth.json')
 for template in ([] if reuse else sorted((ROOT/'workflows').glob('*.json'))):
  content=template.read_text(encoding='utf-8').replace('CONFIGURE_BUILDING_ID',site['id']);target=RUNTIME/template.name;target.write_text(content,encoding='utf-8')
  docker('cp',str(target),'solvanta-n8n:/tmp/'+template.name)
  docker('exec','solvanta-n8n','n8n','import:workflow','--input=/tmp/'+template.name)
  docker('exec','solvanta-n8n','n8n','publish:workflow','--id=solvanta-'+template.stem)
 docker('restart','solvanta-n8n')
 print(json.dumps({'building_id':site['id'],'workflows':3,'credential':'stored in local n8n database; token not exported'}),flush=True)
 return site['id'],c
if __name__=='__main__':configure()
