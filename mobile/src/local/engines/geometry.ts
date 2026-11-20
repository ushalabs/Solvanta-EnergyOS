// Conservative fixed-orientation grid placement; not a global packing optimum.
// Port of backend/app/services/geometry.py. Shapely's mitre buffers are done with Clipper (pure JS, same mitre joins).
import * as ClipperLib from 'clipper-lib';

export type Point = { x: number; y: number };
export type RoofInput = {
  width: number; height: number; boundary: Point[]; obstacles: Point[][]; scale_points: Point[];
  scale_distance_m: number; setback_m: number; panel_width_m: number; panel_height_m: number;
  gap_m: number; image_data: string | null;
};
export type Panel = { x: number; y: number; width: number; height: number };

/** Clipper works on integers: 1 unit = 1 micrometre in roof metres (the canvas is at most 200 m). */
const SCALE = 1e6;
const MITRE_LIMIT = 5; // Shapely's default mitre ratio limit
const EPS = 1e-7;

type Ring = Point[];

export function signedArea(ring: Ring): number {
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    total += a.x * b.y - b.x * a.y;
  }
  return total / 2;
}

const toPath = (ring: Ring): ClipperLib.Path => ring.map(p => ({ X: Math.round(p.x * SCALE), Y: Math.round(p.y * SCALE) }));
const fromPath = (path: ClipperLib.Path): Ring => path.map(p => ({ x: p.X / SCALE, y: p.Y / SCALE }));

function offset(rings: Ring[], delta: number): ClipperLib.Paths {
  const co = new ClipperLib.ClipperOffset(MITRE_LIMIT, 0.25);
  for (const ring of rings) co.AddPath(toPath(ring), ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  const out: ClipperLib.Paths = [];
  co.Execute(out, delta * SCALE);
  return out;
}

function difference(subject: ClipperLib.Paths, clip: ClipperLib.Paths): ClipperLib.Paths {
  if (!clip.length) return subject;
  const c = new ClipperLib.Clipper();
  c.AddPaths(subject, ClipperLib.PolyType.ptSubject, true);
  c.AddPaths(clip, ClipperLib.PolyType.ptClip, true);
  const out: ClipperLib.Paths = [];
  c.Execute(ClipperLib.ClipType.ctDifference, out, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return out;
}

const pathsArea = (paths: ClipperLib.Paths) => paths.reduce((t, p) => t + ClipperLib.Clipper.Area(p), 0) / (SCALE * SCALE);

function onSegment(p: Point, a: Point, b: Point): boolean {
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (Math.abs(cross) > EPS * Math.max(length, 1)) return false;
  return p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS && p.y >= Math.min(a.y, b.y) - EPS && p.y <= Math.max(a.y, b.y) + EPS;
}

/** Ray casting; points on the ring count as inside (Shapely's covers is boundary-inclusive). */
function inRing(p: Point, ring: Ring): 'in' | 'on' | 'out' {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (onSegment(p, a, b)) return 'on';
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside ? 'in' : 'out';
}

/** Inside or on a region given as outer rings (positive area) and holes (negative area). */
function inRegion(p: Point, rings: Ring[], signs: number[]): boolean {
  let winding = 0;
  for (let i = 0; i < rings.length; i++) {
    const where = inRing(p, rings[i]);
    if (where === 'on') return true;
    if (where === 'in') winding += signs[i];
  }
  return winding > 0;
}

/** True when some part of segment a-b lies strictly inside the open rectangle. */
function crossesInterior(a: Point, b: Point, x0: number, y0: number, x1: number, y1: number): boolean {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  const clips: Array<[number, number]> = [[-dx, a.x - x0], [dx, x1 - a.x], [-dy, a.y - y0], [dy, y1 - a.y]];
  for (const [p, q] of clips) {
    if (Math.abs(p) < 1e-15) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  if (t1 - t0 <= 1e-12) return false;
  const mx = a.x + dx * (t0 + t1) / 2, my = a.y + dy * (t0 + t1) / 2;
  return mx > x0 + EPS && mx < x1 - EPS && my > y0 + EPS && my < y1 - EPS;
}

function coversBox(rings: Ring[], signs: number[], x0: number, y0: number, x1: number, y1: number): boolean {
  const corners = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  if (!corners.every(c => inRegion(c, rings, signs))) return false;
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      if (crossesInterior(ring[i], ring[(i + 1) % ring.length], x0, y0, x1, y1)) return false;
    }
  }
  return true;
}

export function placePanels(data: RoofInput) {
  const [a, b] = data.scale_points;
  const scale = data.scale_distance_m / Math.hypot(a.x - b.x, a.y - b.y);
  const toMetres = (points: Point[]) => points.map(p => ({ x: p.x * scale, y: p.y * scale }));
  const roof = toMetres(data.boundary);
  let usable = offset([roof], -data.setback_m);
  if (data.obstacles.length) usable = difference(usable, offset(data.obstacles.map(toMetres), data.setback_m));
  const rings = usable.map(fromPath);
  const signs = usable.map(p => (ClipperLib.Clipper.Area(p) >= 0 ? 1 : -1));
  const panels: Panel[] = [];
  const allPoints = rings.flat();
  if (allPoints.length) {
    const minx = Math.min(...allPoints.map(p => p.x)), maxx = Math.max(...allPoints.map(p => p.x));
    const miny = Math.min(...allPoints.map(p => p.y)), maxy = Math.max(...allPoints.map(p => p.y));
    const dx = data.panel_width_m + data.gap_m, dy = data.panel_height_m + data.gap_m;
    const cols = Math.max(0, Math.floor((maxx - minx - data.panel_width_m) / dx) + 1);
    const rows = Math.max(0, Math.floor((maxy - miny - data.panel_height_m) / dy) + 1);
    if (cols * rows > 40000) throw new Error('Placement exceeds 40,000 candidates; reduce canvas size or increase panel footprint');
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = minx + col * dx, y = miny + row * dy;
        if (coversBox(rings, signs, x, y, x + data.panel_width_m, y + data.panel_height_m)) {
          panels.push({ x: x / scale, y: y / scale, width: data.panel_width_m / scale, height: data.panel_height_m / scale });
        }
      }
    }
  }
  const round4 = (v: number) => Math.round(v * 1e4) / 1e4;
  return {
    roof_area_m2: round4(Math.abs(signedArea(roof))), usable_area_m2: round4(Math.max(0, pathsArea(usable))),
    panel_count: panels.length, panels, meters_per_pixel: scale,
    method: 'Fixed grid, measured scale; preliminary, no structural or shading assessment',
  };
}

// ---- Validation helpers used by the roof input schema ----

function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return onSegment(p1, p3, p4) || onSegment(p2, p3, p4) || onSegment(p3, p1, p2) || onSegment(p4, p1, p2);
}

/** Shapely-style validity for one ring: at least 3 distinct vertices and no self-intersection. */
export function isSimplePolygon(points: Point[]): boolean {
  const ring = points.filter((p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y);
  while (ring.length > 1 && ring[0].x === ring[ring.length - 1].x && ring[0].y === ring[ring.length - 1].y) ring.pop();
  const n = ring.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      const c = ring[j], d = ring[(j + 1) % n];
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) {
        // Adjacent edges share one vertex; they must not fold back over each other.
        const shared = j === i + 1 ? b : a;
        const other1 = j === i + 1 ? a : b, other2 = j === i + 1 ? d : c;
        if (onSegment(other2, shared, other1) || onSegment(other1, shared, other2)) return false;
      } else if (segmentsIntersect(a, b, c, d)) {
        return false;
      }
    }
  }
  return true;
}

/** Shapely covers(): `inner` has no area outside `outer`. */
export function polygonCovers(outer: Point[], inner: Point[]): boolean {
  const outside = difference([toPath(inner)], [toPath(outer)]);
  return Math.abs(pathsArea(outside)) < 1e-6;
}
