// Appliance scheduling on the device. Replaces backend/app/services/scheduling.py (OR-Tools CP-SAT).
//
// Same constraints and objective as before: every selected appliance runs exactly its required minutes inside
// its window, non-interruptible loads run in one block, interruptible loads use at most 1 + max_interruptions
// blocks, fixed loads stay at their earliest start, and the summed power never exceeds the PV + grid budget in
// any minute. The objective minimizes priority-weighted delay of each required minute.
//
// Search: depth-first branch and bound over appliances (highest priority first). For each appliance the
// candidates are "start filling at minute s" placements against the power still left, tried earliest first.
// The bound adds each remaining appliance's own best cost against the full budget. If the search finishes
// inside the time limit, the result is optimal over these candidate placements; it is reported as OPTIMAL only
// when it also equals the provable lower bound (every appliance at its own best), otherwise FEASIBLE.
import type { ApplianceItem } from './simulation';

export const WEIGHTS: Record<string, number> = { critical: 10, medium: 3, low: 1 };
export type Segment = { start_min: number; end_min: number };
export type Entry = { appliance_id: string; name: string; priority: string; rated_power_w: number; segments: Segment[] };

export function validateSchedule(items: ApplianceItem[], budget: number[], entries: Entry[]): number[] {
  const selected = new Map(items.filter(a => a.selected).map(a => [a.id, a]));
  const ids = new Set(entries.map(e => e.appliance_id));
  if (ids.size !== selected.size || entries.length !== selected.size || [...ids].some(id => !selected.has(id))) {
    throw new Error('Schedule must contain every selected appliance exactly once');
  }
  const power = new Array<number>(1440).fill(0);
  for (const e of entries) {
    const a = selected.get(e.appliance_id)!;
    const minutes: number[] = [];
    for (const segment of e.segments) {
      const { start_min: start, end_min: end } = segment;
      if (!Number.isInteger(start) || !Number.isInteger(end) || !(a.earliest_min <= start && start < end && end <= a.latest_min)) {
        throw new Error('Segment outside appliance window');
      }
      for (let m = start; m < end; m++) minutes.push(m);
    }
    if (new Set(minutes).size !== minutes.length || minutes.length !== a.required_runtime_min) throw new Error('Runtime or overlap violation');
    minutes.sort((x, y) => x - y);
    const starts = minutes.filter((m, i) => i === 0 || m !== minutes[i - 1] + 1).length;
    if (!a.interruptible && starts !== 1) throw new Error('Noninterruptible load was split');
    if (starts > 1 + a.max_interruptions) throw new Error('Too many interruptions');
    if (!a.flexible && minutes.some((m, i) => m !== a.earliest_min + i)) throw new Error('Fixed load moved');
    for (const m of minutes) power[m] += a.rated_power_w;
  }
  if (power.some((p, i) => p > budget[i] + 1e-8)) throw new Error('Source power budget exceeded');
  return power;
}

type Job = { a: ApplianceItem; watts: number; weight: number; maxSegments: number };
type Placement = { segments: Segment[]; cost: number };

/**
 * Placement that starts filling at `start`: walks forward through minutes with enough power left, taking each
 * eligible run until the runtime is met, using at most `maxSegments` blocks.
 */
function placeFrom(job: Job, remaining: number[], start: number): Placement | null {
  const { a, watts, weight, maxSegments } = job;
  if (remaining[start] < watts) return null;
  let need = a.required_runtime_min, cost = 0;
  const segments: Segment[] = [];
  let m = start;
  while (need > 0 && m < a.latest_min) {
    if (remaining[m] < watts) { m++; continue; }
    if (segments.length === maxSegments) return null;
    const segStart = m;
    while (m < a.latest_min && remaining[m] >= watts && need > 0) { cost += weight * (m - a.earliest_min); m++; need--; }
    segments.push({ start_min: segStart, end_min: m });
    if (maxSegments === 1 && need > 0) return null;
  }
  return need === 0 ? { segments, cost } : null;
}

function* candidates(job: Job, remaining: number[]): Generator<Placement> {
  const { a } = job;
  if (!a.flexible) {
    const fixed = placeFrom(job, remaining, a.earliest_min);
    if (fixed && fixed.segments.length === 1) yield fixed;
    return;
  }
  for (let s = a.earliest_min; s + 1 <= a.latest_min; s++) {
    const placed = placeFrom(job, remaining, s);
    if (placed) yield placed;
  }
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 0));

export async function solveSchedule(items: ApplianceItem[], budget: number[], timeLimitMs = 5000) {
  if (budget.length !== 1440 || budget.some(v => !Number.isFinite(v) || v < 0)) throw new Error('Expected 1440 finite nonnegative power budgets');
  const appliances = items.filter(a => a.selected);
  if (appliances.length > 20) throw new Error('Prototype scheduler supports at most 20 selected appliances');
  const earliest: Entry[] = appliances.map(a => ({
    appliance_id: a.id, name: a.name, priority: a.priority, rated_power_w: a.rated_power_w,
    segments: [{ start_min: a.earliest_min, end_min: a.earliest_min + a.required_runtime_min }],
  }));
  const intBudget = budget.map(v => Math.floor(v + 1e-9));
  try {
    validateSchedule(items.map(a => ({ ...a, rated_power_w: Math.ceil(a.rated_power_w) })), intBudget, earliest);
    // Each job already uses its earliest N distinct minutes: its objective lower bound.
    const objective = appliances.reduce((t, a) => t + WEIGHTS[a.priority] * a.required_runtime_min * (a.required_runtime_min - 1) / 2, 0);
    return completedSchedule(items, budget, earliest, 'OPTIMAL', objective, 'Earliest-start objective lower-bound certificate');
  } catch { /* fall through to search */ }

  const jobs: Job[] = appliances.map(a => ({
    a, watts: Math.ceil(a.rated_power_w), weight: WEIGHTS[a.priority],
    maxSegments: a.interruptible ? 1 + a.max_interruptions : 1,
  })).sort((x, y) => y.weight - x.weight || (x.a.latest_min - x.a.earliest_min - x.a.required_runtime_min) - (y.a.latest_min - y.a.earliest_min - y.a.required_runtime_min) || y.watts - x.watts);

  // Each job alone against the full budget: its best cost, and whether it can run at all.
  const own = jobs.map(job => { const first = candidates(job, intBudget).next(); return first.done ? null : first.value; });
  const reasons: string[] = [];
  jobs.forEach((job, i) => {
    if (own[i]) return;
    const available = intBudget.slice(job.a.earliest_min, job.a.latest_min).filter(v => v >= job.watts).length;
    reasons.push(available < job.a.required_runtime_min
      ? `${job.a.name}: only ${available} eligible minutes for ${job.a.required_runtime_min} required`
      : `${job.a.name}: no window of eligible minutes satisfies its continuity limit`);
  });
  if (reasons.length) return { status: 'INFEASIBLE', validated: false, entries: [], reasons };

  const lowerBound = own.reduce((t, p) => t + p!.cost, 0);
  const restBound = jobs.map((_, i) => own.slice(i).reduce((t, p) => t + p!.cost, 0));
  const remaining = [...intBudget];
  const chosen: Placement[] = new Array(jobs.length);
  let best: Placement[] | null = null, bestCost = Infinity, timedOut = false, nodes = 0;
  const started = now();
  let lastPause = started;

  async function search(depth: number, cost: number): Promise<void> {
    if (timedOut || bestCost === lowerBound) return;
    if (depth === jobs.length) { if (cost < bestCost) { bestCost = cost; best = [...chosen]; } return; }
    const job = jobs[depth];
    for (const placement of candidates(job, remaining)) {
      if (++nodes % 500 === 0) {
        const t = now();
        if (t - started > timeLimitMs) { timedOut = true; return; }
        if (t - lastPause > 50) { lastPause = t; await pause(); } // keep the screen responsive
      }
      if (cost + placement.cost + (restBound[depth + 1] ?? 0) >= bestCost) continue;
      for (const s of placement.segments) for (let m = s.start_min; m < s.end_min; m++) remaining[m] -= job.watts;
      chosen[depth] = placement;
      await search(depth + 1, cost + placement.cost);
      for (const s of placement.segments) for (let m = s.start_min; m < s.end_min; m++) remaining[m] += job.watts;
      if (timedOut || bestCost === lowerBound) return;
    }
  }
  await search(0, 0);

  if (!best) {
    return {
      status: timedOut ? 'UNKNOWN' : 'NO_SOLUTION_FOUND', validated: false, entries: [],
      reasons: [timedOut ? 'Search time limit reached; feasibility is unresolved.' : 'Combined power, windows or continuity constraints cannot all be satisfied by the searched placements.'],
    };
  }
  const placements = best as Placement[];
  const byId = new Map(jobs.map((job, i) => [job.a.id, placements[i]]));
  const entries: Entry[] = appliances.map(a => ({ appliance_id: a.id, name: a.name, priority: a.priority, rated_power_w: a.rated_power_w, segments: byId.get(a.id)!.segments }));
  const status = bestCost === lowerBound ? 'OPTIMAL' : 'FEASIBLE';
  return completedSchedule(items, budget, entries, status, bestCost, timedOut ? 'Branch-and-bound placement search (time limit reached)' : 'Branch-and-bound placement search');
}

function completedSchedule(items: ApplianceItem[], budget: number[], entries: Entry[], status: string, objective: number, method: string) {
  const power = validateSchedule(items, budget, entries);
  const total = (values: number[]) => values.reduce((t, v) => t + v, 0);
  return {
    solver_method: method, status, validated: true, entries, reasons: [] as string[], objective,
    objective_description: 'Minimize priority-weighted delay of each required minute; all selected loads must complete.',
    demand_kwh: total(power) / 60000, budget_kwh: total(budget) / 60000,
    timeline: Array.from({ length: 96 }, (_, i) => ({
      minute: i * 15, load_kw: total(power.slice(i * 15, i * 15 + 15)) / 15000, available_kw: total(budget.slice(i * 15, i * 15 + 15)) / 15000,
    })),
  };
}
