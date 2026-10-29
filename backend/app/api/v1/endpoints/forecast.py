from typing import Literal
from datetime import datetime,timezone
from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ....db.session import get_db
from ....models.user import User
from ....models.simulation import SimulationRun
from ....schemas.simulation import SimulationInput
from ....services.forecast import forecast
from ...deps import get_current_user
from .buildings import get_building
from .simulation import calculate
router=APIRouter()
class ForecastInput(SimulationInput):
    basis:Literal['configured','latest_run']='configured'

@router.post('/{building_id}/forecast')
async def project_forecast(building_id:str,data:ForecastInput,user:User=Depends(get_current_user),db:AsyncSession=Depends(get_db)):
    await get_building(building_id,user,db)
    options=SimulationInput(outages=data.outages,use_generator=data.use_generator)
    saved=None
    if data.basis=='latest_run':
        saved=(await db.execute(select(SimulationRun).where(SimulationRun.building_id==building_id).order_by(SimulationRun.created_at.desc()).limit(1))).scalar_one_or_none()
    if saved:
        snapshot=saved.snapshot
    else:
        snapshot,_=await calculate(building_id,options,user,db)
    try:
        result=forecast(snapshot,options,saved.result if saved else None,saved.id if saved else None)
    except ValueError as e:raise HTTPException(422,str(e)) from e
    result['generated_at']=datetime.now(timezone.utc)
    result['fallback_reason']='No saved simulation exists; using configured profiles.' if data.basis=='latest_run' and saved is None else None
    return result
