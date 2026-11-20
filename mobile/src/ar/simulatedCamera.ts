// Camera maths for the simulated AR preview: plane-local metres to a perspective image, no rendering.
import type { ARLayout } from './roofToAr';

export type P2 = [number, number];

/** A camera standing in front of the layout, looking down at it from above eye height, turned slightly. */
export function makeProjector(layout: Pick<ARLayout, 'spanX_m' | 'spanZ_m'>, yawDeg = 28) {
  const span = Math.max(layout.spanX_m, layout.spanZ_m, 2);
  const distance = span * 1.35, height = span * 0.95;
  const yaw = yawDeg * Math.PI / 180, pitch = Math.atan2(height, distance);
  return (x: number, y: number, z: number): P2 => {
    const xr = x * Math.cos(yaw) - z * Math.sin(yaw);
    const zr = x * Math.sin(yaw) + z * Math.cos(yaw);
    const dy = y - height, dz = zr - distance;
    const yc = dy * Math.cos(pitch) - dz * Math.sin(pitch);
    const zc = dy * Math.sin(pitch) + dz * Math.cos(pitch);
    return [xr / -zc, -yc / -zc];
  };
}
