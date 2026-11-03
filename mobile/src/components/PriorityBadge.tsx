import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS } from '../theme/tokens';

export type PriorityTier = 'critical' | 'high' | 'medium' | 'low';

interface PriorityBadgeProps {
  priority: PriorityTier;
  flexible?: boolean;
  critical?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, flexible, critical }) => {
  const { tokens } = useTheme();

  let bg = tokens.surfaceElevated;
  let fg = tokens.textPrimary;
  let label: string = priority;

  switch (priority) {
    case 'critical':
      bg = tokens.redTint;
      fg = tokens.redText;
      label = 'CRITICAL';
      break;
    case 'high':
      bg = tokens.amberTint;
      fg = tokens.amberText;
      label = 'HIGH';
      break;
    case 'medium':
      bg = tokens.surfaceElevated;
      fg = tokens.textSecondary;
      label = 'MEDIUM';
      break;
    case 'low':
      bg = tokens.surfaceElevated;
      fg = tokens.textSecondary;
      label = 'LOW';
      break;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.text, { color: fg }]}>{label}</Text>
      </View>
      {critical && priority !== 'critical' && (
        <View style={[styles.badge, { backgroundColor: tokens.redTint }]}>
          <Text style={[styles.text, { color: tokens.redText }]}>CRITICAL DEMAND</Text>
        </View>
      )}
      {flexible && (
        <View style={[styles.badge, { backgroundColor: tokens.limeTint }]}>
          <Text style={[styles.text, { color: tokens.limeText }]}>FLEXIBLE</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
