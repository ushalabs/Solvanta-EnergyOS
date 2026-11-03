import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  a11yLabel?: string;
  hint?: string;
  disabled?: boolean;
}

/** Two-state control whose whole row is the touch target. It only ever changes app state, never a device. */
export const Toggle: React.FC<ToggleProps> = ({ value, onValueChange, label, a11yLabel, hint, disabled = false }) => {
  const { tokens: t } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      accessibilityRole="switch"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ checked: value, disabled }}
      aria-checked={value}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={{
        flexDirection: 'row',
        flexGrow: label ? 1 : 0,
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: 48,
        minWidth: 48,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label ? (
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textPrimary, fontSize: 14, lineHeight: 21 }}>{label}</Text>
          {hint ? <Text style={{ color: t.textSecondary, fontSize: 12, lineHeight: 18 }}>{hint}</Text> : null}
        </View>
      ) : null}
      <View
        style={{
          width: 48,
          height: 28,
          padding: 3,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: value ? t.lime : t.textSecondary,
          backgroundColor: value ? t.lime : t.surfaceElevated,
          alignItems: value ? 'flex-end' : 'flex-start',
        }}
      >
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: value ? t.onLime : t.textSecondary }} />
      </View>
    </TouchableOpacity>
  );
};
