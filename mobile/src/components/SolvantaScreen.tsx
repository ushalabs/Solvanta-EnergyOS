import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { SPACING } from '../theme/tokens';

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
        >
          <Text style={{ color: tokens.amber, fontSize: 11, marginBottom: 10 }}>
            {banner}
          </Text>
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
    paddingHorizontal: SPACING.horizontalPadding,
    paddingTop: SPACING.sm,
    paddingBottom: 110, // Generous clearance for floating navigation dock
  },
});
