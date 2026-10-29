from .simulation import simulate,load_profiles
from ..schemas.simulation import Plant,SimulationInput

def compare_resilience(snapshot):
    plant=Plant(**snapshot['plant']);options=SimulationInput(**snapshot['options'])
    demand,critical=load_profiles(snapshot['appliances'])
    pv=[p['ac_kw'] for p in snapshot['pv']['timeline'] for _ in range(4)]
    baseline=simulate(plant,demand,critical,pv,options)
    candidate=simulate(plant,demand,critical,pv,options,protect_critical=True)
    b=baseline['summary'];c=candidate['summary']
    use_candidate=c['unserved_critical_kwh']<b['unserved_critical_kwh']-1e-8 or (c['unserved_critical_kwh']<=b['unserved_critical_kwh']+1e-8 and c['unmet_kwh']<b['unmet_kwh']-1e-8)
    chosen=candidate if use_candidate else baseline
    critical_kwh=sum(critical)*.25
    actions=[dict(minute=p['minute'],reason=p['dispatch_reason'],protected_future_kwh=p['protected_future_kwh'],noncritical_unmet_kw=max(0,p['unmet_kw']-p['unserved_critical_kw'])) for p in chosen['trace'] if p['dispatch_reason'].startswith('Preserve')]
    def coverage(result):return 100*(1-result['summary']['unserved_critical_kwh']/critical_kwh) if critical_kwh else None
    return dict(method='Deterministic critical-reserve heuristic with baseline fallback; no global optimality claim',
       baseline=baseline,optimized=chosen,actions=actions,candidate_selected=use_candidate,
       critical_coverage_pct=coverage(chosen),baseline_critical_coverage_pct=coverage(baseline),
       critical_energy_saved_kwh=b['unserved_critical_kwh']-chosen['summary']['unserved_critical_kwh'],
       status='critical_shortage_remaining' if chosen['summary']['unserved_critical_kwh']>1e-8 else 'critical_demand_covered',
       assumptions=['Identical requested loads, outage windows, PV, initial battery and source limits in both runs.',
         'Reserve estimate assumes no future surplus charging and ignores future generator support, making it conservative.',
         'Noncritical unmet demand is explicitly counted; deferral does not claim later completion. Scheduling and plan approval are separate.'])
