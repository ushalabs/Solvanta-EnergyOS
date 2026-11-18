import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SolvantaLogo } from '../src/components/SolvantaLogo';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';

function AuthNavigationWatcher() {
  const router = useRouter();
  const segments = useSegments();
  const { authMode, isLoading } = useAuth();
  const { tokens } = useTheme();

  useEffect(() => {
    if (isLoading) return;

    const currentFirstSegment = segments[0] as string | undefined;
    const isAuthScreen =
      currentFirstSegment === 'welcome' ||
      currentFirstSegment === 'login' ||
      currentFirstSegment === 'register' ||
      currentFirstSegment === 'forgot-password';

    if (authMode === 'none' && !isAuthScreen) {
      router.replace('/welcome');
    } else if (authMode !== 'none' && isAuthScreen) {
      router.replace('/(tabs)');
    }
  }, [authMode, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: tokens.background }]}>
        <View style={styles.splashIconWell}><SolvantaLogo ring size={80} /></View>
        <Text style={[styles.splashTitle, { color: tokens.textPrimary }]}>SOLVANTA</Text>
        <Text style={[styles.splashSubtitle, { color: tokens.limeText }]}>ENERGYOS</Text>
        <ActivityIndicator color={tokens.limeText} size="large" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="welcome"
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AuthNavigationWatcher />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashIconWell: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  splashSubtitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: 2,
  },
});
