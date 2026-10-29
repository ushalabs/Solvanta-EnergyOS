from typing import Protocol
import random
from pydantic import BaseModel,ConfigDict,Field
class TelemetrySample(BaseModel):
    model_config=ConfigDict(allow_inf_nan=False,extra="forbid")
    minute:int=Field(ge=0,lt=1440)
    pv_kw:float=Field(ge=0)
    load_kw:float=Field(ge=0)
    soc_pct:float=Field(ge=0,le=100)
class TelemetryProvider(Protocol):
    source:str
    def samples(self)->list[dict]: ...

class SimulationProvider:
    source='SIMULATED synthetic observations from saved energy trace'
    def __init__(self,result,fixture='none',seed=14):self.result=result;self.fixture=fixture;self.seed=seed
    def samples(self):
        rng=random.Random(self.seed);out=[]
        for p in self.result['trace']:
            out.append(dict(minute=p['minute'],pv_kw=max(0,p['pv_kw']*(1+rng.uniform(-.02,.02))),load_kw=max(0,p['load_kw']*(1+rng.uniform(-.02,.02))),soc_pct=max(0,min(100,p['soc_pct']+rng.uniform(-.1,.1)))))
        if self.fixture=='pv_dropout':
            peak=max(range(len(out)),key=lambda i:out[i]['pv_kw'])
            if out[peak]['pv_kw']<=.5:raise ValueError('PV dropout fixture requires a source run with daytime PV above 0.5 kW')
            for i in range(max(0,peak-1),min(len(out),peak+3)):out[i]['pv_kw']*=.1
        elif self.fixture=='battery_drain':
            if max(p['soc_pct'] for p in out)<=5:raise ValueError('Battery drain fixture requires a source with positive battery state')
            for i in range(24,28):out[i]['soc_pct']=max(0,out[i]['soc_pct']-15)
        elif self.fixture=='load_spike':
            for i in range(32,36):out[i]['load_kw']+=max(2,out[i]['load_kw']*.5)
        elif self.fixture!='none':raise ValueError('Unknown simulated fixture')
        return out

def detect(expected,samples):
    if len(samples)!=96 or len(expected['trace'])!=96:raise ValueError('Expected 96 aligned samples')
    samples=[TelemetrySample.model_validate(s).model_dump() for s in samples]
    rules=[('pv_mismatch','pv_kw',.25,.2,'Possible shade, source loss or sensor mismatch; simulated evidence is not a hardware diagnosis'),('load_mismatch','load_kw',.5,.25,'Possible additional load or measurement mismatch'),('battery_mismatch','soc_pct',5,0,'Possible battery capacity/loss mismatch or state-of-charge sensor error')]
    incidents=[]
    for code,field,absolute,relative,cause in rules:
        evidence=[]
        for p,o in zip(expected['trace'],samples):
            if p['minute']!=o['minute']:raise ValueError('Telemetry timestamps are not aligned')
            residual=o[field]-p[field];threshold=max(absolute,abs(p[field])*relative)
            if abs(residual)>threshold:evidence.append(dict(minute=p['minute'],expected=p[field],observed=o[field],residual=residual,threshold=threshold,unit='%' if field=='soc_pct' else 'kW'))
        if any(b['minute']-a['minute']==15 for a,b in zip(evidence,evidence[1:])):
            incidents.append(dict(code=code,severity='warning',source='SIMULATED',possible_cause=cause,evidence=evidence,state='OPEN',automation_event_id=None,verifications=[]))
    return incidents
