import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/theme/ThemeContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
