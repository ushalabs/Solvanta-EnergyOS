import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { SPACING } from '../theme/tokens';

interface SolvantaScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export const SolvantaScreen: React.FC<SolvantaScreenProps> = ({
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
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={tokens.background}
      />
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
            DEMO • Phase 1 UI preview • Fixture data, no engine or backend connected
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
