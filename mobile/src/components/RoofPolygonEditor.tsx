import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Svg, { Polygon, Rect, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';

interface RoofPolygonEditorProps {
  usableAreaM2?: number;
  panelCount?: number;
  totalKwp?: number;
  onAdjustCorners?: () => void;
  onDefineScale?: () => void;
}

export const RoofPolygonEditor: React.FC<RoofPolygonEditorProps> = ({
  usableAreaM2 = 64.5,
  panelCount = 24,
  totalKwp = 10.0,
  onAdjustCorners,
  onDefineScale,
}) => {
  const { tokens } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: tokens.textSecondary }]}>
          ROOFTOP GEOMETRY & PANEL PLACEMENT
        </Text>
        <Text style={[styles.badge, { color: tokens.lime }]}>
          2D/3D FALLBACK ACTIVE
        </Text>
      </View>

      {/* Roof Canvas */}
      <View style={[styles.canvas, { backgroundColor: tokens.surfaceElevated }]}>
        <Svg width="100%" height={200} viewBox="0 0 320 200">
          {/* Outer Roof Polygon */}
          <Polygon
            points="30,30 290,30 260,170 60,170"
            fill="rgba(198, 244, 61, 0.06)"
            stroke={tokens.lime}
            strokeWidth="2.5"
            strokeDasharray="4,2"
          />

          {/* Calibrated Setback Line */}
          <Polygon
            points="45,45 275,45 250,155 70,155"
            fill="none"
            stroke={tokens.border}
            strokeWidth="1"
          />

          {/* Panel Grid Footprints (Rows of Panels) */}
          {/* Row 1 */}
          {[60, 95, 130, 165, 200, 235].map((x, i) => (
            <Rect key={`r1_${i}`} x={x} y={55} width="28" height="20" rx="3" fill="rgba(198, 244, 61, 0.35)" stroke={tokens.lime} strokeWidth="1" />
          ))}
          {/* Row 2 */}
          {[65, 100, 135, 170, 205].map((x, i) => (
            <Rect key={`r2_${i}`} x={x} y={85} width="28" height="20" rx="3" fill="rgba(198, 244, 61, 0.35)" stroke={tokens.lime} strokeWidth="1" />
          ))}
          {/* Row 3 */}
          {[75, 110, 145, 180, 215].map((x, i) => (
            <Rect key={`r3_${i}`} x={x} y={115} width="28" height="20" rx="3" fill="rgba(198, 244, 61, 0.35)" stroke={tokens.lime} strokeWidth="1" />
          ))}

          {/* Obstacle (e.g. Water Tank / Parapet) */}
          <Circle cx="240" cy="115" r="14" fill="rgba(255, 98, 106, 0.25)" stroke={tokens.red} strokeWidth="1.5" />
          <SvgText x="233" y="119" fill={tokens.red} fontSize="10" fontWeight="bold">✕</SvgText>
        </Svg>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={[styles.mLabel, { color: tokens.textMuted }]}>Usable Area</Text>
          <Text style={[styles.mVal, { color: tokens.textPrimary }]}>{usableAreaM2} m²</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.mLabel, { color: tokens.textMuted }]}>PV Panels</Text>
          <Text style={[styles.mVal, { color: tokens.lime }]}>{panelCount} Modules</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.mLabel, { color: tokens.textMuted }]}>Estimated DC</Text>
          <Text style={[styles.mVal, { color: tokens.textPrimary }]}>{totalKwp.toFixed(1)} kWp</Text>
        </View>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAdjustCorners}
          style={[styles.outlineBtn, { borderColor: tokens.border }]}
        >
          <Text style={[styles.outlineBtnText, { color: tokens.textPrimary }]}>
            Adjust Vertices
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onDefineScale}
          style={[styles.outlineBtn, { borderColor: tokens.border }]}
        >
          <Text style={[styles.outlineBtnText, { color: tokens.textPrimary }]}>
            Calibrate Scale
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    marginVertical: SPACING.sm,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  canvas: {
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  metricItem: {
    alignItems: 'flex-start',
  },
  mLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  mVal: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.sm,
  },
  outlineBtn: {
    flex: 1,
    height: 38,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
