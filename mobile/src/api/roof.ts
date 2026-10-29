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
