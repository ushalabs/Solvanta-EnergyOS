from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Annotated

class Outage(BaseModel):
    start_min: int = Field(ge=0,lt=1440)
    end_min: int = Field(gt=0,le=1440)
    @model_validator(mode='after')
    def valid(self):
        if self.end_min<=self.start_min or self.start_min%15 or self.end_min%15:
            raise ValueError('Outages must be ordered and aligned to 15-minute boundaries')
        return self

class SimulationInput(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
    outages: list[Outage]=Field(default_factory=list,max_length=96)
    use_generator: bool=False
    @model_validator(mode='after')
    def disjoint(self):
        spans=sorted(self.outages,key=lambda o:o.start_min)
        if any(a.end_min>b.start_min for a,b in zip(spans,spans[1:])):
            raise ValueError('Outages cannot overlap')
        return self

class Plant(BaseModel):
    model_config=ConfigDict(allow_inf_nan=False)
    nominal_kwh: float=Field(ge=0)
    usable_kwh: float=Field(ge=0)
    initial_soc: float=Field(ge=0,le=100)
    reserve_soc: float=Field(ge=0,le=100)
    charge_kw: float=Field(ge=0)
    discharge_kw: float=Field(ge=0)
    round_trip_efficiency: float=Field(gt=0,le=1)
    grid_import_kw: float=Field(ge=0)
    grid_export_kw: float=Field(ge=0)
    generator_kw: float=Field(ge=0)
    generator_min_minutes: int=Field(ge=0)
    fuel_l_kwh: float=Field(ge=0)
    @model_validator(mode='after')
    def valid(self):
        if self.usable_kwh>self.nominal_kwh: raise ValueError('Usable battery exceeds nominal')
        floor=max(self.nominal_kwh-self.usable_kwh,self.nominal_kwh*self.reserve_soc/100)
        if self.nominal_kwh*self.initial_soc/100+1e-9<floor:
            raise ValueError('Initial battery energy is below reserve or usable-energy floor')
        return self
