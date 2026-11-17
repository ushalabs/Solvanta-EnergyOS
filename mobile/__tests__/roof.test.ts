import { parsePoints, formatPoints } from '../src/api/roof';
test('roof vertex edits retain coordinate units and reject incomplete entries', () => {
  expect(parsePoints('20,30; 80,90')).toEqual([{x:20,y:30},{x:80,y:90}]);
  expect(formatPoints(parsePoints('20,30; 80,90'))).toBe('20,30; 80,90');
  expect(() => parsePoints('20,')).toThrow();
  expect(() => parsePoints('NaN,30')).toThrow();
});

import { selfIntersects, defaultRectangle } from '../src/api/roof';
describe('outline helpers', () => {
  const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  test('a simple outline does not cross itself', () => { expect(selfIntersects(square)).toBe(false); });
  test('a bow-tie crosses itself', () => { expect(selfIntersects([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 10, y: 0 }, { x: 0, y: 10 }])).toBe(true); });
  test('fewer than 4 corners cannot cross', () => { expect(selfIntersects(square.slice(0, 3))).toBe(false); expect(selfIntersects([])).toBe(false); });
  test('a corner touching another edge counts', () => { expect(selfIntersects([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 8 }])).toBe(true); });
  test('the default rectangle is a valid outline inside the canvas', () => {
    const r = defaultRectangle(1000, 700);
    expect(r).toHaveLength(4);
    expect(selfIntersects(r)).toBe(false);
    expect(r.every(p => p.x >= 0 && p.x <= 1000 && p.y >= 0 && p.y <= 700)).toBe(true);
  });
});

import { panelGroups, usableWidthM, centroid } from '../src/api/roof';
describe('panel drawing helpers', () => {
  const p = (x: number, y: number) => ({ x, y, width: 10, height: 20 });
  test('touching panels form one group and far ones another', () => {
    const groups = panelGroups([p(0, 0), p(11, 0), p(22, 0), p(200, 200)], 2);
    expect(groups).toHaveLength(2);
    const big = groups.find(g => g.panels.length === 3)!;
    expect(big.bounds).toEqual({ x: 0, y: 0, width: 32, height: 20 });
  });
  test('rows stacked within the gap join the same group', () => { expect(panelGroups([p(0, 0), p(0, 21)], 2)).toHaveLength(1); });
  test('no panels, no groups', () => { expect(panelGroups([], 2)).toEqual([]); });
  test('usable width needs placement and a scale', () => {
    expect(usableWidthM([], 0.1)).toBeNull();
    expect(usableWidthM([p(0, 0)], 0)).toBeNull();
    const w = usableWidthM([p(10, 0), p(30, 0)], 0.5)!;
    expect(w.widthM).toBeCloseTo(15); expect([w.x1, w.x2]).toEqual([10, 40]);
  });
  test('centroid of a square', () => { expect(centroid([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }])).toEqual({ x: 5, y: 5 }); });
});
