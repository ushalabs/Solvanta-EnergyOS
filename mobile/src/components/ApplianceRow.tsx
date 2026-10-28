import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { PriorityBadge, PriorityTier } from './PriorityBadge';
import { ScenarioToggle } from './ScenarioToggle';
import { SPACING, RADIUS } from '../theme/tokens';

interface ApplianceRowProps {
  id: string;
  name: string;
  ratedPowerW: number;
  priority: PriorityTier;
  flexible: boolean;
  scenarioOn: boolean;
  onToggle: (id: string, active: boolean) => void;
}

export const ApplianceRow: React.FC<ApplianceRowProps> = ({
  id,
  name,
  ratedPowerW,
  priority,
  flexible,
  scenarioOn,
  onToggle,
}) => {
  const { tokens } = useTheme();

  const formattedPower = ratedPowerW >= 1000
    ? `${(ratedPowerW / 1000).toFixed(1)} kW`
    : `${ratedPowerW} W`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.surface,
          borderColor: scenarioOn ? tokens.border : 'transparent',
        },
      ]}
    >
      <View style={styles.leftCol}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: tokens.textPrimary }]}>
            {name}
          </Text>
          <Text style={[styles.power, { color: tokens.textMuted }]}>
            {formattedPower}
          </Text>
        </View>
        <PriorityBadge priority={priority} flexible={flexible} />
      </View>

      <View style={styles.rightCol}>
        <ScenarioToggle
          value={scenarioOn}
          onValueChange={(val) => onToggle(id, val)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    marginVertical: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  leftCol: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  power: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  rightCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
