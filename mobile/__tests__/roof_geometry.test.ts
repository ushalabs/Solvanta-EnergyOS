import { emptyRoof, formatPoints, parsePoints, screenPx, tapToRoofPoint } from '../src/api/roof';

describe('tapToRoofPoint', () => {
  test('maps canvas corners and centre to roof units', () => {
    expect(tapToRoofPoint(0, 0, 300, 1000)).toEqual({ x: 0, y: 0 });
    expect(tapToRoofPoint(150, 105, 300, 1000)).toEqual({ x: 500, y: 350 });
    expect(tapToRoofPoint(300, 210, 300, 1000)).toEqual({ x: 1000, y: 700 });
  });
  test('rounds to whole roof units', () => {
    expect(tapToRoofPoint(1, 1, 300, 1000)).toEqual({ x: 3, y: 3 });
  });
  test('does not produce NaN or Infinity before the canvas has been measured', () => {
    const p = tapToRoofPoint(10, 20, 0, 1000);
    expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
  });
  test('uses the same scale on both axes, so a portrait roof is not stretched', () => {
    expect(tapToRoofPoint(150, 300, 300, 1000, 2000)).toEqual({ x: 500, y: 1000 });
  });
  test.each([320, 342, 354, 376, 412, 1024])('keeps the canvas corner at a view width of %d', viewWidth => {
    expect(tapToRoofPoint(viewWidth, viewWidth * 0.7, viewWidth, 1000, 700)).toEqual({ x: 1000, y: 700 });
  });
  test('clamps a release outside the canvas, because the API rejects such points', () => {
    expect(tapToRoofPoint(-20, -1, 300, 1000, 700)).toEqual({ x: 0, y: 0 });
    expect(tapToRoofPoint(900, 900, 300, 1000, 700)).toEqual({ x: 1000, y: 700 });
    expect(tapToRoofPoint(150, 900, 300, 1000, 700)).toEqual({ x: 500, y: 700 });
  });
  test('never returns negative zero', () => {
    expect(Object.is(tapToRoofPoint(-0.1, -0.1, 300, 1000, 700).x, -0)).toBe(false);
  });
});

describe('screenPx', () => {
  test('keeps a marker the requested size on screen', () => {
    expect(screenPx(7, 300, 1000) * 300 / 1000).toBeCloseTo(7);
    expect(screenPx(7, 1000, 1000)).toBe(7);
  });
  test('falls back to the requested size when the canvas is unmeasured', () => {
    expect(screenPx(7, 0, 1000)).toBe(7);
  });
  test('grows in roof units as the canvas shrinks, so markers stay tappable-sized', () => {
    expect(screenPx(5, 150, 1000)).toBeGreaterThan(screenPx(5, 600, 1000));
  });
});

describe('emptyRoof', () => {
  test('has the documented defaults', () => {
    const r = emptyRoof();
    expect([r.width, r.height]).toEqual([1000, 700]);
    expect(r.boundary).toEqual([]);
    expect(r.obstacles).toEqual([]);
    expect(r.scale_points).toEqual([]);
    expect(r.scale_distance_m).toBe(0);
    expect(r.image_data).toBeNull();
    expect([r.setback_m, r.panel_width_m, r.panel_height_m, r.gap_m]).toEqual([0.5, 1.1, 2, 0.1]);
  });
  test('returns independent objects', () => {
    const a = emptyRoof(); const b = emptyRoof();
    a.boundary.push({ x: 1, y: 1 });
    expect(b.boundary).toEqual([]);
  });
  test('defaults stay inside the limits the API enforces', () => {
    const r = emptyRoof();
    expect(r.panel_width_m).toBeGreaterThanOrEqual(0.5);
    expect(r.panel_width_m).toBeLessThanOrEqual(3);
    expect(r.panel_height_m).toBeGreaterThanOrEqual(0.5);
    expect(r.panel_height_m).toBeLessThanOrEqual(4);
    expect(r.gap_m).toBeGreaterThanOrEqual(0.02);
    expect(r.setback_m).toBeGreaterThanOrEqual(0);
  });
});

describe('parsePoints / formatPoints', () => {
  test('empty and blank input means no vertices', () => {
    expect(parsePoints('')).toEqual([]);
    expect(parsePoints('   ')).toEqual([]);
  });
  test('accepts decimals, negatives and extra spaces', () => {
    expect(parsePoints(' 1.5 , -2 ; 3 , 4 ')).toEqual([{ x: 1.5, y: -2 }, { x: 3, y: 4 }]);
  });
  test.each(['1,2;', '1,2,3', ',', '5', 'Infinity,1', '1,abc', ';'])('rejects malformed input %p', bad => {
    expect(() => parsePoints(bad)).toThrow();
  });
  test('formatPoints rounds and handles empty input', () => {
    expect(formatPoints([{ x: 1.4, y: 2.6 }])).toBe('1,3');
    expect(formatPoints([])).toBe('');
  });
  test('format then parse round-trips whole-number roofs', () => {
    const roof = [{ x: 80, y: 80 }, { x: 920, y: 80 }, { x: 920, y: 620 }, { x: 80, y: 620 }];
    expect(parsePoints(formatPoints(roof))).toEqual(roof);
  });
  test('tap to text to parse keeps the same vertex', () => {
    const p = tapToRoofPoint(123, 77, 342, 1000, 700);
    expect(parsePoints(formatPoints([p]))).toEqual([p]);
  });
  test('the error tells the user the expected format', () => {
    expect(() => parsePoints('nonsense')).toThrow('Use x,y; x,y coordinates');
  });
});
