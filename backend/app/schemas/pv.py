from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field, model_validator

class StringSpecs(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra='forbid')
    modules_per_string: int = Field(gt=0, le=100)
    module_voc_v: float = Field(gt=0, le=100)
    module_vmp_v: float = Field(gt=0, le=100)
    inverter_max_dc_v: float = Field(gt=0, le=2000)
    mppt_min_v: float = Field(gt=0, le=2000)
    mppt_max_v: float = Field(gt=0, le=2000)

    @model_validator(mode='after')
    def valid_specs(self):
        if self.module_vmp_v >= self.module_voc_v:
            raise ValueError('Module Vmp must be below Voc')
        if not self.mppt_min_v < self.mppt_max_v <= self.inverter_max_dc_v:
            raise ValueError('MPPT limits must be ordered and within the DC voltage limit')
        return self

class PVInput(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra='forbid')
    module_wattage_w: float = Field(default=550, gt=0, le=1000)
    inverter_kw: float = Field(default=8, gt=0, le=1000)
    inverter_efficiency_pct: float = Field(default=96, gt=0, le=100)
    tilt_deg: float = Field(default=25, ge=0, le=90)
    azimuth_deg: float = Field(default=180, ge=0, le=360)
    losses_pct: float = Field(default=14, ge=0, le=50)
    latitude_deg: float = Field(default=31.52, ge=-65, le=65)
    cell_temperature_c: float = Field(default=25, ge=-40, le=85)
    temperature_coefficient_per_c: float = Field(default=-0.004, ge=-0.01, le=0)
    # Optional values are already plane-of-array hourly means; no second tilt correction.
    poa_w_m2: list[Annotated[float, Field(ge=0, le=1500)]] | None = Field(default=None, min_length=24, max_length=24)
    string_specs: StringSpecs | None = None

class PVStep(BaseModel):
    hour: int
    duration_hours: float
    poa_w_m2: float
    dc_kw: float
    ac_kw: float
    energy_kwh: float

class PVProfile(BaseModel):
    schema_version: str = 'pv-profile-v1'
    source: str
    time_basis: str = 'Representative equinox solar day; hourly means, no calendar forecast'
    panel_count: int
    dc_capacity_kwp: float
    inverter_kw: float
    dc_ac_ratio: float
    daily_energy_kwh: float
    warnings: list[str]
    timeline: list[PVStep]
