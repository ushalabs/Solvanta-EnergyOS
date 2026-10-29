import copy,hashlib,json
from datetime import datetime,timezone
from typing import Literal
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field,ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ....db.session import get_db
from ....models.user import User
from ....models.simulation import SimulationRun
from ....models.plan import EnergyPlan
from ....models.telemetry import TelemetryRun,Incident
from ....services.telemetry import SimulationProvider,detect
from ...deps import get_current_user
from .buildings import get_building
router=APIRouter()
class TelemetryInput(BaseModel):
 model_config=ConfigDict(extra='forbid')
 run_id:str
 fixture:Literal['none','pv_dropout','battery_drain','load_spike']='none'
 seed:int=Field(default=14,ge=0,le=1000000)
class VerificationInput(BaseModel):
 plan_id:str
 verification_id:str=Field(min_length=8,max_length=100)
 fixture:Literal['none','pv_dropout','battery_drain','load_spike']='none'

def incident_view(i):return dict(id=i.id,building_id=i.building_id,telemetry_id=i.telemetry_id,created_at=i.created_at,**i.data)

@router.post('/{building_id}/telemetry',status_code=201)
async def generate(building_id:str,data:TelemetryInput,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
 await get_building(building_id,user,db)
 run=await db.get(SimulationRun,data.run_id)
 if run is None or run.building_id!=building_id:raise HTTPException(404,'Source simulation not found')
 provider=SimulationProvider(run.result,data.fixture,data.seed)
 try:samples=provider.samples();detected=detect(run.result,samples)
 except ValueError as e:raise HTTPException(422,str(e)) from e
 record=TelemetryRun(building_id=building_id,run_id=run.id,data=dict(source=provider.source,fixture=data.fixture,seed=data.seed,samples=samples));db.add(record);await db.flush()
 incidents=[Incident(building_id=building_id,telemetry_id=record.id,data=d) for d in detected]
 db.add_all(incidents);await db.commit();return dict(id=record.id,run_id=run.id,**record.data,incidents=[incident_view(i) for i in incidents])

@router.get('/{building_id}/telemetry')
async def history(building_id:str,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
 await get_building(building_id,user,db)
 runs=(await db.execute(select(TelemetryRun).where(TelemetryRun.building_id==building_id).order_by(TelemetryRun.created_at.desc()).limit(10))).scalars().all()
 return [dict(id=r.id,run_id=r.run_id,created_at=r.created_at,**r.data) for r in runs]

@router.get('/{building_id}/incidents')
async def incidents(building_id:str,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
 await get_building(building_id,user,db)
 records=(await db.execute(select(Incident).where(Incident.building_id==building_id).order_by(Incident.created_at.desc()).limit(20))).scalars().all()
 return [incident_view(i) for i in records]

@router.get('/{building_id}/incidents/pending')
async def pending(building_id:str,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
 await get_building(building_id,user,db)
 records=(await db.execute(select(Incident).where(Incident.building_id==building_id,Incident.data['state'].as_string()=='OPEN').order_by(Incident.created_at).limit(20))).scalars().all()
 items=[incident_view(i) for i in records]
 return [dict(building_id=building_id,incident_id=i['id'],event_id='incident-'+i['id'],correlation_id=i['id']) for i in items if not i['automation_event_id'] and i['state']=='OPEN']

@router.post('/{building_id}/incidents/{incident_id}/verify')
async def verify(building_id:str,incident_id:str,data:VerificationInput,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
 await get_building(building_id,user,db)
 incident=(await db.execute(select(Incident).where(Incident.id==incident_id,Incident.building_id==building_id).with_for_update())).scalar_one_or_none()
 if incident is None:raise HTTPException(404,'Incident not found')
 digest=hashlib.sha256(json.dumps(data.model_dump(),sort_keys=True).encode()).hexdigest()
 for v in incident.data['verifications']:
  if v['verification_id']==data.verification_id:
   if v['digest']!=digest:raise HTTPException(409,'Verification id conflicts')
   return v
 plan=await db.get(EnergyPlan,data.plan_id)
 if plan is None or plan.building_id!=building_id:raise HTTPException(404,'Plan not found')
 if plan.snapshot['state']!='VERIFIED':raise HTTPException(409,'A verified approved plan simulation is required')
 run=await db.get(SimulationRun,plan.snapshot['run_id'])
 try:
  provider=SimulationProvider(run.result,data.fixture);observed=provider.samples();remaining=detect(run.result,observed)
 except ValueError as e:raise HTTPException(422,str(e)) from e
 result=dict(verification_id=data.verification_id,digest=digest,plan_id=plan.id,run_id=run.id,source=provider.source,state='FAILED' if remaining else 'MODEL_MATCH',remaining_codes=[i['code'] for i in remaining],sample_count=len(observed),created_at=datetime.now(timezone.utc).isoformat(),meaning='Synthetic post-plan model consistency only; no physical incident resolution claimed')
 d=copy.deepcopy(incident.data);d['verifications'].append(result);d['state']='SIMULATED_MODEL_MATCH' if not remaining else 'SIMULATED_MISMATCH';incident.data=d;await db.commit();return result
