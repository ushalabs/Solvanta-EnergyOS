from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from ....db.session import get_db
from ....models.building import Building
from ....models.user import User, UserRole
from ....schemas.building import BuildingCreate, BuildingRead, BuildingUpdate
from ...deps import get_current_user

router = APIRouter()

def check_building_access(user: User, building: Building) -> None:
    """Enforces multi-tenant organization boundaries and customer ownership isolation."""
    # 1. System administrators (is_superuser) have global platform access
    if user.is_superuser:
        return

    # 2. Direct owner always has access to their own buildings
    if building.owner_id == user.id:
        return

    # 3. Organization engineers/admins only have access to buildings in their organization
    if user.role in [UserRole.ADMIN, UserRole.ENGINEER, UserRole.TECHNICIAN]:
        if user.organization_id is not None and building.organization_id == user.organization_id:
            return

    # Denied: Cross-tenant or unauthorized customer access
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied to this building digital twin."
    )

@router.post("/", response_model=BuildingRead, status_code=status.HTTP_201_CREATED)
async def create_building(
    payload: BuildingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register a new building digital twin associated with the authenticated user."""
    create_dict = payload.model_dump(exclude={"battery"})
    building = Building(
        **create_dict,
        owner_id=current_user.id,
        organization_id=current_user.organization_id,
    )
    db.add(building)
    await db.commit()
    await db.refresh(building)
    return building

@router.get("/", response_model=List[BuildingRead])
async def list_buildings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List buildings scoped strictly by organization or customer ownership."""
    if current_user.is_superuser:
        query = select(Building)
    elif current_user.role in [UserRole.ADMIN, UserRole.ENGINEER, UserRole.TECHNICIAN]:
        if current_user.organization_id is not None:
            query = select(Building).where(
                or_(
                    Building.organization_id == current_user.organization_id,
                    Building.owner_id == current_user.id
                )
            )
        else:
            query = select(Building).where(Building.owner_id == current_user.id)
    else:
        # Customers only see buildings they own
        query = select(Building).where(Building.owner_id == current_user.id)
    
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{building_id}", response_model=BuildingRead)
async def get_building(
    building_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve specific building digital twin configuration."""
    result = await db.execute(select(Building).where(Building.id == building_id))
    building = result.scalars().first()
    if not building:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Building not found")
    
    check_building_access(current_user, building)
    return building

@router.patch("/{building_id}", response_model=BuildingRead)
async def update_building(
    building_id: str,
    payload: BuildingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update building physical sizing, battery thresholds, or metadata with consistency checks."""
    result = await db.execute(select(Building).where(Building.id == building_id))
    building = result.scalars().first()
    if not building:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Building not found")
    
    check_building_access(current_user, building)
    
    update_data = payload.model_dump(exclude_unset=True, exclude={"battery"})

    # Validate combined state invariants
    effective_nominal = update_data.get("battery_nominal_kwh", building.battery_nominal_kwh)
    effective_usable = update_data.get("battery_usable_kwh", building.battery_usable_kwh)
    effective_initial = update_data.get("battery_initial_soc_pct", building.battery_initial_soc_pct)
    effective_min = update_data.get("battery_min_soc_pct", building.battery_min_soc_pct)

    if effective_usable > effective_nominal:
        raise HTTPException(
            status_code=422,
            detail=f"Battery usable capacity ({effective_usable} kWh) cannot exceed nominal capacity ({effective_nominal} kWh)",
        )
    if effective_initial < effective_min:
        raise HTTPException(
            status_code=422,
            detail=f"Battery initial SoC ({effective_initial}%) cannot be lower than minimum SoC limit ({effective_min}%)",
        )

    for field, value in update_data.items():
        setattr(building, field, value)
    
    await db.commit()
    await db.refresh(building)
    return building

@router.delete("/{building_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_building(
    building_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a building digital twin."""
    result = await db.execute(select(Building).where(Building.id == building_id))
    building = result.scalars().first()
    if not building:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Building not found")
    
    check_building_access(current_user, building)
    
    await db.delete(building)
    await db.commit()
    return None
