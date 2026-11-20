// What the Solvanta AI screen shows for the engine tools: the shortcut list, readable result descriptions, run labels and
// friendly error messages. Nothing here calls the API; the screen keeps its existing calls and parameters.
export type ToolName = 'get_building_profile' | 'get_energy_scenario' | 'run_outage_simulation' | 'forecast_energy' | 'optimize_appliance_schedule' | 'optimize_resilience' | 'compare_energy_configurations' | 'get_energy_anomalies' | 'propose_energy_plan';

export type ToolResultData = { tool: string; source: string; building_id: string; scenario_id: string | null; record_id: string | null; provenance: string; units: Record<string, string>; data: Record<string, any> };

export type ToolInfo = {
  /** The suggestion shown on the chip. It names what the tool does; it does not promise an answer to a question. */
  chip: string;
  /** Shown in the echo bubble and the request state. */
  label: string;
  icon: 'zap' | 'calendar' | 'battery' | 'alert' | 'building' | 'forecast' | 'shield' | 'scenario' | 'plan';
  /** Needs a saved scenario (a saved simulation run) to work on. */
  needsScenario: boolean;
  group: 'primary' | 'more';
  /** A sentence for tools that save a record or have a side effect worth stating. It is shown inside the result card. */
  note?: string;
};

/** Order is the order shown. The four primary shortcuts are the chips; the rest sit under More shortcuts. */
export const TOOLS: Record<ToolName, ToolInfo> = {
  run_outage_simulation: { chip: 'Re-run my saved outage scenario', label: 'Outage simulation', icon: 'zap', needsScenario: true, group: 'primary', note: 'Saves a new simulated run.' },
  optimize_appliance_schedule: { chip: 'Optimize my appliance schedule', label: 'Schedule optimization', icon: 'calendar', needsScenario: true, group: 'primary', note: 'Saves the schedule when it validates. Nothing is switched.' },
  compare_energy_configurations: { chip: 'Compare three configurations', label: 'Configuration comparison', icon: 'battery', needsScenario: true, group: 'primary' },
  get_energy_anomalies: { chip: 'Check for anomalies', label: 'Anomaly check', icon: 'alert', needsScenario: false, group: 'primary' },
  get_building_profile: { chip: 'Show my building profile', label: 'Building profile', icon: 'building', needsScenario: false, group: 'more' },
  get_energy_scenario: { chip: 'Show my saved scenario', label: 'Saved scenario', icon: 'scenario', needsScenario: true, group: 'more' },
  forecast_energy: { chip: 'Project the next 24 hours', label: 'Energy forecast', icon: 'forecast', needsScenario: true, group: 'more' },
  optimize_resilience: { chip: 'Compare resilience plans', label: 'Resilience comparison', icon: 'shield', needsScenario: true, group: 'more', note: 'Saves the comparison.' },
  propose_energy_plan: { chip: 'Propose a plan for review', label: 'Plan proposal', icon: 'plan', needsScenario: true, group: 'more', note: 'Creates a plan waiting for human approval. Nothing is approved or switched.' },
};
export const toolInfo = (name: string): ToolInfo => (TOOLS as Record<string, ToolInfo>)[name] ?? { chip: name.replace(/_/g, ' '), label: name.replace(/_/g, ' '), icon: 'scenario', needsScenario: true, group: 'more' };
/** Tools the building alone is enough for. Everything else needs a saved scenario. */
export const needsScenario = (name: string) => toolInfo(name).needsScenario;
/** The four shortcuts shown as chips, in order. */
export const PRIMARY_TOOLS = (Object.keys(TOOLS) as ToolName[]).filter(n => TOOLS[n].group === 'primary');

const DASH = '—';
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const fmt = (v: unknown, digits: number, unit?: string) => num(v) ? `${v.toFixed(digits)}${unit ? ` ${unit}` : ''}` : DASH;
const pct = (v: unknown) => num(v) ? `${v.toFixed(1)}%` : DASH;
export const clock = (minute: unknown) => num(minute) ? `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(Math.round(minute % 60)).padStart(2, '0')}` : DASH;
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const words = (s: unknown) => typeof s === 'string' ? s.replace(/_/g, ' ') : DASH;
const times = (segments: unknown) => Array.isArray(segments) && segments.length ? segments.map((x: any) => `${clock(x?.start_min)} – ${clock(x?.end_min)}`).join(', ') : DASH;
const unique = (lines: unknown[]) => [...new Set(lines.filter((x): x is string => typeof x === 'string' && !!x))];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const time12 = (d: Date) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
/**
 * A saved run as people say it: "Today 1:39 AM", "Yesterday 7:56 PM", "3 Nov 2:55 PM" (with the year when it is not this
 * year). The newest run is prefixed "Latest run · ". A run without a usable date is just "Saved run". The id never appears.
 */
export function runLabel(createdAt: unknown, latest: boolean, now: Date = new Date()): string {
  const d = new Date(createdAt as any);
  const when = Number.isNaN(d.getTime()) ? '' : (() => {
    const days = Math.round((dayStart(now) - dayStart(d)) / 86400000);
    const day = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`}`;
    return `${day} ${time12(d)}`;
  })();
  if (latest) return when ? `Latest run · ${when}` : 'Latest run';
  return when || 'Saved run';
}

export type Described = {
  title: string;
  /** One plain sentence about the outcome, or empty. */
  summary: string;
  /** The few numbers that matter. */
  rows: Array<{ label: string; value: string }>;
  /** The rest of the figures, shown under Show all details. */
  moreRows: Array<{ label: string; value: string }>;
  /** A small table, for comparing configurations. */
  table?: { columns: string[]; rows: Array<{ name: string; cells: string[] }>; sameNote?: string };
  items: Array<{ title: string; lines: string[]; warning?: boolean }>;
  /** Small notes that stay visible, for example the simulated-detector note. */
  inlineNotes: string[];
  /** One line saying what was looked at, for tools that read the building rather than a scenario. */
  checked?: string;
  /** Engine fine print, shown under How this was calculated. */
  notes: string[];
  /** Shown when the result has nothing to list. */
  empty?: string;
};

const runRows = (s: Record<string, any> | undefined) => ({
  rows: [{ label: 'Unmet', value: fmt(s?.unmet_kwh, 2, 'kWh') }, { label: 'Critical unmet', value: fmt(s?.unserved_critical_kwh, 2, 'kWh') }, { label: 'Grid import', value: fmt(s?.grid_import_kwh, 2, 'kWh') }, { label: 'Final battery', value: pct(s?.final_soc_pct) }],
  moreRows: [{ label: 'Requested', value: fmt(s?.load_kwh, 2, 'kWh') }, { label: 'PV', value: fmt(s?.pv_kwh, 2, 'kWh') }, { label: 'Generator fuel', value: fmt(s?.generator_fuel_l, 2, 'L') }, { label: 'Curtailed', value: fmt(s?.curtailed_kwh, 2, 'kWh') }],
});
const COMPARE_COLUMNS = ['Unmet', 'Critical unmet', 'Final battery'];
const compareCells = (s: Record<string, any> | undefined) => [fmt(s?.unmet_kwh, 2, 'kWh'), fmt(s?.unserved_critical_kwh, 2, 'kWh'), pct(s?.final_soc_pct)];
export const SAME_CONFIGURATIONS = 'All three configurations cover your load on this day, so there is no difference to show.';

/** A readable description of a tool result, built only from fields the result actually has. Missing values are dashes. */
export function describeResult(result: ToolResultData): Described {
  const d = result.data ?? {};
  const info = toolInfo(result.tool);
  const base: Described = { title: info.label, summary: '', rows: [], moreRows: [], items: [], inlineNotes: [], notes: [] };
  switch (result.tool) {
    case 'get_building_profile': {
      const solar = d.solar ?? {}, inverter = d.inverter ?? {}, battery = d.battery ?? {}, generator = d.generator ?? {}, grid = d.grid ?? {};
      return { ...base, summary: typeof d.building_name === 'string' ? d.building_name : '', checked: 'Authorized building records, Building configuration',
        rows: [{ label: 'PV capacity', value: fmt(solar.pv_capacity_kwp, 2, 'kWp') }, { label: 'Battery', value: fmt(battery.nominal_capacity_kwh, 1, 'kWh') }, { label: 'Inverter', value: fmt(inverter.rating_kw, 1, 'kW') }, { label: 'Generator', value: typeof generator.enabled === 'boolean' ? (generator.enabled ? `On, ${fmt(generator.rating_kw, 1, 'kW')}` : 'Off') : DASH }],
        moreRows: [{ label: 'Modules', value: num(solar.module_count) ? String(solar.module_count) : DASH }, { label: 'Usable battery', value: fmt(battery.usable_capacity_kwh, 1, 'kWh') }, { label: 'Starting charge', value: pct(battery.initial_soc_pct) }, { label: 'Grid import limit', value: fmt(grid.import_limit_kw, 1, 'kW') }],
        inlineNotes: Array.isArray(d.validation_messages) ? d.validation_messages.filter((m: unknown) => typeof m === 'string') : [] };
    }
    case 'run_outage_simulation':
    case 'get_energy_scenario': {
      const s = d.result?.summary;
      return { ...base, summary: s ? (num(s.unmet_kwh) && s.unmet_kwh > 1e-8 ? `Unmet energy ${fmt(s.unmet_kwh, 2, 'kWh')} on this representative day.` : 'No unmet energy on this representative day.') : '', ...(s ? runRows(s) : {}),
        empty: s ? undefined : 'This result has no summary.', notes: Array.isArray(d.result?.assumptions) ? d.result.assumptions : [] };
    }
    case 'forecast_energy': {
      const sh = d.shortage ?? {}, level = sh.level;
      const summary = level === 'none' ? 'No shortage is projected over the next 24 hours.' : level === 'load' ? `Some load may go unmet, starting at ${clock(sh.first_unmet_minute)}.` : level === 'critical' ? `Critical loads may go unmet, starting at ${clock(sh.first_unmet_minute)}.` : '';
      const p = d.projection?.summary;
      return { ...base, summary, rows: [{ label: 'Lowest battery', value: pct(sh.minimum_soc_pct) }, { label: 'Unmet', value: fmt(sh.unmet_kwh, 2, 'kWh') }, { label: 'Critical unmet', value: fmt(sh.critical_unmet_kwh, 2, 'kWh') }],
        moreRows: [{ label: 'PV', value: fmt(p?.pv_kwh, 2, 'kWh') }, { label: 'Requested', value: fmt(p?.load_kwh, 2, 'kWh') }, { label: 'Final battery', value: pct(p?.final_soc_pct) }],
        notes: unique([d.method, d.horizon_hours ? `Horizon ${d.horizon_hours} hours.` : '']) };
    }
    case 'optimize_appliance_schedule': {
      const entries: any[] = Array.isArray(d.entries) ? d.entries : [];
      const ok = d.status === 'OPTIMAL' || d.status === 'FEASIBLE';
      return { ...base, summary: ok ? `${cap(String(d.status).toLowerCase())} schedule · ${entries.length} ${entries.length === 1 ? 'appliance' : 'appliances'} · ${fmt(d.demand_kwh, 2, 'kWh')} requested` : 'No schedule was saved.',
        rows: [{ label: 'Status', value: typeof d.status === 'string' ? d.status : DASH }, { label: 'Independently validated', value: typeof d.validated === 'boolean' ? (d.validated ? 'Yes' : 'No') : DASH }],
        items: [...(Array.isArray(d.reasons) ? d.reasons : []).map((r: string) => ({ title: 'Conflict', lines: [String(r)], warning: true })),
          ...entries.map(e => ({ title: String(e?.name ?? DASH), lines: [times(e?.segments), `${cap(String(e?.priority ?? ''))} priority · ${fmt(num(e?.rated_power_w) ? e.rated_power_w / 1000 : undefined, 2, 'kW')}`] }))],
        notes: unique([d.supply_policy, d.objective_description]), empty: entries.length ? undefined : 'No appliances were scheduled.' };
    }
    case 'optimize_resilience': {
      const b = d.baseline?.summary, o = d.optimized?.summary;
      return { ...base, summary: num(d.critical_energy_saved_kwh) ? `${fmt(d.critical_energy_saved_kwh, 2, 'kWh')} more critical energy served than the baseline.` : '', rows: [
        { label: 'Critical coverage', value: `${pct(d.baseline_critical_coverage_pct)} → ${pct(d.critical_coverage_pct)}` }, { label: 'Critical unmet', value: `${fmt(b?.unserved_critical_kwh, 2)} → ${fmt(o?.unserved_critical_kwh, 2, 'kWh')}` }, { label: 'Total unmet', value: `${fmt(b?.unmet_kwh, 2)} → ${fmt(o?.unmet_kwh, 2, 'kWh')}` },
      ], moreRows: [{ label: 'Status', value: words(d.status) }],
        notes: unique([d.method, d.candidate_selected === true ? 'Critical-reserve policy selected.' : d.candidate_selected === false ? 'Baseline retained: the reserve candidate did not improve the comparison.' : '']) };
    }
    case 'compare_energy_configurations': {
      const variants: any[] = Array.isArray(d.variants) ? d.variants : [];
      const rows = variants.map(v => ({ name: String(v?.name ?? DASH), cells: compareCells(v?.summary) }));
      const same = rows.length > 1 && rows.every(r => r.cells.every((c, i) => c === rows[0].cells[i]));
      return { ...base, summary: variants.length ? `${variants.length} ${variants.length === 1 ? 'configuration' : 'configurations'} compared. These are hypothetical changes, not installed equipment.` : '',
        table: rows.length ? { columns: COMPARE_COLUMNS, rows, ...(same ? { sameNote: SAME_CONFIGURATIONS } : {}) } : undefined,
        notes: unique(variants.flatMap(v => Array.isArray(v?.tradeoff) ? v.tradeoff.map(String) : [])), empty: variants.length ? undefined : 'No configurations were returned.' };
    }
    case 'get_energy_anomalies': {
      const incidents: any[] = Array.isArray(d.incidents) ? d.incidents : [];
      return { ...base, summary: incidents.length ? `${incidents.length} ${incidents.length === 1 ? 'incident' : 'incidents'} found.` : 'No incidents found',
        items: incidents.map(i => ({ title: `${String(i?.code ?? DASH)} · ${String(i?.state ?? DASH)}`, lines: [String(i?.source ?? DASH), String(i?.possible_cause ?? DASH)] })),
        checked: 'Authorized building records, Building configuration', inlineNotes: ['SIMULATED detector, not a physical diagnosis'] };
    }
    case 'propose_energy_plan': {
      const variants: any[] = Array.isArray(d.variants) ? d.variants : [];
      return { ...base, summary: 'A plan was created for human review. Nothing is approved or switched.', rows: [{ label: 'State', value: words(d.state) }, { label: 'Revision', value: num(d.revision) ? String(d.revision) : DASH }],
        table: variants.length ? { columns: COMPARE_COLUMNS, rows: variants.map(v => ({ name: String(v?.name ?? DASH), cells: compareCells(v?.summary) })) } : undefined,
        notes: unique(variants.flatMap(v => Array.isArray(v?.tradeoff) ? v.tradeoff.map(String) : [])) };
    }
    default:
      return { ...base, empty: 'No readable summary is available for this result.' };
  }
}

/** The ids and provenance for the Technical details block of a result. */
export function technicalDetails(result: ToolResultData): Array<{ label: string; value: string }> {
  return [
    { label: 'Tool', value: result.tool },
    { label: 'Source', value: result.source },
    { label: 'Saved scenario', value: result.scenario_id ?? 'Building configuration' },
    { label: 'Saved record', value: result.record_id ?? DASH },
    { label: 'Building', value: result.building_id },
  ];
}

export const COULD_NOT_RUN = "Couldn't run this right now. Try again.";
/**
 * A short, friendly message for a failed tool call. The raw server text is never part of it: it can carry field paths,
 * identifiers or validation wording that means nothing to a homeowner. The screen keeps the raw text under Technical details.
 */
export function friendlyToolError(error: unknown): string {
  const status = typeof (error as any)?.status === 'number' ? (error as any).status : undefined;
  const raw = String((error as any)?.message ?? '');
  if (status === 499) return 'That request was cancelled.';
  if (status === 401 || status === 403) return 'You need to be signed in to use these tools.';
  if (status === 404 && /scenario/i.test(raw)) return 'That saved scenario was not found. Pick another one, or save a simulation first.';
  if (status === 404) return 'That tool is not available right now.';
  if (status === 422 && /generator/i.test(raw)) return 'The schedule optimizer excludes the generator. Choose a saved scenario that does not use it.';
  if (status === 422) return 'The tool could not run with this saved scenario. Try a different one.';
  return COULD_NOT_RUN;
}
/** The raw error for Technical details: the status and the message the server or network gave. */
export function rawErrorText(error: unknown): string {
  const status = typeof (error as any)?.status === 'number' ? `Status ${(error as any).status}: ` : '';
  const message = String((error as any)?.message ?? error ?? '').trim();
  return `${status}${message || 'No message'}`.slice(0, 600);
}

/** First name for a greeting, or empty when there is no usable name. */
export function firstName(fullName: unknown): string {
  if (typeof fullName !== 'string') return '';
  const first = fullName.trim().split(/\s+/)[0] ?? '';
  return /^[\p{L}][\p{L}'’.-]*$/u.test(first) && first.length <= 24 ? first : '';
}
