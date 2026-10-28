import React from 'react';
import { StyleSheet, TouchableOpacity, View, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS } from '../theme/tokens';

interface ScenarioToggleProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
}

export const ScenarioToggle: React.FC<ScenarioToggleProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  const { tokens } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel="Scenario load active toggle"
      style={[
        styles.track,
        {
          backgroundColor: value ? tokens.lime : tokens.surfaceElevated,
          borderColor: value ? tokens.limeBright : tokens.border,
        },
      ]}
    >
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: value ? tokens.onLime : tokens.textMuted,
            transform: [{ translateX: value ? 18 : 0 }],
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: RADIUS.pill,
    padding: 3,
    borderWidth: 1,
    justifyContent: 'center',
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});
