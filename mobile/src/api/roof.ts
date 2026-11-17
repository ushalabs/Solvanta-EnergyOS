export type Point = { x: number; y: number };
export type RoofInput = {
  width: number; height: number; boundary: Point[]; obstacles: Point[][];
  scale_points: Point[]; scale_distance_m: number; setback_m: number;
  panel_width_m: number; panel_height_m: number; gap_m: number; image_data: string | null;
};
export type Layout = { roof_area_m2: number; usable_area_m2: number; panel_count: number; meters_per_pixel: number; panels: Array<{ x: number; y: number; width: number; height: number }>; method: string };
export type RoofRecord = { geometry: RoofInput; layout: Layout };
export const emptyRoof = (): RoofInput => ({ width: 1000, height: 700, boundary: [], obstacles: [], scale_points: [], scale_distance_m: 0, setback_m: 0.5, panel_width_m: 1.1, panel_height_m: 2, gap_m: 0.1, image_data: null });
export function parsePoints(text: string): Point[] {
  if (!text.trim()) return [];
  return text.split(';').map(pair => {
    const xy = pair.trim().split(',');
    if (xy.length !== 2 || xy.some(v => !v.trim() || !Number.isFinite(Number(v)))) throw new Error('Use x,y; x,y coordinates');
    return { x: Number(xy[0]), y: Number(xy[1]) };
  });
}
export const formatPoints = (points: Point[]) => points.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).join('; ');

/**
 * Convert a touch position inside the on-screen canvas to roof units (canvas is uniformly scaled).
 * A finger released past the edge reports a location outside the view; clamp it because the API
 * rejects any point outside the image canvas.
 */
export function tapToRoofPoint(x: number, y: number, viewWidth: number, roofWidth: number, roofHeight = Infinity): Point {
  const scale = viewWidth > 0 ? roofWidth / viewWidth : 1;
  return { x: Math.min(roofWidth, Math.max(0, Math.round(x * scale))), y: Math.min(roofHeight, Math.max(0, Math.round(y * scale))) };
}
/** Size in roof units that renders as `px` screen pixels, so markers stay visible on small phones. */
export const screenPx = (px: number, viewWidth: number, roofWidth: number) =>
  viewWidth > 0 ? (px * roofWidth) / viewWidth : px;

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
const onSegment = (a: Point, b: Point, p: Point) => Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) && Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y);
function segmentsCross(a: Point, b: Point, c: Point, d: Point) {
  const d1 = cross(a, b, c), d2 = cross(a, b, d), d3 = cross(c, d, a), d4 = cross(c, d, b);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return (d1 === 0 && onSegment(a, b, c)) || (d2 === 0 && onSegment(a, b, d)) || (d3 === 0 && onSegment(c, d, a)) || (d4 === 0 && onSegment(c, d, b));
}
/** True when the closed outline crosses itself (edges that are not neighbours touch or intersect). Needs at least 4 corners. */
export function selfIntersects(points: Point[]): boolean {
  const n = points.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const neighbours = j === i + 1 || (i === 0 && j === n - 1);
      if (!neighbours && segmentsCross(points[i], points[(i + 1) % n], points[j], points[(j + 1) % n])) return true;
    }
  }
  return false;
}
/** A starting outline the user can edit: a rectangle inset from the canvas edges. */
export function defaultRectangle(width: number, height: number): Point[] {
  const l = Math.round(width * 0.15), r = Math.round(width * 0.85), t = Math.round(height * 0.17), b = Math.round(height * 0.83);
  return [{ x: l, y: t }, { x: r, y: t }, { x: r, y: b }, { x: l, y: b }];
}

export type PanelRect = { x: number; y: number; width: number; height: number };
/**
 * Group placed panels that touch (or sit within `tolerance` of) each other, so each contiguous block can be outlined.
 * Only changes how placement is drawn; the panels themselves are not altered.
 */
export function panelGroups(panels: PanelRect[], tolerance: number): Array<{ bounds: PanelRect; panels: PanelRect[] }> {
  const parent = panels.map((_, i) => i);
  const find = (i: number): number => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const near = (a: PanelRect, b: PanelRect) => a.x <= b.x + b.width + tolerance && b.x <= a.x + a.width + tolerance && a.y <= b.y + b.height + tolerance && b.y <= a.y + a.height + tolerance;
  for (let i = 0; i < panels.length; i++) for (let j = i + 1; j < panels.length; j++) if (near(panels[i], panels[j])) parent[find(i)] = find(j);
  const groups = new Map<number, PanelRect[]>();
  panels.forEach((p, i) => { const k = find(i); groups.set(k, [...(groups.get(k) ?? []), p]); });
  return [...groups.values()].map(list => {
    const x = Math.min(...list.map(p => p.x)), y = Math.min(...list.map(p => p.y));
    return { panels: list, bounds: { x, y, width: Math.max(...list.map(p => p.x + p.width)) - x, height: Math.max(...list.map(p => p.y + p.height)) - y } };
  });
}
/** Usable width in metres: the horizontal extent of the placed panels. Null without placement or a scale. */
export function usableWidthM(panels: PanelRect[], metersPerPixel: number): { widthM: number; x1: number; x2: number } | null {
  if (!panels.length || !(metersPerPixel > 0)) return null;
  const x1 = Math.min(...panels.map(p => p.x)), x2 = Math.max(...panels.map(p => p.x + p.width));
  return { widthM: (x2 - x1) * metersPerPixel, x1, x2 };
}
/** Centre of a ring, for placing its label. */
export const centroid = (ring: Point[]): Point => ({ x: ring.reduce((n, p) => n + p.x, 0) / ring.length, y: ring.reduce((n, p) => n + p.y, 0) / ring.length });
