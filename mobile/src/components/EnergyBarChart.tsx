import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';

interface BarData {
  day: string;
  kwh: number;
  active?: boolean;
}

interface EnergyBarChartProps {
  data: BarData[];
  title?: string;
  subtitle?: string;
}

export const EnergyBarChart: React.FC<EnergyBarChartProps> = ({
  data,
  title = 'USAGE HISTORY',
  subtitle = 'Week view • kWh',
}) => {
  const { tokens } = useTheme();

  const maxVal = Math.max(...data.map((d) => d.kwh), 1);
  const chartHeight = 90;

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
        <Text style={[styles.title, { color: tokens.textSecondary }]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
          {subtitle}
        </Text>
      </View>

      <View style={[styles.barsContainer, { height: chartHeight }]}>
        {data.map((item, index) => {
          const barHeight = Math.max((item.kwh / maxVal) * (chartHeight - 15), 8);
          const isSelected = item.active;

          return (
            <View key={index} style={styles.barColumn}>
              {/* Vertical Bar track */}
              <View style={[styles.barTrack, { height: chartHeight - 20 }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: barHeight,
                      backgroundColor: isSelected ? tokens.lime : tokens.surfaceElevated,
                    },
                    isSelected && styles.activeBarGlow,
                  ]}
                />
              </View>
              {/* Day Label */}
              <Text
                style={[
                  styles.dayLabel,
                  {
                    color: isSelected ? tokens.lime : tokens.textMuted,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {item.day}
              </Text>
            </View>
          );
        })}
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
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: 14,
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 7,
  },
  barFill: {
    width: 10,
    borderRadius: 5,
  },
  activeBarGlow: {
    shadowColor: '#C6F43D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  dayLabel: {
    fontSize: 11,
    marginTop: 6,
  },
});
