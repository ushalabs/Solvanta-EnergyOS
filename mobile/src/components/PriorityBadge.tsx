import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS } from '../theme/tokens';

export type PriorityTier = 'critical' | 'high' | 'medium' | 'low';

interface PriorityBadgeProps {
  priority: PriorityTier;
  flexible?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, flexible }) => {
  const { tokens } = useTheme();

  let bg = tokens.surfaceElevated;
  let fg = tokens.textPrimary;
  let label: string = priority;

  switch (priority) {
    case 'critical':
      bg = 'rgba(255, 98, 106, 0.18)';
      fg = tokens.red;
      label = 'CRITICAL';
      break;
    case 'high':
      bg = 'rgba(249, 188, 70, 0.18)';
      fg = tokens.amber;
      label = 'HIGH';
      break;
    case 'medium':
      bg = tokens.surfaceElevated;
      fg = tokens.textSecondary;
      label = 'MEDIUM';
      break;
    case 'low':
      bg = tokens.surfaceElevated;
      fg = tokens.textMuted;
      label = 'LOW';
      break;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.text, { color: fg }]}>{label}</Text>
      </View>
      {flexible && (
        <View style={[styles.badge, styles.flexBadge, { backgroundColor: 'rgba(198, 244, 61, 0.15)' }]}>
          <Text style={[styles.text, { color: tokens.lime }]}>FLEXIBLE</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  flexBadge: {
    marginLeft: 4,
  },
  text: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
