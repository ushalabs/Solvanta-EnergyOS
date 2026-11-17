import { socPoints, project, linePath, areaPath, summarize, describeSeries, bandRects, clock } from '../src/api/lineChart';

const box = { left: 40, top: 10, width: 200, height: 100 };
const X: [number, number] = [0, 1440], Y: [number, number] = [0, 100];

describe('socPoints', () => {
  test('maps a trace to minute and battery level', () => {
    expect(socPoints([{ minute: 0, soc_pct: 60 }, { minute: 15, soc_pct: 58.5 }])).toEqual([{ x: 0, y: 60 }, { x: 15, y: 58.5 }]);
  });
  test('skips steps without a number rather than inventing one', () => {
    expect(socPoints([{ minute: 0, soc_pct: 60 }, { minute: 15 }, { soc_pct: 50 }, { minute: 30, soc_pct: NaN }, { minute: 45, soc_pct: 55 }])).toEqual([{ x: 0, y: 60 }, { x: 45, y: 55 }]);
  });
  test('no trace gives no points', () => { expect(socPoints(null)).toEqual([]); expect(socPoints(undefined)).toEqual([]); expect(socPoints([])).toEqual([]); });
});

describe('project', () => {
  test('puts the domain corners on the plot corners, with y pointing up', () => {
    expect(project({ x: 0, y: 0 }, X, Y, box)).toEqual({ x: 40, y: 110 });
    expect(project({ x: 1440, y: 100 }, X, Y, box)).toEqual({ x: 240, y: 10 });
    expect(project({ x: 720, y: 50 }, X, Y, box)).toEqual({ x: 140, y: 60 });
  });
  test('values outside the domain are held at the edge', () => {
    expect(project({ x: -50, y: 130 }, X, Y, box)).toEqual({ x: 40, y: 10 });
    expect(project({ x: 2000, y: -5 }, X, Y, box)).toEqual({ x: 240, y: 110 });
  });
});

describe('paths', () => {
  const pts = [{ x: 0, y: 100 }, { x: 720, y: 50 }, { x: 1440, y: 0 }];
  test('a line goes through each point in order', () => {
    expect(linePath(pts, X, Y, box)).toBe('M40,10 L140,60 L240,110');
  });
  test('no points, no path', () => { expect(linePath([], X, Y, box)).toBe(''); expect(areaPath([], X, Y, box)).toBe(''); expect(areaPath(pts.slice(0, 1), X, Y, box)).toBe(''); });
  test('one point still draws a dot', () => { expect(linePath([{ x: 720, y: 50 }], X, Y, box)).toMatch(/^M140,60 l0\.01,0$/); });
  test('the area closes down to the bottom of the plot', () => {
    expect(areaPath(pts, X, Y, box)).toBe('M40,10 L140,60 L240,110 L240,110 L40,110 Z');
  });
});

describe('summaries', () => {
  const pts = [{ x: 0, y: 80 }, { x: 600, y: 35.4 }, { x: 1425, y: 60 }];
  test('start, end and lowest point', () => { expect(summarize(pts)).toEqual({ start: 80, end: 60, min: 35.4, minAt: 600 }); expect(summarize([])).toBeNull(); });
  test('one sentence per series, with the lowest time as a clock', () => {
    expect(describeSeries('Current plan', pts)).toBe('Current plan: starts at 80%, ends at 60%, lowest 35% at 10:00.');
  });
  test('a series without data says so', () => { expect(describeSeries('Optimized plan', [])).toBe('Optimized plan: no data.'); });
  test('clock formats minutes', () => { expect(clock(0)).toBe('00:00'); expect(clock(485)).toBe('08:05'); expect(clock(1440)).toBe('24:00'); });
});

describe('outage bands', () => {
  test('maps spans to x and width, clipped to the domain', () => {
    expect(bandRects([{ from: 360, to: 720 }], X, box)).toEqual([{ x: 90, width: 50 }]);
    expect(bandRects([{ from: -100, to: 100 }, { from: 1400, to: 1600 }], X, box)).toEqual([{ x: 40, width: expect.closeTo(13.9, 1) }, { x: expect.closeTo(234.4, 1), width: expect.closeTo(5.6, 1) }]);
  });
  test('empty or outside spans are dropped', () => {
    expect(bandRects([{ from: 500, to: 500 }, { from: 2000, to: 3000 }, { from: 900, to: 800 }], X, box)).toEqual([]);
  });
});
