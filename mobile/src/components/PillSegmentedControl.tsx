import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';

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
}

export const PillSegmentedControl: React.FC<PillSegmentedControlProps> = ({
  options,
  selectedId,
  onSelect,
  style,
}) => {
  const { tokens } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tokens.surface,
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
                      : tokens.surfaceElevated,
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
    padding: 4,
    borderWidth: 1,
    marginVertical: SPACING.sm,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    fontSize: 10,
    fontWeight: '700',
  },
});
