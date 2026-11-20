// Plan variants, replay and verification. Port of backend/app/services/plans.py.
import { loadProfiles, quarterHourPv, simulate, validatePlant, type SimulationResult } from './simulation';
import type { Snapshot } from './forecast';

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export function executeSnapshot(snapshot: Snapshot): SimulationResult {
  const plant = validatePlant({ ...snapshot.plant });
  const [demand, critical] = loadProfiles(snapshot.appliances);
  return simulate(plant, demand, critical, quarterHourPv(snapshot.pv), snapshot.options, true);
}

const NAMES = ['Current configuration', 'Battery capacity +50%', 'PV capacity +25%'];
const TRADEOFFS = [
  'Existing equipment assumptions retained',
  'Larger hypothetical battery; power limits unchanged; installation and cost not assessed',
  'Hypothetical added PV; roof feasibility and cost require a new design assessment',
];

export function variants(snapshot: Snapshot) {
  return NAMES.map((name, index) => {
    const s = clone(snapshot);
    if (index === 1) { s.plant.nominal_kwh *= 1.5; s.plant.usable_kwh *= 1.5; }
    if (index === 2) {
      const pv = s.pv as unknown as Record<string, any>;
      for (const v of pv.timeline) {
        v.ac_kw = Math.min(pv.inverter_kw, v.ac_kw * 1.25);
        if ('dc_kw' in v) v.dc_kw *= 1.25;
        if ('energy_kwh' in v) v.energy_kwh = v.ac_kw * (v.duration_hours ?? 1);
      }
      for (const key of ['dc_capacity_kwp', 'dc_ac_ratio']) if (key in pv) pv[key] *= 1.25;
      if ('daily_energy_kwh' in pv) pv.daily_energy_kwh = pv.timeline.reduce((t: number, v: any) => t + (v.energy_kwh ?? v.ac_kw), 0);
      pv.source += '; hypothetical 25% PV expansion, clipped to existing inverter';
    }
    const result = executeSnapshot(s);
    return { index, name, snapshot: s, summary: result.summary, tradeoff: TRADEOFFS[index] };
  });
}

const PHYSICAL = ['battery_end_kwh', 'charge_kw', 'discharge_kw', 'load_kw', 'pv_kw', 'grid_import_kw', 'grid_export_kw', 'generator_kw', 'unmet_kw', 'curtailed_kw'] as const;

export function verifyResult(snapshot: Snapshot, result: SimulationResult): string[] {
  const errors = new Set<string>();
  const p = validatePlant({ ...snapshot.plant });
  const eta = Math.sqrt(p.round_trip_efficiency);
  const floor = Math.max(p.nominal_kwh - p.usable_kwh, p.nominal_kwh * p.reserve_soc / 100);
  const expected = executeSnapshot(snapshot);
  if (JSON.stringify(result) !== JSON.stringify(expected)) errors.add('Replay differs from immutable approved inputs');
  const trace = result.trace ?? [];
  if (trace.length !== 96) return ['Expected 96 intervals'];
  let previous = p.nominal_kwh * p.initial_soc / 100;
  for (const row of trace as unknown as Array<Record<string, number>>) {
    if (!PHYSICAL.every(k => typeof row[k] === 'number' && Number.isFinite(row[k]))) { errors.add('Nonfinite or missing physical value'); break; }
    const e = row.battery_end_kwh, charge = row.charge_kw, discharge = row.discharge_kw;
    if (e < floor - 1e-7 || e > p.nominal_kwh + 1e-7) errors.add('Battery bounds violated');
    if (charge < 0 || discharge < 0 || charge > p.charge_kw + 1e-7 || discharge > p.discharge_kw + 1e-7 || charge * discharge > 1e-8) errors.add('Battery power violated');
    if (Math.abs(e - previous - 0.25 * (charge * eta - discharge / eta)) > 1e-7) errors.add('Battery energy recurrence violated');
    const incoming = row.pv_kw + row.grid_import_kw + row.generator_kw + discharge;
    const outgoing = row.load_kw - row.unmet_kw + charge + row.grid_export_kw + row.curtailed_kw;
    if (Math.abs(incoming - outgoing) > 1e-7) errors.add('AC conservation violated');
    previous = e;
  }
  return [...errors].sort();
}
