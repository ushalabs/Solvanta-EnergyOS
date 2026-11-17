import React, { useRef, useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Polygon, Rect, Circle, Image as SvgImage, Line } from 'react-native-svg';
import { ArrowUp } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS } from '../theme/tokens';
import { RoofInput, Layout, Point, tapToRoofPoint, screenPx, panelGroups, usableWidthM, centroid } from '../api/roof';

const GRID = [0.25, 0.5, 0.75];

export type RoofCanvasProps = {
  roof: RoofInput;
  layout: Layout | null;
  draft: Point[];
  mode: 'roof' | 'obstacle' | 'scale';
  /** Indexes of finished obstacles that break a rule, drawn with a red outline. */
  invalidObstacles?: number[];
  /** The obstacle being drawn breaks a rule. */
  draftInvalid?: boolean;
  a11yLabel: string;
  /** Without this the canvas is a read-only preview: no taps and no corner handles. */
  onTapPoint?: (point: Point) => void;
  onMoveCorner?: (index: number, point: Point) => void;
};

/** The roof drawing. The same drawing is used for the Design preview (read-only) and the full-screen editor. */
export function RoofCanvas({ roof, layout, draft, mode, invalidObstacles = [], draftInvalid = false, a11yLabel, onTapPoint, onMoveCorner }: RoofCanvasProps) {
  const { tokens: t } = useTheme();
  const [width, setWidth] = useState(300);
  const drag = useRef<{ px: number; py: number; orig: Point } | null>(null);
  const interactive = !!onTapPoint;
  const canvasH = width * roof.height / roof.width;
  const toX = (x: number) => x / roof.width * width, toY = (y: number) => y / roof.height * canvasH;
  const sp = (px: number) => screenPx(px, width, roof.width);
  const groups = layout ? panelGroups(layout.panels, (roof.gap_m / (layout.meters_per_pixel || 1)) * 1.5 + 1) : [];
  const dimension = layout && roof.scale_points.length === 2 && roof.boundary.length >= 3 ? usableWidthM(layout.panels, layout.meters_per_pixel) : null;
  const dimY = Math.min(canvasH - 18, toY(Math.max(...roof.boundary.map(p => p.y), 0)) + 8);
  const moveCorner = (i: number, e: any) => {
    const d = drag.current; if (!d || width <= 0) return;
    onMoveCorner?.(i, tapToRoofPoint(toX(d.orig.x) + (e.nativeEvent.pageX - d.px), toY(d.orig.y) + (e.nativeEvent.pageY - d.py), width, roof.width, roof.height));
  };
  const responder = interactive ? { onStartShouldSetResponder: () => true, onResponderRelease: (e: any) => onTapPoint!(tapToRoofPoint(e.nativeEvent.locationX, e.nativeEvent.locationY, width, roof.width, roof.height)) } : {};
  return <View accessible accessibilityRole="image" accessibilityLabel={a11yLabel} onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height: canvasH, backgroundColor: t.backgroundRaised, borderRadius: RADIUS.card - 4, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }} {...responder}>
    {!roof.image_data && GRID.map(f => <React.Fragment key={f}><View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: `${f * 100}%`, height: 1, backgroundColor: t.border, opacity: 0.6 }} /><View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: `${f * 100}%`, width: 1, backgroundColor: t.border, opacity: 0.6 }} /></React.Fragment>)}
    <Svg pointerEvents="none" width="100%" height="100%" viewBox={`0 0 ${roof.width} ${roof.height}`}>
      {roof.image_data && <SvgImage href={{ uri: roof.image_data }} width={roof.width} height={roof.height} />}
      {roof.boundary.length >= 3 && <Polygon points={roof.boundary.map(p => `${p.x},${p.y}`).join(' ')} fill={t.surfaceElevated} fillOpacity={roof.image_data ? 0.35 : 0.9} stroke={t.textSecondary} strokeWidth={sp(2.5)} strokeLinejoin="round" />}
      {roof.boundary.map((p, i) => <Circle key={`v${i}`} cx={p.x} cy={p.y} r={sp(6)} fill={t.surfaceElevated} stroke={t.limeMark} strokeWidth={sp(2)} />)}
      {roof.obstacles.map((ring, i) => invalidObstacles.includes(i)
        ? <Polygon key={i} points={ring.map(p => `${p.x},${p.y}`).join(' ')} fill={t.redTint} stroke={t.redText} strokeWidth={sp(2.5)} strokeLinejoin="round" />
        : <Polygon key={i} points={ring.map(p => `${p.x},${p.y}`).join(' ')} fill={t.textSecondary} fillOpacity={0.35} stroke={t.textSecondary} strokeWidth={sp(2)} strokeLinejoin="round" />)}
      {draft.length >= 3 && <Polygon points={draft.map(p => `${p.x},${p.y}`).join(' ')} fill={draftInvalid ? t.redTint : t.textSecondary} fillOpacity={draftInvalid ? 1 : 0.2} stroke={draftInvalid ? t.redText : t.limeMark} strokeWidth={sp(2.5)} strokeLinejoin="round" />}
      {draft.map((p, i) => <Circle key={`d${i}`} cx={p.x} cy={p.y} r={sp(5)} fill={draftInvalid ? t.redText : t.limeMark} />)}
      {layout?.panels.map((p, i) => <Rect key={i} {...p} fill={t.panelFill} stroke={t.limeMark} strokeOpacity={0.55} strokeWidth={sp(0.5)} />)}
      {groups.map((g, i) => { const pad = sp(1); return <Polygon key={`g${i}`} points={[[g.bounds.x - pad, g.bounds.y - pad], [g.bounds.x + g.bounds.width + pad, g.bounds.y - pad], [g.bounds.x + g.bounds.width + pad, g.bounds.y + g.bounds.height + pad], [g.bounds.x - pad, g.bounds.y + g.bounds.height + pad]].map(q => q.join(',')).join(' ')} fill="none" stroke={t.limeMark} strokeWidth={sp(1.5)} strokeLinejoin="round" />; })}
      {roof.scale_points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={sp(7)} fill={t.cyanText} />)}
      {roof.scale_points.length === 2 && <Line x1={roof.scale_points[0].x} y1={roof.scale_points[0].y} x2={roof.scale_points[1].x} y2={roof.scale_points[1].y} stroke={t.cyanText} strokeWidth={sp(2.5)} />}
    </Svg>
    {roof.obstacles.map((ring, i) => { const c = centroid(ring); return <View key={`o${i}`} pointerEvents="none" style={{ position: 'absolute', left: toX(c.x) - 30, top: toY(c.y) - 7, width: 60, alignItems: 'center' }}><Text style={{ color: t.textPrimary, fontSize: 10, lineHeight: 14 }}>Obstacle</Text></View>; })}
    {dimension && <View pointerEvents="none" accessibilityLabel={`Usable width ${dimension.widthM.toFixed(1)} metres`} style={{ position: 'absolute', left: toX(dimension.x1), width: Math.max(1, toX(dimension.x2) - toX(dimension.x1)), top: dimY, alignItems: 'center' }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 4, height: 1, backgroundColor: t.cyanText }} /><View style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 9, backgroundColor: t.cyanText }} /><View style={{ position: 'absolute', right: 0, top: 0, width: 1, height: 9, backgroundColor: t.cyanText }} />
      <Text style={{ marginTop: 8, color: t.cyanText, fontSize: 11, lineHeight: 14 }}>{dimension.widthM.toFixed(1)} m</Text>
    </View>}
    <View pointerEvents="none" accessibilityLabel="North arrow: the top of the canvas is assumed to be north" style={{ position: 'absolute', left: 8, top: 8, alignItems: 'center' }}><ArrowUp size={14} color={t.textSecondary} /><Text style={{ color: t.textSecondary, fontSize: 10, lineHeight: 12, fontWeight: '700' }}>N</Text></View>
    {interactive && mode === 'roof' && roof.boundary.map((p, i) => <View key={`h${i}`} accessibilityLabel={`Roof corner ${i + 1}, drag to move`} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ position: 'absolute', left: toX(p.x) - 10, top: toY(p.y) - 10, width: 20, height: 20, borderRadius: 10 }} onStartShouldSetResponder={() => true} onResponderGrant={(e: any) => { drag.current = { px: e.nativeEvent.pageX, py: e.nativeEvent.pageY, orig: { ...p } }; }} onResponderMove={(e: any) => moveCorner(i, e)} onResponderRelease={() => { drag.current = null; }} onResponderTerminate={() => { drag.current = null; }} />)}
  </View>;
}
