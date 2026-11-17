import { EnergyResult, EnergyStep } from './simulation';

/** Direction of a pulse on the Home flow diagram: toward the hub, away from it, or none. */
export type Flow = 'in' | 'out' | null;

export type OverviewNodes = {
  minute: number;
  solarKw: number;
  /** Positive while importing, negative while exporting. */
  gridKw: number;
  gridAvailable: boolean;
  /** Positive while discharging, negative while charging. */
  batteryKw: number;
  socPct: number;
  /** Load actually served, so unmet demand is not shown as delivered. */
  homeKw: number;
  unmetKw: number;
  flows: { solar: Flow; grid: Flow; battery: Flow; home: Flow };
};

const NO_FLOW_KW = 0.005;
const direction = (kw: number, positive: Flow, negative: Flow): Flow => kw > NO_FLOW_KW ? positive : kw < -NO_FLOW_KW ? negative : null;

/** The interval of a saved simulation that covers this time of day. The run is a representative day, not today. */
export function stepAt(result: Pick<EnergyResult, 'trace' | 'step_minutes'> | null | undefined, now: Date): EnergyStep | null {
  const trace = result?.trace;
  if (!result || !trace?.length) return null;
  const size = result.step_minutes > 0 ? result.step_minutes : 15;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return trace[Math.min(trace.length - 1, Math.floor(minutes / size))];
}

export function overviewNodes(step: EnergyStep | null): OverviewNodes | null {
  if (!step) return null;
  const gridKw = step.grid_import_kw - step.grid_export_kw;
  const batteryKw = step.discharge_kw - step.charge_kw;
  const homeKw = Math.max(0, step.load_kw - step.unmet_kw);
  return {
    minute: step.minute,
    solarKw: step.pv_kw,
    gridKw,
    gridAvailable: step.grid_available,
    batteryKw,
    socPct: step.soc_pct,
    homeKw,
    unmetKw: step.unmet_kw,
    flows: {
      solar: direction(step.pv_kw, 'in', null),
      grid: direction(gridKw, 'in', 'out'),
      battery: direction(batteryKw, 'in', 'out'),
      home: direction(homeKw, 'out', null),
    },
  };
}

/** Power magnitude for display, or a dash when there is no reading. Direction is shown in words beside it. */
export const formatKw = (kw: number | null | undefined) => kw == null || !Number.isFinite(kw) ? '—' : Math.abs(kw).toFixed(2);

export const clockLabel = (minute: number) => `${Math.floor(minute / 60).toString().padStart(2, '0')}:${(minute % 60).toString().padStart(2, '0')}`;
