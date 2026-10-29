from pydantic import BaseModel, ConfigDict, Field, model_validator

class ApplianceInput(BaseModel):
    model_config=ConfigDict(allow_inf_nan=False,extra='forbid')
    name: str=Field(min_length=1,max_length=100)
    rated_power_w: float=Field(gt=0,le=100000)
    priority: str=Field(pattern='^(critical|medium|low)$')
    critical: bool=False
    flexible: bool=False
    required_runtime_min: int=Field(ge=1,le=1440)
    earliest_min: int=Field(ge=0,lt=1440)
    latest_min: int=Field(gt=0,le=1440)
    interruptible: bool=False
    max_interruptions: int=Field(default=0,ge=0,le=50)

    @model_validator(mode='after')
    def consistent(self):
        self.name=self.name.strip()
        if not self.name: raise ValueError('Name cannot be blank')
        if self.latest_min<=self.earliest_min: raise ValueError('Latest time must be after earliest time')
        if self.required_runtime_min>self.latest_min-self.earliest_min: raise ValueError('Required runtime exceeds available window')
        if self.critical and self.priority!='critical': raise ValueError('Critical loads must have critical priority')
        if self.interruptible and not self.flexible: raise ValueError('Interruptible load must be flexible')
        if not self.interruptible and self.max_interruptions: raise ValueError('Non-interruptible load cannot have interruptions')
        return self

class ScenarioInput(BaseModel):
    selected: bool
