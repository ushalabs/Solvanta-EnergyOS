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
