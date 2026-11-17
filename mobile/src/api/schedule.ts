// Helpers for the Scheduling screen. Everything here is derived from the schedule result, the outage input,
// the appliance list or the PV estimate; nothing is invented.
export type Segment = { start_min: number; end_min: number };
export type ScheduleEntry = { appliance_id: string; name: string; priority: string; rated_power_w: number; segments: Segment[] };
export type ScheduleResult = { status: string; validated: boolean; reasons: string[]; supply_policy: string; objective_description?: string; demand_kwh?: number; entries: ScheduleEntry[] };

export const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(Math.round(minute % 60)).padStart(2, '0')}`;

/** Sorts segments and joins those that touch or overlap; zero-length or reversed ones are dropped. */
export function mergeSegments(segments: Segment[]): Segment[] {
  const sorted = segments.filter(s => s.end_min > s.start_min).map(s => ({ ...s })).sort((a, b) => a.start_min - b.start_min);
  const out: Segment[] = [];
  for (const s of sorted) { const last = out[out.length - 1]; if (last && s.start_min <= last.end_min) last.end_min = Math.max(last.end_min, s.end_min); else out.push(s); }
  return out;
}
/** The parts of [from, to] not covered by `ranges`: for the grid lane, the day outside the outages. */
export function complement(ranges: Segment[], from = 0, to = 1440): Segment[] {
  const out: Segment[] = []; let cursor = from;
  for (const r of mergeSegments(ranges)) {
    const start = Math.max(from, r.start_min), end = Math.min(to, r.end_min);
    if (end <= from || start >= to) continue;
    if (start > cursor) out.push({ start_min: cursor, end_min: start });
    cursor = Math.max(cursor, end);
  }
  if (cursor < to) out.push({ start_min: cursor, end_min: to });
  return out;
}
/** Hours in which the PV estimate has any output, as segments. Hours without a finite number are not counted. */
export function solarSegments(timeline: Array<{ hour: number; ac_kw: number }> | null | undefined): Segment[] {
  return mergeSegments((timeline ?? []).filter(h => Number.isFinite(h.hour) && Number.isFinite(h.ac_kw) && h.ac_kw > 0).map(h => ({ start_min: h.hour * 60, end_min: (h.hour + 1) * 60 })));
}
export const spanText = (segments: Segment[]) => segments.length ? segments.map(s => `${clock(s.start_min)} – ${clock(s.end_min)}`).join(', ') : '—';
export const totalMinutes = (segments: Segment[]) => segments.reduce((n, s) => n + Math.max(0, s.end_min - s.start_min), 0);
/** The window an appliance may run in, from the appliance list. */
export const windowText = (a: { earliest_min?: number; latest_min?: number } | null | undefined) =>
  a && Number.isFinite(a.earliest_min) && Number.isFinite(a.latest_min) ? `${clock(a.earliest_min as number)} – ${clock(a.latest_min as number)}` : '—';
/** Entries in the order they start; appliances with no segments go last. */
export const sortEntries = (entries: ScheduleEntry[]) => [...entries].sort((a, b) => (a.segments[0]?.start_min ?? Infinity) - (b.segments[0]?.start_min ?? Infinity) || a.name.localeCompare(b.name));

/** Heading for the lime card from what the solver actually returned. */
export function scheduleHeadline(result: { status: string; validated: boolean; demand_kwh?: number; entries: ScheduleEntry[] } | null | undefined): { title: string; subtitle: string; ready: boolean } {
  if (!result) return { title: 'No schedule yet', subtitle: 'Solve a schedule to see when each appliance runs.', ready: false };
  const status = result.status.toUpperCase();
  const ready = status === 'OPTIMAL' || status === 'FEASIBLE';
  const title = status === 'OPTIMAL' ? 'Optimized schedule ready' : status === 'FEASIBLE' ? 'Feasible schedule ready' : 'No schedule saved';
  // One short line. Whether the schedule was independently validated is explained under How this was scheduled.
  const parts = [`${result.entries.length} ${result.entries.length === 1 ? 'appliance' : 'appliances'}`, Number.isFinite(result.demand_kwh) ? `${(result.demand_kwh as number).toFixed(2)} kWh requested` : null].filter(Boolean);
  return { title, subtitle: ready ? parts.join(' · ') : 'See the conflict details below.', ready };
}
