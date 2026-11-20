// What the AR view would place, drawn in perspective for devices that cannot run AR (no ARCore, no Viro, emulators).
// Uses the same plane-local metres as the real AR view (layoutToAR), on a tracked-plane grid, labelled as simulated.
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING } from '../theme/tokens';
import type { ARLayout } from '../ar/roofToAr';
import { makeProjector, type P2 } from '../ar/simulatedCamera';

const CELL_ROWS = 6;
const CELL_COLS = 3;

export function SimulatedARPreview({ layout, width = 340, height = 420 }: { layout: ARLayout; width?: number; height?: number }) {
  const { tokens: t } = useTheme();
  const project = makeProjector(layout);
  const halfX = layout.spanX_m / 2 + 1.2, halfZ = layout.spanZ_m / 2 + 1.2;
  const lift = 0.02;

  // Panels as world-space quads; cell lines are interpolated in world space so they stay straight in perspective.
  const panels = layout.panels.map(p => {
    const [cx, , cz] = p.position;
    const w = p.width / 2, h = p.height / 2;
    const corner = (u: number, v: number) => [cx - w + u * p.width, cz - h + v * p.height] as const;
    return { key: p.key, corner };
  });
  const raw: P2[] = [
    project(-halfX, 0, -halfZ), project(halfX, 0, -halfZ), project(halfX, 0, halfZ), project(-halfX, 0, halfZ),
  ];
  const xs = raw.map(p => p[0]), ys = raw.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((width * 0.9) / (maxX - minX), (height * 0.62) / (maxY - minY));
  const offX = width / 2 - scale * (minX + maxX) / 2, offY = height * 0.58 - scale * (minY + maxY) / 2;
  const screen = (x: number, y: number, z: number): P2 => { const [px, py] = project(x, y, z); return [offX + px * scale, offY + py * scale]; };
  const pts = (list: P2[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const grid: Array<[P2, P2]> = [];
  for (let x = -Math.floor(halfX); x <= Math.floor(halfX); x++) grid.push([screen(x, 0, -halfZ), screen(x, 0, halfZ)]);
  for (let z = -Math.floor(halfZ); z <= Math.floor(halfZ); z++) grid.push([screen(-halfX, 0, z), screen(halfX, 0, z)]);
  const plane = pts([screen(-halfX, 0, -halfZ), screen(halfX, 0, -halfZ), screen(halfX, 0, halfZ), screen(-halfX, 0, halfZ)]);
  const [reticleX, reticleY] = screen(0, 0, layout.spanZ_m / 2 + 0.7);

  return (
    <View testID="simulated-ar-preview" accessible accessibilityLabel={`Simulated AR preview: ${layout.panels.length} panels covering ${layout.spanX_m.toFixed(1)} by ${layout.spanZ_m.toFixed(1)} metres`}
      style={{ borderRadius: RADIUS.card, overflow: 'hidden', borderWidth: 1, borderColor: t.border, backgroundColor: '#0B0F0D' }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1C2A33" />
            <Stop offset="0.38" stopColor="#24302B" />
            <Stop offset="1" stopColor="#151B18" />
          </LinearGradient>
          <RadialGradient id="vignette" cx="50%" cy="55%" r="75%">
            <Stop offset="0.6" stopColor="#000000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.55" />
          </RadialGradient>
          <LinearGradient id="cell" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#1E4A73" />
            <Stop offset="0.55" stopColor="#0F2C4A" />
            <Stop offset="1" stopColor="#0A1F36" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#sky)" />
        {/* Tracked plane: soft fill, dotted grid and a lime edge, as AR apps show a detected surface */}
        <Polygon points={plane} fill={t.lime} fillOpacity={0.06} stroke={t.lime} strokeOpacity={0.55} strokeWidth={1.2} strokeDasharray="5 4" />
        {grid.map(([a, b], i) => <Line key={`g${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#FFFFFF" strokeOpacity={0.09} strokeWidth={0.8} />)}
        {/* Shadows first, then the panels, farthest first */}
        {[...panels].sort((a, b) => a.corner(0, 0)[1] - b.corner(0, 0)[1]).map(({ key, corner }) => {
          const at = (u: number, v: number, y: number) => { const [x, z] = corner(u, v); return screen(x, y, z); };
          const shadow = pts([at(0, 0, 0), at(1, 0, 0), at(1, 1, 0), at(0, 1, 0)].map(([x, y]) => [x + 3, y + 3] as P2));
          const face = pts([at(0, 0, lift), at(1, 0, lift), at(1, 1, lift), at(0, 1, lift)]);
          const lines: Array<[P2, P2]> = [];
          for (let r = 1; r < CELL_ROWS; r++) lines.push([at(0, r / CELL_ROWS, lift), at(1, r / CELL_ROWS, lift)]);
          for (let c = 1; c < CELL_COLS; c++) lines.push([at(c / CELL_COLS, 0, lift), at(c / CELL_COLS, 1, lift)]);
          return (
            <React.Fragment key={key}>
              <Polygon points={shadow} fill="#000000" fillOpacity={0.35} />
              <Polygon testID="ar-panel" points={face} fill="url(#cell)" stroke="#C9D6E2" strokeOpacity={0.75} strokeWidth={0.9} />
              {lines.map(([a, b], i) => <Line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#8FB3D9" strokeOpacity={0.35} strokeWidth={0.6} />)}
            </React.Fragment>
          );
        })}
        {/* Placement reticle where the user would tap */}
        <Circle cx={reticleX} cy={reticleY} r={13} fill="none" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={2} />
        <Circle cx={reticleX} cy={reticleY} r={3} fill={t.lime} />
        <Rect x="0" y="0" width={width} height={height} fill="url(#vignette)" />
      </Svg>
      <View style={{ position: 'absolute', top: SPACING.md, left: SPACING.md, right: SPACING.md, flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, backgroundColor: t.amberTint }}>
          <Text style={{ color: t.amberText, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>SIMULATED AR</Text>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <Text style={{ color: t.textPrimary, fontSize: 11, fontWeight: '600' }}>{layout.panels.length} panels</Text>
        </View>
      </View>
      <View style={{ position: 'absolute', bottom: SPACING.md, left: SPACING.md, right: SPACING.md, padding: 10, borderRadius: RADIUS.md, backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Text style={{ color: t.textPrimary, fontSize: 13, fontWeight: '600' }}>{`${layout.spanX_m.toFixed(1)} m × ${layout.spanZ_m.toFixed(1)} m array on a detected surface`}</Text>
        <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>Rendered from the saved layout. On an ARCore phone it is placed on the real surface through the camera.</Text>
      </View>
    </View>
  );
}
