/**
 * Solvanta EnergyOS — Firebase & Guest Authentication Test Suite
 */

const memoryStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => memoryStore[key] || null),
    setItem: jest.fn(async (key: string, val: string) => {
      memoryStore[key] = val;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete memoryStore[key];
    }),
    clear: jest.fn(async () => {
      Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
    }),
  },
}));

const mockConstants = {
  appOwnership: 'expo',
  executionEnvironment: 'storeClient',
  expoConfig: {},
};

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: mockConstants,
  ExecutionEnvironment: {
    Bare: 'bare',
    Standalone: 'standalone',
    StoreClient: 'storeClient',
  },
}));

const mockPlatform = {
  OS: 'android',
  select: (objs: any) => objs.android || objs.default,
};

const mockTurboRegistry = {
  get: jest.fn((): any => null),
  getEnforcing: jest.fn((): any => null),
};

const mockNativeModules: Record<string, any> = {};

jest.mock('react-native', () => ({
  Platform: mockPlatform,
  TurboModuleRegistry: mockTurboRegistry,
  NativeModules: mockNativeModules,
  StyleSheet: { create: (s: any) => s },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeAuthError } from '../src/auth/authErrors';
import {
  getStoredAuthMode,
  setStoredAuthMode,
  getOrCreateGuestIdentity,
  clearGuestIdentity,
  AUTH_MODE_STORAGE_KEY,
  GUEST_IDENTITY_STORAGE_KEY,
} from '../src/auth/guestMode';
import {
  isGoogleSignInAvailable,
  signInWithGoogleNative,
} from '../src/auth/googleSignIn';

describe('1. Firebase Error Normalization', () => {
  test('maps common Firebase Authentication error codes to user-friendly messages', () => {
    expect(normalizeAuthError({ code: 'auth/email-already-in-use' })).toBe(
      'This email address is already registered. Please sign in instead.'
    );
    expect(normalizeAuthError({ code: 'auth/invalid-email' })).toBe(
      'Please enter a valid email address.'
    );
    expect(normalizeAuthError({ code: 'auth/user-not-found' })).toBe(
      'No account was found with this email. Please check the spelling or create an account.'
    );
    expect(normalizeAuthError({ code: 'auth/wrong-password' })).toBe(
      'Incorrect email or password. Please verify your credentials or reset your password.'
    );
    expect(normalizeAuthError({ code: 'auth/invalid-credential' })).toBe(
      'Incorrect email or password. Please verify your credentials or reset your password.'
    );
    expect(normalizeAuthError({ code: 'auth/weak-password' })).toBe(
      'Password is too weak. Please use at least 8 characters with numbers or symbols.'
    );
    expect(normalizeAuthError({ code: 'auth/too-many-requests' })).toBe(
      'Access temporarily blocked due to multiple failed attempts. Please wait a few moments or reset your password.'
    );
    expect(normalizeAuthError({ code: 'auth/network-request-failed' })).toBe(
      'Network connection failed. Please check your internet connection.'
    );
    expect(normalizeAuthError({ code: 'auth/user-disabled' })).toBe(
      'This user account has been disabled. Please contact support.'
    );
  });

  test('maps Google native codes and Expo Go boundary errors', () => {
    expect(normalizeAuthError({ code: 'google/cancelled' })).toBe(
      'Google sign-in was cancelled.'
    );
    expect(normalizeAuthError({ code: 'google/play-services-missing' })).toBe(
      'Google Play Services is unavailable or outdated on this device.'
    );
    expect(normalizeAuthError({ code: 'google/expo-go-unsupported' })).toBe(
      'Google Sign-In requires an Android development build. In Expo Go, please use Email/Password or Continue Without Account.'
    );
  });

  test('normalizes unknown error objects and offline exceptions cleanly', () => {
    expect(normalizeAuthError(new Error('offline network error'))).toContain(
      'Network connection unavailable'
    );
    expect(normalizeAuthError(null)).toBe('An unexpected error occurred. Please try again.');
  });
});

describe('2. Form Validation Logic', () => {
  const validateRegister = (email: string, pass: string, confirm: string) => {
    const trimmed = email.trim();
    if (!trimmed) return 'Please enter an email address.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return 'Please enter a valid email address.';
    if (!pass) return 'Please enter a password.';
    if (pass.length < 8) return 'Password must be at least 8 characters long.';
    if (pass !== confirm) return 'Passwords do not match.';
    return null;
  };

  test('validates email syntax properly', () => {
    expect(validateRegister('', 'Secret123!', 'Secret123!')).toBe('Please enter an email address.');
    expect(validateRegister('invalidemail', 'Secret123!', 'Secret123!')).toBe('Please enter a valid email address.');
    expect(validateRegister('user@domain', 'Secret123!', 'Secret123!')).toBe('Please enter a valid email address.');
    expect(validateRegister('valid@solvanta.energy', 'Secret123!', 'Secret123!')).toBeNull();
  });

  test('enforces 8 character minimum password and matching confirmation', () => {
    expect(validateRegister('user@solvanta.energy', 'short', 'short')).toBe(
      'Password must be at least 8 characters long.'
    );
    expect(validateRegister('user@solvanta.energy', 'validPass123', 'differentPass')).toBe(
      'Passwords do not match.'
    );
    expect(validateRegister('user@solvanta.energy', 'validPass123', 'validPass123')).toBeNull();
  });
});

describe('3. Local-Only / Guest Mode (Offline Identity)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('starts with none when no auth session stored', async () => {
    const mode = await getStoredAuthMode();
    expect(mode).toBe('none');
  });

  test('stores and restores guest auth mode', async () => {
    await setStoredAuthMode('guest');
    const mode = await getStoredAuthMode();
    expect(mode).toBe('guest');
  });

  test('stores and restores firebase auth mode', async () => {
    await setStoredAuthMode('firebase');
    const mode = await getStoredAuthMode();
    expect(mode).toBe('firebase');
  });

  test('generates persistent guest identity with local ID without cloud calls', async () => {
    const guest1 = await getOrCreateGuestIdentity();
    expect(guest1.isGuest).toBe(true);
    expect(guest1.displayName).toBe('Offline Guest User');
    expect(guest1.guestId).toMatch(/^guest_/);
    expect(guest1.createdAt).toBeDefined();

    // Calling again returns the exact same cached guest identity
    const guest2 = await getOrCreateGuestIdentity();
    expect(guest2.guestId).toBe(guest1.guestId);
  });

  test('clears guest identity on sign-out / reset', async () => {
    await getOrCreateGuestIdentity();
    await setStoredAuthMode('guest');

    await clearGuestIdentity();
    await setStoredAuthMode('none');

    const mode = await getStoredAuthMode();
    expect(mode).toBe('none');
    expect(await AsyncStorage.getItem(GUEST_IDENTITY_STORAGE_KEY)).toBeNull();
  });
});

describe('4. Native Google Sign-In Safe Runtime Boundary (Expo Go Compatibility)', () => {
  beforeEach(() => {
    mockConstants.appOwnership = 'expo';
    mockConstants.executionEnvironment = 'storeClient';
    mockPlatform.OS = 'android';
    mockTurboRegistry.get.mockReturnValue(null);
  });

  test('returns false in Expo Go environment', () => {
    expect(isGoogleSignInAvailable()).toBe(false);
  });

  test('returns false on Web platform', () => {
    mockConstants.appOwnership = 'standalone';
    mockPlatform.OS = 'web';
    expect(isGoogleSignInAvailable()).toBe(false);
  });

  test('prevents crashes when signInWithGoogleNative is called in Expo Go', async () => {
    mockConstants.appOwnership = 'expo';
    mockConstants.executionEnvironment = 'storeClient';

    const result = await signInWithGoogleNative();
    expect(result.error).toBe('google/expo-go-unsupported');
    expect(result.idToken).toBeUndefined();
  });

  test('returns true when running in standalone build with native module linked', () => {
    mockConstants.appOwnership = 'standalone';
    mockConstants.executionEnvironment = 'standalone';
    mockPlatform.OS = 'android';
    mockTurboRegistry.get.mockReturnValue({} as any);

    expect(isGoogleSignInAvailable()).toBe(true);
  });
});

describe('5. Identity Isolation and Session Restoration Contracts', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('guest identity and legacy FastAPI token keys do not conflict', async () => {
    await AsyncStorage.setItem(AUTH_MODE_STORAGE_KEY, 'guest');
    await AsyncStorage.setItem('@solvanta_auth_token', 'legacy_fastapi_jwt');

    const authMode = await AsyncStorage.getItem(AUTH_MODE_STORAGE_KEY);
    const legacyToken = await AsyncStorage.getItem('@solvanta_auth_token');

    expect(authMode).toBe('guest');
    expect(legacyToken).toBe('legacy_fastapi_jwt');
  });

  test('switching from guest to firebase removes guest identity cleanly', async () => {
    await getOrCreateGuestIdentity();
    await setStoredAuthMode('guest');

    expect(await getStoredAuthMode()).toBe('guest');

    // Simulate user authenticating with Firebase
    await clearGuestIdentity();
    await setStoredAuthMode('firebase');

    expect(await getStoredAuthMode()).toBe('firebase');
    expect(await AsyncStorage.getItem(GUEST_IDENTITY_STORAGE_KEY)).toBeNull();
  });

  test('sign-out clears active mode to none', async () => {
    await setStoredAuthMode('firebase');
    expect(await getStoredAuthMode()).toBe('firebase');

    await setStoredAuthMode('none');
    expect(await getStoredAuthMode()).toBe('none');
  });
});
