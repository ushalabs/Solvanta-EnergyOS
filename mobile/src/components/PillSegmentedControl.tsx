import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS } from '../theme/tokens';

interface Option {
  id: string;
  label: string;
  badge?: string;
}

interface PillSegmentedControlProps {
  options: Option[];
  selectedId: string;
  onSelect: (id: string) => void;
  style?: ViewStyle;
  a11yLabel?: string;
}

export const PillSegmentedControl: React.FC<PillSegmentedControlProps> = ({
  options,
  selectedId,
  onSelect,
  style,
  a11yLabel,
}) => {
  const { tokens } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={a11yLabel}
      style={[
        styles.container,
        {
          backgroundColor: tokens.surfaceElevated,
          borderColor: tokens.border,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const isSelected = option.id === selectedId;
        return (
          <TouchableOpacity
            key={option.id}
            activeOpacity={0.8}
            onPress={() => onSelect(option.id)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected, checked: isSelected }}
            aria-checked={isSelected}
            style={[
              styles.pill,
              isSelected && {
                backgroundColor: tokens.lime,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isSelected ? tokens.onLime : tokens.textSecondary,
                  fontWeight: isSelected ? '700' : '500',
                },
              ]}
            >
              {option.label}
            </Text>
            {option.badge && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: isSelected
                      ? tokens.onLime
                      : tokens.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color: isSelected ? tokens.lime : tokens.textPrimary,
                    },
                  ]}
                >
                  {option.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: RADIUS.pill,
    padding: 3,
    borderWidth: 1,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: RADIUS.pill,
  },
  label: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
