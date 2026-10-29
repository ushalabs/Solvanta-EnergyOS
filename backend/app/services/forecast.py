from typing import Protocol
from ..schemas.simulation import Plant,SimulationInput
from .simulation import simulate,load_profiles

class ProfileProvider(Protocol):
    def profiles(self) -> tuple[list[float],list[float],list[float]]: ...

class ConfiguredProfileProvider:
    def __init__(self,snapshot): self.snapshot=snapshot
    def profiles(self):
        d,c=load_profiles(self.snapshot['appliances'])
        pv=[p['ac_kw'] for p in self.snapshot['pv']['timeline'] for _ in range(4)]
        return d,c,pv

class SavedRunProfileProvider:
    def __init__(self,run): self.run=run
    def profiles(self):
        trace=self.run['trace']
        return [p['load_kw'] for p in trace],[p['critical_kw'] for p in trace],[p['pv_kw'] for p in trace]

def forecast(snapshot,options:SimulationInput,saved_result=None,source_id=None):
    plant=Plant(**snapshot['plant'])
    provider:ProfileProvider=ConfiguredProfileProvider(snapshot)
    source='Configured appliance runtime and PV design baseline'
    if saved_result is not None:
        provider=SavedRunProfileProvider(saved_result)
        plant=Plant(**(snapshot['plant']|{'initial_soc':saved_result['summary']['final_soc_pct']}))
        source='Persistence of latest SIMULATED daily profiles; starts at that run final battery SoC'
    demand,critical,pv=provider.profiles()
    if options.use_generator and plant.generator_kw<=0:
        raise ValueError('The forecast source has no enabled generator with positive rating')
    projection=simulate(plant,demand,critical,pv,options)
    first=next((p['minute'] for p in projection['trace'] if p['unmet_kw']>1e-8),None)
    critical_short=projection['summary']['unserved_critical_kwh']
    unmet=projection['summary']['unmet_kwh']
    return dict(schema_version='forecast-v1',method='deterministic daily persistence',horizon_hours=24,
       time_basis='Next representative solar-day scenario, not a dated weather forecast',
       provenance=dict(source=source,source_run_id=source_id,pv_source=snapshot['pv']['source'],observed_samples=0),
       evaluation=dict(trained_model=False,sample_size=0,mae=None,rmse=None,split=None,
         reason='Only configured/simulated profiles exist. No independent observed time series or chronological holdout is available; training and accuracy evaluation are not valid.'),
       shortage=dict(level='critical' if critical_short>1e-8 else 'load' if unmet>1e-8 else 'none',first_unmet_minute=first,
         unmet_kwh=unmet,critical_unmet_kwh=critical_short,minimum_soc_pct=min(p['soc_pct'] for p in projection['trace'])),
       projection=projection)
