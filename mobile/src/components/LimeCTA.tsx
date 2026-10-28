import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';

interface LimeCTAProps {
  title: string;
  onPress: () => void;
  variant?: 'lime' | 'surface' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const LimeCTA: React.FC<LimeCTAProps> = ({
  title,
  onPress,
  variant = 'lime',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const { tokens } = useTheme();

  let bg = tokens.lime;
  let fg = tokens.onLime;
  let border = 'transparent';

  if (variant === 'surface') {
    bg = tokens.surfaceElevated;
    fg = tokens.textPrimary;
  } else if (variant === 'outline') {
    bg = 'transparent';
    fg = tokens.lime;
    border = tokens.lime;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: fg }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.xs,
    borderWidth: 1,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
