import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Polygon, Rect, Circle, Image as SvgImage, Line, Defs, Pattern, Path } from 'react-native-svg';
import { ArrowUp, ZoomIn, ZoomOut, Maximize } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS } from '../theme/tokens';
import { RoofInput, Layout, Point, panelGroups, usableWidthM, centroid } from '../api/roof';
import { edgeLengths, gridStep, nearestCorner, nearestEdge, insidePolygon, setbackStrips } from '../api/roofEdit';

const COARSE_GRID = [0.25, 0.5, 0.75];
/** Half of a 44px touch target. */
const HIT_PX = 22;
const EDGE_PX = 12;
const CORNER_FIRST_PX = 12;
const MOVE_PX = 8;
const LONG_PRESS_MS = 500;
export const MAX_ZOOM = 4;

/** A corner of the roof (`ring: 'roof'`) or of obstacle number `ring`. */
export type CornerTarget = { ring: 'roof' | number; index: number };
export type CanvasEvent =
  | { type: 'tap'; point: Point; corner: CornerTarget | null; edge: { ring: 'roof' | number; index: number; point: Point } | null; obstacle: number | null }
  | { type: 'dragStart' | 'dragEnd'; target: CornerTarget }
  | { type: 'drag'; target: CornerTarget; point: Point }
  | { type: 'moveStart' | 'moveEnd'; obstacle: number }
  | { type: 'move'; obstacle: number; dx: number; dy: number }
  | { type: 'longPress'; target: CornerTarget };

export type RoofCanvasProps = {
  roof: RoofInput;
  layout: Layout | null;
  draft: Point[];
  mode: 'roof' | 'obstacle' | 'scale';
  /** Metres per roof unit from the measured scale. Without it no metres are drawn. */
  metersPerUnit?: number | null;
  invalidObstacles?: number[];
  draftInvalid?: boolean;
  obstacleNames?: string[];
  selectedObstacle?: number | null;
  /** Fine grid lines, shown while snapping is on. */
  fineGrid?: boolean;
  a11yLabel: string;
  /** Without this the canvas is a read-only preview: no gestures, handles or zoom. */
  onEvent?: (event: CanvasEvent) => void;
};

type Gesture = {
  kind: 'pending' | 'pan' | 'drag' | 'move' | 'pinch' | 'done';
  origin: Point; start: Point; pan0: Point; zoom0: number;
  corner: CornerTarget | null; obstacle: number | null;
  timer: ReturnType<typeof setTimeout> | null;
  /** Corner position minus the press position, so a corner grabbed off-centre does not jump to the finger. */
  offset: Point;
  pinch?: { d0: number; mid0: Point };
};

/** The roof drawing, shared by the Design preview (read-only) and the full-screen editor (zoom, pan and editing). */
export function RoofCanvas({ roof, layout, draft, mode, metersPerUnit = null, invalidObstacles = [], draftInvalid = false, obstacleNames = [], selectedObstacle = null, fineGrid = false, a11yLabel, onEvent }: RoofCanvasProps) {
  const { tokens: t } = useTheme();
  const [width, setWidth] = useState(300);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const gesture = useRef<Gesture | null>(null);
  useEffect(() => () => { if (gesture.current?.timer) clearTimeout(gesture.current.timer); }, []);
  const interactive = !!onEvent;
  const canvasH = width * roof.height / roof.width;
  const k = (width * zoom) / roof.width;
  const toX = (x: number) => x * k, toY = (y: number) => y * k;
  const sp = (px: number) => px / k;
  const clampPan = (p: Point, z: number): Point => ({ x: Math.min(0, Math.max(width - width * z, p.x)), y: Math.min(0, Math.max(canvasH - canvasH * z, p.y)) });
  const setView = (z: number, p: Point) => { const nz = Math.min(MAX_ZOOM, Math.max(1, z)); setZoom(nz); setPan(clampPan(p, nz)); };
  const zoomAround = (factor: number) => { const c = { x: width / 2, y: canvasH / 2 }; const nz = Math.min(MAX_ZOOM, Math.max(1, zoom * factor)); setView(nz, { x: c.x - (c.x - pan.x) * (nz / zoom), y: c.y - (c.y - pan.y) * (nz / zoom) }); };
  const toRoof = (v: Point): Point => ({ x: Math.round(Math.min(roof.width, Math.max(0, (v.x - pan.x) / k))), y: Math.round(Math.min(roof.height, Math.max(0, (v.y - pan.y) / k))) });

  const rings = (): Array<{ ring: 'roof' | number; points: Point[] }> => mode === 'roof' ? [{ ring: 'roof', points: roof.boundary }] : mode === 'obstacle' ? roof.obstacles.map((points, i) => ({ ring: i, points })) : [];
  const cornerAt = (p: Point): CornerTarget | null => {
    let best: CornerTarget | null = null, bestD = Infinity;
    for (const r of rings()) { const i = nearestCorner(p, r.points, sp(HIT_PX)); if (i >= 0) { const d = Math.hypot(r.points[i].x - p.x, r.points[i].y - p.y); if (d < bestD) { best = { ring: r.ring, index: i }; bestD = d; } } }
    return best;
  };
  const edgeAt = (p: Point) => { for (const r of rings()) { const e = nearestEdge(p, r.points, sp(EDGE_PX)); if (e) return { ring: r.ring, index: e.index, point: e.point }; } return null; };
  const obstacleAt = (p: Point) => mode === 'obstacle' ? roof.obstacles.findIndex(ring => insidePolygon(p, ring)) : -1;

  const viewPoint = (e: any, g: Gesture | null): Point => g ? { x: e.nativeEvent.pageX - g.origin.x, y: e.nativeEvent.pageY - g.origin.y } : { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
  const touches = (e: any): any[] => e.nativeEvent.touches ?? [];
  const grant = (e: any) => {
    const n = e.nativeEvent;
    const origin = { x: (n.pageX ?? n.locationX) - n.locationX, y: (n.pageY ?? n.locationY) - n.locationY };
    const start = { x: n.locationX, y: n.locationY };
    const p = toRoof(start);
    let corner = cornerAt(p);
    // Small obstacles are mostly corner hit area. A press inside a shape moves it unless it is right on a corner.
    const within = obstacleAt(p);
    if (corner && within >= 0) { const q = (corner.ring === 'roof' ? roof.boundary : roof.obstacles[corner.ring])[corner.index]; if (Math.hypot(q.x - p.x, q.y - p.y) > sp(CORNER_FIRST_PX)) corner = null; }
    const inside = corner ? -1 : within;
    const c = corner ? (corner.ring === 'roof' ? roof.boundary : roof.obstacles[corner.ring])[corner.index] : null;
    const g: Gesture = { kind: 'pending', origin, start, pan0: pan, zoom0: zoom, corner, obstacle: inside >= 0 ? inside : null, timer: null, offset: c ? { x: c.x - p.x, y: c.y - p.y } : { x: 0, y: 0 } };
    if (corner) g.timer = setTimeout(() => { if (gesture.current === g && g.kind === 'pending') { g.kind = 'done'; onEvent!({ type: 'longPress', target: corner }); } }, LONG_PRESS_MS);
    gesture.current = g;
  };
  const move = (e: any) => {
    const g = gesture.current; if (!g || g.kind === 'done') return;
    const list = touches(e);
    if (list.length >= 2) {
      if (g.timer) { clearTimeout(g.timer); g.timer = null; }
      if (g.kind === 'drag' && g.corner) onEvent!({ type: 'dragEnd', target: g.corner });
      if (g.kind === 'move' && g.obstacle !== null) onEvent!({ type: 'moveEnd', obstacle: g.obstacle });
      const a = { x: list[0].pageX - g.origin.x, y: list[0].pageY - g.origin.y }, b = { x: list[1].pageX - g.origin.x, y: list[1].pageY - g.origin.y };
      const d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (g.kind !== 'pinch' || !g.pinch) { g.kind = 'pinch'; g.pinch = { d0: d || 1, mid0: mid }; g.zoom0 = zoom; g.pan0 = pan; return; }
      const z = Math.min(MAX_ZOOM, Math.max(1, g.zoom0 * d / g.pinch.d0));
      setView(z, { x: mid.x - (g.pinch.mid0.x - g.pan0.x) * (z / g.zoom0), y: mid.y - (g.pinch.mid0.y - g.pan0.y) * (z / g.zoom0) });
      return;
    }
    if (g.kind === 'pinch') return;
    const v = viewPoint(e, g);
    const dx = v.x - g.start.x, dy = v.y - g.start.y;
    if (g.kind === 'pending') {
      if (Math.hypot(dx, dy) < MOVE_PX) return;
      if (g.timer) { clearTimeout(g.timer); g.timer = null; }
      if (g.corner) { g.kind = 'drag'; onEvent!({ type: 'dragStart', target: g.corner }); }
      else if (g.obstacle !== null) { g.kind = 'move'; onEvent!({ type: 'moveStart', obstacle: g.obstacle }); }
      else g.kind = 'pan';
    }
    if (g.kind === 'drag' && g.corner) { const q = toRoof(v); onEvent!({ type: 'drag', target: g.corner, point: { x: Math.min(roof.width, Math.max(0, q.x + g.offset.x)), y: Math.min(roof.height, Math.max(0, q.y + g.offset.y)) } }); }
    else if (g.kind === 'move' && g.obstacle !== null) onEvent!({ type: 'move', obstacle: g.obstacle, dx: Math.round(dx / k), dy: Math.round(dy / k) });
    else if (g.kind === 'pan') setPan(clampPan({ x: g.pan0.x + dx, y: g.pan0.y + dy }, zoom));
  };
  const finish = (e: any, tapAllowed: boolean) => {
    const g = gesture.current; gesture.current = null;
    if (g?.timer) clearTimeout(g.timer);
    if (!g || g.kind === 'pending') {
      if (!tapAllowed) return;
      const p = toRoof(viewPoint(e, g));
      const corner = cornerAt(p);
      const obstacle = obstacleAt(p);
      onEvent!({ type: 'tap', point: p, corner, edge: corner ? null : edgeAt(p), obstacle: obstacle >= 0 ? obstacle : null });
    } else if (g.kind === 'drag' && g.corner) onEvent!({ type: 'dragEnd', target: g.corner });
    else if (g.kind === 'move' && g.obstacle !== null) onEvent!({ type: 'moveEnd', obstacle: g.obstacle });
  };
  const responder = interactive ? {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: grant,
    onResponderMove: move,
    onResponderRelease: (e: any) => finish(e, true),
    onResponderTerminate: (e: any) => finish(e, false),
  } : {};

  const groups = layout ? panelGroups(layout.panels, (roof.gap_m / (layout.meters_per_pixel || 1)) * 1.5 + 1) : [];
  const dimension = layout && roof.scale_points.length === 2 && roof.boundary.length >= 3 ? usableWidthM(layout.panels, layout.meters_per_pixel) : null;
  const dimY = Math.min(canvasH * zoom - 18, toY(Math.max(...roof.boundary.map(p => p.y), 0)) + 8);
  const strips = metersPerUnit && roof.setback_m > 0 && roof.boundary.length >= 3 ? setbackStrips(roof.boundary, roof.setback_m / metersPerUnit) : [];
  const lengths = metersPerUnit && roof.boundary.length >= 3 ? edgeLengths(roof.boundary) : [];
  const step = gridStep(roof.width);
  const fine = fineGrid && !roof.image_data ? Array.from({ length: Math.floor(roof.width / step) - 1 }, (_, i) => (i + 1) * step) : [];
  const fineY = fineGrid && !roof.image_data ? Array.from({ length: Math.floor(roof.height / step) }, (_, i) => (i + 1) * step).filter(y => y < roof.height) : [];
  const content = { position: 'absolute' as const, left: pan.x, top: pan.y, width: width * zoom, height: canvasH * zoom };
  const ringPoints = (ring: Point[]) => ring.map(p => `${p.x},${p.y}`).join(' ');
  const name = (i: number) => obstacleNames[i]?.trim() || 'Obstacle';

  return <View>
  <View accessible accessibilityRole="image" accessibilityLabel={a11yLabel} onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height: canvasH, backgroundColor: t.backgroundRaised, borderRadius: RADIUS.card - 4, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }} {...responder}>
    <View pointerEvents="none" style={content}>
      {!roof.image_data && !fineGrid && COARSE_GRID.map(f => <React.Fragment key={f}><View style={{ position: 'absolute', left: 0, right: 0, top: `${f * 100}%`, height: 1, backgroundColor: t.border, opacity: 0.6 }} /><View style={{ position: 'absolute', top: 0, bottom: 0, left: `${f * 100}%`, width: 1, backgroundColor: t.border, opacity: 0.6 }} /></React.Fragment>)}
      {fine.map(x => <View key={`gx${x}`} style={{ position: 'absolute', top: 0, bottom: 0, left: toX(x), width: 1, backgroundColor: t.border, opacity: 0.35 }} />)}
      {fineY.map(y => <View key={`gy${y}`} style={{ position: 'absolute', left: 0, right: 0, top: toY(y), height: 1, backgroundColor: t.border, opacity: 0.35 }} />)}
      <Svg width="100%" height="100%" viewBox={`0 0 ${roof.width} ${roof.height}`}>
        <Defs>
          <Pattern id="setbackHatch" patternUnits="userSpaceOnUse" width={sp(8)} height={sp(8)}>
            <Path d={`M0,${sp(8)} L${sp(8)},0`} stroke={t.textSecondary} strokeWidth={sp(1)} strokeOpacity={0.6} />
          </Pattern>
        </Defs>
        {roof.image_data && <SvgImage href={{ uri: roof.image_data }} width={roof.width} height={roof.height} />}
        {roof.boundary.length >= 3 && <Polygon points={ringPoints(roof.boundary)} fill={t.surfaceElevated} fillOpacity={roof.image_data ? 0.35 : 0.9} stroke={t.textSecondary} strokeWidth={sp(2.5)} strokeLinejoin="round" />}
        {strips.map((s, i) => <Polygon key={`sb${i}`} points={ringPoints(s)} fill="url(#setbackHatch)" fillOpacity={0.9} stroke="none" />)}
        {roof.boundary.map((p, i) => <Circle key={`v${i}`} cx={p.x} cy={p.y} r={sp(6)} fill={t.surfaceElevated} stroke={t.limeMark} strokeWidth={sp(2)} />)}
        {roof.obstacles.map((ring, i) => invalidObstacles.includes(i)
          ? <Polygon key={i} points={ringPoints(ring)} fill={t.redTint} stroke={t.redText} strokeWidth={sp(2.5)} strokeLinejoin="round" />
          : <Polygon key={i} points={ringPoints(ring)} fill={t.textSecondary} fillOpacity={0.35} stroke={selectedObstacle === i ? t.limeMark : t.textSecondary} strokeWidth={sp(selectedObstacle === i ? 2.5 : 2)} strokeLinejoin="round" />)}
        {mode === 'obstacle' && roof.obstacles.map((ring, i) => ring.map((p, j) => <Circle key={`oc${i}-${j}`} cx={p.x} cy={p.y} r={sp(4)} fill={t.surfaceElevated} stroke={invalidObstacles.includes(i) ? t.redText : t.textPrimary} strokeWidth={sp(1.5)} />))}
        {draft.length >= 3 && <Polygon points={ringPoints(draft)} fill={draftInvalid ? t.redTint : t.textSecondary} fillOpacity={draftInvalid ? 1 : 0.2} stroke={draftInvalid ? t.redText : t.limeMark} strokeWidth={sp(2.5)} strokeLinejoin="round" />}
        {draft.map((p, i) => <Circle key={`d${i}`} cx={p.x} cy={p.y} r={sp(5)} fill={draftInvalid ? t.redText : t.limeMark} />)}
        {layout?.panels.map((p, i) => <Rect key={i} {...p} fill={t.panelFill} stroke={t.limeMark} strokeOpacity={0.45} strokeWidth={sp(0.5)} />)}
        {groups.map((g, i) => <Polygon key={`sh${i}`} points={ringPoints([{ x: g.bounds.x, y: g.bounds.y }, { x: g.bounds.x + g.bounds.width, y: g.bounds.y }, { x: g.bounds.x + g.bounds.width, y: g.bounds.y + g.bounds.height * 0.35 }, { x: g.bounds.x, y: g.bounds.y + g.bounds.height * 0.6 }])} fill={t.textPrimary} fillOpacity={0.06} stroke="none" />)}
        {groups.map((g, i) => { const pad = sp(1); return <Polygon key={`g${i}`} points={ringPoints([{ x: g.bounds.x - pad, y: g.bounds.y - pad }, { x: g.bounds.x + g.bounds.width + pad, y: g.bounds.y - pad }, { x: g.bounds.x + g.bounds.width + pad, y: g.bounds.y + g.bounds.height + pad }, { x: g.bounds.x - pad, y: g.bounds.y + g.bounds.height + pad }])} fill="none" stroke={t.limeMark} strokeWidth={sp(1.5)} strokeLinejoin="round" />; })}
        {roof.scale_points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={sp(7)} fill={t.cyanText} />)}
        {roof.scale_points.length === 2 && <Line x1={roof.scale_points[0].x} y1={roof.scale_points[0].y} x2={roof.scale_points[1].x} y2={roof.scale_points[1].y} stroke={t.cyanText} strokeWidth={sp(2.5)} />}
      </Svg>
      {lengths.map((len, i) => { const a = roof.boundary[i], b = roof.boundary[(i + 1) % roof.boundary.length]; return <View key={`len${i}`} accessibilityLabel={`Edge ${i + 1}: ${(len * metersPerUnit!).toFixed(1)} metres`} style={{ position: 'absolute', left: toX((a.x + b.x) / 2) - 28, top: toY((a.y + b.y) / 2) - 9, width: 56, alignItems: 'center' }}><Text style={{ color: t.textPrimary, fontSize: 10, lineHeight: 14, paddingHorizontal: 3, borderRadius: 4, backgroundColor: t.background, opacity: 0.85 }}>{(len * metersPerUnit!).toFixed(1)} m</Text></View>; })}
      {roof.obstacles.map((ring, i) => { const c = centroid(ring); return <View key={`o${i}`} style={{ position: 'absolute', left: toX(c.x) - 40, top: toY(c.y) - 7, width: 80, alignItems: 'center' }}><Text numberOfLines={1} style={{ color: t.textPrimary, fontSize: 10, lineHeight: 14 }}>{name(i)}</Text></View>; })}
      {dimension && <View accessibilityLabel={`Usable width ${dimension.widthM.toFixed(1)} metres`} style={{ position: 'absolute', left: toX(dimension.x1), width: Math.max(1, toX(dimension.x2) - toX(dimension.x1)), top: dimY, alignItems: 'center' }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 4, height: 1, backgroundColor: t.cyanText }} /><View style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 9, backgroundColor: t.cyanText }} /><View style={{ position: 'absolute', right: 0, top: 0, width: 1, height: 9, backgroundColor: t.cyanText }} />
        <Text numberOfLines={1} style={{ marginTop: 8, width: 130, textAlign: 'center', color: t.cyanText, fontSize: 11, lineHeight: 14, backgroundColor: t.backgroundRaised, borderRadius: 4 }}>{dimension.widthM.toFixed(1)} m usable width</Text>
      </View>}
      {interactive && mode === 'roof' && roof.boundary.map((p, i) => <View key={`h${i}`} accessibilityLabel={`Roof corner ${i + 1}, drag to move`} style={{ position: 'absolute', left: toX(p.x) - 10, top: toY(p.y) - 10, width: 20, height: 20, borderRadius: 10 }} />)}
    </View>
    <View pointerEvents="none" accessibilityLabel="North arrow: the top of the canvas is assumed to be north" style={{ position: 'absolute', left: 8, top: 8, alignItems: 'center' }}><ArrowUp size={14} color={t.textSecondary} /><Text style={{ color: t.textSecondary, fontSize: 10, lineHeight: 12, fontWeight: '700' }}>N</Text></View>
  </View>
  {interactive && <View accessibilityLabel={`Zoom ${Math.round(zoom * 100)} percent`} style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
      {[{ label: 'Zoom in', icon: <ZoomIn size={18} color={t.textPrimary} />, on: () => zoomAround(1.5), off: zoom >= MAX_ZOOM }, { label: 'Zoom out', icon: <ZoomOut size={18} color={t.textPrimary} />, on: () => zoomAround(1 / 1.5), off: zoom <= 1 }, { label: 'Reset view', icon: <Maximize size={18} color={t.textPrimary} />, on: () => setView(1, { x: 0, y: 0 }), off: zoom === 1 && pan.x === 0 && pan.y === 0 }].map(b =>
        <TouchableOpacity key={b.label} accessibilityRole="button" accessibilityLabel={b.label} accessibilityState={{ disabled: b.off }} disabled={b.off} onPress={b.on} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, opacity: b.off ? 0.5 : 1 }}>{b.icon}</TouchableOpacity>)}
    </View>}
  </View>;
}
