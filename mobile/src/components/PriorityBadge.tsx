import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS } from '../theme/tokens';

export type PriorityTier = 'critical' | 'high' | 'medium' | 'low';

interface PriorityBadgeProps {
  priority: PriorityTier;
  flexible?: boolean;
  /** The appliance has no flexible window: it runs at its earliest start. */
  fixed?: boolean;
  critical?: boolean;
  /** Further neutral tags built from real fields, for example Split into 2. */
  tags?: string[];
  /** Outlined pills (a border in the text colour, no fill), as in the schedule rows. */
  outlined?: boolean;
  /** One pill under another, right-aligned, for narrow spaces at the end of a row. */
  stack?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, flexible, fixed, critical, tags, outlined, stack }) => {
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

  const pill = (key: string, background: string, color: string, text: string) => (
    <View key={key} testID="badge-pill" style={[styles.badge, outlined ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: color } : { backgroundColor: background }]}>
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );

  return (
    <View style={[styles.container, stack && styles.stacked]}>
      {pill('priority', bg, fg, label)}
      {critical && priority !== 'critical' && pill('critical', tokens.redTint, tokens.redText, 'CRITICAL DEMAND')}
      {fixed && !flexible && pill('fixed', tokens.surfaceElevated, tokens.textSecondary, 'FIXED TIME')}
      {flexible && pill('flexible', tokens.limeTint, tokens.limeText, 'FLEXIBLE')}
      {(tags ?? []).map(tag => pill(`tag-${tag}`, tokens.surfaceElevated, tokens.textSecondary, tag.toUpperCase()))}
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
  stacked: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    alignItems: 'flex-end',
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
