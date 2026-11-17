// Outage rows for the Custom scenario: From and To times in minutes after midnight, converted to and from the
// minute-range text the simulation and scheduling requests already use ("480-600, 1080-1200").
export type OutageRow = { from: number; to: number };

/** Times move in 15-minute steps, the boundary the server requires for outages. */
export const TIME_STEP = 15;
export const DAY = 1440;

export const formatTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** The text for the existing request and field. Rows are written in the order they are shown. */
export const rowsToText = (rows: OutageRow[]) => rows.map(r => `${r.from}-${r.to}`).join(', ');

/**
 * Rows for a minute-range text, or null when the text cannot be shown as rows (wrong shape, not whole 15-minute
 * boundaries, or an end that is not after its start). Blank text is no rows. Overlaps are allowed here: the existing
 * validation reports them when a run is requested.
 */
export function textToRows(text: string): OutageRow[] | null {
  if (!text.trim()) return [];
  const rows: OutageRow[] = [];
  for (const pair of text.split(',')) {
    const parts = pair.trim().split('-');
    if (parts.length !== 2 || parts.some(p => !/^\d+$/.test(p.trim()))) return null;
    const [from, to] = parts.map(Number);
    if (from % TIME_STEP || to % TIME_STEP || from < 0 || to > DAY || to <= from) return null;
    rows.push({ from, to });
  }
  return rows;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Moves a time by `delta` minutes inside [min, max]. */
export const stepTime = (value: number, delta: number, min: number, max: number) => clamp(value + delta, min, max);

/** A row is edited without ever making its end earlier than a step after its start. */
export const setFrom = (row: OutageRow, from: number): OutageRow => { const f = clamp(from, 0, DAY - TIME_STEP); return { from: f, to: Math.max(row.to, f + TIME_STEP) }; };
export const setTo = (row: OutageRow, to: number): OutageRow => { const t = clamp(to, TIME_STEP, DAY); return { from: Math.min(row.from, t - TIME_STEP), to: t }; };

export const canAddRow = (rows: OutageRow[]) => !rows.length || rows[rows.length - 1].to <= DAY - TIME_STEP;
/** A new one-hour outage that starts where the last one ends, or at 08:00 when there is none. */
export function addRow(rows: OutageRow[]): OutageRow[] {
  if (!canAddRow(rows)) return rows;
  const from = rows.length ? rows[rows.length - 1].to : 480;
  return [...rows, { from, to: Math.min(DAY, from + 60) }];
}
export const removeRow = (rows: OutageRow[], index: number) => rows.filter((_, i) => i !== index);

/** True when two rows share any minute. Touching rows (one ends where the next starts) do not overlap. */
export function hasOverlap(rows: OutageRow[]): boolean {
  const sorted = [...rows].sort((a, b) => a.from - b.from);
  return sorted.some((r, i) => i > 0 && r.from < sorted[i - 1].to);
}
