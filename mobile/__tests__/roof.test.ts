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

import { roofProblem, obstacleProblem, friendlyRoofError } from '../src/api/roof';
describe('geometry validation', () => {
  const roof = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
  const tri = [{ x: 10, y: 10 }, { x: 40, y: 10 }, { x: 40, y: 40 }];
  test('a good roof passes and bad ones say why', () => {
    expect(roofProblem(roof)).toBeNull();
    expect(roofProblem(roof.slice(0, 2))).toMatch(/at least 3 corners/);
    expect(roofProblem([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 10, y: 0 }, { x: 0, y: 10 }])).toMatch(/crosses itself/);
    expect(roofProblem([{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 10 }])).toMatch(/no area/);
  });
  test('an obstacle inside the roof is accepted', () => { expect(obstacleProblem(tri, roof)).toBeNull(); });
  test('fewer than 3 corners is refused', () => { expect(obstacleProblem(tri.slice(0, 2), roof)).toMatch(/at least 3 corners/); });
  test('the bow-tie obstacle is refused', () => {
    expect(obstacleProblem([{ x: 10, y: 10 }, { x: 40, y: 40 }, { x: 40, y: 10 }, { x: 10, y: 40 }], roof)).toMatch(/crosses itself/);
  });
  test('an obstacle partly or fully outside the roof is refused', () => {
    expect(obstacleProblem([{ x: 90, y: 90 }, { x: 140, y: 90 }, { x: 140, y: 140 }], roof)).toMatch(/inside the roof/);
    expect(obstacleProblem([{ x: 200, y: 200 }, { x: 240, y: 200 }, { x: 240, y: 240 }], roof)).toMatch(/inside the roof/);
  });
  test('an obstacle that spans a notch of a concave roof is refused', () => {
    const lShape = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 40 }, { x: 40, y: 40 }, { x: 40, y: 100 }, { x: 0, y: 100 }];
    expect(obstacleProblem([{ x: 10, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }], lShape)).toMatch(/inside the roof/);
    expect(obstacleProblem([{ x: 5, y: 5 }, { x: 30, y: 5 }, { x: 30, y: 30 }], lShape)).toBeNull();
  });
  test('an obstacle with no roof drawn asks for the roof first', () => { expect(obstacleProblem(tri, [])).toMatch(/Draw the roof outline first/); });
  test('an obstacle touching the roof edge is allowed, as the server allows it', () => {
    expect(obstacleProblem([{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 30 }], roof)).toBeNull();
  });
});
describe('friendlyRoofError', () => {
  test('hides the raw validation prefix and explains obstacle errors', () => {
    expect(friendlyRoofError('body: Value error, Obstacle must be a valid polygon inside the roof')).toBe('Obstacle must stay inside the roof and not cross itself.');
    expect(friendlyRoofError('body.obstacles: Value error, Obstacles need 3–64 vertices')).toBe('Obstacle must stay inside the roof and not cross itself.');
  });
  test('other known server messages are rephrased', () => {
    expect(friendlyRoofError('body: Value error, Roof must be a simple polygon with positive area')).toMatch(/not cross itself/);
    expect(friendlyRoofError('body: Value error, All points must lie inside the image canvas')).toMatch(/inside the drawing area/);
    expect(friendlyRoofError('body.boundary: List should have at least 3 items after validation, not 2')).toMatch(/at least 3 corners/);
  });
  test('unknown validation text loses the prefix, and ordinary messages pass through', () => {
    expect(friendlyRoofError('body: Value error, Something else')).toBe('Something else');
    expect(friendlyRoofError('Network failure connecting to x')).toBe('Network failure connecting to x');
  });
});
