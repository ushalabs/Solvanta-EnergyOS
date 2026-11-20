// AC-bus energy balance, quarter-hour means; no physical control. Port of backend/app/services/simulation.py.
export type Outage = { start_min: number; end_min: number };
export type SimulationOptions = { outages: Outage[]; use_generator: boolean };
export type Plant = {
  nominal_kwh: number; usable_kwh: number; initial_soc: number; reserve_soc: number;
  charge_kw: number; discharge_kw: number; round_trip_efficiency: number;
  grid_import_kw: number; grid_export_kw: number; generator_kw: number;
  generator_min_minutes: number; fuel_l_kwh: number;
};
export type ApplianceItem = {
  id: string; name: string; rated_power_w: number; priority: 'critical' | 'medium' | 'low';
  critical: boolean; flexible: boolean; required_runtime_min: number; earliest_min: number;
  latest_min: number; interruptible: boolean; max_interruptions: number; selected: boolean;
  [key: string]: unknown;
};
export type TraceStep = {
  minute: number; duration_hours: number; pv_kw: number; load_kw: number; critical_kw: number;
  grid_available: boolean; grid_import_kw: number; grid_export_kw: number; generator_kw: number;
  charge_kw: number; discharge_kw: number; curtailed_kw: number; unmet_kw: number;
  unserved_critical_kw: number; battery_start_kwh: number; battery_end_kwh: number;
  protected_future_kwh: number; dispatch_reason: string; soc_pct: number; balance_error_kw: number;
};
export type SimulationSummary = {
  load_kwh: number; pv_kwh: number; grid_import_kwh: number; grid_export_kwh: number;
  generator_kwh: number; generator_fuel_l: number; unmet_kwh: number; unserved_critical_kwh: number;
  curtailed_kwh: number; final_soc_pct: number; generator_remaining_minutes: number;
};
export type SimulationResult = {
  schema_version: 'energy-trace-v1'; step_minutes: 15; trace: TraceStep[];
  summary: SimulationSummary; assumptions: string[];
};

export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const inOutage = (minute: number, outages: Outage[]) => outages.some(o => o.start_min <= minute && minute < o.end_min);

export function simulate(plant: Plant, demand: number[], critical: number[], pv: number[], options: SimulationOptions, protectCritical = false): SimulationResult {
  if ([demand, critical, pv].some(v => v.length !== 96)) throw new Error('Expected 96 quarter-hour values');
  if ([demand, critical, pv].some(v => v.some(x => !Number.isFinite(x) || x < 0))) throw new Error('Profiles must be finite and non-negative');
  if (critical.some((c, i) => c > demand[i] + 1e-9)) throw new Error('Critical demand exceeds total demand');
  const dt = 0.25;
  const eta = Math.sqrt(plant.round_trip_efficiency);
  let energy = plant.nominal_kwh * plant.initial_soc / 100;
  const floor = Math.max(plant.nominal_kwh - plant.usable_kwh, plant.nominal_kwh * plant.reserve_soc / 100);
  const futureNeed = new Array<number>(97).fill(0);
  for (let j = 95; j >= 0; j--) {
    const online = !inOutage(j * 15, options.outages);
    const assured = pv[j] + (online ? plant.grid_import_kw : 0);
    futureNeed[j] = futureNeed[j + 1] + Math.max(0, critical[j] - assured) * dt / eta;
  }
  let genUntil = 0;
  const trace: TraceStep[] = [];
  for (let i = 0; i < 96; i++) {
    const load = demand[i], crit = critical[i], solar = pv[i];
    const minute = i * 15;
    const available = !inOutage(minute, options.outages);
    const before = energy;
    let deficit = Math.max(0, load - solar);
    const grid = available ? Math.min(deficit, plant.grid_import_kw) : 0;
    deficit -= grid;
    let discharge = Math.min(deficit, plant.discharge_kw, Math.max(0, energy - floor) * eta / dt);
    const unrestricted = discharge;
    if (protectCritical) {
      const criticalDeficit = Math.max(0, crit - solar - grid);
      const criticalDischarge = Math.min(discharge, criticalDeficit);
      const freeEnergy = Math.max(0, energy - floor - criticalDischarge * dt / eta - futureNeed[i + 1]);
      discharge = criticalDischarge + Math.min(Math.max(0, discharge - criticalDischarge), freeEnergy * eta / dt);
    }
    const reason = discharge < unrestricted - 1e-9 ? 'Preserve battery for future critical deficit; defer noncritical service' : 'Serve demand within source and battery constraints';
    energy -= discharge * dt / eta;
    deficit -= discharge;
    if (options.use_generator && plant.generator_kw > 0 && deficit > 1e-9) {
      genUntil = Math.max(genUntil, minute + Math.max(15, plant.generator_min_minutes));
    }
    const generator = options.use_generator && minute < genUntil ? plant.generator_kw : 0;
    let surplus = Math.max(0, solar + grid + discharge + generator - load);
    const charge = discharge <= 1e-9 ? Math.min(surplus, plant.charge_kw, Math.max(0, plant.nominal_kwh - energy) / eta / dt) : 0;
    energy += charge * dt * eta;
    surplus -= charge;
    const exported = available ? Math.min(surplus, plant.grid_export_kw) : 0;
    const curtailed = surplus - exported;
    const unmet = Math.max(0, load - solar - grid - discharge - generator);
    const served = load - unmet;
    const unservedCritical = Math.max(0, crit - served);
    const residual = solar + grid + discharge + generator - (served + charge + exported + curtailed);
    trace.push({
      minute, duration_hours: dt, pv_kw: solar, load_kw: load, critical_kw: crit,
      grid_available: available, grid_import_kw: grid, grid_export_kw: exported, generator_kw: generator,
      charge_kw: charge, discharge_kw: discharge, curtailed_kw: curtailed, unmet_kw: unmet,
      unserved_critical_kw: unservedCritical, battery_start_kwh: before, battery_end_kwh: energy,
      protected_future_kwh: protectCritical ? futureNeed[i + 1] : 0, dispatch_reason: reason,
      soc_pct: plant.nominal_kwh ? 100 * energy / plant.nominal_kwh : 0, balance_error_kw: residual,
    });
  }
  const total = (key: keyof TraceStep) => sum(trace.map(t => (t[key] as number) * dt));
  return {
    schema_version: 'energy-trace-v1', step_minutes: 15, trace,
    summary: {
      load_kwh: total('load_kw'), pv_kwh: total('pv_kw'), grid_import_kwh: total('grid_import_kw'),
      grid_export_kwh: total('grid_export_kw'), generator_kwh: total('generator_kw'),
      generator_fuel_l: total('generator_kw') * plant.fuel_l_kwh, unmet_kwh: total('unmet_kw'),
      unserved_critical_kwh: total('unserved_critical_kw'), curtailed_kwh: total('curtailed_kw'),
      final_soc_pct: trace[trace.length - 1].soc_pct, generator_remaining_minutes: Math.max(0, genUntil - 1440),
    },
    assumptions: [
      'Quarter-hour mean AC powers; battery efficiency split equally between charge/discharge.',
      protectCritical
        ? 'Critical reserve heuristic: preserve battery for remaining critical deficit; PV, grid, battery, generator dispatch.'
        : 'Fixed baseline order: PV, grid, battery, generator. Critical demand served first for unmet-energy accounting.',
      'Selected appliances run continuously from earliest start for required runtime; no scheduling optimization.',
      'PV uses representative solar-hour profile as a scenario assumption, not a dated weather forecast.',
    ],
  };
}

export function loadProfiles(items: ApplianceItem[]): [number[], number[]] {
  const demand = new Array<number>(96).fill(0);
  const critical = new Array<number>(96).fill(0);
  for (const a of items) {
    if (!a.selected) continue;
    const start = a.earliest_min, end = start + a.required_runtime_min;
    for (let i = 0; i < 96; i++) {
      const overlap = Math.max(0, Math.min(end, i * 15 + 15) - Math.max(start, i * 15));
      const power = a.rated_power_w / 1000 * overlap / 15;
      demand[i] += power;
      if (a.critical) critical[i] += power;
    }
  }
  return [demand, critical];
}

/** Quarter-hour PV from an hourly profile: each hourly AC mean repeated four times. */
export const quarterHourPv = (pv: { timeline: Array<{ ac_kw: number }> }) => pv.timeline.flatMap(p => [p.ac_kw, p.ac_kw, p.ac_kw, p.ac_kw]);

export function validatePlant(plant: Plant): Plant {
  const ranges: Array<[keyof Plant, number, number]> = [
    ['nominal_kwh', 0, Infinity], ['usable_kwh', 0, Infinity], ['initial_soc', 0, 100], ['reserve_soc', 0, 100],
    ['charge_kw', 0, Infinity], ['discharge_kw', 0, Infinity], ['grid_import_kw', 0, Infinity],
    ['grid_export_kw', 0, Infinity], ['generator_kw', 0, Infinity], ['generator_min_minutes', 0, Infinity], ['fuel_l_kwh', 0, Infinity],
  ];
  for (const [key, min, max] of ranges) {
    const value = plant[key];
    if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${key} is out of range`);
  }
  if (!(plant.round_trip_efficiency > 0 && plant.round_trip_efficiency <= 1)) throw new Error('round_trip_efficiency is out of range');
  if (plant.usable_kwh > plant.nominal_kwh) throw new Error('Usable battery exceeds nominal');
  const floor = Math.max(plant.nominal_kwh - plant.usable_kwh, plant.nominal_kwh * plant.reserve_soc / 100);
  if (plant.nominal_kwh * plant.initial_soc / 100 + 1e-9 < floor) throw new Error('Initial battery energy is below reserve or usable-energy floor');
  return plant;
}
