import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';

interface MCPToolResultCardProps {
  toolName: string;
  engineName: string;
  scenarioId: string;
  resultSummary: string;
  criticalCoveragePct: number;
  durationMs: number;
  onViewPlan?: () => void;
  onReviewEvidence?: () => void;
}

export const MCPToolResultCard: React.FC<MCPToolResultCardProps> = ({
  toolName,
  engineName,
  scenarioId,
  resultSummary,
  criticalCoveragePct,
  durationMs,
  onViewPlan,
  onReviewEvidence,
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
        <View style={[styles.badge, { backgroundColor: 'rgba(198, 244, 61, 0.15)' }]}>
          <Text style={[styles.badgeText, { color: tokens.lime }]}>
            TOOL RESULT • SIMULATED
          </Text>
        </View>
        <Text style={[styles.duration, { color: tokens.textMuted }]}>
          {durationMs}ms
        </Text>
      </View>

      <Text style={[styles.toolTitle, { color: tokens.textPrimary }]}>
        {toolName}
      </Text>

      <View style={styles.metaRow}>
        <Text style={[styles.metaLabel, { color: tokens.textMuted }]}>Engine: </Text>
        <Text style={[styles.metaVal, { color: tokens.lime }]}>{engineName}</Text>
        <Text style={[styles.metaLabel, { color: tokens.textMuted }]}> | Ref: </Text>
        <Text style={[styles.metaVal, { color: tokens.textSecondary }]}>{scenarioId}</Text>
      </View>

      <Text style={[styles.summary, { color: tokens.textSecondary }]}>
        {resultSummary}
      </Text>

      <View style={styles.coverageRow}>
        <Text style={[styles.covLabel, { color: tokens.textMuted }]}>
          Critical Load Coverage:
        </Text>
        <Text style={[styles.covVal, { color: tokens.lime }]}>
          {criticalCoveragePct}%
        </Text>
      </View>

      <View style={styles.btnRow}>
        {onViewPlan && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onViewPlan}
            style={[styles.btn, { backgroundColor: tokens.lime }]}
          >
            <Text style={[styles.btnText, { color: tokens.onLime }]}>
              View Plan
            </Text>
          </TouchableOpacity>
        )}

        {onReviewEvidence && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onReviewEvidence}
            style={[styles.btn, { backgroundColor: tokens.surfaceElevated }]}
          >
            <Text style={[styles.btnText, { color: tokens.textPrimary }]}>
              Review Evidence
            </Text>
          </TouchableOpacity>
        )}
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
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  duration: {
    fontSize: 10,
    fontWeight: '600',
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metaVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  summary: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  coverageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  covLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  covVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
