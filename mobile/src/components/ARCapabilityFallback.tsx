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
      style={[
        styles.card,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: 'rgba(249, 188, 70, 0.15)' }]}>
        <Text style={[styles.badgeText, { color: tokens.amber }]}>
          DEMO • NATIVE AR NOT INTEGRATED
        </Text>
      </View>

      <Text style={[styles.title, { color: tokens.textPrimary }]}>
        Native AR Environment Gate
      </Text>

      <Text style={[styles.body, { color: tokens.textSecondary }]}>
        Native AR overlay requires an Android device with Google Play Services for AR (ARCore) and a custom native development client build (EAS dev client). ViroReact cannot execute inside Expo Go or standard web preview.
      </Text>

      <Text style={[styles.body, { color: tokens.textMuted }]}>
        The measured 2D editor and saved panel placement are available. This Expo SDK 58 build has no native AR module. The checked ViroReact package excludes SDK 58, and no physical ARCore device is connected for validation.
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
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    marginVertical: SPACING.sm,
    borderWidth: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  body: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  cta: {
    marginTop: SPACING.sm,
  },
});
