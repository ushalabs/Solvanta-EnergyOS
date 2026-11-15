import type { Layout } from '../api/roof';

export type Vec3 = [number, number, number];
export type ARPanel = { key: string; position: Vec3; rotation: Vec3; width: number; height: number };
export type ARLayout = { panels: ARPanel[]; spanX_m: number; spanZ_m: number };

/** Viro quads face +Z. This turns them to face +Y, the normal of a detected plane. */
export const FLAT_ON_PLANE: Vec3 = [-90, 0, 0];
/** Keeps panels just above the plane so the two surfaces do not flicker against each other. */
export const PANEL_LIFT_M = 0.01;

/**
 * Convert a saved roof layout (image pixels, y down) to plane-local metres, centred on the point the
 * user taps. Seen from above with -Z ahead, image +x is +X and image +y is +Z, so the layout is not mirrored.
 * Scale comes only from the roof's meters_per_pixel, which came from the user's measured distance.
 */
export function layoutToAR(layout: Pick<Layout, 'panels' | 'meters_per_pixel'>): ARLayout {
  const scale = layout.meters_per_pixel;
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('The saved roof has no usable scale. Mark the scale in the 2D layout and save again.');
  const valid = layout.panels.every(p => [p.x, p.y, p.width, p.height].every(Number.isFinite) && p.width > 0 && p.height > 0);
  if (!valid) throw new Error('The saved roof layout has an invalid panel. Recalculate and save it in the 2D layout.');
  if (layout.panels.length === 0) return { panels: [], spanX_m: 0, spanZ_m: 0 };

  const minX = Math.min(...layout.panels.map(p => p.x));
  const maxX = Math.max(...layout.panels.map(p => p.x + p.width));
  const minY = Math.min(...layout.panels.map(p => p.y));
  const maxY = Math.max(...layout.panels.map(p => p.y + p.height));
  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;

  return {
    spanX_m: (maxX - minX) * scale,
    spanZ_m: (maxY - minY) * scale,
    panels: layout.panels.map((p, i) => ({
      key: `panel-${i}`,
      position: [(p.x + p.width / 2 - centreX) * scale, PANEL_LIFT_M, (p.y + p.height / 2 - centreY) * scale],
      rotation: FLAT_ON_PLANE,
      width: p.width * scale,
      height: p.height * scale,
    })),
  };
}
