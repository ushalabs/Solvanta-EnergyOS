import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';

interface RecommendationCardProps {
  title: string;
  summary: string;
  criticalCoveragePct: number;
  batteryEndSocPct: number;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  title,
  summary,
  criticalCoveragePct,
  batteryEndSocPct,
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
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: 'rgba(198, 244, 61, 0.15)' }]}>
          <Text style={[styles.badgeText, { color: tokens.lime }]}>
            ✦ RECOMMENDED RESILIENCE PLAN
          </Text>
        </View>
        <Text style={[styles.provenance, { color: tokens.textMuted }]}>
          SIMULATED
        </Text>
      </View>

      <Text style={[styles.title, { color: tokens.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.summary, { color: tokens.textSecondary }]}>
        {summary}
      </Text>

      <View style={styles.kpiRow}>
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiLabel, { color: tokens.textMuted }]}>Critical Coverage</Text>
          <Text style={[styles.kpiVal, { color: tokens.lime }]}>
            {criticalCoveragePct}%
          </Text>
        </View>
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiLabel, { color: tokens.textMuted }]}>End Battery SoC</Text>
          <Text style={[styles.kpiVal, { color: tokens.textPrimary }]}>
            {batteryEndSocPct}%
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
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  provenance: {
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  kpiItem: {
    alignItems: 'flex-start',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  kpiVal: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
});
