from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict, model_validator

class BatteryConfig(BaseModel):
    nominal_capacity_kwh: float = Field(..., ge=0.0, le=1000.0)
    usable_capacity_kwh: float = Field(..., ge=0.0, le=1000.0)
    initial_soc_pct: float = Field(70.0, ge=0.0, le=100.0)
    minimum_soc_pct: float = Field(20.0, ge=0.0, le=100.0)
    max_charge_kw: float = Field(4.0, ge=0.0, le=100.0)
    max_discharge_kw: float = Field(4.0, ge=0.0, le=100.0)
    round_trip_efficiency: float = Field(0.90, gt=0.0, le=1.0)

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def validate_battery_invariants(self) -> "BatteryConfig":
        if self.usable_capacity_kwh > self.nominal_capacity_kwh:
            raise ValueError("usable_capacity_kwh cannot exceed nominal_capacity_kwh")
        if self.initial_soc_pct < self.minimum_soc_pct:
            raise ValueError("initial_soc_pct cannot be lower than minimum_soc_pct")
        return self

class BatteryUpdateConfig(BaseModel):
    nominal_capacity_kwh: Optional[float] = Field(None, ge=0.0, le=1000.0)
    usable_capacity_kwh: Optional[float] = Field(None, ge=0.0, le=1000.0)
    initial_soc_pct: Optional[float] = Field(None, ge=0.0, le=100.0)
    minimum_soc_pct: Optional[float] = Field(None, ge=0.0, le=100.0)
    max_charge_kw: Optional[float] = Field(None, ge=0.0, le=100.0)
    max_discharge_kw: Optional[float] = Field(None, ge=0.0, le=100.0)
    round_trip_efficiency: Optional[float] = Field(None, gt=0.0, le=1.0)

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def validate_update_invariants(self) -> "BatteryUpdateConfig":
        if (
            self.nominal_capacity_kwh is not None
            and self.usable_capacity_kwh is not None
            and self.usable_capacity_kwh > self.nominal_capacity_kwh
        ):
            raise ValueError("usable_capacity_kwh cannot exceed nominal_capacity_kwh")
        if (
            self.initial_soc_pct is not None
            and self.minimum_soc_pct is not None
            and self.initial_soc_pct < self.minimum_soc_pct
        ):
            raise ValueError("initial_soc_pct cannot be lower than minimum_soc_pct")
        return self

class BuildingCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    address: Optional[str] = None
    timezone: str = "Asia/Karachi"

    pv_capacity_kwp: float = Field(..., ge=0.0, le=500.0, description="Nameplate DC peak solar capacity")
    inverter_rating_kw: float = Field(..., ge=0.0, le=500.0, description="Nominal inverter AC output")

    # Contract format: nested battery object
    battery: Optional[BatteryConfig] = None

    # Alternative flat parameters
    battery_nominal_kwh: Optional[float] = Field(None, ge=0.0, le=1000.0)
    battery_usable_kwh: Optional[float] = Field(None, ge=0.0, le=1000.0)
    battery_initial_soc_pct: Optional[float] = Field(70.0, ge=0.0, le=100.0)
    battery_min_soc_pct: Optional[float] = Field(20.0, ge=0.0, le=100.0)
    battery_max_charge_kw: Optional[float] = Field(4.0, ge=0.0, le=100.0)
    battery_max_discharge_kw: Optional[float] = Field(4.0, ge=0.0, le=100.0)
    battery_round_trip_efficiency: Optional[float] = Field(0.90, gt=0.0, le=1.0)

    @model_validator(mode="before")
    @classmethod
    def normalize_battery_payload(cls, data: Any) -> Any:
        if isinstance(data, dict):
            bat = data.get("battery")
            if isinstance(bat, dict):
                data.setdefault("battery_nominal_kwh", bat.get("nominal_capacity_kwh", bat.get("nominal_kwh")))
                data.setdefault("battery_usable_kwh", bat.get("usable_capacity_kwh", bat.get("usable_kwh")))
                data.setdefault("battery_initial_soc_pct", bat.get("initial_soc_pct", 70.0))
                data.setdefault("battery_min_soc_pct", bat.get("minimum_soc_pct", bat.get("min_soc_pct", 20.0)))
                data.setdefault("battery_max_charge_kw", bat.get("max_charge_kw", 4.0))
                data.setdefault("battery_max_discharge_kw", bat.get("max_discharge_kw", 4.0))
                data.setdefault("battery_round_trip_efficiency", bat.get("round_trip_efficiency", 0.90))
        return data

    @model_validator(mode="after")
    def validate_invariants(self) -> "BuildingCreate":
        if self.battery_nominal_kwh is None or self.battery_usable_kwh is None:
            raise ValueError("Battery capacity parameters (nominal and usable) must be provided")
        if self.battery_usable_kwh > self.battery_nominal_kwh:
            raise ValueError(
                f"Battery usable capacity ({self.battery_usable_kwh} kWh) cannot exceed nominal capacity ({self.battery_nominal_kwh} kWh)"
            )
        if self.battery_initial_soc_pct is not None and self.battery_min_soc_pct is not None:
            if self.battery_initial_soc_pct < self.battery_min_soc_pct:
                raise ValueError(
                    f"Battery initial SoC ({self.battery_initial_soc_pct}%) cannot be lower than minimum SoC limit ({self.battery_min_soc_pct}%)"
                )
        return self

class BuildingUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    address: Optional[str] = None
    timezone: Optional[str] = None
    pv_capacity_kwp: Optional[float] = Field(None, ge=0.0, le=500.0)
    inverter_rating_kw: Optional[float] = Field(None, ge=0.0, le=500.0)

    # Optional nested battery update
    battery: Optional[BatteryUpdateConfig] = None

    # Alternative flat parameters
    battery_nominal_kwh: Optional[float] = Field(None, ge=0.0, le=1000.0)
    battery_usable_kwh: Optional[float] = Field(None, ge=0.0, le=1000.0)
    battery_initial_soc_pct: Optional[float] = Field(None, ge=0.0, le=100.0)
    battery_min_soc_pct: Optional[float] = Field(None, ge=0.0, le=100.0)
    battery_max_charge_kw: Optional[float] = Field(None, ge=0.0, le=100.0)
    battery_max_discharge_kw: Optional[float] = Field(None, ge=0.0, le=100.0)
    battery_round_trip_efficiency: Optional[float] = Field(None, gt=0.0, le=1.0)

    @model_validator(mode="before")
    @classmethod
    def normalize_update_payload(cls, data: Any) -> Any:
        if isinstance(data, dict):
            bat = data.get("battery")
            if isinstance(bat, dict):
                if "nominal_capacity_kwh" in bat or "nominal_kwh" in bat:
                    data.setdefault("battery_nominal_kwh", bat.get("nominal_capacity_kwh", bat.get("nominal_kwh")))
                if "usable_capacity_kwh" in bat or "usable_kwh" in bat:
                    data.setdefault("battery_usable_kwh", bat.get("usable_capacity_kwh", bat.get("usable_kwh")))
                if "initial_soc_pct" in bat:
                    data.setdefault("battery_initial_soc_pct", bat["initial_soc_pct"])
                if "minimum_soc_pct" in bat or "min_soc_pct" in bat:
                    data.setdefault("battery_min_soc_pct", bat.get("minimum_soc_pct", bat.get("min_soc_pct")))
                if "max_charge_kw" in bat:
                    data.setdefault("battery_max_charge_kw", bat["max_charge_kw"])
                if "max_discharge_kw" in bat:
                    data.setdefault("battery_max_discharge_kw", bat["max_discharge_kw"])
                if "round_trip_efficiency" in bat:
                    data.setdefault("battery_round_trip_efficiency", bat["round_trip_efficiency"])
        return data

    @model_validator(mode="after")
    def validate_invariants(self) -> "BuildingUpdate":
        if (
            self.battery_nominal_kwh is not None
            and self.battery_usable_kwh is not None
            and self.battery_usable_kwh > self.battery_nominal_kwh
        ):
            raise ValueError("Battery usable capacity cannot exceed nominal capacity")
        if (
            self.battery_initial_soc_pct is not None
            and self.battery_min_soc_pct is not None
            and self.battery_initial_soc_pct < self.battery_min_soc_pct
        ):
            raise ValueError("Battery initial SoC cannot be lower than minimum SoC limit")
        return self

class BuildingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    name: str
    address: Optional[str] = None
    timezone: str = "Asia/Karachi"
    pv_capacity_kwp: float
    inverter_rating_kw: float
    battery_nominal_kwh: float
    battery_usable_kwh: float
    battery_initial_soc_pct: float
    battery_min_soc_pct: float
    battery_max_charge_kw: float
    battery_max_discharge_kw: float
    battery_round_trip_efficiency: float
    battery: BatteryConfig
    owner_id: str
    organization_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def assemble_read_battery(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "battery" not in data and "battery_nominal_kwh" in data:
                data["battery"] = {
                    "nominal_capacity_kwh": data["battery_nominal_kwh"],
                    "usable_capacity_kwh": data["battery_usable_kwh"],
                    "initial_soc_pct": data.get("battery_initial_soc_pct", 70.0),
                    "minimum_soc_pct": data.get("battery_min_soc_pct", 20.0),
                    "max_charge_kw": data.get("battery_max_charge_kw", 4.0),
                    "max_discharge_kw": data.get("battery_max_discharge_kw", 4.0),
                    "round_trip_efficiency": data.get("battery_round_trip_efficiency", 0.90),
                }
            return data
        if hasattr(data, "battery_nominal_kwh"):
            return {
                "id": data.id,
                "name": data.name,
                "address": data.address,
                "timezone": data.timezone,
                "pv_capacity_kwp": data.pv_capacity_kwp,
                "inverter_rating_kw": data.inverter_rating_kw,
                "battery_nominal_kwh": data.battery_nominal_kwh,
                "battery_usable_kwh": data.battery_usable_kwh,
                "battery_initial_soc_pct": data.battery_initial_soc_pct,
                "battery_min_soc_pct": data.battery_min_soc_pct,
                "battery_max_charge_kw": data.battery_max_charge_kw,
                "battery_max_discharge_kw": data.battery_max_discharge_kw,
                "battery_round_trip_efficiency": data.battery_round_trip_efficiency,
                "battery": {
                    "nominal_capacity_kwh": data.battery_nominal_kwh,
                    "usable_capacity_kwh": data.battery_usable_kwh,
                    "initial_soc_pct": data.battery_initial_soc_pct,
                    "minimum_soc_pct": data.battery_min_soc_pct,
                    "max_charge_kw": data.battery_max_charge_kw,
                    "max_discharge_kw": data.battery_max_discharge_kw,
                    "round_trip_efficiency": data.battery_round_trip_efficiency,
                },
                "owner_id": data.owner_id,
                "organization_id": data.organization_id,
                "created_at": data.created_at,
                "updated_at": data.updated_at,
            }
        return data
