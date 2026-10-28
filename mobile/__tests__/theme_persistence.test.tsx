import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
let currentTheme: ReturnType<typeof useTheme>;
function Probe() {
  currentTheme = useTheme();
  return <>{currentTheme.mode}</>;
}

beforeEach(() => jest.clearAllMocks());

test('first launch defaults dark, theme changes persist and survive provider remount', async () => {
  storage.getItem.mockResolvedValueOnce(null).mockResolvedValueOnce('light');
  storage.setItem.mockResolvedValue();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<ThemeProvider><Probe /></ThemeProvider>); });
  expect(tree.toJSON()).toBe('dark');
  await act(async () => { await currentTheme.setTheme('light'); });
  expect(tree.toJSON()).toBe('light');
  expect(storage.setItem).toHaveBeenCalledWith('@solvanta_theme_mode', 'light');
  await act(async () => { tree.unmount(); });
  await act(async () => { tree = create(<ThemeProvider><Probe /></ThemeProvider>); });
  expect(tree.toJSON()).toBe('light');
  await act(async () => { tree.unmount(); });
});

test('saved light preference loads before any default-dark screen can render', async () => {
  let resolvePreference!: (mode: string) => void;
  storage.getItem.mockReturnValue(new Promise(resolve => { resolvePreference = resolve; }));
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<ThemeProvider><Probe /></ThemeProvider>); });
  expect(tree.toJSON()).toBeNull();
  await act(async () => { resolvePreference('light'); });
  expect(tree.toJSON()).toBe('light');
  await act(async () => { tree.unmount(); });
});
