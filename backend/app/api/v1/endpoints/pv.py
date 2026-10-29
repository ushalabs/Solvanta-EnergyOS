from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ....db.session import get_db
from ....models.user import User
from ....models.pv import PVDesign
from ....schemas.pv import PVInput, PVProfile
from ....services.pv import estimate_pv
from ...deps import get_current_user
from .buildings import get_building
from .roofs import read_roof

router = APIRouter()

@router.post('/{building_id}/pv/preview', response_model=PVProfile)
async def preview_pv(building_id: str, data: PVInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    roof = await read_roof(building_id,user,db)
    try:
        return estimate_pv(roof['layout']['panel_count'], data)
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc

@router.get('/{building_id}/pv')
async def read_pv(building_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    building = await get_building(building_id,user,db)
    design = await db.get(PVDesign,building_id)
    data = PVInput(**design.parameters) if design else PVInput(
        module_wattage_w=building.pv_module_wattage_w or 550, inverter_kw=building.inverter_rating_kw or 8,
        tilt_deg=building.pv_panel_tilt_deg,azimuth_deg=building.pv_panel_azimuth_deg,
        losses_pct=building.pv_system_losses_pct,inverter_efficiency_pct=building.inverter_efficiency_pct)
    return {'parameters':data,'saved':design is not None,'profile':await preview_pv(building_id,data,user,db)}

@router.put('/{building_id}/pv')
async def save_pv(building_id: str, data: PVInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    profile = await preview_pv(building_id,data,user,db)
    design = await db.get(PVDesign,building_id)
    if design is None:
        design=PVDesign(building_id=building_id)
        db.add(design)
    design.parameters=data.model_dump()
    await db.commit()
    return {'parameters':data,'saved':True,'profile':profile}
