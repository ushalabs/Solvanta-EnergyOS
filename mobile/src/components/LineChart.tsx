import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';
import { ChartPoint, areaPath, bandRects, describeSeries, linePath, project } from '../api/lineChart';

export interface LineSeries {
  id: string;
  label: string;
  points: ChartPoint[];
  /** Token key for the colour, so the chart follows the theme. */
  tone: 'lime' | 'cyan';
  /** Fill the area under the line. */
  area?: boolean;
}
export interface LineChartProps {
  series: LineSeries[];
  title: string;
  subtitle?: string;
  /** Where the numbers come from, for example SIMULATED. */
  badge?: string;
  xDomain: [number, number];
  yDomain: [number, number];
  xTicks: Array<{ value: number; label: string }>;
  yTicks: Array<{ value: number; label: string }>;
  /** Shaded spans on the x axis, for example outage windows. */
  bands?: Array<{ from: number; to: number }>;
  bandLabel?: string;
  /** Shown in place of the plot when no series has data. */
  emptyText?: string;
  /** Added to the spoken summary, for example where the lines come from. */
  note?: string;
  caption?: string;
  height?: number;
  unit?: string;
}

const LEFT = 38, RIGHT = 8, TOP = 8, BOTTOM = 22;

/** A line chart in the style of EnergyBarChart: same card, title and badge, same token colours. */
export const LineChart: React.FC<LineChartProps> = ({ series, title, subtitle, badge, xDomain, yDomain, xTicks, yTicks, bands = [], bandLabel, emptyText = 'No data yet.', note, caption, height = 180, unit = '%' }) => {
  const { tokens } = useTheme();
  const [width, setWidth] = useState(300);
  const colour = (tone: LineSeries['tone']) => tone === 'lime' ? tokens.limeMark : tokens.cyanText;
  const hasData = series.some(s => s.points.length > 0);
  const box = { left: LEFT, top: TOP, width: Math.max(10, width - LEFT - RIGHT), height: height - TOP - BOTTOM };
  const summary = [`${title}${badge ? `, ${badge.toLowerCase()}` : ''}.`, ...series.map(s => describeSeries(s.label, s.points, unit)), note ?? ''].filter(Boolean).join(' ');
  return (
    <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={[styles.title, { color: tokens.textPrimary }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>{subtitle}</Text> : null}
        </View>
        {badge ? <View style={[styles.badge, { backgroundColor: tokens.amberTint }]}><Text style={[styles.badgeText, { color: tokens.amberText }]}>{badge}</Text></View> : null}
      </View>
      {hasData ? (
        <View accessible accessibilityRole="image" accessibilityLabel={summary} onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height, marginTop: SPACING.md }}>
          <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
            {bandRects(bands, xDomain, box).map((b, i) => <Rect key={`band${i}`} x={b.x} y={box.top} width={b.width} height={box.height} fill={tokens.amberTint} />)}
            {yTicks.map(t => { const y = project({ x: xDomain[0], y: t.value }, xDomain, yDomain, box).y; return <React.Fragment key={`y${t.value}`}><Line x1={box.left} x2={box.left + box.width} y1={y} y2={y} stroke={tokens.border} strokeWidth={1} /><SvgText x={box.left - 6} y={y + 4} fontSize={11} textAnchor="end" fill={tokens.textSecondary}>{t.label}</SvgText></React.Fragment>; })}
            {xTicks.map(t => { const x = project({ x: t.value, y: yDomain[0] }, xDomain, yDomain, box).x; return <SvgText key={`x${t.value}`} x={x} y={height - 5} fontSize={11} textAnchor={t.value <= xDomain[0] ? 'start' : t.value >= xDomain[1] ? 'end' : 'middle'} fill={tokens.textSecondary}>{t.label}</SvgText>; })}
            {series.filter(s => s.area && s.points.length > 1).map(s => <Path key={`area-${s.id}`} d={areaPath(s.points, xDomain, yDomain, box)} fill={colour(s.tone)} fillOpacity={0.12} stroke="none" />)}
            {series.filter(s => s.points.length).map(s => <Path key={s.id} d={linePath(s.points, xDomain, yDomain, box)} fill="none" stroke={colour(s.tone)} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />)}
          </Svg>
        </View>
      ) : (
        <View style={[styles.empty, { backgroundColor: tokens.surfaceElevated, height }]}><Text style={[styles.emptyText, { color: tokens.textSecondary }]}>{emptyText}</Text></View>
      )}
      <View style={styles.legend}>
        {series.map(s => <View key={s.id} style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colour(s.tone) }]} /><Text style={[styles.legendText, { color: s.points.length ? tokens.textPrimary : tokens.textSecondary }]}>{s.label}{s.points.length ? '' : ' —'}</Text></View>)}
        {bands.length > 0 && bandLabel ? <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: tokens.amberText }]} /><Text style={[styles.legendText, { color: tokens.textPrimary }]}>{bandLabel}</Text></View> : null}
      </View>
      {caption ? <Text style={[styles.caption, { color: tokens.textSecondary }]}>{caption}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.card, padding: SPACING.cardPadding, marginVertical: SPACING.sm, borderWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.sm },
  headerText: { flex: 1 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  subtitle: { fontSize: 12, lineHeight: 17 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.pill },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  empty: { marginTop: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', padding: SPACING.md },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.lg, marginTop: SPACING.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 17, marginTop: SPACING.sm },
});
