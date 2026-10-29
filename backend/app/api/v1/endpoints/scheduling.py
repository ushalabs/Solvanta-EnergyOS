import asyncio
from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ....db.session import get_db
from ....models.user import User
from ....models.schedule import Schedule
from ....schemas.simulation import SimulationInput
from ....services.scheduling import solve_schedule
from ...deps import get_current_user
from .buildings import get_building
from .simulation import calculate
router=APIRouter()

@router.post('/{building_id}/schedules')
async def schedule(building_id:str,options:SimulationInput,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    if options.use_generator:raise HTTPException(422,'Phase 9 budget uses PV and grid only; generator dispatch belongs to resilience optimization')
    snapshot,_=await calculate(building_id,options,user,db)
    budget=[]
    for minute in range(1440):
        grid=0 if any(o.start_min<=minute<o.end_min for o in options.outages) else snapshot['plant']['grid_import_kw']
        budget.append((grid+snapshot['pv']['timeline'][minute//60]['ac_kw'])*1000)
    try: result=await asyncio.to_thread(solve_schedule,snapshot['appliances'],budget)
    except ValueError as e:raise HTTPException(422,str(e)) from e
    result['supply_policy']='PV plus available grid only. Battery and generator are excluded from this conservative scheduling budget.'
    if not result['validated']:return dict(id=None,result=result)
    snapshot['budget_w']=budget
    record=Schedule(building_id=building_id,snapshot=snapshot,result=result)
    db.add(record);await db.commit();await db.refresh(record)
    return dict(id=record.id,created_at=record.created_at,result=record.result)

@router.get('/{building_id}/schedules')
async def list_schedules(building_id:str,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    await get_building(building_id,user,db)
    records=(await db.execute(select(Schedule).where(Schedule.building_id==building_id).order_by(Schedule.created_at.desc()).limit(20))).scalars().all()
    return [dict(id=r.id,created_at=r.created_at,result=r.result) for r in records]
