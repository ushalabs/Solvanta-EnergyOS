import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';

interface BatterySocRingProps {
  socPct: number;
  backupHours: number;
  outageDurationHours: number;
  unservedCriticalKwh?: number;
}

export const BatterySocRing: React.FC<BatterySocRingProps> = ({
  socPct,
  backupHours,
  outageDurationHours,
  unservedCriticalKwh = 0,
}) => {
  const { tokens } = useTheme();

  const size = 200;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  // Arc covering 270 degrees (leaving bottom gap like the reference gauge)
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * Math.min(Math.max(socPct, 0), 100)) / 100;

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
      <View style={styles.topInfoRow}>
        <Text style={[styles.sectionTitle, { color: tokens.textSecondary }]}>
          BATTERY STATE & OUTAGE RUNTIME
        </Text>
        <Text style={[styles.outageBadge, { color: tokens.lime }]}>
          {outageDurationHours}H OUTAGE
        </Text>
      </View>

      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="limeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={tokens.limeBright} />
              <Stop offset="50%" stopColor={tokens.lime} />
              <Stop offset="100%" stopColor={tokens.limeDeep} />
            </LinearGradient>
          </Defs>

          {/* Background Track (270 degrees arc) */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={tokens.surfaceElevated}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            rotation={135}
            origin={`${center}, ${center}`}
          />

          {/* Active Lime Progress Arc */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#limeGrad)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation={135}
            origin={`${center}, ${center}`}
          />
        </Svg>

        {/* Center Readout inside the radial ring */}
        <View style={styles.centerReadout}>
          <Text style={[styles.socText, { color: tokens.textPrimary }]}>
            {socPct}%
          </Text>
          <Text style={[styles.socLabel, { color: tokens.lime }]}>
            BATTERY SOC
          </Text>
          <Text style={[styles.backupText, { color: tokens.textSecondary }]}>
            ~{backupHours.toFixed(1)}h reserve
          </Text>
        </View>
      </View>

      {/* Footer stats below the ring */}
      <View style={styles.footerRow}>
        <View style={styles.footerCol}>
          <Text style={[styles.footerLabel, { color: tokens.textMuted }]}>Minimum Reserve</Text>
          <Text style={[styles.footerVal, { color: tokens.textPrimary }]}>20% (Locked)</Text>
        </View>
        <View style={styles.footerCol}>
          <Text style={[styles.footerLabel, { color: tokens.textMuted }]}>Critical Deficit</Text>
          <Text
            style={[
              styles.footerVal,
              { color: unservedCriticalKwh > 0 ? tokens.red : tokens.green },
            ]}
          >
            {unservedCriticalKwh > 0 ? `${unservedCriticalKwh.toFixed(1)} kWh` : '0.0 kWh (Protected)'}
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
    alignItems: 'center',
  },
  topInfoRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  outageBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gaugeContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.sm,
  },
  centerReadout: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socText: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  socLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  backupText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  footerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerCol: {
    alignItems: 'flex-start',
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  footerVal: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
});
