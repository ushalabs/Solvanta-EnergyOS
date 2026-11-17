import { clockLabel, formatKw, overviewNodes, stepAt } from '../src/api/overview';
import { flowPaths, nodeRects, pathD, polylineLength, sameSize } from '../src/components/energyFlowPaths';
import type { EnergyStep } from '../src/api/simulation';

const step = (minute: number, extra: Partial<EnergyStep> = {}): EnergyStep => ({
  minute, duration_hours: 0.25, pv_kw: 0, load_kw: 0, critical_kw: 0, grid_available: true, grid_import_kw: 0, grid_export_kw: 0,
  generator_kw: 0, charge_kw: 0, discharge_kw: 0, curtailed_kw: 0, unmet_kw: 0, unserved_critical_kw: 0,
  battery_start_kwh: 5, battery_end_kwh: 5, soc_pct: 50, balance_error_kw: 0, ...extra,
});
const day = { step_minutes: 15, trace: Array.from({ length: 96 }, (_, i) => step(i * 15)) };
const at = (h: number, m: number) => new Date(2026, 10, 17, h, m);

describe('stepAt', () => {
  test.each([
    [0, 0, 0], [0, 14, 0], [0, 15, 15], [12, 7, 720], [12, 59, 765], [23, 59, 1425],
  ])('%i:%i falls in the interval starting at minute %i', (h, m, minute) => {
    expect(stepAt(day, at(h, m))!.minute).toBe(minute);
  });
  test('no run, or a run with no intervals, gives nothing', () => {
    expect(stepAt(null, at(12, 0))).toBeNull();
    expect(stepAt(undefined, at(12, 0))).toBeNull();
    expect(stepAt({ step_minutes: 15, trace: [] }, at(12, 0))).toBeNull();
  });
  test('a shorter trace stops at its last interval instead of reading past the end', () => {
    expect(stepAt({ step_minutes: 15, trace: day.trace.slice(0, 4) }, at(18, 0))!.minute).toBe(45);
  });
  test('other step sizes are honoured, and a bad step size falls back to 15 minutes', () => {
    const hourly = { step_minutes: 60, trace: Array.from({ length: 24 }, (_, i) => step(i * 60)) };
    expect(stepAt(hourly, at(13, 40))!.minute).toBe(780);
    expect(stepAt({ ...day, step_minutes: 0 }, at(1, 0))!.minute).toBe(60);
  });
});

describe('overviewNodes', () => {
  test('nothing in, nothing out', () => {
    expect(overviewNodes(null)).toBeNull();
  });
  test('sources flow toward the hub and the home away from it', () => {
    const n = overviewNodes(step(720, { pv_kw: 4.2, load_kw: 2.9, grid_import_kw: 0.8, discharge_kw: 2.1, soc_pct: 61 }))!;
    expect(n).toMatchObject({ minute: 720, solarKw: 4.2, gridKw: 0.8, batteryKw: 2.1, homeKw: 2.9, socPct: 61, gridAvailable: true });
    expect(n.flows).toEqual({ solar: 'in', grid: 'in', battery: 'in', home: 'out' });
  });
  test('charging and exporting are negative and flow away from the hub', () => {
    const n = overviewNodes(step(720, { pv_kw: 5, charge_kw: 1.5, grid_export_kw: 2 }))!;
    expect(n.batteryKw).toBe(-1.5);
    expect(n.gridKw).toBe(-2);
    expect(n.flows).toMatchObject({ battery: 'out', grid: 'out' });
  });
  test('idle nodes have no flow', () => {
    expect(overviewNodes(step(0))!.flows).toEqual({ solar: null, grid: null, battery: null, home: null });
    expect(overviewNodes(step(0, { pv_kw: 0.004 }))!.flows.solar).toBeNull();
  });
  test('unmet demand is not shown as power delivered to the home', () => {
    const n = overviewNodes(step(600, { load_kw: 3, unmet_kw: 1.2, grid_available: false }))!;
    expect(n.homeKw).toBeCloseTo(1.8);
    expect(n.unmetKw).toBe(1.2);
    expect(n.gridAvailable).toBe(false);
  });
  test('served load never goes negative', () => {
    expect(overviewNodes(step(0, { load_kw: 1, unmet_kw: 1.5 }))!.homeKw).toBe(0);
  });
});

describe('formatting', () => {
  test('missing readings become a dash, never a zero', () => {
    expect(formatKw(undefined)).toBe('—');
    expect(formatKw(null)).toBe('—');
    expect(formatKw(NaN)).toBe('—');
    expect(formatKw(0)).toBe('0.00');
  });
  test('power shows as a magnitude; direction is given in words elsewhere', () => {
    expect(formatKw(-1.5)).toBe('1.50');
    expect(formatKw(4.234)).toBe('4.23');
  });
  test('clock labels', () => {
    expect(clockLabel(0)).toBe('00:00');
    expect(clockLabel(725)).toBe('12:05');
    expect(clockLabel(1425)).toBe('23:45');
  });
});

describe('flowPaths', () => {
  // Two columns of 160 with a 16 gap, two rows of 64 with a 20 gap, starting 300 down the component.
  const layout = {
    originY: 270,
    solar: { x: 0, y: 300, width: 160, height: 64 }, grid: { x: 176, y: 300, width: 160, height: 64 },
    battery: { x: 0, y: 384, width: 160, height: 64 }, home: { x: 176, y: 384, width: 160, height: 64 },
  };
  const p = flowPaths(layout);
  const last = (points: Array<{ x: number; y: number }>) => points[points.length - 1];

  test('the hub sits in the middle of the gaps between the four cards', () => {
    expect(p.hub).toEqual({ x: 168, y: 374 });
  });
  test('the main line drops straight from the house to the hub', () => {
    expect(p.main).toEqual([{ x: 168, y: 270 }, { x: 168, y: 374 }]);
  });
  test('each branch starts at the hub and ends on its card edge', () => {
    for (const key of ['solar', 'grid', 'battery', 'home'] as const) expect(p[key][0]).toEqual(p.hub);
    expect(last(p.solar).y).toBe(364);
    expect(last(p.home).y).toBe(384);
    expect(last(p.grid)).toEqual({ x: 176, y: 332 });
    expect(last(p.battery)).toEqual({ x: 160, y: 416 });
    expect(last(p.solar).x).toBeGreaterThan(layout.solar.x);
    expect(last(p.solar).x).toBeLessThan(layout.solar.x + layout.solar.width);
    expect(last(p.home).x).toBeGreaterThan(layout.home.x);
    expect(last(p.home).x).toBeLessThan(layout.home.x + layout.home.width);
  });
  test('every branch is three points with one right-angle turn', () => {
    for (const key of ['solar', 'grid', 'battery', 'home'] as const) {
      const [a, b, c] = p[key];
      expect(p[key]).toHaveLength(3);
      const firstHorizontal = a.y === b.y; const secondHorizontal = b.y === c.y;
      expect(a.x === b.x || firstHorizontal).toBe(true);
      expect(b.x === c.x || secondHorizontal).toBe(true);
      expect(firstHorizontal).not.toBe(secondHorizontal);
    }
  });
  test('lines stay in the gaps: nothing crosses a card', () => {
    const inside = (pt: { x: number; y: number }, r: typeof layout.solar) => pt.x > r.x + 0.5 && pt.x < r.x + r.width - 0.5 && pt.y > r.y + 0.5 && pt.y < r.y + r.height - 0.5;
    for (const key of ['main', 'solar', 'grid', 'battery', 'home'] as const)
      for (const pt of p[key])
        for (const card of [layout.solar, layout.grid, layout.battery, layout.home]) expect(inside(pt, card)).toBe(false);
  });
  test('follows the measured layout: wider cards and taller rows move the hub and the ends', () => {
    const wide = flowPaths({
      originY: 100,
      solar: { x: 0, y: 200, width: 250, height: 90 }, grid: { x: 270, y: 200, width: 250, height: 90 },
      battery: { x: 0, y: 320, width: 250, height: 110 }, home: { x: 270, y: 320, width: 250, height: 110 },
    });
    expect(wide.hub).toEqual({ x: 260, y: 305 });
    expect(last(wide.battery)).toEqual({ x: 250, y: 375 });
    expect(wide.main[0]).toEqual({ x: 260, y: 100 });
  });
  test('uneven card heights in a row still put the hub below the taller one', () => {
    const uneven = flowPaths({ ...layout, grid: { ...layout.grid, height: 80 }, battery: { ...layout.battery, y: 400 }, home: { ...layout.home, y: 400 } });
    expect(uneven.hub.y).toBe(390);
  });
});

describe('path helpers', () => {
  test('length adds up the segments', () => {
    expect(polylineLength([{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 40 }])).toBe(70);
    expect(polylineLength([{ x: 0, y: 0 }])).toBe(0);
  });
  test('path data is a move followed by lines', () => {
    expect(pathD([{ x: 1, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 9 }])).toBe('M1 2 L3 2 L3 9');
  });
  test('sameSize ignores sub-pixel jitter but not real changes', () => {
    const r = { width: 100, height: 50 };
    expect(sameSize(undefined, r)).toBe(false);
    expect(sameSize(r, { ...r, width: 100.2 })).toBe(true);
    expect(sameSize(r, { ...r, height: 52 })).toBe(false);
  });
});

describe('nodeRects', () => {
  const card = { width: 160, height: 64 };
  test('places two columns against the edges and two rows below the top block', () => {
    expect(nodeRects({ top: 300, width: 336, rowGap: 20, solar: card, grid: card, battery: card, home: card })).toEqual({
      solar: { x: 0, y: 300, width: 160, height: 64 }, grid: { x: 176, y: 300, width: 160, height: 64 },
      battery: { x: 0, y: 384, width: 160, height: 64 }, home: { x: 176, y: 384, width: 160, height: 64 },
    });
  });
  test('the taller card sets its row, so the second row moves down with it', () => {
    const r = nodeRects({ top: 0, width: 336, rowGap: 20, solar: { width: 160, height: 90 }, grid: card, battery: { width: 160, height: 104 }, home: card });
    expect(r.grid.height).toBe(90);
    expect(r.battery.y).toBe(110);
    expect(r.home).toEqual({ x: 176, y: 110, width: 160, height: 104 });
  });
  test('a taller top block moves every card down by the same amount', () => {
    const a = nodeRects({ top: 100, width: 336, rowGap: 20, solar: card, grid: card, battery: card, home: card });
    const b = nodeRects({ top: 250, width: 336, rowGap: 20, solar: card, grid: card, battery: card, home: card });
    for (const key of ['solar', 'grid', 'battery', 'home'] as const) expect(b[key].y - a[key].y).toBe(150);
  });
});
