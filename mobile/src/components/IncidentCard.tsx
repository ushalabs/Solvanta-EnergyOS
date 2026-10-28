import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';

interface IncidentCardProps {
  id: string;
  title: string;
  severity: 'warning' | 'critical' | 'info';
  suspectedCause: string;
  timestamp: string;
  onViewTrace?: (id: string) => void;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({
  id,
  title,
  severity,
  suspectedCause,
  timestamp,
  onViewTrace,
}) => {
  const { tokens } = useTheme();

  const color = severity === 'critical' ? tokens.red : severity === 'warning' ? tokens.amber : tokens.cyan;

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
        <View style={[styles.badge, { backgroundColor: 'rgba(249, 188, 70, 0.15)' }]}>
          <Text style={[styles.badgeText, { color }]}>
            {severity.toUpperCase()} ALERT • SIMULATED
          </Text>
        </View>
        <Text style={[styles.time, { color: tokens.textMuted }]}>
          {timestamp}
        </Text>
      </View>

      <Text style={[styles.title, { color: tokens.textPrimary }]}>
        {title}
      </Text>

      <View style={[styles.causeBox, { backgroundColor: tokens.surfaceElevated }]}>
        <Text style={[styles.causeLabel, { color: tokens.textMuted }]}>
          Suspected Cause:
        </Text>
        <Text style={[styles.causeText, { color: tokens.textPrimary }]}>
          {suspectedCause}
        </Text>
      </View>

      {onViewTrace && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onViewTrace(id)}
          style={[styles.btn, { borderColor: tokens.border }]}
        >
          <Text style={[styles.btnText, { color: tokens.lime }]}>
            Inspect Diagnostic Trace →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    marginVertical: SPACING.xs,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 10,
    fontWeight: '500',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  causeBox: {
    borderRadius: RADIUS.sm,
    padding: 8,
    marginBottom: 8,
  },
  causeLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  causeText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  btn: {
    height: 34,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
