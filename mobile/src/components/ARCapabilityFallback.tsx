import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { LimeCTA } from './LimeCTA';
import { SPACING, RADIUS } from '../theme/tokens';

interface ARCapabilityFallbackProps {
  onContinue2D: () => void;
}

export const ARCapabilityFallback: React.FC<ARCapabilityFallbackProps> = ({
  onContinue2D,
}) => {
  const { tokens } = useTheme();

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
          DEMO • NATIVE AR NOT INTEGRATED
        </Text>
      </View>

      <Text accessibilityRole="header" style={[styles.title, { color: tokens.textPrimary }]}>
        Native AR Environment Gate
      </Text>

      <Text style={[styles.body, { color: tokens.textPrimary }]}>
        Native AR overlay requires an Android device with Google Play Services for AR (ARCore) and a custom native development client build (EAS dev client). ViroReact cannot execute inside Expo Go or standard web preview.
      </Text>

      <Text style={[styles.body, { color: tokens.textSecondary }]}>
        The measured 2D editor and saved panel placement are available. This Expo SDK 57 build has no native AR module. ViroReact is not installed yet, and no physical ARCore device is connected for validation.
      </Text>

      <LimeCTA
        title="Return to 2D Layout Preview"
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
