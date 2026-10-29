from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ....db.session import get_db
from ....models.roof import Roof
from ....models.user import User
from ....schemas.roof import RoofInput
from ....services.geometry import place_panels
from ...deps import get_current_user
from .buildings import get_building

router = APIRouter()


@router.get('/{building_id}/roof')
async def read_roof(building_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await get_building(building_id, user, db)
    roof = await db.get(Roof, building_id)
    if roof is None:
        raise HTTPException(404, 'No saved roof for this building')
    return {'geometry': roof.geometry, 'layout': place_panels(RoofInput(**roof.geometry))}


@router.post('/{building_id}/roof/preview')
async def preview_roof(building_id: str, data: RoofInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await get_building(building_id, user, db)
    try:
        return place_panels(data)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@router.put('/{building_id}/roof')
async def save_roof(building_id: str, data: RoofInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    layout = await preview_roof(building_id, data, user, db)
    roof = await db.get(Roof, building_id)
    if roof is None:
        roof = Roof(building_id=building_id)
        db.add(roof)
    roof.geometry = data.model_dump()
    await db.commit()
    return {'geometry': roof.geometry, 'layout': layout}
