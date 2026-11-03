import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING } from '../theme/tokens';

interface SolvantaScreenProps {
  banner?: string;
  children: ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export const SolvantaScreen: React.FC<SolvantaScreenProps> = ({
  banner = 'DEMO • Fixture preview; live tools are labelled separately',
  children,
  scrollable = true,
  style,
  contentContainerStyle,
}) => {
  const { tokens, isDark } = useTheme();

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: tokens.background },
        style,
      ]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {scrollable ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.scrollContent,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.banner, { backgroundColor: tokens.amberTint }]}>
            <View style={[styles.bannerDot, { backgroundColor: tokens.amberText }]} />
            <Text style={[styles.bannerText, { color: tokens.amberText }]}>{banner}</Text>
          </View>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.container, contentContainerStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: SPACING.horizontalPadding,
    paddingTop: SPACING.md,
    paddingBottom: 110, // Generous clearance for floating navigation dock
  },
  banner: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    maxWidth: '100%',
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bannerText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});
