import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';

interface BarData {
  /** Shown under the bar when `showBarLabels` is on; always part of the spoken summary. */
  day: string;
  kwh: number;
  /** When any bar sets this, only active bars are lime and the rest are muted. */
  active?: boolean;
}

interface EnergyBarChartProps {
  data: BarData[];
  title?: string;
  subtitle?: string;
  /** Large figure under the title, already formatted. Pass a dash when there is no value. */
  headline?: string;
  headlineUnit?: string;
  /** Where the numbers come from, for example SIMULATED or FORECAST. */
  badge?: string;
  /** Evenly spaced labels under the bars, for example hours. */
  axisLabels?: string[];
  caption?: string;
  /** Shown in place of the bars when there is no data. */
  emptyText?: string;
  showBarLabels?: boolean;
  a11yLabel?: string;
}

const CHART_HEIGHT = 120;

export const EnergyBarChart: React.FC<EnergyBarChartProps> = ({
  data,
  title = 'Usage history',
  subtitle,
  headline,
  headlineUnit,
  badge,
  axisLabels,
  caption,
  emptyText = 'No data yet.',
  showBarLabels = false,
  a11yLabel,
}) => {
  const { tokens } = useTheme();

  const maxVal = Math.max(...data.map((d) => d.kwh), 0);
  const highlights = data.some((d) => d.active !== undefined);

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
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={[styles.title, { color: tokens.textPrimary }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: tokens.amberTint }]}>
            <Text style={[styles.badgeText, { color: tokens.amberText }]}>{badge}</Text>
          </View>
        ) : null}
      </View>

      {headline !== undefined ? (
        <Text style={[styles.headline, { color: tokens.textPrimary }]}>
          {headline}
          {headlineUnit ? <Text style={styles.headlineUnit}> {headlineUnit}</Text> : null}
        </Text>
      ) : null}

      {data.length && maxVal > 0 ? (
        <>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={a11yLabel ?? `${title}: ${data.length} bars, highest ${maxVal.toFixed(2)}`}
            style={styles.barsContainer}
          >
            {data.map((item, index) => {
              const lit = !highlights || item.active;
              return (
                <View key={index} style={styles.barColumn}>
                  <LinearGradient
                    testID="chart-bar"
                    colors={lit ? [tokens.limeMark, tokens.limeDeep] : [tokens.surfaceElevated, tokens.surfaceElevated]}
                    style={[styles.bar, { height: Math.max(2, (item.kwh / maxVal) * CHART_HEIGHT) }]}
                  />
                </View>
              );
            })}
          </View>
          {showBarLabels ? (
            <View style={styles.axisRow}>
              {data.map((item, index) => (
                <Text key={index} style={[styles.barLabel, { color: tokens.textSecondary }]}>{item.day}</Text>
              ))}
            </View>
          ) : null}
          {axisLabels ? (
            <View style={styles.axisRow}>
              {axisLabels.map((label) => (
                <Text key={label} style={[styles.axisLabel, { color: tokens.textSecondary }]}>{label}</Text>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <View style={[styles.empty, { backgroundColor: tokens.surfaceElevated }]}>
          <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>{emptyText}</Text>
        </View>
      )}

      {caption ? (
        <Text style={[styles.caption, { color: tokens.textSecondary }]}>{caption}</Text>
      ) : null}
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
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  headlineUnit: {
    fontSize: 18,
    fontWeight: '700',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: CHART_HEIGHT,
    marginTop: SPACING.md,
  },
  barColumn: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  axisLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  barLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
  },
  empty: {
    height: CHART_HEIGHT,
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: SPACING.sm,
  },
});
