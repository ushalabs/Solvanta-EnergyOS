from fastapi import APIRouter,Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ....db.session import get_db
from ....models.user import User
from ....models.resilience import ResilienceRun
from ....schemas.simulation import SimulationInput
from ....services.resilience import compare_resilience
from ...deps import get_current_user
from .buildings import get_building
from .simulation import calculate
router=APIRouter()

@router.post('/{building_id}/resilience')
async def optimize(building_id:str,options:SimulationInput,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    snapshot,_=await calculate(building_id,options,user,db)
    result=compare_resilience(snapshot)
    run=ResilienceRun(building_id=building_id,snapshot=snapshot,result=result)
    db.add(run);await db.commit();await db.refresh(run)
    return dict(id=run.id,created_at=run.created_at,result=run.result)

@router.get('/{building_id}/resilience')
async def history(building_id:str,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    await get_building(building_id,user,db)
    runs=(await db.execute(select(ResilienceRun).where(ResilienceRun.building_id==building_id).order_by(ResilienceRun.created_at.desc()).limit(10))).scalars().all()
    return [dict(id=r.id,created_at=r.created_at,result=r.result) for r in runs]
