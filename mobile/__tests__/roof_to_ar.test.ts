import { FLAT_ON_PLANE, layoutToAR, PANEL_LIFT_M } from '../src/ar/roofToAr';

const panel = (x: number, y: number, width = 100, height = 200) => ({ x, y, width, height });

describe('layoutToAR', () => {
  test('converts panel size from roof pixels to metres with meters_per_pixel', () => {
    const { panels } = layoutToAR({ meters_per_pixel: 0.015, panels: [panel(10, 10, 73.33, 133.33)] });
    expect(panels[0].width).toBeCloseTo(1.1, 3);
    expect(panels[0].height).toBeCloseTo(2, 3);
  });

  test('doubling meters_per_pixel doubles every size and offset', () => {
    const panels = [panel(0, 0), panel(300, 400)];
    const a = layoutToAR({ meters_per_pixel: 0.01, panels });
    const b = layoutToAR({ meters_per_pixel: 0.02, panels });
    expect(b.panels[1].width).toBeCloseTo(a.panels[1].width * 2);
    expect(b.panels[1].position[0]).toBeCloseTo(a.panels[1].position[0] * 2);
    expect(b.panels[1].position[2]).toBeCloseTo(a.panels[1].position[2] * 2);
    expect(b.spanX_m).toBeCloseTo(a.spanX_m * 2);
  });

  test('a single panel sits on the tap point', () => {
    const [only] = layoutToAR({ meters_per_pixel: 0.01, panels: [panel(500, 300)] }).panels;
    expect(only.position[0]).toBeCloseTo(0);
    expect(only.position[2]).toBeCloseTo(0);
  });

  test('centres the layout on its bounding box, whatever its place on the roof image', () => {
    const near = layoutToAR({ meters_per_pixel: 0.01, panels: [panel(0, 0), panel(200, 0)] });
    const far = layoutToAR({ meters_per_pixel: 0.01, panels: [panel(700, 500), panel(900, 500)] });
    expect(near.panels[0].position[0]).toBeCloseTo(-1);
    expect(near.panels[1].position[0]).toBeCloseTo(1);
    expect(far.panels.map(p => p.position)).toEqual(near.panels.map(p => p.position));
  });

  test('keeps the plan orientation: image right is +X and image down is +Z, with no mirroring', () => {
    const { panels } = layoutToAR({ meters_per_pixel: 0.01, panels: [panel(0, 0), panel(400, 0), panel(0, 600)] });
    const [origin, right, below] = panels;
    expect(right.position[0]).toBeGreaterThan(origin.position[0]);
    expect(right.position[2]).toBeCloseTo(origin.position[2]);
    expect(below.position[2]).toBeGreaterThan(origin.position[2]);
    expect(below.position[0]).toBeCloseTo(origin.position[0]);
    // Clockwise on the image (origin, right, below) stays clockwise seen from above (+Y looking down).
    const cross = (right.position[0] - origin.position[0]) * (below.position[2] - origin.position[2]) - (right.position[2] - origin.position[2]) * (below.position[0] - origin.position[0]);
    expect(cross).toBeGreaterThan(0);
  });

  test('preserves the measured distance between panels', () => {
    const { panels } = layoutToAR({ meters_per_pixel: 0.02, panels: [panel(100, 100), panel(400, 500)] });
    const distance = Math.hypot(panels[1].position[0] - panels[0].position[0], panels[1].position[2] - panels[0].position[2]);
    expect(distance).toBeCloseTo(Math.hypot(300, 400) * 0.02);
  });

  test('reports the span of the whole layout, panel edges included', () => {
    const { spanX_m, spanZ_m } = layoutToAR({ meters_per_pixel: 0.01, panels: [panel(0, 0, 100, 200), panel(400, 300, 100, 200)] });
    expect(spanX_m).toBeCloseTo(5);
    expect(spanZ_m).toBeCloseTo(5);
  });

  test('lays every panel flat, just above the plane, with a unique key', () => {
    const { panels } = layoutToAR({ meters_per_pixel: 0.01, panels: [panel(0, 0), panel(200, 0), panel(400, 0)] });
    for (const p of panels) {
      expect(p.rotation).toEqual(FLAT_ON_PLANE);
      expect(p.position[1]).toBe(PANEL_LIFT_M);
    }
    expect(FLAT_ON_PLANE).toEqual([-90, 0, 0]);
    expect(new Set(panels.map(p => p.key)).size).toBe(3);
  });

  test('returns an empty layout for no panels', () => {
    expect(layoutToAR({ meters_per_pixel: 0.01, panels: [] })).toEqual({ panels: [], spanX_m: 0, spanZ_m: 0 });
  });

  test.each([[0], [-0.01], [NaN], [Infinity]])('refuses meters_per_pixel of %s rather than guessing a scale', scale => {
    expect(() => layoutToAR({ meters_per_pixel: scale, panels: [panel(0, 0)] })).toThrow(/no usable scale/);
  });

  test.each([
    ['NaN x', { ...panel(0, 0), x: NaN }],
    ['infinite y', { ...panel(0, 0), y: Infinity }],
    ['zero width', panel(0, 0, 0, 200)],
    ['negative height', panel(0, 0, 100, -5)],
  ])('refuses a panel with %s', (_name, bad) => {
    expect(() => layoutToAR({ meters_per_pixel: 0.01, panels: [panel(0, 0), bad] })).toThrow(/invalid panel/);
  });

  test('does not change its input', () => {
    const input = { meters_per_pixel: 0.01, panels: [panel(10, 20)] };
    const copy = JSON.parse(JSON.stringify(input));
    layoutToAR(input);
    expect(input).toEqual(copy);
  });
});
