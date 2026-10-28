from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class BuildingBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    address: Optional[str] = None
    timezone: str = "Asia/Karachi"

    # Equipment Configuration
    pv_capacity_kwp: float = Field(..., ge=0.0, le=500.0, description="Nameplate DC peak solar capacity")
    inverter_rating_kw: float = Field(..., ge=0.0, le=500.0, description="Nominal inverter AC output")

    # Battery
    battery_nominal_kwh: float = Field(..., ge=0.0, le=1000.0)
    battery_usable_kwh: float = Field(..., ge=0.0, le=1000.0)
    battery_initial_soc_pct: float = Field(70.0, ge=0.0, le=100.0)
    battery_min_soc_pct: float = Field(20.0, ge=0.0, le=100.0)
    battery_max_charge_kw: float = Field(4.0, ge=0.0, le=100.0)
    battery_max_discharge_kw: float = Field(4.0, ge=0.0, le=100.0)
    battery_round_trip_efficiency: float = Field(0.90, ge=0.5, le=1.0)

class BuildingCreate(BuildingBase):
    pass

class BuildingUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    timezone: Optional[str] = None
    pv_capacity_kwp: Optional[float] = None
    inverter_rating_kw: Optional[float] = None
    battery_nominal_kwh: Optional[float] = None
    battery_usable_kwh: Optional[float] = None
    battery_initial_soc_pct: Optional[float] = None
    battery_min_soc_pct: Optional[float] = None
    battery_max_charge_kw: Optional[float] = None
    battery_max_discharge_kw: Optional[float] = None
    battery_round_trip_efficiency: Optional[float] = None

class BuildingRead(BuildingBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
    organization_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
