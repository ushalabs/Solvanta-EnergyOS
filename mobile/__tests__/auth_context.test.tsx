/**
 * Solvanta EnergyOS — AuthContext State Transitions & Session Lifecycle Tests
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

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'standalone',
    executionEnvironment: 'standalone',
    expoConfig: {},
  },
  ExecutionEnvironment: {
    Bare: 'bare',
    Standalone: 'standalone',
    StoreClient: 'storeClient',
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android', select: (o: any) => o.android || o.default },
  TurboModuleRegistry: { get: jest.fn((): any => ({})), getEnforcing: jest.fn() },
  NativeModules: {},
  StyleSheet: { create: (s: any) => s },
}));

const mockCurrentUser: any = {
  uid: 'usr_test_123',
  email: 'engineer@solvanta.energy',
  emailVerified: false,
  displayName: 'Lead Engineer',
  reload: jest.fn(async () => {}),
};

const mockAuthInstance: any = {
  currentUser: mockCurrentUser,
};

const mockGetFirebaseAuth = jest.fn((): any => mockAuthInstance);
jest.mock('../src/auth/firebase', () => ({
  getFirebaseAuth: () => mockGetFirebaseAuth(),
  requireFirebaseAuth: () => {
    const auth = mockGetFirebaseAuth();
    if (!auth) throw new Error('Firebase sign-in is unavailable in this build.');
    return auth;
  },
}));

let authStateCallback: ((user: any) => void) | null = null;

jest.mock('firebase/app', () => ({
  getApps: jest.fn(() => [{ name: '[DEFAULT]' }]),
  getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => mockAuthInstance),
  initializeAuth: jest.fn(() => mockAuthInstance),
  getReactNativePersistence: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((auth: any, cb: (user: any) => void) => {
    authStateCallback = cb;
    return jest.fn(); // unsubscribe
  }),
  createUserWithEmailAndPassword: jest.fn(async (_auth, email, _pass) => ({
    user: {
      uid: 'new_uid_789',
      email,
      emailVerified: false,
      displayName: null,
      reload: jest.fn(async () => {}),
    },
  })),
  signInWithEmailAndPassword: jest.fn(async (_auth, email, _pass) => ({
    user: {
      uid: 'login_uid_456',
      email,
      emailVerified: true,
      displayName: 'Authenticated User',
      reload: jest.fn(async () => {}),
    },
  })),
  sendEmailVerification: jest.fn(async () => {}),
  sendPasswordResetEmail: jest.fn(async () => {}),
  GoogleAuthProvider: {
    credential: jest.fn((token: string) => ({ providerId: 'google.com', token })),
  },
  signInWithCredential: jest.fn(async (_auth, _cred) => ({
    user: {
      uid: 'google_uid_999',
      email: 'google.user@solvanta.energy',
      emailVerified: true,
      displayName: 'Google User',
      providerData: [{ providerId: 'google.com' }],
      reload: jest.fn(async () => {}),
    },
  })),
  signOut: jest.fn(async () => {}),
}));

const mockSignInWithGoogleNative = jest.fn();
jest.mock('../src/auth/googleSignIn', () => ({
  isGoogleSignInAvailable: jest.fn(() => true),
  signInWithGoogleNative: (...args: any[]) => mockSignInWithGoogleNative(...args),
  signOutGoogleNative: jest.fn(async () => {}),
}));

import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import * as firebaseAuth from 'firebase/auth';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Helper component to extract AuthContext value
let authContextConsumer: ReturnType<typeof useAuth>;
function AuthConsumer({ onReady }: { onReady?: () => void }) {
  authContextConsumer = useAuth();
  React.useEffect(() => {
    if (onReady) onReady();
  }, [onReady]);
  return null;
}

describe('AuthContext State Transitions', () => {
  let tree: ReactTestRenderer;

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mockGetFirebaseAuth.mockReturnValue(mockAuthInstance);
    authStateCallback = null;
  });

  afterEach(async () => {
    if (tree) {
      await act(async () => {
        tree.unmount();
      });
    }
  });

  test('restores offline guest identity from storage on launch', async () => {
    await AsyncStorage.setItem('@solvanta_auth_mode', 'guest');
    await AsyncStorage.setItem(
      '@solvanta_guest_identity',
      JSON.stringify({
        guestId: 'guest_restored_1',
        displayName: 'Offline Guest User',
        createdAt: '2026-10-30T00:00:00.000Z',
        isGuest: true,
      })
    );

    await act(async () => {
      tree = create(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    expect(authContextConsumer.authMode).toBe('guest');
    expect(authContextConsumer.isGuest).toBe(true);
    expect(authContextConsumer.isAuthenticated).toBe(true);
    expect(authContextConsumer.guestIdentity?.guestId).toBe('guest_restored_1');
    expect(authContextConsumer.user).toBeNull();
  });

  test('missing configuration leaves startup usable and rejects cloud sign-in clearly', async () => {
    mockGetFirebaseAuth.mockReturnValue(null);
    await act(async () => { tree = create(<AuthProvider><AuthConsumer /></AuthProvider>); });
    expect(authContextConsumer.isLoading).toBe(false);
    expect(authContextConsumer.authMode).toBe('none');
    expect(firebaseAuth.onAuthStateChanged).not.toHaveBeenCalled();
    await expect(authContextConsumer.signInWithEmail('user@example.com', 'password')).rejects.toThrow('unavailable');
    await act(async () => { await authContextConsumer.continueAsGuest(); });
    expect(authContextConsumer.isGuest).toBe(true);
  });

  test('restores guest without initializing Firebase or observing it', async () => {
    await AsyncStorage.setItem('@solvanta_auth_mode', 'guest');
    await act(async () => { tree = create(<AuthProvider><AuthConsumer /></AuthProvider>); });
    expect(mockGetFirebaseAuth).not.toHaveBeenCalled();
    expect(firebaseAuth.onAuthStateChanged).not.toHaveBeenCalled();
    expect(authContextConsumer.isLoading).toBe(false);
  });

  test('restores a Firebase session through the client observer', async () => {
    await act(async () => { tree = create(<AuthProvider><AuthConsumer /></AuthProvider>); });
    await act(async () => { await authStateCallback?.(mockCurrentUser); });
    expect(authContextConsumer.user?.uid).toBe(mockCurrentUser.uid);
    expect(authContextConsumer.authMode).toBe('firebase');
    expect(authContextConsumer.isLoading).toBe(false);
  });

  test('performs successful email registration, sends verification email and updates state', async () => {
    await act(async () => {
      tree = create(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    let newUser: any;
    await act(async () => {
      newUser = await authContextConsumer.signUpWithEmail('engineer@solvanta.energy', 'SecurePass2026!');
    });

    expect(firebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'engineer@solvanta.energy',
      'SecurePass2026!'
    );
    expect(firebaseAuth.sendEmailVerification).toHaveBeenCalled();
    expect(authContextConsumer.authMode).toBe('firebase');
    expect(authContextConsumer.user?.email).toBe('engineer@solvanta.energy');
    expect(authContextConsumer.isGuest).toBe(false);
  });

  test('performs successful email sign-in and updates state', async () => {
    await act(async () => {
      tree = create(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    await act(async () => {
      await authContextConsumer.signInWithEmail('operator@solvanta.energy', 'OperatorPass!');
    });

    expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'operator@solvanta.energy',
      'OperatorPass!'
    );
    expect(authContextConsumer.authMode).toBe('firebase');
    expect(authContextConsumer.user?.email).toBe('operator@solvanta.energy');
  });

  test('sends password reset email', async () => {
    await act(async () => {
      tree = create(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    await act(async () => {
      await authContextConsumer.sendPasswordReset('forgot@solvanta.energy');
    });

    expect(firebaseAuth.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(),
      'forgot@solvanta.energy'
    );
  });

  test('executes continueAsGuest and persists guest identity', async () => {
    await act(async () => {
      tree = create(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    await act(async () => {
      await authContextConsumer.continueAsGuest();
    });

    expect(authContextConsumer.authMode).toBe('guest');
    expect(authContextConsumer.isGuest).toBe(true);
    expect(authContextConsumer.guestIdentity?.isGuest).toBe(true);
    expect(await AsyncStorage.getItem('@solvanta_auth_mode')).toBe('guest');
  });

  test('signs out and resets state to unauthenticated', async () => {
    await act(async () => {
      tree = create(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    await act(async () => {
      await authContextConsumer.continueAsGuest();
    });
    expect(authContextConsumer.isAuthenticated).toBe(true);

    await act(async () => {
      await authContextConsumer.signOut();
    });

    expect(authContextConsumer.authMode).toBe('none');
    expect(authContextConsumer.isAuthenticated).toBe(false);
    expect(authContextConsumer.user).toBeNull();
    expect(authContextConsumer.guestIdentity).toBeNull();
  });

  test('signs in with native Google credential exchange', async () => {
    mockSignInWithGoogleNative.mockResolvedValueOnce({
      idToken: 'mock_google_id_token_xyz',
    });

    await act(async () => {
      tree = create(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    let res: any;
    await act(async () => {
      res = await authContextConsumer.signInWithGoogle();
    });

    expect(res.success).toBe(true);
    expect(firebaseAuth.GoogleAuthProvider.credential).toHaveBeenCalledWith('mock_google_id_token_xyz');
    expect(firebaseAuth.signInWithCredential).toHaveBeenCalled();
    expect(authContextConsumer.authMode).toBe('firebase');
    expect(authContextConsumer.user?.email).toBe('google.user@solvanta.energy');
  });

  test('handles cancelled Google sign in gracefully', async () => {
    mockSignInWithGoogleNative.mockResolvedValueOnce({
      cancelled: true,
    });

    await act(async () => {
      tree = create(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
    });

    let res: any;
    await act(async () => {
      res = await authContextConsumer.signInWithGoogle();
    });

    expect(res.success).toBe(false);
    expect(res.cancelled).toBe(true);
  });
});
