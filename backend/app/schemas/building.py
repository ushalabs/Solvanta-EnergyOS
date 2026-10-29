from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict, model_validator


def check_field_conflict(flat_val: Any, nested_val: Any, field_name: str, tolerance: float = 1e-4) -> None:
    """Detect conflicts between flat and nested sub-schema values instead of silently overriding."""
    if flat_val is not None and nested_val is not None:
        if isinstance(flat_val, (int, float)) and isinstance(nested_val, (int, float)):
            if abs(float(flat_val) - float(nested_val)) > tolerance:
                raise ValueError(
                    f"Conflicting values provided for '{field_name}': flat field has {flat_val} but nested field has {nested_val}"
                )
        elif flat_val != nested_val:
            raise ValueError(
                f"Conflicting values provided for '{field_name}': flat field has '{flat_val}' but nested field has '{nested_val}'"
            )


# -----------------------------------------------------------------------------
# 1. Solar PV Configuration Sub-Schema
# -----------------------------------------------------------------------------
class SolarConfig(BaseModel):
    pv_capacity_kwp: float = Field(..., ge=0.0, le=500.0, description="Total DC peak solar capacity in kWp")
    panel_tilt_deg: float = Field(25.0, ge=0.0, le=90.0, description="Panel tilt from horizontal (0=flat, 90=vertical)")
    panel_azimuth_deg: float = Field(180.0, ge=0.0, le=360.0, description="Panel azimuth angle (180=South, 90=East, 270=West)")
    system_losses_pct: float = Field(14.0, ge=0.0, le=50.0, description="Estimated DC/AC wiring, dust, mismatch losses")
    module_count: Optional[int] = Field(None, ge=0, le=2000, description="Number of installed PV modules")
    module_wattage_w: Optional[float] = Field(None, ge=0.0, le=1000.0, description="Individual module peak rating in Watts")

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def validate_solar_consistency(self) -> "SolarConfig":
        if self.module_count is None and self.module_wattage_w is None:
            if self.pv_capacity_kwp > 0:
                self.module_count = max(1, round((self.pv_capacity_kwp * 1000.0) / 550.0))
                self.module_wattage_w = round((self.pv_capacity_kwp * 1000.0) / self.module_count, 1)
            else:
                self.module_count = 0
                self.module_wattage_w = 0.0
        elif self.module_count is not None and self.module_wattage_w is None:
            if self.module_count > 0:
                self.module_wattage_w = round((self.pv_capacity_kwp * 1000.0) / self.module_count, 1)
            else:
                self.module_wattage_w = 0.0
        elif self.module_count is None and self.module_wattage_w is not None:
            if self.module_wattage_w > 0:
                self.module_count = max(1, round((self.pv_capacity_kwp * 1000.0) / self.module_wattage_w))
            else:
                self.module_count = 0
        elif self.module_count > 0 and self.module_wattage_w > 0:
            calc_kwp = round((self.module_count * self.module_wattage_w) / 1000.0, 3)
            tolerance = max(0.5, 0.05 * self.pv_capacity_kwp)
            if abs(self.pv_capacity_kwp - calc_kwp) > tolerance:
                raise ValueError(
                    f"PV capacity mismatch: declared pv_capacity_kwp ({self.pv_capacity_kwp} kWp) is inconsistent with module count {self.module_count} × {self.module_wattage_w}W = {calc_kwp} kWp (exceeds allowable tolerance of ±5% or ±0.5 kWp)"
                )
        return self


class SolarUpdateConfig(BaseModel):
    pv_capacity_kwp: Optional[float] = Field(None, ge=0.0, le=500.0)
    panel_tilt_deg: Optional[float] = Field(None, ge=0.0, le=90.0)
    panel_azimuth_deg: Optional[float] = Field(None, ge=0.0, le=360.0)
    system_losses_pct: Optional[float] = Field(None, ge=0.0, le=50.0)
    module_count: Optional[int] = Field(None, ge=0, le=2000)
    module_wattage_w: Optional[float] = Field(None, ge=0.0, le=1000.0)

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def validate_solar_update_consistency(self) -> "SolarUpdateConfig":
        if (
            self.pv_capacity_kwp is not None
            and self.module_count is not None
            and self.module_wattage_w is not None
            and self.module_count > 0
            and self.module_wattage_w > 0
        ):
            calc_kwp = round((self.module_count * self.module_wattage_w) / 1000.0, 3)
            tolerance = max(0.5, 0.05 * self.pv_capacity_kwp)
            if abs(self.pv_capacity_kwp - calc_kwp) > tolerance:
                raise ValueError(
                    f"PV capacity mismatch: declared pv_capacity_kwp ({self.pv_capacity_kwp} kWp) is inconsistent with module count {self.module_count} × {self.module_wattage_w}W = {calc_kwp} kWp (exceeds allowable tolerance of ±5% or ±0.5 kWp)"
                )
        return self

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

    @model_validator(mode="after")
    def validate_generator(self) -> "GeneratorConfig":
        if self.enabled and self.rating_kw <= 0.0:
            raise ValueError("Enabled generator must have a rating greater than 0 kW (rating_kw > 0)")
        return self

class GeneratorUpdateConfig(BaseModel):
    enabled: Optional[bool] = None
    rating_kw: Optional[float] = Field(None, ge=0.0, le=500.0)
    fuel_type: Optional[str] = Field(None, max_length=32)
    fuel_consumption_l_per_kwh: Optional[float] = Field(None, ge=0.0, le=5.0)
    min_runtime_min: Optional[int] = Field(None, ge=0, le=1440)

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def validate_generator_update(self) -> "GeneratorUpdateConfig":
        if self.enabled is True and self.rating_kw is not None and self.rating_kw <= 0.0:
            raise ValueError("Enabled generator must have a rating greater than 0 kW (rating_kw > 0)")
        return self

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
    pv_module_count: Optional[int] = Field(None, ge=0, le=2000)
    pv_module_wattage_w: Optional[float] = Field(None, ge=0.0, le=1000.0)

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
            # 1. Normalize battery
            bat = data.get("battery")
            if isinstance(bat, dict):
                nom = bat.get("nominal_capacity_kwh", bat.get("nominal_kwh"))
                check_field_conflict(data.get("battery_nominal_kwh"), nom, "battery_nominal_kwh")
                if nom is not None:
                    data["battery_nominal_kwh"] = nom

                usa = bat.get("usable_capacity_kwh", bat.get("usable_kwh"))
                check_field_conflict(data.get("battery_usable_kwh"), usa, "battery_usable_kwh")
                if usa is not None:
                    data["battery_usable_kwh"] = usa

                init_soc = bat.get("initial_soc_pct")
                check_field_conflict(data.get("battery_initial_soc_pct"), init_soc, "battery_initial_soc_pct")
                if init_soc is not None:
                    data["battery_initial_soc_pct"] = init_soc

                min_soc = bat.get("minimum_soc_pct", bat.get("min_soc_pct"))
                check_field_conflict(data.get("battery_min_soc_pct"), min_soc, "battery_min_soc_pct")
                if min_soc is not None:
                    data["battery_min_soc_pct"] = min_soc

                mc = bat.get("max_charge_kw")
                check_field_conflict(data.get("battery_max_charge_kw"), mc, "battery_max_charge_kw")
                if mc is not None:
                    data["battery_max_charge_kw"] = mc

                md = bat.get("max_discharge_kw")
                check_field_conflict(data.get("battery_max_discharge_kw"), md, "battery_max_discharge_kw")
                if md is not None:
                    data["battery_max_discharge_kw"] = md

                rte = bat.get("round_trip_efficiency")
                check_field_conflict(data.get("battery_round_trip_efficiency"), rte, "battery_round_trip_efficiency")
                if rte is not None:
                    data["battery_round_trip_efficiency"] = rte

                chem = bat.get("chemistry")
                check_field_conflict(data.get("battery_chemistry"), chem, "battery_chemistry")
                if chem is not None:
                    data["battery_chemistry"] = chem

            # 2. Normalize solar
            sol = data.get("solar")
            if isinstance(sol, dict):
                pv = sol.get("pv_capacity_kwp")
                check_field_conflict(data.get("pv_capacity_kwp"), pv, "pv_capacity_kwp")
                if pv is not None:
                    data["pv_capacity_kwp"] = pv

                tilt = sol.get("panel_tilt_deg")
                check_field_conflict(data.get("pv_panel_tilt_deg"), tilt, "pv_panel_tilt_deg")
                if tilt is not None:
                    data["pv_panel_tilt_deg"] = tilt

                az = sol.get("panel_azimuth_deg")
                check_field_conflict(data.get("pv_panel_azimuth_deg"), az, "pv_panel_azimuth_deg")
                if az is not None:
                    data["pv_panel_azimuth_deg"] = az

                loss = sol.get("system_losses_pct")
                check_field_conflict(data.get("pv_system_losses_pct"), loss, "pv_system_losses_pct")
                if loss is not None:
                    data["pv_system_losses_pct"] = loss

                cnt = sol.get("module_count")
                check_field_conflict(data.get("pv_module_count"), cnt, "pv_module_count")
                if cnt is not None:
                    data["pv_module_count"] = cnt

                watt = sol.get("module_wattage_w")
                check_field_conflict(data.get("pv_module_wattage_w"), watt, "pv_module_wattage_w")
                if watt is not None:
                    data["pv_module_wattage_w"] = watt

            # Derived-capacity rule: if module count / wattage not explicitly provided, derive from pv_capacity_kwp
            pv_kwp = data.get("pv_capacity_kwp")
            has_cnt = "pv_module_count" in data and data["pv_module_count"] is not None
            has_watt = "pv_module_wattage_w" in data and data["pv_module_wattage_w"] is not None

            if pv_kwp is not None and float(pv_kwp) > 0:
                if not has_cnt and not has_watt:
                    cnt = max(1, round((float(pv_kwp) * 1000.0) / 550.0))
                    data["pv_module_count"] = cnt
                    data["pv_module_wattage_w"] = round((float(pv_kwp) * 1000.0) / cnt, 1)
                elif has_cnt and not has_watt:
                    cnt = int(data["pv_module_count"])
                    if cnt > 0:
                        data["pv_module_wattage_w"] = round((float(pv_kwp) * 1000.0) / cnt, 1)
                elif not has_cnt and has_watt:
                    watt = float(data["pv_module_wattage_w"])
                    if watt > 0:
                        data["pv_module_count"] = max(1, round((float(pv_kwp) * 1000.0) / watt))
            elif pv_kwp == 0:
                data.setdefault("pv_module_count", 0)
                data.setdefault("pv_module_wattage_w", 0.0)

            # 3. Normalize inverter
            inv = data.get("inverter")
            if isinstance(inv, dict):
                inv_r = inv.get("rating_kw")
                check_field_conflict(data.get("inverter_rating_kw"), inv_r, "inverter_rating_kw")
                if inv_r is not None:
                    data["inverter_rating_kw"] = inv_r

                eff = inv.get("efficiency_pct")
                check_field_conflict(data.get("inverter_efficiency_pct"), eff, "inverter_efficiency_pct")
                if eff is not None:
                    data["inverter_efficiency_pct"] = eff

                itype = inv.get("inverter_type")
                check_field_conflict(data.get("inverter_type"), itype, "inverter_type")
                if itype is not None:
                    data["inverter_type"] = itype

            # 4. Normalize generator
            gen = data.get("generator")
            if isinstance(gen, dict):
                has_g = gen.get("enabled", gen.get("has_generator"))
                check_field_conflict(data.get("has_generator"), has_g, "has_generator")
                if has_g is not None:
                    data["has_generator"] = has_g

                gen_r = gen.get("rating_kw", gen.get("generator_rating_kw"))
                check_field_conflict(data.get("generator_rating_kw"), gen_r, "generator_rating_kw")
                if gen_r is not None:
                    data["generator_rating_kw"] = gen_r

                fuel = gen.get("fuel_type", gen.get("generator_fuel_type"))
                check_field_conflict(data.get("generator_fuel_type"), fuel, "generator_fuel_type")
                if fuel is not None:
                    data["generator_fuel_type"] = fuel

                cons = gen.get("fuel_consumption_l_per_kwh")
                check_field_conflict(data.get("generator_fuel_consumption_l_per_kwh"), cons, "generator_fuel_consumption_l_per_kwh")
                if cons is not None:
                    data["generator_fuel_consumption_l_per_kwh"] = cons

                min_run = gen.get("min_runtime_min")
                check_field_conflict(data.get("generator_min_runtime_min"), min_run, "generator_min_runtime_min")
                if min_run is not None:
                    data["generator_min_runtime_min"] = min_run

            # 5. Normalize grid
            grd = data.get("grid")
            if isinstance(grd, dict):
                conn = grd.get("connection_type")
                check_field_conflict(data.get("grid_connection_type"), conn, "grid_connection_type")
                if conn is not None:
                    data["grid_connection_type"] = conn

                imp = grd.get("import_limit_kw")
                check_field_conflict(data.get("grid_import_limit_kw"), imp, "grid_import_limit_kw")
                if imp is not None:
                    data["grid_import_limit_kw"] = imp

                exp = grd.get("export_limit_kw")
                check_field_conflict(data.get("grid_export_limit_kw"), exp, "grid_export_limit_kw")
                if exp is not None:
                    data["grid_export_limit_kw"] = exp

                net = grd.get("has_net_metering")
                check_field_conflict(data.get("has_net_metering"), net, "has_net_metering")
                if net is not None:
                    data["has_net_metering"] = net

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
        if self.has_generator and self.generator_rating_kw <= 0.0:
            raise ValueError(
                f"Enabled backup generator must have a rating greater than 0 kW (got {self.generator_rating_kw} kW)"
            )
        if self.pv_module_count > 0 and self.pv_module_wattage_w > 0:
            calc_kwp = round((self.pv_module_count * self.pv_module_wattage_w) / 1000.0, 3)
            tolerance = max(0.5, 0.05 * self.pv_capacity_kwp)
            if abs(self.pv_capacity_kwp - calc_kwp) > tolerance:
                raise ValueError(
                    f"PV capacity mismatch: declared pv_capacity_kwp ({self.pv_capacity_kwp} kWp) is inconsistent with module count {self.pv_module_count} × {self.pv_module_wattage_w}W = {calc_kwp} kWp (exceeds allowable tolerance of ±5% or ±0.5 kWp)"
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
            # 1. Battery normalization & conflict checks
            bat = data.get("battery")
            if isinstance(bat, dict):
                nom = bat.get("nominal_capacity_kwh", bat.get("nominal_kwh"))
                check_field_conflict(data.get("battery_nominal_kwh"), nom, "battery_nominal_kwh")
                if nom is not None:
                    data["battery_nominal_kwh"] = nom

                usa = bat.get("usable_capacity_kwh", bat.get("usable_kwh"))
                check_field_conflict(data.get("battery_usable_kwh"), usa, "battery_usable_kwh")
                if usa is not None:
                    data["battery_usable_kwh"] = usa

                if "initial_soc_pct" in bat:
                    check_field_conflict(data.get("battery_initial_soc_pct"), bat["initial_soc_pct"], "battery_initial_soc_pct")
                    data["battery_initial_soc_pct"] = bat["initial_soc_pct"]

                min_soc = bat.get("minimum_soc_pct", bat.get("min_soc_pct"))
                check_field_conflict(data.get("battery_min_soc_pct"), min_soc, "battery_min_soc_pct")
                if min_soc is not None:
                    data["battery_min_soc_pct"] = min_soc

                if "max_charge_kw" in bat:
                    check_field_conflict(data.get("battery_max_charge_kw"), bat["max_charge_kw"], "battery_max_charge_kw")
                    data["battery_max_charge_kw"] = bat["max_charge_kw"]

                if "max_discharge_kw" in bat:
                    check_field_conflict(data.get("battery_max_discharge_kw"), bat["max_discharge_kw"], "battery_max_discharge_kw")
                    data["battery_max_discharge_kw"] = bat["max_discharge_kw"]

                if "round_trip_efficiency" in bat:
                    check_field_conflict(data.get("battery_round_trip_efficiency"), bat["round_trip_efficiency"], "battery_round_trip_efficiency")
                    data["battery_round_trip_efficiency"] = bat["round_trip_efficiency"]

                if "chemistry" in bat:
                    check_field_conflict(data.get("battery_chemistry"), bat["chemistry"], "battery_chemistry")
                    data["battery_chemistry"] = bat["chemistry"]

            # 2. Solar normalization & conflict checks
            sol = data.get("solar")
            if isinstance(sol, dict):
                if "pv_capacity_kwp" in sol:
                    check_field_conflict(data.get("pv_capacity_kwp"), sol["pv_capacity_kwp"], "pv_capacity_kwp")
                    data["pv_capacity_kwp"] = sol["pv_capacity_kwp"]
                if "panel_tilt_deg" in sol:
                    check_field_conflict(data.get("pv_panel_tilt_deg"), sol["panel_tilt_deg"], "pv_panel_tilt_deg")
                    data["pv_panel_tilt_deg"] = sol["panel_tilt_deg"]
                if "panel_azimuth_deg" in sol:
                    check_field_conflict(data.get("pv_panel_azimuth_deg"), sol["panel_azimuth_deg"], "pv_panel_azimuth_deg")
                    data["pv_panel_azimuth_deg"] = sol["panel_azimuth_deg"]
                if "system_losses_pct" in sol:
                    check_field_conflict(data.get("pv_system_losses_pct"), sol["system_losses_pct"], "pv_system_losses_pct")
                    data["pv_system_losses_pct"] = sol["system_losses_pct"]
                if "module_count" in sol:
                    check_field_conflict(data.get("pv_module_count"), sol["module_count"], "pv_module_count")
                    data["pv_module_count"] = sol["module_count"]
                if "module_wattage_w" in sol:
                    check_field_conflict(data.get("pv_module_wattage_w"), sol["module_wattage_w"], "pv_module_wattage_w")
                    data["pv_module_wattage_w"] = sol["module_wattage_w"]

            # 3. Inverter normalization & conflict checks
            inv = data.get("inverter")
            if isinstance(inv, dict):
                if "rating_kw" in inv:
                    check_field_conflict(data.get("inverter_rating_kw"), inv["rating_kw"], "inverter_rating_kw")
                    data["inverter_rating_kw"] = inv["rating_kw"]
                if "efficiency_pct" in inv:
                    check_field_conflict(data.get("inverter_efficiency_pct"), inv["efficiency_pct"], "inverter_efficiency_pct")
                    data["inverter_efficiency_pct"] = inv["efficiency_pct"]
                if "inverter_type" in inv:
                    check_field_conflict(data.get("inverter_type"), inv["inverter_type"], "inverter_type")
                    data["inverter_type"] = inv["inverter_type"]

            # 4. Generator normalization & conflict checks
            gen = data.get("generator")
            if isinstance(gen, dict):
                has_g = gen.get("enabled", gen.get("has_generator"))
                if has_g is not None:
                    check_field_conflict(data.get("has_generator"), has_g, "has_generator")
                    data["has_generator"] = has_g
                if "rating_kw" in gen:
                    check_field_conflict(data.get("generator_rating_kw"), gen["rating_kw"], "generator_rating_kw")
                    data["generator_rating_kw"] = gen["rating_kw"]
                if "fuel_type" in gen:
                    check_field_conflict(data.get("generator_fuel_type"), gen["fuel_type"], "generator_fuel_type")
                    data["generator_fuel_type"] = gen["fuel_type"]
                if "fuel_consumption_l_per_kwh" in gen:
                    check_field_conflict(data.get("generator_fuel_consumption_l_per_kwh"), gen["fuel_consumption_l_per_kwh"], "generator_fuel_consumption_l_per_kwh")
                    data["generator_fuel_consumption_l_per_kwh"] = gen["fuel_consumption_l_per_kwh"]
                if "min_runtime_min" in gen:
                    check_field_conflict(data.get("generator_min_runtime_min"), gen["min_runtime_min"], "generator_min_runtime_min")
                    data["generator_min_runtime_min"] = gen["min_runtime_min"]

            # 5. Grid normalization & conflict checks
            grd = data.get("grid")
            if isinstance(grd, dict):
                if "connection_type" in grd:
                    check_field_conflict(data.get("grid_connection_type"), grd["connection_type"], "grid_connection_type")
                    data["grid_connection_type"] = grd["connection_type"]
                if "import_limit_kw" in grd:
                    check_field_conflict(data.get("grid_import_limit_kw"), grd["import_limit_kw"], "grid_import_limit_kw")
                    data["grid_import_limit_kw"] = grd["import_limit_kw"]
                if "export_limit_kw" in grd:
                    check_field_conflict(data.get("grid_export_limit_kw"), grd["export_limit_kw"], "grid_export_limit_kw")
                    data["grid_export_limit_kw"] = grd["export_limit_kw"]
                if "has_net_metering" in grd:
                    check_field_conflict(data.get("has_net_metering"), grd["has_net_metering"], "has_net_metering")
                    data["has_net_metering"] = grd["has_net_metering"]

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
        if self.has_generator is True and self.generator_rating_kw is not None and self.generator_rating_kw <= 0.0:
            raise ValueError("Enabled generator must have a rating greater than 0 kW (generator_rating_kw > 0)")
        if (
            self.pv_capacity_kwp is not None
            and self.pv_module_count is not None
            and self.pv_module_wattage_w is not None
            and self.pv_module_count > 0
            and self.pv_module_wattage_w > 0
        ):
            calc_kwp = round((self.pv_module_count * self.pv_module_wattage_w) / 1000.0, 3)
            tolerance = max(0.5, 0.05 * self.pv_capacity_kwp)
            if abs(self.pv_capacity_kwp - calc_kwp) > tolerance:
                raise ValueError(
                    f"PV capacity mismatch: declared pv_capacity_kwp ({self.pv_capacity_kwp} kWp) is inconsistent with module count {self.pv_module_count} × {self.pv_module_wattage_w}W = {calc_kwp} kWp (exceeds allowable tolerance of ±5% or ±0.5 kWp)"
                )
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
