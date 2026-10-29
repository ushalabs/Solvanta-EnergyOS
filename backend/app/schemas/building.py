from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict, model_validator

# -----------------------------------------------------------------------------
# 1. Solar PV Configuration Sub-Schema
# -----------------------------------------------------------------------------
class SolarConfig(BaseModel):
    pv_capacity_kwp: float = Field(..., ge=0.0, le=500.0, description="Total DC peak solar capacity in kWp")
    panel_tilt_deg: float = Field(25.0, ge=0.0, le=90.0, description="Panel tilt from horizontal (0=flat, 90=vertical)")
    panel_azimuth_deg: float = Field(180.0, ge=0.0, le=360.0, description="Panel azimuth angle (180=South, 90=East, 270=West)")
    system_losses_pct: float = Field(14.0, ge=0.0, le=50.0, description="Estimated DC/AC wiring, dust, mismatch losses")
    module_count: int = Field(18, ge=0, le=2000, description="Number of installed PV modules")
    module_wattage_w: float = Field(550.0, ge=0.0, le=1000.0, description="Individual module peak rating in Watts")

    model_config = ConfigDict(populate_by_name=True)

class SolarUpdateConfig(BaseModel):
    pv_capacity_kwp: Optional[float] = Field(None, ge=0.0, le=500.0)
    panel_tilt_deg: Optional[float] = Field(None, ge=0.0, le=90.0)
    panel_azimuth_deg: Optional[float] = Field(None, ge=0.0, le=360.0)
    system_losses_pct: Optional[float] = Field(None, ge=0.0, le=50.0)
    module_count: Optional[int] = Field(None, ge=0, le=2000)
    module_wattage_w: Optional[float] = Field(None, ge=0.0, le=1000.0)

    model_config = ConfigDict(populate_by_name=True)

# -----------------------------------------------------------------------------
# 2. Inverter Configuration Sub-Schema
# -----------------------------------------------------------------------------
class InverterConfig(BaseModel):
    rating_kw: float = Field(..., ge=0.0, le=500.0, description="Nominal continuous AC output in kW")
    efficiency_pct: float = Field(96.0, gt=50.0, le=100.0, description="Peak inverter efficiency percentage")
    inverter_type: str = Field("hybrid", max_length=32, description="hybrid, string, or microinverter")

    model_config = ConfigDict(populate_by_name=True)

class InverterUpdateConfig(BaseModel):
    rating_kw: Optional[float] = Field(None, ge=0.0, le=500.0)
    efficiency_pct: Optional[float] = Field(None, gt=50.0, le=100.0)
    inverter_type: Optional[str] = Field(None, max_length=32)

    model_config = ConfigDict(populate_by_name=True)

# -----------------------------------------------------------------------------
# 3. Battery Storage Configuration Sub-Schema
# -----------------------------------------------------------------------------
class BatteryConfig(BaseModel):
    nominal_capacity_kwh: float = Field(..., ge=0.0, le=1000.0)
    usable_capacity_kwh: float = Field(..., ge=0.0, le=1000.0)
    initial_soc_pct: float = Field(70.0, ge=0.0, le=100.0)
    minimum_soc_pct: float = Field(20.0, ge=0.0, le=100.0)
    max_charge_kw: float = Field(4.0, ge=0.0, le=100.0)
    max_discharge_kw: float = Field(4.0, ge=0.0, le=100.0)
    round_trip_efficiency: float = Field(0.90, gt=0.0, le=1.0)
    chemistry: str = Field("LFP", max_length=32, description="Battery chemistry: LFP (LiFePO4) or NMC")

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
    chemistry: Optional[str] = Field(None, max_length=32)

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

# -----------------------------------------------------------------------------
# 4. Backup Generator Configuration Sub-Schema
# -----------------------------------------------------------------------------
class GeneratorConfig(BaseModel):
    enabled: bool = Field(False, description="Whether backup generator is installed and available")
    rating_kw: float = Field(0.0, ge=0.0, le=500.0, description="Rated continuous electrical output in kW")
    fuel_type: Optional[str] = Field(None, max_length=32, description="diesel, petrol, or natural_gas")
    fuel_consumption_l_per_kwh: float = Field(0.35, ge=0.0, le=5.0, description="Specific fuel consumption in L/kWh")
    min_runtime_min: int = Field(15, ge=0, le=1440, description="Minimum engine run duration to prevent thermal cycling")

    model_config = ConfigDict(populate_by_name=True)

class GeneratorUpdateConfig(BaseModel):
    enabled: Optional[bool] = None
    rating_kw: Optional[float] = Field(None, ge=0.0, le=500.0)
    fuel_type: Optional[str] = Field(None, max_length=32)
    fuel_consumption_l_per_kwh: Optional[float] = Field(None, ge=0.0, le=5.0)
    min_runtime_min: Optional[int] = Field(None, ge=0, le=1440)

    model_config = ConfigDict(populate_by_name=True)

# -----------------------------------------------------------------------------
# 5. Grid Interconnection Sub-Schema
# -----------------------------------------------------------------------------
class GridConfig(BaseModel):
    connection_type: str = Field("single_phase", max_length=32, description="single_phase or three_phase")
    import_limit_kw: float = Field(15.0, ge=0.0, le=1000.0, description="Sanctioned grid import capacity in kW")
    export_limit_kw: float = Field(10.0, ge=0.0, le=1000.0, description="Approved net metering export limit in kW")
    has_net_metering: bool = Field(True, description="Whether bidirectional grid export credit is active")

    model_config = ConfigDict(populate_by_name=True)

class GridUpdateConfig(BaseModel):
    connection_type: Optional[str] = Field(None, max_length=32)
    import_limit_kw: Optional[float] = Field(None, ge=0.0, le=1000.0)
    export_limit_kw: Optional[float] = Field(None, ge=0.0, le=1000.0)
    has_net_metering: Optional[bool] = None

    model_config = ConfigDict(populate_by_name=True)

# -----------------------------------------------------------------------------
# 6. Building Create, Update & Read Schemas
# -----------------------------------------------------------------------------
class BuildingCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    address: Optional[str] = None
    timezone: str = "Asia/Karachi"

    pv_capacity_kwp: float = Field(..., ge=0.0, le=500.0, description="Nameplate DC peak solar capacity")
    inverter_rating_kw: float = Field(..., ge=0.0, le=500.0, description="Nominal inverter AC output")

    # Optional sub-schemas
    solar: Optional[SolarConfig] = None
    inverter: Optional[InverterConfig] = None
    battery: Optional[BatteryConfig] = None
    generator: Optional[GeneratorConfig] = None
    grid: Optional[GridConfig] = None

    # Alternative / flat equipment parameters
    pv_panel_tilt_deg: float = Field(25.0, ge=0.0, le=90.0)
    pv_panel_azimuth_deg: float = Field(180.0, ge=0.0, le=360.0)
    pv_system_losses_pct: float = Field(14.0, ge=0.0, le=50.0)
    pv_module_count: int = Field(18, ge=0, le=2000)
    pv_module_wattage_w: float = Field(550.0, ge=0.0, le=1000.0)

    inverter_efficiency_pct: float = Field(96.0, gt=50.0, le=100.0)
    inverter_type: str = Field("hybrid", max_length=32)

    battery_nominal_kwh: Optional[float] = Field(None, ge=0.0, le=1000.0)
    battery_usable_kwh: Optional[float] = Field(None, ge=0.0, le=1000.0)
    battery_initial_soc_pct: float = Field(70.0, ge=0.0, le=100.0)
    battery_min_soc_pct: float = Field(20.0, ge=0.0, le=100.0)
    battery_max_charge_kw: float = Field(4.0, ge=0.0, le=100.0)
    battery_max_discharge_kw: float = Field(4.0, ge=0.0, le=100.0)
    battery_round_trip_efficiency: float = Field(0.90, gt=0.0, le=1.0)
    battery_chemistry: str = Field("LFP", max_length=32)

    has_generator: bool = Field(False)
    generator_rating_kw: float = Field(0.0, ge=0.0, le=500.0)
    generator_fuel_type: Optional[str] = Field(None, max_length=32)
    generator_fuel_consumption_l_per_kwh: float = Field(0.35, ge=0.0, le=5.0)
    generator_min_runtime_min: int = Field(15, ge=0, le=1440)

    grid_connection_type: str = Field("single_phase", max_length=32)
    grid_import_limit_kw: float = Field(15.0, ge=0.0, le=1000.0)
    grid_export_limit_kw: float = Field(10.0, ge=0.0, le=1000.0)
    has_net_metering: bool = Field(True)

    @model_validator(mode="before")
    @classmethod
    def normalize_payload(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Normalize battery
            bat = data.get("battery")
            if isinstance(bat, dict):
                data.setdefault("battery_nominal_kwh", bat.get("nominal_capacity_kwh", bat.get("nominal_kwh")))
                data.setdefault("battery_usable_kwh", bat.get("usable_capacity_kwh", bat.get("usable_kwh")))
                data.setdefault("battery_initial_soc_pct", bat.get("initial_soc_pct", 70.0))
                data.setdefault("battery_min_soc_pct", bat.get("minimum_soc_pct", bat.get("min_soc_pct", 20.0)))
                data.setdefault("battery_max_charge_kw", bat.get("max_charge_kw", 4.0))
                data.setdefault("battery_max_discharge_kw", bat.get("max_discharge_kw", 4.0))
                data.setdefault("battery_round_trip_efficiency", bat.get("round_trip_efficiency", 0.90))
                data.setdefault("battery_chemistry", bat.get("chemistry", "LFP"))
            
            # Normalize solar
            sol = data.get("solar")
            if isinstance(sol, dict):
                if "pv_capacity_kwp" in sol:
                    data.setdefault("pv_capacity_kwp", sol["pv_capacity_kwp"])
                data.setdefault("pv_panel_tilt_deg", sol.get("panel_tilt_deg", 25.0))
                data.setdefault("pv_panel_azimuth_deg", sol.get("panel_azimuth_deg", 180.0))
                data.setdefault("pv_system_losses_pct", sol.get("system_losses_pct", 14.0))
                data.setdefault("pv_module_count", sol.get("module_count", 18))
                data.setdefault("pv_module_wattage_w", sol.get("module_wattage_w", 550.0))

            # Normalize inverter
            inv = data.get("inverter")
            if isinstance(inv, dict):
                if "rating_kw" in inv:
                    data.setdefault("inverter_rating_kw", inv["rating_kw"])
                data.setdefault("inverter_efficiency_pct", inv.get("efficiency_pct", 96.0))
                data.setdefault("inverter_type", inv.get("inverter_type", "hybrid"))

            # Normalize generator
            gen = data.get("generator")
            if isinstance(gen, dict):
                data.setdefault("has_generator", gen.get("enabled", gen.get("has_generator", False)))
                data.setdefault("generator_rating_kw", gen.get("rating_kw", gen.get("generator_rating_kw", 0.0)))
                data.setdefault("generator_fuel_type", gen.get("fuel_type", gen.get("generator_fuel_type")))
                data.setdefault("generator_fuel_consumption_l_per_kwh", gen.get("fuel_consumption_l_per_kwh", 0.35))
                data.setdefault("generator_min_runtime_min", gen.get("min_runtime_min", 15))

            # Normalize grid
            grd = data.get("grid")
            if isinstance(grd, dict):
                data.setdefault("grid_connection_type", grd.get("connection_type", "single_phase"))
                data.setdefault("grid_import_limit_kw", grd.get("import_limit_kw", 15.0))
                data.setdefault("grid_export_limit_kw", grd.get("export_limit_kw", 10.0))
                data.setdefault("has_net_metering", grd.get("has_net_metering", True))

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

    # Optional nested updates
    solar: Optional[SolarUpdateConfig] = None
    inverter: Optional[InverterUpdateConfig] = None
    battery: Optional[BatteryUpdateConfig] = None
    generator: Optional[GeneratorUpdateConfig] = None
    grid: Optional[GridUpdateConfig] = None

    # Flat parameters
    pv_panel_tilt_deg: Optional[float] = Field(None, ge=0.0, le=90.0)
    pv_panel_azimuth_deg: Optional[float] = Field(None, ge=0.0, le=360.0)
    pv_system_losses_pct: Optional[float] = Field(None, ge=0.0, le=50.0)
    pv_module_count: Optional[int] = Field(None, ge=0, le=2000)
    pv_module_wattage_w: Optional[float] = Field(None, ge=0.0, le=1000.0)

    inverter_efficiency_pct: Optional[float] = Field(None, gt=50.0, le=100.0)
    inverter_type: Optional[str] = Field(None, max_length=32)

    battery_nominal_kwh: Optional[float] = Field(None, ge=0.0, le=1000.0)
    battery_usable_kwh: Optional[float] = Field(None, ge=0.0, le=1000.0)
    battery_initial_soc_pct: Optional[float] = Field(None, ge=0.0, le=100.0)
    battery_min_soc_pct: Optional[float] = Field(None, ge=0.0, le=100.0)
    battery_max_charge_kw: Optional[float] = Field(None, ge=0.0, le=100.0)
    battery_max_discharge_kw: Optional[float] = Field(None, ge=0.0, le=100.0)
    battery_round_trip_efficiency: Optional[float] = Field(None, gt=0.0, le=1.0)
    battery_chemistry: Optional[str] = Field(None, max_length=32)

    has_generator: Optional[bool] = None
    generator_rating_kw: Optional[float] = Field(None, ge=0.0, le=500.0)
    generator_fuel_type: Optional[str] = Field(None, max_length=32)
    generator_fuel_consumption_l_per_kwh: Optional[float] = Field(None, ge=0.0, le=5.0)
    generator_min_runtime_min: Optional[int] = Field(None, ge=0, le=1440)

    grid_connection_type: Optional[str] = Field(None, max_length=32)
    grid_import_limit_kw: Optional[float] = Field(None, ge=0.0, le=1000.0)
    grid_export_limit_kw: Optional[float] = Field(None, ge=0.0, le=1000.0)
    has_net_metering: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_update_payload(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Battery normalization
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
                if "chemistry" in bat:
                    data.setdefault("battery_chemistry", bat["chemistry"])

            # Solar normalization
            sol = data.get("solar")
            if isinstance(sol, dict):
                if "pv_capacity_kwp" in sol:
                    data.setdefault("pv_capacity_kwp", sol["pv_capacity_kwp"])
                if "panel_tilt_deg" in sol:
                    data.setdefault("pv_panel_tilt_deg", sol["panel_tilt_deg"])
                if "panel_azimuth_deg" in sol:
                    data.setdefault("pv_panel_azimuth_deg", sol["panel_azimuth_deg"])
                if "system_losses_pct" in sol:
                    data.setdefault("pv_system_losses_pct", sol["system_losses_pct"])
                if "module_count" in sol:
                    data.setdefault("pv_module_count", sol["module_count"])
                if "module_wattage_w" in sol:
                    data.setdefault("pv_module_wattage_w", sol["module_wattage_w"])

            # Inverter normalization
            inv = data.get("inverter")
            if isinstance(inv, dict):
                if "rating_kw" in inv:
                    data.setdefault("inverter_rating_kw", inv["rating_kw"])
                if "efficiency_pct" in inv:
                    data.setdefault("inverter_efficiency_pct", inv["efficiency_pct"])
                if "inverter_type" in inv:
                    data.setdefault("inverter_type", inv["inverter_type"])

            # Generator normalization
            gen = data.get("generator")
            if isinstance(gen, dict):
                if "enabled" in gen:
                    data.setdefault("has_generator", gen["enabled"])
                elif "has_generator" in gen:
                    data.setdefault("has_generator", gen["has_generator"])
                if "rating_kw" in gen:
                    data.setdefault("generator_rating_kw", gen["rating_kw"])
                if "fuel_type" in gen:
                    data.setdefault("generator_fuel_type", gen["fuel_type"])
                if "fuel_consumption_l_per_kwh" in gen:
                    data.setdefault("generator_fuel_consumption_l_per_kwh", gen["fuel_consumption_l_per_kwh"])
                if "min_runtime_min" in gen:
                    data.setdefault("generator_min_runtime_min", gen["min_runtime_min"])

            # Grid normalization
            grd = data.get("grid")
            if isinstance(grd, dict):
                if "connection_type" in grd:
                    data.setdefault("grid_connection_type", grd["connection_type"])
                if "import_limit_kw" in grd:
                    data.setdefault("grid_import_limit_kw", grd["import_limit_kw"])
                if "export_limit_kw" in grd:
                    data.setdefault("grid_export_limit_kw", grd["export_limit_kw"])
                if "has_net_metering" in grd:
                    data.setdefault("has_net_metering", grd["has_net_metering"])

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

    # Flat equipment properties
    pv_capacity_kwp: float
    pv_panel_tilt_deg: float = 25.0
    pv_panel_azimuth_deg: float = 180.0
    pv_system_losses_pct: float = 14.0
    pv_module_count: int = 18
    pv_module_wattage_w: float = 550.0

    inverter_rating_kw: float
    inverter_efficiency_pct: float = 96.0
    inverter_type: str = "hybrid"

    battery_nominal_kwh: float
    battery_usable_kwh: float
    battery_initial_soc_pct: float
    battery_min_soc_pct: float
    battery_max_charge_kw: float
    battery_max_discharge_kw: float
    battery_round_trip_efficiency: float
    battery_chemistry: str = "LFP"

    has_generator: bool = False
    generator_rating_kw: float = 0.0
    generator_fuel_type: Optional[str] = None
    generator_fuel_consumption_l_per_kwh: float = 0.35
    generator_min_runtime_min: int = 15

    grid_connection_type: str = "single_phase"
    grid_import_limit_kw: float = 15.0
    grid_export_limit_kw: float = 10.0
    has_net_metering: bool = True

    # Structured sub-schemas
    solar: SolarConfig
    inverter: InverterConfig
    battery: BatteryConfig
    generator: GeneratorConfig
    grid: GridConfig

    owner_id: str
    organization_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def assemble_read_structures(cls, data: Any) -> Any:
        if hasattr(data, "id"):
            pv_cap = getattr(data, "pv_capacity_kwp", 10.0)
            tilt = getattr(data, "pv_panel_tilt_deg", 25.0)
            azimuth = getattr(data, "pv_panel_azimuth_deg", 180.0)
            losses = getattr(data, "pv_system_losses_pct", 14.0)
            mod_count = getattr(data, "pv_module_count", 18)
            mod_watt = getattr(data, "pv_module_wattage_w", 550.0)

            inv_kw = getattr(data, "inverter_rating_kw", 8.0)
            inv_eff = getattr(data, "inverter_efficiency_pct", 96.0)
            inv_type = getattr(data, "inverter_type", "hybrid")

            bat_nom = getattr(data, "battery_nominal_kwh", 10.0)
            bat_usable = getattr(data, "battery_usable_kwh", 9.0)
            bat_init = getattr(data, "battery_initial_soc_pct", 70.0)
            bat_min = getattr(data, "battery_min_soc_pct", 20.0)
            bat_chg = getattr(data, "battery_max_charge_kw", 4.0)
            bat_dischg = getattr(data, "battery_max_discharge_kw", 4.0)
            bat_eff = getattr(data, "battery_round_trip_efficiency", 0.90)
            bat_chem = getattr(data, "battery_chemistry", "LFP")

            has_gen = getattr(data, "has_generator", False)
            gen_kw = getattr(data, "generator_rating_kw", 0.0)
            gen_fuel = getattr(data, "generator_fuel_type", None)
            gen_sfc = getattr(data, "generator_fuel_consumption_l_per_kwh", 0.35)
            gen_min = getattr(data, "generator_min_runtime_min", 15)

            grid_type = getattr(data, "grid_connection_type", "single_phase")
            grid_import = getattr(data, "grid_import_limit_kw", 15.0)
            grid_export = getattr(data, "grid_export_limit_kw", 10.0)
            grid_net = getattr(data, "has_net_metering", True)

            return {
                "id": data.id,
                "name": data.name,
                "address": data.address,
                "timezone": data.timezone,
                "pv_capacity_kwp": pv_cap,
                "pv_panel_tilt_deg": tilt,
                "pv_panel_azimuth_deg": azimuth,
                "pv_system_losses_pct": losses,
                "pv_module_count": mod_count,
                "pv_module_wattage_w": mod_watt,
                "inverter_rating_kw": inv_kw,
                "inverter_efficiency_pct": inv_eff,
                "inverter_type": inv_type,
                "battery_nominal_kwh": bat_nom,
                "battery_usable_kwh": bat_usable,
                "battery_initial_soc_pct": bat_init,
                "battery_min_soc_pct": bat_min,
                "battery_max_charge_kw": bat_chg,
                "battery_max_discharge_kw": bat_dischg,
                "battery_round_trip_efficiency": bat_eff,
                "battery_chemistry": bat_chem,
                "has_generator": has_gen,
                "generator_rating_kw": gen_kw,
                "generator_fuel_type": gen_fuel,
                "generator_fuel_consumption_l_per_kwh": gen_sfc,
                "generator_min_runtime_min": gen_min,
                "grid_connection_type": grid_type,
                "grid_import_limit_kw": grid_import,
                "grid_export_limit_kw": grid_export,
                "has_net_metering": grid_net,
                "solar": {
                    "pv_capacity_kwp": pv_cap,
                    "panel_tilt_deg": tilt,
                    "panel_azimuth_deg": azimuth,
                    "system_losses_pct": losses,
                    "module_count": mod_count,
                    "module_wattage_w": mod_watt,
                },
                "inverter": {
                    "rating_kw": inv_kw,
                    "efficiency_pct": inv_eff,
                    "inverter_type": inv_type,
                },
                "battery": {
                    "nominal_capacity_kwh": bat_nom,
                    "usable_capacity_kwh": bat_usable,
                    "initial_soc_pct": bat_init,
                    "minimum_soc_pct": bat_min,
                    "max_charge_kw": bat_chg,
                    "max_discharge_kw": bat_dischg,
                    "round_trip_efficiency": bat_eff,
                    "chemistry": bat_chem,
                },
                "generator": {
                    "enabled": has_gen,
                    "rating_kw": gen_kw,
                    "fuel_type": gen_fuel,
                    "fuel_consumption_l_per_kwh": gen_sfc,
                    "min_runtime_min": gen_min,
                },
                "grid": {
                    "connection_type": grid_type,
                    "import_limit_kw": grid_import,
                    "export_limit_kw": grid_export,
                    "has_net_metering": grid_net,
                },
                "owner_id": data.owner_id,
                "organization_id": data.organization_id,
                "created_at": data.created_at,
                "updated_at": data.updated_at,
            }
        return data


# -----------------------------------------------------------------------------
# 7. Dedicated Equipment Summary Schema (Phase 3 Primitives)
# -----------------------------------------------------------------------------
class EquipmentSummary(BaseModel):
    building_id: str
    building_name: str
    solar: SolarConfig
    inverter: InverterConfig
    battery: BatteryConfig
    generator: GeneratorConfig
    grid: GridConfig
    is_valid: bool = True
    validation_messages: list[str] = []
