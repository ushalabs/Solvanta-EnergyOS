from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ....db.session import get_db
from ....models.building import Building
from ....models.user import User, UserRole
from ....schemas.building import BuildingCreate, BuildingRead, BuildingUpdate
from ...deps import get_current_user

router = APIRouter()

@router.post("/", response_model=BuildingRead, status_code=status.HTTP_201_CREATED)
async def create_building(
    payload: BuildingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register a new building digital twin associated with the authenticated user."""
    building = Building(
        **payload.model_dump(),
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
    """List buildings. Admins and Engineers view all or tenant-scoped, Customers view owned buildings."""
    if current_user.role in [UserRole.ADMIN, UserRole.ENGINEER]:
        query = select(Building)
    else:
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
    
    # Ownership verification
    if current_user.role not in [UserRole.ADMIN, UserRole.ENGINEER] and building.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this building")
    
    return building

@router.patch("/{building_id}", response_model=BuildingRead)
async def update_building(
    building_id: str,
    payload: BuildingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update building physical sizing, battery thresholds, or metadata."""
    result = await db.execute(select(Building).where(Building.id == building_id))
    building = result.scalars().first()
    if not building:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Building not found")
    
    if current_user.role not in [UserRole.ADMIN, UserRole.ENGINEER] and building.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this building")
    
    update_data = payload.model_dump(exclude_unset=True)
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
    
    if current_user.role not in [UserRole.ADMIN, UserRole.ENGINEER] and building.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this building")
    
    await db.delete(building)
    await db.commit()
    return None
