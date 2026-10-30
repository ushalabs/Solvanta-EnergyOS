import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Zap } from 'lucide-react-native';
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
        <View style={[styles.splashIconWell, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Zap size={36} color={tokens.lime} />
        </View>
        <Text style={[styles.splashTitle, { color: tokens.textPrimary }]}>SOLVANTA</Text>
        <Text style={[styles.splashSubtitle, { color: tokens.lime }]}>ENERGYOS</Text>
        <ActivityIndicator color={tokens.lime} size="large" style={{ marginTop: 24 }} />
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
        name="scheduling"
        options={{
          presentation: 'card',
          headerShown: false,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
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
