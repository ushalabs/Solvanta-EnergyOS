// Deterministic daily persistence projection. Port of backend/app/services/forecast.py.
import { loadProfiles, quarterHourPv, simulate, validatePlant, type ApplianceItem, type Plant, type SimulationOptions, type SimulationResult } from './simulation';
import type { PVProfile } from './pv';

export type Snapshot = { plant: Plant; appliances: ApplianceItem[]; pv: PVProfile; options: SimulationOptions; budget_w?: number[] };

export function forecast(snapshot: Snapshot, options: SimulationOptions, savedResult: SimulationResult | null = null, sourceId: string | null = null) {
  let plant = validatePlant({ ...snapshot.plant });
  let demand: number[], critical: number[], pv: number[];
  let source = 'Configured appliance runtime and PV design baseline';
  if (savedResult) {
    const trace = savedResult.trace;
    demand = trace.map(p => p.load_kw); critical = trace.map(p => p.critical_kw); pv = trace.map(p => p.pv_kw);
    plant = validatePlant({ ...snapshot.plant, initial_soc: savedResult.summary.final_soc_pct });
    source = 'Persistence of latest SIMULATED daily profiles; starts at that run final battery SoC';
  } else {
    [demand, critical] = loadProfiles(snapshot.appliances);
    pv = quarterHourPv(snapshot.pv);
  }
  if (options.use_generator && plant.generator_kw <= 0) throw new Error('The forecast source has no enabled generator with positive rating');
  const projection = simulate(plant, demand, critical, pv, options);
  const first = projection.trace.find(p => p.unmet_kw > 1e-8)?.minute ?? null;
  const criticalShort = projection.summary.unserved_critical_kwh;
  const unmet = projection.summary.unmet_kwh;
  return {
    schema_version: 'forecast-v1', method: 'deterministic daily persistence', horizon_hours: 24,
    time_basis: 'Next representative solar-day scenario, not a dated weather forecast',
    provenance: { source, source_run_id: sourceId, pv_source: snapshot.pv.source, observed_samples: 0 },
    evaluation: {
      trained_model: false, sample_size: 0, mae: null, rmse: null, split: null,
      reason: 'Only configured/simulated profiles exist. No independent observed time series or chronological holdout is available; training and accuracy evaluation are not valid.',
    },
    shortage: {
      level: criticalShort > 1e-8 ? 'critical' : unmet > 1e-8 ? 'load' : 'none', first_unmet_minute: first,
      unmet_kwh: unmet, critical_unmet_kwh: criticalShort, minimum_soc_pct: Math.min(...projection.trace.map(p => p.soc_pct)),
    },
    projection,
  };
}
