// The simulated AR camera: a perspective view from in front of and above the layout.
import { makeProjector } from '../src/ar/simulatedCamera';

test('nearer points sit lower on screen and the far edge looks narrower', () => {
  const project = makeProjector({ spanX_m: 8, spanZ_m: 5 }, 0);
  const [, nearY] = project(0, 0, 2.5), [, farY] = project(0, 0, -2.5);
  expect(nearY).toBeGreaterThan(farY);
  const nearWidth = project(4, 0, 2.5)[0] - project(-4, 0, 2.5)[0];
  const farWidth = project(4, 0, -2.5)[0] - project(-4, 0, -2.5)[0];
  expect(nearWidth).toBeGreaterThan(farWidth);
  // Raised points (the panels) appear above the plane beneath them.
  expect(project(0, 0.5, 0)[1]).toBeLessThan(project(0, 0, 0)[1]);
});
