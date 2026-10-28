import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorTokens, darkTokens, lightTokens, HERO_LIME_GRADIENT, HERO_LIME_GRADIENT_LIGHT } from './tokens';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  tokens: ColorTokens;
  heroGradient: [string, string, string];
  isDark: boolean;
  setTheme: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = '@solvanta_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  tokens: darkTokens,
  heroGradient: HERO_LIME_GRADIENT,
  isDark: true,
  setTheme: async () => {},
  toggleTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // First-launch default is ALWAYS dark, per ADR-007 and UI_DESIGN_SPEC
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadStoredTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') {
          setModeState(saved);
        }
      } catch (err) {
        console.warn('Failed to load persisted theme', err);
      } finally {
        setIsReady(true);
      }
    };
    loadStoredTheme();
  }, []);

  const setTheme = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (err) {
      console.warn('Failed to persist theme preference', err);
    }
  };

  const toggleTheme = async () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    await setTheme(next);
  };

  const isDark = mode === 'dark';
  const tokens = isDark ? darkTokens : lightTokens;
  const heroGradient = isDark ? HERO_LIME_GRADIENT : HERO_LIME_GRADIENT_LIGHT;

  // Do not render the default theme before the saved preference has loaded.
  if (!isReady) return null;

  return (
    <ThemeContext.Provider
      value={{
        mode,
        tokens,
        heroGradient,
        isDark,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
