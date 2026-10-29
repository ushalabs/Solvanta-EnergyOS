import hashlib,json,copy
from datetime import datetime,timezone
from typing import Literal
from fastapi import APIRouter,Depends,HTTPException
from pydantic import Field
from sqlalchemy import select,text
from sqlalchemy.ext.asyncio import AsyncSession
from ....db.session import get_db
from ....models.user import User
from ....models.plan import EnergyPlan
from ....models.automation import AutomationEvent
from ....models.telemetry import Incident
from ....models.audit import AuditLog
from ...deps import get_current_user
from .buildings import get_building
from .plans import PlanInput,build_plan,audit
router=APIRouter()
class EventInput(PlanInput):
 event_id:str=Field(min_length=8,max_length=100)
 correlation_id:str=Field(min_length=8,max_length=100)
 kind:Literal['shortage','daily_planner','anomaly_incident']
 incident_id:str|None=None

def event_view(event,plan):
 d=event.data;expired=datetime.now(timezone.utc)>=datetime.fromisoformat(plan.snapshot['expires_at'])
 state=plan.snapshot['state']
 terminal=state in ['VERIFIED','FAILED','REJECTED'] or expired
 if expired and state not in ['VERIFIED','FAILED','REJECTED']:state='EXPIRED'
 return dict(id=event.id,event_id=event.event_id,correlation_id=d['correlation_id'],building_id=event.building_id,kind=d['kind'],plan_id=plan.id,plan_revision=plan.snapshot['revision'],state=state,waiting=not terminal and state not in ['APPROVED','SIMULATED'],terminal=terminal,notice=d['notice'],run_id=plan.snapshot['run_id'])

@router.post('/{building_id}/events')
async def start(building_id:str,data:EventInput,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
 await get_building(building_id,user,db)
 incident=None
 if data.incident_id:
  incident=(await db.execute(select(Incident).where(Incident.id==data.incident_id,Incident.building_id==building_id).with_for_update())).scalar_one_or_none()
  if incident is None or incident.building_id!=building_id:raise HTTPException(404,'Incident not found')
  if data.kind!='anomaly_incident':raise HTTPException(422,'Incident links require anomaly event kind')
 digest=hashlib.sha256(json.dumps(data.model_dump(exclude_none=True),sort_keys=True).encode()).hexdigest()
 key=int.from_bytes(hashlib.sha256((user.id+data.event_id).encode()).digest()[:8],'big',signed=True)
 await db.execute(text('SELECT pg_advisory_xact_lock(:key)'),{'key':key})
 old=(await db.execute(select(AutomationEvent).where(AutomationEvent.actor_id==user.id,AutomationEvent.event_id==data.event_id))).scalar_one_or_none()
 if old:
  if old.building_id!=building_id or old.data['digest']!=digest:raise HTTPException(409,'Event id reused with different input')
  return event_view(old,await db.get(EnergyPlan,old.data['plan_id']))
 if incident and incident.data['automation_event_id']:raise HTTPException(409,'Incident already linked to an automation event')
 plan=await build_plan(building_id,data,user,db)
 d=copy.deepcopy(plan.snapshot);d['state']='PENDING_APPROVAL';d['revision']=2;plan.snapshot=d
 audit(db,user,plan,'automation_submit',{'correlation_id':data.correlation_id,'event_id':data.event_id,'revision':2})
 event=AutomationEvent(building_id=building_id,actor_id=user.id,event_id=data.event_id,data=dict(digest=digest,correlation_id=data.correlation_id,kind=data.kind,plan_id=plan.id,notice=f'{data.kind}: review plan {plan.id[:8]}. Simulation requires explicit approval.'))
 db.add(event);await db.flush()
 if incident:
  state=copy.deepcopy(incident.data);state['automation_event_id']=event.id;state['state']='REVIEW_REQUESTED';incident.data=state
 await db.commit()
 return event_view(event,plan)

@router.get('/{building_id}/events/{event_id}')
async def status(building_id:str,event_id:str,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
 await get_building(building_id,user,db)
 event=await db.get(AutomationEvent,event_id)
 if event is None or event.building_id!=building_id:raise HTTPException(404,'Event not found')
 return event_view(event,await db.get(EnergyPlan,event.data['plan_id']))

@router.get('/{building_id}/events')
async def notices(building_id:str,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
 await get_building(building_id,user,db)
 events=(await db.execute(select(AutomationEvent).where(AutomationEvent.building_id==building_id).order_by(AutomationEvent.created_at.desc()).limit(20))).scalars().all()
 return [event_view(e,await db.get(EnergyPlan,e.data['plan_id'])) for e in events]
