// Mapping from simulation traces to line-chart geometry. Pure functions, so the drawing can be tested without a screen.
export type ChartPoint = { x: number; y: number };
export type ChartBox = { left: number; top: number; width: number; height: number };
export type TraceStep = { minute: number; soc_pct: number };

/** Battery level over the day from a trace. Steps with a missing minute or level are skipped, never filled in. */
export function socPoints(trace: ReadonlyArray<Partial<TraceStep>> | null | undefined): ChartPoint[] {
  return (trace ?? []).filter(s => Number.isFinite(s.minute) && Number.isFinite(s.soc_pct)).map(s => ({ x: s.minute as number, y: s.soc_pct as number }));
}

export const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(Math.round(minute % 60)).padStart(2, '0')}`;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Screen position of a data point inside the plot box. Values outside the domain are clamped to its edge. */
export function project(p: ChartPoint, xDomain: [number, number], yDomain: [number, number], box: ChartBox): ChartPoint {
  const fx = (clamp(p.x, xDomain[0], xDomain[1]) - xDomain[0]) / (xDomain[1] - xDomain[0] || 1);
  const fy = (clamp(p.y, yDomain[0], yDomain[1]) - yDomain[0]) / (yDomain[1] - yDomain[0] || 1);
  return { x: box.left + fx * box.width, y: box.top + (1 - fy) * box.height };
}
const r1 = (v: number) => Math.round(v * 10) / 10;

/** SVG path for a series; empty when there are no points. A single point gives a zero-length segment so it still shows a dot. */
export function linePath(points: ChartPoint[], xDomain: [number, number], yDomain: [number, number], box: ChartBox): string {
  if (!points.length) return '';
  return points.map((p, i) => { const q = project(p, xDomain, yDomain, box); return `${i ? 'L' : 'M'}${r1(q.x)},${r1(q.y)}`; }).join(' ') + (points.length === 1 ? ' l0.01,0' : '');
}
/** Closed path under a series down to the bottom of the plot, for a soft fill. */
export function areaPath(points: ChartPoint[], xDomain: [number, number], yDomain: [number, number], box: ChartBox): string {
  if (points.length < 2) return '';
  const first = project(points[0], xDomain, yDomain, box), last = project(points[points.length - 1], xDomain, yDomain, box);
  return `${linePath(points, xDomain, yDomain, box)} L${r1(last.x)},${r1(box.top + box.height)} L${r1(first.x)},${r1(box.top + box.height)} Z`;
}

export type SeriesSummary = { start: number; end: number; min: number; minAt: number };
export function summarize(points: ChartPoint[]): SeriesSummary | null {
  if (!points.length) return null;
  const low = points.reduce((a, b) => (b.y < a.y ? b : a));
  return { start: points[0].y, end: points[points.length - 1].y, min: low.y, minAt: low.x };
}
/** One spoken sentence per series: where it starts, where it ends and its lowest point. Says plainly when there is no data. */
export function describeSeries(label: string, points: ChartPoint[], unit = '%'): string {
  const s = summarize(points);
  if (!s) return `${label}: no data.`;
  return `${label}: starts at ${s.start.toFixed(0)}${unit}, ends at ${s.end.toFixed(0)}${unit}, lowest ${s.min.toFixed(0)}${unit} at ${clock(s.minAt)}.`;
}

/** Shaded spans (outages) clipped to the x-domain; spans that fall outside it or are empty are dropped. */
export function bandRects(bands: Array<{ from: number; to: number }>, xDomain: [number, number], box: ChartBox): Array<{ x: number; width: number }> {
  return bands.map(b => ({ from: clamp(b.from, xDomain[0], xDomain[1]), to: clamp(b.to, xDomain[0], xDomain[1]) })).filter(b => b.to > b.from).map(b => {
    const a = project({ x: b.from, y: 0 }, xDomain, [0, 1], box), z = project({ x: b.to, y: 0 }, xDomain, [0, 1], box);
    return { x: a.x, width: z.x - a.x };
  });
}
