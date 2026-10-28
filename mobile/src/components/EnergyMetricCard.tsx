import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS, TYPOGRAPHY } from '../theme/tokens';

interface EnergyMetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  accentColor?: string;
  style?: ViewStyle;
}

export const EnergyMetricCard: React.FC<EnergyMetricCardProps> = ({
  label,
  value,
  unit,
  subtext,
  accentColor,
  style,
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
        style,
      ]}
    >
      <Text style={[styles.label, { color: tokens.textSecondary }]}>
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text
          style={[
            styles.value,
            { color: accentColor || tokens.textPrimary },
          ]}
        >
          {value}
        </Text>
        {unit && (
          <Text style={[styles.unit, { color: tokens.textMuted }]}>
            {' '}{unit}
          </Text>
        )}
      </View>
      {subtext && (
        <Text style={[styles.subtext, { color: tokens.textMuted }]}>
          {subtext}
        </Text>
      )}
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
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  value: {
    fontSize: TYPOGRAPHY.kpiNumber,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtext: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});
