// Geometry for the Home flow diagram, kept apart from the component so it can be tested without rendering.
export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };

export type FlowLayout = {
  /** Where the line from the house starts. It drops straight down to the hub. */
  originY: number;
  /** Top row. */
  solar: Rect;
  grid: Rect;
  /** Bottom row. */
  battery: Rect;
  home: Rect;
};

export type FlowPaths = {
  hub: Point;
  /** Every path starts at the hub, except `main`, which ends there. */
  main: Point[];
  solar: Point[];
  grid: Point[];
  battery: Point[];
  home: Point[];
};

const EDGE_INSET = 12;
const right = (r: Rect) => r.x + r.width;
const bottom = (r: Rect) => r.y + r.height;
const within = (r: Rect, fraction: number) => Math.min(right(r) - EDGE_INSET, Math.max(r.x + EDGE_INSET, r.x + r.width * fraction));

/**
 * The hub sits in the gap between the four cards. Each branch makes one right-angle turn and ends on a card edge:
 * Solar and Home are reached along the row gap, Grid and Battery along the column gap.
 */
export function flowPaths({ originY, solar, grid, battery, home }: FlowLayout): FlowPaths {
  const hub = {
    x: (Math.max(right(solar), right(battery)) + Math.min(grid.x, home.x)) / 2,
    y: (Math.max(bottom(solar), bottom(grid)) + Math.min(battery.y, home.y)) / 2,
  };
  const solarX = within(solar, 0.55);
  const homeX = within(home, 0.45);
  const gridY = grid.y + grid.height / 2;
  const batteryY = battery.y + battery.height / 2;
  return {
    hub,
    main: [{ x: hub.x, y: originY }, hub],
    solar: [hub, { x: solarX, y: hub.y }, { x: solarX, y: bottom(solar) }],
    grid: [hub, { x: hub.x, y: gridY }, { x: grid.x, y: gridY }],
    battery: [hub, { x: hub.x, y: batteryY }, { x: right(battery), y: batteryY }],
    home: [hub, { x: homeX, y: hub.y }, { x: homeX, y: home.y }],
  };
}

export const polylineLength = (points: Point[]) =>
  points.slice(1).reduce((total, p, i) => total + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0);

export const pathD = (points: Point[]) => points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');

export type Size = { width: number; height: number };

/**
 * Where the four cards sit, worked out from their measured sizes: two columns against the left and right
 * edges of the node area, two rows separated by `rowGap`, starting `top` below the component's top edge.
 * Cards in a row stretch to the same height, so the taller one sets the row.
 */
export function nodeRects({ top, width, rowGap, solar, grid, battery, home }: { top: number; width: number; rowGap: number; solar: Size; grid: Size; battery: Size; home: Size }): Pick<FlowLayout, 'solar' | 'grid' | 'battery' | 'home'> {
  const firstRow = Math.max(solar.height, grid.height);
  const secondRow = Math.max(battery.height, home.height);
  const secondTop = top + firstRow + rowGap;
  return {
    solar: { x: 0, y: top, width: solar.width, height: firstRow },
    grid: { x: width - grid.width, y: top, width: grid.width, height: firstRow },
    battery: { x: 0, y: secondTop, width: battery.width, height: secondRow },
    home: { x: width - home.width, y: secondTop, width: home.width, height: secondRow },
  };
}

/** Same size with a tolerance, so a repeated layout event does not trigger another render. */
export const sameSize = (a: Size | undefined, b: Size) =>
  !!a && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
