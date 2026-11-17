import { emptyRoof } from '../src/api/roof';
import { gridStep, metersPerUnit, polygonArea, edgeLengths, snapPoint, nearestCorner, nearestEdge, insertCorner, removeCorner, insidePolygon, rectangleRing, circleRing, ringCentre, dragShapeCorner, translateRing, setbackStrips, emptyHistory, record, undo, redo } from '../src/api/roofEdit';

const bounds = { width: 1000, height: 700 };
const square = [{ x: 100, y: 100 }, { x: 500, y: 100 }, { x: 500, y: 500 }, { x: 100, y: 500 }];

describe('scale and measurements', () => {
  test('metres per unit come only from two scale points and a positive distance', () => {
    const roof = { ...emptyRoof(), scale_points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], scale_distance_m: 5 };
    expect(metersPerUnit(roof)).toBeCloseTo(0.05);
    expect(metersPerUnit(roof, '10')).toBeCloseTo(0.1);
    expect(metersPerUnit(roof, '')).toBeNull();
    expect(metersPerUnit(roof, '0')).toBeNull();
    expect(metersPerUnit({ ...roof, scale_points: [{ x: 0, y: 0 }] })).toBeNull();
    expect(metersPerUnit({ ...roof, scale_points: [{ x: 0, y: 0 }, { x: 0, y: 0 }] })).toBeNull();
  });
  test('area and edge lengths', () => {
    expect(polygonArea(square)).toBe(160000);
    expect(edgeLengths(square)).toEqual([400, 400, 400, 400]);
    expect(edgeLengths([])).toEqual([]);
  });
});

describe('snapping', () => {
  const opts = { step: gridStep(1000), tolerance: 10, bounds };
  test('grid step is a twentieth of the width', () => { expect(gridStep(1000)).toBe(50); });
  test('points near a grid line jump to it, others stay', () => {
    expect(snapPoint({ x: 207, y: 333 }, opts)).toEqual({ point: { x: 200, y: 333 }, kind: 'grid' });
    expect(snapPoint({ x: 225, y: 325 }, opts)).toEqual({ point: { x: 225, y: 325 }, kind: null });
  });
  test('an edge close to horizontal or vertical is straightened', () => {
    const r = snapPoint({ x: 433, y: 117 }, { ...opts, prev: { x: 100, y: 100 } });
    expect(r.kind).toBe('angle');
    expect(r.point).toEqual({ x: 433, y: 100 });
    expect(snapPoint({ x: 112, y: 433 }, { ...opts, prev: { x: 100, y: 100 } }).point).toEqual({ x: 100, y: 433 });
  });
  test('an edge close to a right angle with the previous slanted edge becomes square to it', () => {
    // Previous edge runs at 45 degrees; the new edge at about 130 degrees is pulled onto 135.
    const prevPrev = { x: 100, y: 100 }, prev = { x: 300, y: 300 };
    const r = snapPoint({ x: 170, y: 450 }, { ...opts, tolerance: 0, prev, prevPrev });
    expect(r.kind).toBe('angle');
    const dx = r.point.x - prev.x, dy = r.point.y - prev.y;
    expect(Math.abs(dx * 1 + dy * 1)).toBeLessThan(3);
  });
  test('a clearly slanted edge is left alone', () => {
    expect(snapPoint({ x: 325, y: 275 }, { ...opts, prev: { x: 100, y: 100 } })).toEqual({ point: { x: 325, y: 275 }, kind: null });
  });
  test('results stay inside the canvas', () => {
    expect(snapPoint({ x: 1004, y: -3 }, opts).point).toEqual({ x: 1000, y: 0 });
  });
});

describe('hit testing and corner edits', () => {
  test('nearest corner within the radius', () => {
    expect(nearestCorner({ x: 110, y: 95 }, square, 20)).toBe(0);
    expect(nearestCorner({ x: 300, y: 300 }, square, 20)).toBe(-1);
  });
  test('nearest edge projects the tap and ignores the ends', () => {
    expect(nearestEdge({ x: 300, y: 108 }, square, 12)).toEqual({ index: 0, point: { x: 300, y: 100 } });
    expect(nearestEdge({ x: 300, y: 130 }, square, 12)).toBeNull();
    expect(nearestEdge({ x: 102, y: 102 }, square, 12)).toBeNull();
  });
  test('insert and remove corners', () => {
    expect(insertCorner(square, 0, { x: 300, y: 100 })).toHaveLength(5);
    expect(insertCorner(square, 0, { x: 300, y: 100 })[1]).toEqual({ x: 300, y: 100 });
    expect(insertCorner(square, 3, { x: 100, y: 300 })[4]).toEqual({ x: 100, y: 300 });
    expect(removeCorner(square, 1)).toEqual([square[0], square[2], square[3]]);
  });
  test('inside polygon', () => {
    expect(insidePolygon({ x: 300, y: 300 }, square)).toBe(true);
    expect(insidePolygon({ x: 600, y: 300 }, square)).toBe(false);
  });
});

describe('obstacle shapes', () => {
  test('rectangle and circle rings around a centre', () => {
    expect(rectangleRing({ x: 300, y: 300 }, 50, 30)).toEqual([{ x: 250, y: 270 }, { x: 350, y: 270 }, { x: 350, y: 330 }, { x: 250, y: 330 }]);
    const c = circleRing({ x: 300, y: 300 }, 40);
    expect(c).toHaveLength(16);
    expect(c.every(p => Math.abs(Math.hypot(p.x - 300, p.y - 300) - 40) <= 1)).toBe(true);
    expect(ringCentre(c).x).toBeCloseTo(300, 0);
  });
  test('dragging a rectangle corner keeps it a rectangle with the opposite corner fixed', () => {
    const r = rectangleRing({ x: 300, y: 300 }, 50, 50);
    const moved = dragShapeCorner('rect', r, 2, { x: 420, y: 380 });
    expect(moved).toEqual([{ x: 250, y: 250 }, { x: 420, y: 250 }, { x: 420, y: 380 }, { x: 250, y: 380 }]);
  });
  test('dragging a circle point changes the radius around the same centre', () => {
    const c = circleRing({ x: 300, y: 300 }, 40);
    const bigger = dragShapeCorner('circle', c, 0, { x: 380, y: 300 });
    expect(bigger).toHaveLength(16);
    expect(Math.hypot(bigger[4].x - 300, bigger[4].y - 300)).toBeCloseTo(80, 0);
  });
  test('dragging a polygon corner moves only that corner', () => {
    expect(dragShapeCorner('polygon', square, 1, { x: 550, y: 90 })[1]).toEqual({ x: 550, y: 90 });
  });
  test('moving a shape keeps it inside the canvas', () => {
    expect(translateRing(square, 900, 0, bounds).map(p => p.x)).toEqual([600, 1000, 1000, 600]);
  });
});

describe('setback strips', () => {
  test('one strip per edge, on the inside, for either winding', () => {
    for (const ring of [square, [...square].reverse()]) {
      const strips = setbackStrips(ring, 20);
      expect(strips).toHaveLength(4);
      for (const strip of strips) for (const p of strip) expect(insidePolygon(p, square) || p.x === 100 || p.x === 500 || p.y === 100 || p.y === 500).toBe(true);
      expect(strips.some(s => s.some(p => p.x === 120 || p.y === 120 || p.x === 480 || p.y === 480))).toBe(true);
    }
  });
  test('no setback or no roof gives no strips', () => {
    expect(setbackStrips(square, 0)).toEqual([]);
    expect(setbackStrips(square.slice(0, 2), 10)).toEqual([]);
  });
});

describe('undo and redo', () => {
  test('records, undoes and redoes whole states', () => {
    let h = emptyHistory<number>();
    h = record(h, 1); h = record(h, 2);
    const u = undo(h, 3)!;
    expect(u.state).toBe(2);
    const r = redo(u.history, u.state)!;
    expect(r.state).toBe(3);
    expect(undo(emptyHistory<number>(), 1)).toBeNull();
    expect(redo(emptyHistory<number>(), 1)).toBeNull();
  });
  test('a new change clears redo', () => {
    let h = record(emptyHistory<number>(), 1);
    const u = undo(h, 2)!;
    h = record(u.history, u.state);
    expect(h.future).toEqual([]);
  });
});

import { placementPoint, distanceToRing } from '../src/api/roofEdit';
describe('placing a new obstacle shape', () => {
  const lShape = [{ x: 100, y: 100 }, { x: 800, y: 100 }, { x: 800, y: 400 }, { x: 450, y: 400 }, { x: 450, y: 800 }, { x: 100, y: 800 }];
  test('uses the centre when there is room around it', () => {
    const r = placementPoint(square, 50);
    expect(r.point).toEqual({ x: 300, y: 300 });
    expect(r.clearance).toBe(200);
  });
  test('moves away from the centre of an L-shaped roof, which lies in the notch', () => {
    const r = placementPoint(lShape, 60);
    expect(insidePolygon(r.point, lShape)).toBe(true);
    expect(distanceToRing(r.point, lShape)).toBeGreaterThan(100);
    expect(r.clearance).toBeCloseTo(distanceToRing(r.point, lShape));
  });
});

import { panelBlocks } from '../src/api/roofEdit';
describe('panel blocks for outlines', () => {
  const p = (x: number, y: number) => ({ x, y, width: 10, height: 20 });
  test('two full rows stacked within the gap form one rectangular block', () => {
    const blocks = panelBlocks([p(0, 0), p(11, 0), p(22, 0), p(0, 21), p(11, 21), p(22, 21)], 2);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].bounds).toEqual({ x: 0, y: 0, width: 32, height: 41 });
  });
  test('an L of panels is split so no outline covers the empty corner', () => {
    const blocks = panelBlocks([p(0, 0), p(11, 0), p(22, 0), p(0, 21)], 2);
    expect(blocks).toHaveLength(2);
    expect(blocks.map(b => b.bounds)).toEqual([{ x: 0, y: 0, width: 32, height: 20 }, { x: 0, y: 21, width: 10, height: 20 }]);
  });
  test('a gap in a row splits the run', () => {
    expect(panelBlocks([p(0, 0), p(11, 0), p(60, 0)], 2)).toHaveLength(2);
  });
  test('every panel ends up in exactly one block', () => {
    const panels = [p(0, 0), p(11, 0), p(0, 21), p(11, 21), p(40, 21), p(0, 60)];
    expect(panelBlocks(panels, 2).flatMap(b => b.panels)).toHaveLength(panels.length);
  });
});

import { alignToFirst } from '../src/api/roofEdit';
describe('squaring the closing edge', () => {
  const first = { x: 100, y: 100 };
  test('a last corner almost below the first lines up with it', () => {
    expect(alignToFirst({ x: 112, y: 600 }, first)).toEqual({ point: { x: 100, y: 600 }, aligned: true });
  });
  test('a last corner almost level with the first lines up with it', () => {
    expect(alignToFirst({ x: 700, y: 92 }, first)).toEqual({ point: { x: 700, y: 100 }, aligned: true });
  });
  test('a clearly slanted closing edge is left alone, and an exact one is not reported', () => {
    expect(alignToFirst({ x: 300, y: 500 }, first).aligned).toBe(false);
    expect(alignToFirst({ x: 100, y: 500 }, first).aligned).toBe(false);
  });
});
