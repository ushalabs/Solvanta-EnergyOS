// Pure helpers for the full-screen roof editor. Distances in metres come only from the measured scale.
import type { Point, RoofInput } from './roof';

export type SnapKind = 'grid' | 'angle' | null;
/** Roof units between grid lines: the canvas width split into 20 steps. */
export const gridStep = (roofWidth: number) => roofWidth / 20;

/** Metres per roof unit from the two scale points and the measured distance, or null without a usable scale. */
export function metersPerUnit(roof: Pick<RoofInput, 'scale_points' | 'scale_distance_m'>, distanceText?: string): number | null {
  const distance = distanceText === undefined ? roof.scale_distance_m : Number(distanceText);
  if (roof.scale_points.length !== 2 || !Number.isFinite(distance) || distance <= 0) return null;
  const [a, b] = roof.scale_points;
  const units = Math.hypot(a.x - b.x, a.y - b.y);
  return units >= 1 ? distance / units : null;
}

/** Polygon area in square roof units (always positive). */
export const polygonArea = (ring: Point[]) => Math.abs(ring.reduce((n, p, i) => { const q = ring[(i + 1) % ring.length]; return n + p.x * q.y - q.x * p.y; }, 0)) / 2;

/** Length of each closed-ring edge in roof units; edge i runs from corner i to corner i+1. */
export const edgeLengths = (ring: Point[]) => ring.length < 2 ? [] : ring.map((p, i) => { const q = ring[(i + 1) % ring.length]; return Math.hypot(q.x - p.x, q.y - p.y); });

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Magnetic snapping. Grid: each axis jumps to the nearest grid line when within `tolerance` roof units.
 * Right angle: when the edge from `prev` is within `maxDegrees` of horizontal, vertical, along the previous edge
 * or perpendicular to it, the point is moved onto that direction. Right-angle snapping wins over grid snapping.
 */
export function snapPoint(p: Point, opts: { step: number; tolerance: number; prev?: Point; prevPrev?: Point; maxDegrees?: number; bounds: { width: number; height: number } }): { point: Point; kind: SnapKind } {
  const { step, tolerance, prev, prevPrev, maxDegrees = 8, bounds } = opts;
  let point = { ...p }; let kind: SnapKind = null;
  const gx = Math.round(p.x / step) * step, gy = Math.round(p.y / step) * step;
  if (Math.abs(gx - p.x) <= tolerance) { point.x = gx; kind = 'grid'; }
  if (Math.abs(gy - p.y) <= tolerance) { point.y = gy; kind = 'grid'; }
  if (prev) {
    const dx = p.x - prev.x, dy = p.y - prev.y, len = Math.hypot(dx, dy);
    if (len > 0) {
      const dirs: Array<[number, number]> = [[1, 0], [0, 1]];
      if (prevPrev) { const ex = prev.x - prevPrev.x, ey = prev.y - prevPrev.y, el = Math.hypot(ex, ey); if (el > 0) dirs.push([ex / el, ey / el], [-ey / el, ex / el]); }
      let best: { cos: number; dir: [number, number] } | null = null;
      for (const dir of dirs) { const cos = Math.abs((dx * dir[0] + dy * dir[1]) / len); if (!best || cos > best.cos) best = { cos, dir }; }
      if (best && best.cos >= Math.cos((maxDegrees * Math.PI) / 180) && best.cos < 1 - 1e-12) {
        const along = dx * best.dir[0] + dy * best.dir[1];
        point = { x: prev.x + along * best.dir[0], y: prev.y + along * best.dir[1] };
        kind = 'angle';
      }
    }
  }
  return { point: { x: Math.round(clamp(point.x, 0, bounds.width)), y: Math.round(clamp(point.y, 0, bounds.height)) }, kind };
}

/** Index of the corner within `radius` roof units of `p` (the closest), or -1. */
export function nearestCorner(p: Point, ring: Point[], radius: number): number {
  let best = -1, bestD = radius;
  ring.forEach((q, i) => { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d <= bestD) { best = i; bestD = d; } });
  return best;
}

/** The closed-ring edge within `radius` of `p`, with the point projected onto it, or null. Ends of edges are excluded. */
export function nearestEdge(p: Point, ring: Point[], radius: number): { index: number; point: Point } | null {
  if (ring.length < 3) return null;
  let best: { index: number; point: Point; d: number } | null = null;
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const vx = b.x - a.x, vy = b.y - a.y, len2 = vx * vx + vy * vy;
    if (!len2) return;
    const t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2;
    if (t <= 0.05 || t >= 0.95) return;
    const q = { x: a.x + t * vx, y: a.y + t * vy };
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d <= radius && (!best || d < best.d)) best = { index: i, point: { x: Math.round(q.x), y: Math.round(q.y) }, d };
  });
  return best ? { index: (best as any).index, point: (best as any).point } : null;
}

export const insertCorner = (ring: Point[], edge: number, p: Point) => [...ring.slice(0, edge + 1), p, ...ring.slice(edge + 1)];
export const removeCorner = (ring: Point[], index: number) => ring.filter((_, i) => i !== index);

/** Ray casting; points on an edge are not counted. Used to pick an obstacle to move. */
export function insidePolygon(p: Point, ring: Point[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export type ObstacleShape = 'polygon' | 'rect' | 'circle';
export const CIRCLE_SIDES = 16;
export function rectangleRing(c: Point, halfW: number, halfH: number): Point[] {
  const r = (v: number) => Math.round(v);
  return [{ x: r(c.x - halfW), y: r(c.y - halfH) }, { x: r(c.x + halfW), y: r(c.y - halfH) }, { x: r(c.x + halfW), y: r(c.y + halfH) }, { x: r(c.x - halfW), y: r(c.y + halfH) }];
}
/** A circle drawn as a regular polygon, because the API stores obstacles as polygons. */
export function circleRing(c: Point, radius: number, sides = CIRCLE_SIDES): Point[] {
  return Array.from({ length: sides }, (_, i) => { const a = (2 * Math.PI * i) / sides; return { x: Math.round(c.x + radius * Math.cos(a)), y: Math.round(c.y + radius * Math.sin(a)) }; });
}
export const ringCentre = (ring: Point[]) => ({ x: ring.reduce((n, p) => n + p.x, 0) / ring.length, y: ring.reduce((n, p) => n + p.y, 0) / ring.length });

/** Moves one corner. Rectangles stay rectangles (the opposite corner is fixed); circles keep their centre and change radius. */
export function dragShapeCorner(shape: ObstacleShape, ring: Point[], index: number, p: Point): Point[] {
  if (shape === 'rect' && ring.length === 4) {
    const o = ring[(index + 2) % 4];
    const c = { x: (o.x + p.x) / 2, y: (o.y + p.y) / 2 };
    const fresh = rectangleRing(c, Math.abs(p.x - o.x) / 2, Math.abs(p.y - o.y) / 2);
    return fresh;
  }
  if (shape === 'circle') { const c = ringCentre(ring); return circleRing(c, Math.max(1, Math.hypot(p.x - c.x, p.y - c.y)), ring.length); }
  return ring.map((q, i) => i === index ? p : q);
}
export const translateRing = (ring: Point[], dx: number, dy: number, bounds: { width: number; height: number }) => {
  const minX = Math.min(...ring.map(p => p.x)), maxX = Math.max(...ring.map(p => p.x)), minY = Math.min(...ring.map(p => p.y)), maxY = Math.max(...ring.map(p => p.y));
  const ddx = clamp(dx, -minX, bounds.width - maxX), ddy = clamp(dy, -minY, bounds.height - maxY);
  return ring.map(p => ({ x: Math.round(p.x + ddx), y: Math.round(p.y + ddy) }));
};

/**
 * One strip per roof edge, `inset` roof units wide, on the inside of the edge. A drawing aid only:
 * the server computes the real usable area with a mitred inward buffer, which this does not reproduce at corners.
 */
export function setbackStrips(ring: Point[], inset: number): Point[][] {
  if (ring.length < 3 || !(inset > 0)) return [];
  const signed = ring.reduce((n, p, i) => { const q = ring[(i + 1) % ring.length]; return n + p.x * q.y - q.x * p.y; }, 0);
  const s = signed > 0 ? 1 : -1;
  return ring.map((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = (-(b.y - a.y) / len) * s, ny = ((b.x - a.x) / len) * s;
    return [a, b, { x: b.x + nx * inset, y: b.y + ny * inset }, { x: a.x + nx * inset, y: a.y + ny * inset }];
  });
}

/** Undo/redo stacks of whole editor states. */
export type History<T> = { past: T[]; future: T[] };
export const emptyHistory = <T,>(): History<T> => ({ past: [], future: [] });
export const record = <T,>(h: History<T>, current: T, limit = 100): History<T> => ({ past: [...h.past.slice(-(limit - 1)), current], future: [] });
export function undo<T>(h: History<T>, current: T): { history: History<T>; state: T } | null {
  if (!h.past.length) return null;
  return { history: { past: h.past.slice(0, -1), future: [current, ...h.future] }, state: h.past[h.past.length - 1] };
}
export function redo<T>(h: History<T>, current: T): { history: History<T>; state: T } | null {
  if (!h.future.length) return null;
  return { history: { past: [...h.past, current], future: h.future.slice(1) }, state: h.future[0] };
}
