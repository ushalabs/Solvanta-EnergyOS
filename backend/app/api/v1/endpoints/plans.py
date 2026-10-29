import copy,hashlib,json
from datetime import datetime,timedelta,timezone
from typing import Literal
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field,ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ....db.session import get_db
from ....models.user import User
from ....models.plan import EnergyPlan
from ....models.simulation import SimulationRun
from ....models.audit import AuditLog
from ....schemas.simulation import SimulationInput
from ....services.plans import variants,execute_snapshot,verify_result
from ...deps import get_current_user
from .buildings import get_building
from .simulation import calculate
router=APIRouter()
class PlanInput(SimulationInput):
 expiry_minutes:int=Field(default=60,ge=1,le=1440)
class PlanAction(BaseModel):
 model_config=ConfigDict(extra='forbid')
 action:Literal['submit','approve','reject','request_modification','revise','simulate','verify']
 expected_revision:int=Field(ge=1)
 idempotency_key:str=Field(min_length=8,max_length=100)
 variant:int=Field(default=0,ge=0,le=2)
 comment:str=Field(default='',max_length=1000)

def serialize(plan):
 d=copy.deepcopy(plan.snapshot);d.pop('receipts',None)
 selected=d['variants'][d['selected_variant']]['snapshot']
 d['scenario']=dict(options=selected['options'],pv_source=selected['pv']['source'],plant=selected['plant'],selected_loads=[dict(name=a['name'],rated_power_w=a['rated_power_w'],critical=a['critical']) for a in selected['appliances'] if a['selected']])
 for v in d['variants']:v.pop('snapshot',None)
 return dict(id=plan.id,created_at=plan.created_at,**d)

def audit(db,user,plan,action,details):
 db.add(AuditLog(user_id=user.id,action=action,target_type='energy_plan',target_id=plan.id,details=json.dumps(details)))

async def build_plan(building_id,data,user,db):
 options=SimulationInput(outages=data.outages,use_generator=data.use_generator)
 snapshot,_=await calculate(building_id,options,user,db)
 plan=EnergyPlan(building_id=building_id,snapshot=dict(state='DRAFT',revision=1,selected_variant=0,expires_at=(datetime.now(timezone.utc)+timedelta(minutes=data.expiry_minutes)).isoformat(),variants=variants(snapshot),run_id=None,receipts={},verification_errors=[]))
 db.add(plan);await db.flush();audit(db,user,plan,'create',{'revision':1})
 return plan


@router.post('/{building_id}/plans',status_code=201)
async def create(building_id:str,data:PlanInput,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
 plan=await build_plan(building_id,data,user,db)
 await db.commit();await db.refresh(plan)
 return serialize(plan)

@router.get('/{building_id}/plans')
async def history(building_id:str,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
 await get_building(building_id,user,db)
 plans=(await db.execute(select(EnergyPlan).where(EnergyPlan.building_id==building_id).order_by(EnergyPlan.created_at.desc()).limit(10))).scalars().all()
 return [serialize(p) for p in plans]

@router.post('/{building_id}/plans/{plan_id}/actions')
async def transition(building_id:str,plan_id:str,data:PlanAction,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
 await get_building(building_id,user,db)
 plan=(await db.execute(select(EnergyPlan).where(EnergyPlan.id==plan_id,EnergyPlan.building_id==building_id).with_for_update())).scalar_one_or_none()
 if plan is None:raise HTTPException(404,'Plan not found')
 d=copy.deepcopy(plan.snapshot)
 digest=hashlib.sha256((user.id+json.dumps(data.model_dump(),sort_keys=True)).encode()).hexdigest()
 receipt=d['receipts'].get(data.idempotency_key)
 if receipt:
  if receipt['digest']!=digest:raise HTTPException(409,'Idempotency key already used for different request or actor')
  return dict(**serialize(plan),replayed=True)
 if d['revision']!=data.expected_revision:raise HTTPException(409,'Plan revision changed; reload before acting')
 if datetime.now(timezone.utc)>=datetime.fromisoformat(d['expires_at']):raise HTTPException(409,'Plan expired; create a fresh plan')
 allowed={'submit':('DRAFT','PENDING_APPROVAL'),'approve':('PENDING_APPROVAL','APPROVED'),'reject':('PENDING_APPROVAL','REJECTED'),'request_modification':('PENDING_APPROVAL','MODIFICATION_REQUESTED'),'revise':('MODIFICATION_REQUESTED','DRAFT'),'simulate':('APPROVED','SIMULATED'),'verify':('SIMULATED','VERIFIED')}
 source,target=allowed[data.action]
 if d['state']!=source:raise HTTPException(409,f"Cannot {data.action} a {d['state']} plan")
 if data.action in ('submit','revise'):d['selected_variant']=data.variant
 snapshot=d['variants'][d['selected_variant']]['snapshot']
 if data.action=='simulate':
  result=execute_snapshot(snapshot);run=SimulationRun(building_id=building_id,snapshot=snapshot,result=result);db.add(run);await db.flush();d['run_id']=run.id
 if data.action=='verify':
  run=await db.get(SimulationRun,d['run_id'])
  d['verification_errors']=verify_result(snapshot,run.result) if run else ['Linked simulation missing']
  target='FAILED' if d['verification_errors'] else 'VERIFIED'
 d['state']=target;d['revision']+=1;d['receipts'][data.idempotency_key]={'digest':digest}
 plan.snapshot=d;audit(db,user,plan,data.action,{'from':source,'to':target,'revision':d['revision'],'comment':data.comment,'run_id':d['run_id']})
 await db.commit();return serialize(plan)

@router.get('/{building_id}/plans/{plan_id}/audit')
async def read_audit(building_id:str,plan_id:str,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
 await get_building(building_id,user,db)
 plan=await db.get(EnergyPlan,plan_id)
 if plan is None or plan.building_id!=building_id:raise HTTPException(404,'Plan not found')
 records=(await db.execute(select(AuditLog).where(AuditLog.target_id==plan_id,AuditLog.target_type=='energy_plan').order_by(AuditLog.created_at))).scalars().all()
 return [dict(actor_id=r.user_id,action=r.action,created_at=r.created_at,details=json.loads(r.details)) for r in records]
