import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Circle, Line, Rect, Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';

interface EnergyFlowSvgProps {
  solarKw: number;
  batterySocPct: number;
  batteryFlowKw: number; // positive = discharge to home, negative = charge
  loadKw: number;
  gridAvailable: boolean;
}

export const EnergyFlowSvg: React.FC<EnergyFlowSvgProps> = ({
  solarKw,
  batterySocPct,
  batteryFlowKw,
  loadKw,
  gridAvailable,
}) => {
  const { tokens } = useTheme();

  const isBatteryDischarging = batteryFlowKw > 0;
  const isSolarGenerating = solarKw > 0.05;

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
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: tokens.textSecondary }]}>
          ENERGY FLOW DIGITAL TWIN
        </Text>
        <View style={[styles.liveBadge, { backgroundColor: tokens.surfaceElevated }]}>
          <View style={[styles.pulseDot, { backgroundColor: tokens.amber }]} />
          <Text style={[styles.liveBadgeText, { color: tokens.amber }]}>
            OUTAGE SIMULATED
          </Text>
        </View>
      </View>

      <View style={styles.svgContainer}>
        <Svg width="100%" height={160} viewBox="0 0 300 160">
          {/* Connecting Lines */}
          {/* Solar to Home (Top to Center) */}
          <Line
            x1="70"
            y1="40"
            x2="150"
            y2="80"
            stroke={isSolarGenerating ? tokens.lime : tokens.border}
            strokeWidth="2.5"
            strokeDasharray={isSolarGenerating ? '5,3' : undefined}
          />
          {/* Home to Battery (Center to Right) */}
          <Line
            x1="150"
            y1="80"
            x2="230"
            y2="40"
            stroke={isBatteryDischarging ? tokens.lime : tokens.border}
            strokeWidth="2.5"
            strokeDasharray={isBatteryDischarging ? '5,3' : undefined}
          />
          {/* Grid to Home (Bottom to Center) */}
          <Line
            x1="150"
            y1="130"
            x2="150"
            y2="80"
            stroke={gridAvailable ? tokens.cyan : tokens.red}
            strokeWidth="2"
            strokeDasharray={gridAvailable ? '4,4' : '2,4'}
          />

          {/* Node 1: Solar (Top Left) */}
          <Circle cx="70" cy="40" r="24" fill={tokens.surfaceElevated} stroke={isSolarGenerating ? tokens.lime : tokens.border} strokeWidth="2" />

          {/* Node 2: Battery (Top Right) */}
          <Circle cx="230" cy="40" r="24" fill={tokens.surfaceElevated} stroke={tokens.lime} strokeWidth="2" />

          {/* Node 3: Home / Load (Center) */}
          <Rect x="125" y="55" width="50" height="50" rx="14" fill={tokens.lime} />

          {/* Node 4: Grid (Bottom Center) */}
          <Circle cx="150" cy="130" r="18" fill={tokens.surfaceElevated} stroke={gridAvailable ? tokens.cyan : tokens.red} strokeWidth="1.5" />
        </Svg>
      </View>

      {/* Metric Labels under the SVG diagram */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: tokens.textMuted }]}>Solar</Text>
          <Text style={[styles.metricValue, { color: isSolarGenerating ? tokens.lime : tokens.textPrimary }]}>
            {solarKw.toFixed(1)} kW
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: tokens.textMuted }]}>Load</Text>
          <Text style={[styles.metricValue, { color: tokens.textPrimary }]}>
            {loadKw.toFixed(2)} kW
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: tokens.textMuted }]}>Battery</Text>
          <Text style={[styles.metricValue, { color: tokens.lime }]}>
            {batterySocPct}%
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: tokens.textMuted }]}>Grid</Text>
          <Text style={[styles.metricValue, { color: gridAvailable ? tokens.cyan : tokens.red }]}>
            {gridAvailable ? 'Active' : 'Outage'}
          </Text>
        </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
});
