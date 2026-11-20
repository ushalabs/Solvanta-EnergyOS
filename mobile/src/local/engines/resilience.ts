// Critical-reserve comparison. Port of backend/app/services/resilience.py.
import { loadProfiles, quarterHourPv, simulate, sum, validatePlant, type SimulationResult } from './simulation';
import type { Snapshot } from './forecast';

export function compareResilience(snapshot: Snapshot) {
  const plant = validatePlant({ ...snapshot.plant });
  const options = snapshot.options;
  const [demand, critical] = loadProfiles(snapshot.appliances);
  const pv = quarterHourPv(snapshot.pv);
  const baseline = simulate(plant, demand, critical, pv, options);
  const candidate = simulate(plant, demand, critical, pv, options, true);
  const b = baseline.summary, c = candidate.summary;
  const useCandidate = c.unserved_critical_kwh < b.unserved_critical_kwh - 1e-8
    || (c.unserved_critical_kwh <= b.unserved_critical_kwh + 1e-8 && c.unmet_kwh < b.unmet_kwh - 1e-8);
  const chosen = useCandidate ? candidate : baseline;
  const criticalKwh = sum(critical) * 0.25;
  const actions = chosen.trace.filter(p => p.dispatch_reason.startsWith('Preserve')).map(p => ({
    minute: p.minute, reason: p.dispatch_reason, protected_future_kwh: p.protected_future_kwh,
    noncritical_unmet_kw: Math.max(0, p.unmet_kw - p.unserved_critical_kw),
  }));
  const coverage = (result: SimulationResult) => criticalKwh ? 100 * (1 - result.summary.unserved_critical_kwh / criticalKwh) : null;
  return {
    method: 'Deterministic critical-reserve heuristic with baseline fallback; no global optimality claim',
    baseline, optimized: chosen, actions, candidate_selected: useCandidate,
    critical_coverage_pct: coverage(chosen), baseline_critical_coverage_pct: coverage(baseline),
    critical_energy_saved_kwh: b.unserved_critical_kwh - chosen.summary.unserved_critical_kwh,
    status: chosen.summary.unserved_critical_kwh > 1e-8 ? 'critical_shortage_remaining' : 'critical_demand_covered',
    assumptions: [
      'Identical requested loads, outage windows, PV, initial battery and source limits in both runs.',
      'Reserve estimate assumes no future surplus charging and ignores future generator support, making it conservative.',
      'Noncritical unmet demand is explicitly counted; deferral does not claim later completion. Scheduling and plan approval are separate.',
    ],
  };
}
