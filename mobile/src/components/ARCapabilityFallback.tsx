import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { LimeCTA } from './LimeCTA';
import { SPACING, RADIUS } from '../theme/tokens';
import { AR_UNAVAILABLE_COPY, ARUnavailable } from '../ar/arCapability';

interface ARCapabilityFallbackProps {
  capability: ARUnavailable;
  onContinue2D: () => void;
  onRetry?: () => void;
}

export const ARCapabilityFallback: React.FC<ARCapabilityFallbackProps> = ({
  capability,
  onContinue2D,
  onRetry,
}) => {
  const { tokens } = useTheme();
  const copy = AR_UNAVAILABLE_COPY[capability];

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.card,
        {
          backgroundColor: tokens.backgroundRaised,
          borderColor: tokens.amberText,
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: tokens.amberTint }]}>
        <Text style={[styles.badgeText, { color: tokens.amberText }]}>
          {copy.badge}
        </Text>
      </View>

      <Text accessibilityRole="header" style={[styles.title, { color: tokens.textPrimary }]}>
        {copy.title}
      </Text>

      <Text style={[styles.body, { color: tokens.textPrimary }]}>
        {copy.body}
      </Text>

      <Text style={[styles.body, { color: tokens.textSecondary }]}>
        The measured 2D editor and saved panel placement still work on this device.
      </Text>

      {onRetry && (
        <LimeCTA
          title="Check Again"
          variant="surface"
          onPress={onRetry}
          style={styles.cta}
        />
      )}
      <LimeCTA
        title="Back to 2D layout"
        onPress={onContinue2D}
        style={styles.cta}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    padding: SPACING.cardPadding,
    borderWidth: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    marginBottom: SPACING.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  cta: {
    marginTop: SPACING.sm,
  },
});
