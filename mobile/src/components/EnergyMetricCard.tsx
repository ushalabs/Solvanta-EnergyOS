import React, { ReactNode } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, Text, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS, TYPOGRAPHY } from '../theme/tokens';

interface EnergyMetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
  /** With an icon the card uses the compact node layout: icon tile beside label and value. */
  icon?: ReactNode;
  /** Draws a bar under the value, for example battery state of charge. Null draws an empty track. */
  progressPct?: number | null;
  progressLabel?: string;
  /** Spoken in place of the visible text, for example to add where the number comes from. */
  a11yLabel?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}

export const EnergyMetricCard: React.FC<EnergyMetricCardProps> = ({
  label,
  value,
  unit,
  subtext,
  accentColor,
  style,
  icon,
  progressPct,
  progressLabel,
  a11yLabel,
  onLayout,
}) => {
  const { tokens } = useTheme();
  const compact = !!icon;
  const hasBar = progressPct !== undefined;
  const fill = Math.min(100, Math.max(0, progressPct ?? 0));

  const text = (
    <>
      <Text style={[compact ? styles.nodeLabel : styles.label, { color: tokens.textSecondary }]}>
        {label}
      </Text>
      <View style={[styles.valueRow, compact && styles.nodeValueRow]}>
        <Text
          style={[
            compact ? styles.nodeValue : styles.value,
            { color: accentColor || tokens.textPrimary },
          ]}
        >
          {value}
        </Text>
        {unit && (
          <Text style={[compact ? styles.nodeUnit : styles.unit, { color: compact ? accentColor || tokens.textPrimary : tokens.textSecondary }]}>
            {' '}{unit}
          </Text>
        )}
      </View>
      {hasBar && (
        <View style={styles.barRow}>
          <View style={[styles.barTrack, { backgroundColor: tokens.surfaceElevated }]}>
            <View style={[styles.barFill, { width: `${fill}%`, backgroundColor: tokens.limeMark }]} />
          </View>
          {progressLabel ? <Text style={[styles.barLabel, { color: tokens.textSecondary }]}>{progressLabel}</Text> : null}
        </View>
      )}
      {subtext && (
        <Text style={[styles.subtext, { color: tokens.textSecondary }]}>
          {subtext}
        </Text>
      )}
    </>
  );

  return (
    <View
      accessible
      accessibilityLabel={a11yLabel ?? `${label}: ${value}${unit ? ` ${unit}` : ''}${subtext ? `, ${subtext}` : ''}`}
      onLayout={onLayout}
      style={[
        styles.card,
        compact && styles.nodeCard,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
        },
        style,
      ]}
    >
      {compact ? (
        <>
          <View style={[styles.iconTile, { backgroundColor: tokens.surfaceElevated }]}>{icon}</View>
          <View style={styles.nodeText}>{text}</View>
        </>
      ) : text}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    borderWidth: 1,
    flex: 1,
    minWidth: 140,
    marginVertical: SPACING.xs,
  },
  nodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    minWidth: 0,
    minHeight: 64,
    marginVertical: 0,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeText: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  nodeLabel: {
    fontSize: 13,
    lineHeight: 17,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  nodeValueRow: {
    marginTop: 1,
  },
  value: {
    fontSize: TYPOGRAPHY.kpiNumber,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  nodeValue: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
  },
  nodeUnit: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  barTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  barLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  subtext: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    marginTop: 3,
  },
});
