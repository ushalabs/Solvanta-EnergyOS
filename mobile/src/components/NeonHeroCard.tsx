import React, { ReactNode } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';

interface NeonHeroCardProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  rightElement?: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  children?: ReactNode;
}

export const NeonHeroCard: React.FC<NeonHeroCardProps> = ({
  title,
  subtitle,
  badgeText,
  rightElement,
  onPress,
  style,
  children,
}) => {
  const { heroGradient, tokens } = useTheme();

  const content = (
    <LinearGradient
      colors={heroGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      <View style={styles.topRow}>
        <View style={styles.textContainer}>
          {badgeText && (
            <View style={[styles.badge, { backgroundColor: tokens.onLime }]}>
              <Text style={[styles.badgeText, { color: tokens.limeBright }]}>
                {badgeText}
              </Text>
            </View>
          )}
          <Text style={[styles.title, { color: tokens.onLime }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: tokens.onLime }]}>
              {subtitle}
            </Text>
          )}
        </View>
        {rightElement && <View style={styles.rightSlot}>{rightElement}</View>}
      </View>
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  gradient: {
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    marginVertical: SPACING.sm,
    shadowColor: '#C6F43D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.85,
  },
  rightSlot: {
    marginLeft: SPACING.sm,
  },
});
