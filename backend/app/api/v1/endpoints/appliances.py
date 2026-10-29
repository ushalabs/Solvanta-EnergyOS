import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from ....db.session import get_db
from ....models.user import User
from ....models.appliance import Appliance, ScenarioSelection
from ....schemas.appliance import ApplianceInput, ScenarioInput
from ...deps import get_current_user
from .buildings import get_building

router=APIRouter()

def row(a: Appliance, selected: bool):
    return dict(id=a.id,building_id=a.building_id,name=a.name,rated_power_w=a.rated_power_w,
      priority=a.priority,critical=a.critical,flexible=a.flexible,required_runtime_min=a.required_runtime_min,
      earliest_min=a.earliest_min,latest_min=a.latest_min,interruptible=a.interruptible,
      max_interruptions=a.max_interruptions,selected=selected)

async def owned_appliance(building_id,appliance_id,user,db):
    await get_building(building_id,user,db)
    a=await db.get(Appliance,appliance_id)
    if not a or a.building_id!=building_id: raise HTTPException(404,'Appliance not found in this building')
    return a

@router.get('/{building_id}/appliances')
async def list_appliances(building_id: str,user: User=Depends(get_current_user),db: AsyncSession=Depends(get_db)):
    await get_building(building_id,user,db)
    appliances=(await db.execute(select(Appliance).where(Appliance.building_id==building_id).order_by(Appliance.created_at,Appliance.id))).scalars().all()
    selections=(await db.execute(select(ScenarioSelection).where(ScenarioSelection.building_id==building_id))).scalars().all()
    selected={s.appliance_id:s.selected for s in selections}
    items=[row(a,selected.get(a.id,False)) for a in appliances]
    selected_items=[a for a in items if a['selected']]
    return dict(items=items,summary=dict(requested_kw=round(sum(a['rated_power_w'] for a in selected_items)/1000,6),
      critical_kw=round(sum(a['rated_power_w'] for a in selected_items if a['critical'])/1000,6),
      selected_count=len(selected_items)),disclaimer='Scenario selection only; no physical device switching')

@router.post('/{building_id}/appliances',status_code=201)
async def create_appliance(building_id: str,data: ApplianceInput,user: User=Depends(get_current_user),db: AsyncSession=Depends(get_db)):
    await get_building(building_id,user,db)
    a=Appliance(id=str(uuid.uuid4()),building_id=building_id,**data.model_dump())
    db.add(a); await db.commit(); await db.refresh(a)
    return row(a,False)

@router.put('/{building_id}/appliances/{appliance_id}')
async def update_appliance(building_id: str,appliance_id: str,data: ApplianceInput,user: User=Depends(get_current_user),db: AsyncSession=Depends(get_db)):
    a=await owned_appliance(building_id,appliance_id,user,db)
    for k,v in data.model_dump().items(): setattr(a,k,v)
    await db.commit(); await db.refresh(a)
    s=(await db.execute(select(ScenarioSelection).where(ScenarioSelection.building_id==building_id,ScenarioSelection.appliance_id==a.id))).scalar_one_or_none()
    return row(a,s.selected if s else False)

@router.delete('/{building_id}/appliances/{appliance_id}',status_code=204)
async def remove_appliance(building_id: str,appliance_id: str,user: User=Depends(get_current_user),db: AsyncSession=Depends(get_db)):
    a=await owned_appliance(building_id,appliance_id,user,db)
    await db.delete(a);await db.commit()

@router.put('/{building_id}/appliances/{appliance_id}/selection')
async def choose_appliance(building_id: str,appliance_id: str,data: ScenarioInput,user: User=Depends(get_current_user),db: AsyncSession=Depends(get_db)):
    a=await owned_appliance(building_id,appliance_id,user,db)
    s=(await db.execute(select(ScenarioSelection).where(ScenarioSelection.building_id==building_id,ScenarioSelection.appliance_id==a.id))).scalar_one_or_none()
    if s is None:
        s=ScenarioSelection(id=str(uuid.uuid4()),building_id=building_id,appliance_id=a.id,selected=data.selected)
        db.add(s)
    else:s.selected=data.selected
    await db.commit()
    return await list_appliances(building_id,user,db)
