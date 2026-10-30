/**
 * Solvanta EnergyOS — Unified Authentication Context
 *
 * Provides reactive authentication state across Firebase Email/Password,
 * Native Google Sign-In, and Offline-First Local-Only Guest Mode.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirebaseAuth, requireFirebaseAuth } from './firebase';
import { normalizeAuthError } from './authErrors';
import {
  AuthMode,
  GuestIdentity,
  getStoredAuthMode,
  setStoredAuthMode,
  getOrCreateGuestIdentity,
  clearGuestIdentity,
} from './guestMode';
import {
  signInWithGoogleNative,
  signOutGoogleNative,
  isGoogleSignInAvailable,
} from './googleSignIn';

export interface AuthContextType {
  user: User | null;
  guestIdentity: GuestIdentity | null;
  authMode: AuthMode;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  emailVerified: boolean;
  isGoogleAvailable: boolean;

  // Actions
  signUpWithEmail: (email: string, password: string) => Promise<User>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string; cancelled?: boolean }>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  continueAsGuest: () => Promise<GuestIdentity>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [guestIdentity, setGuestIdentity] = useState<GuestIdentity | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('none');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Effects run only on the client; imports/static rendering never initialize Auth.
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    async function initializeSession() {
      try {
        const storedMode = await getStoredAuthMode();
        if (!isMounted) return;
        if (storedMode === 'guest') {
          const guest = await getOrCreateGuestIdentity();
          if (!isMounted) return;
          setGuestIdentity(guest);
          setAuthMode('guest');
          setUser(null);
          setIsLoading(false);
          return;
        }

        const auth = getFirebaseAuth();
        if (!auth) {
          setIsLoading(false);
          return;
        }
        unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          try {
            const mode = await getStoredAuthMode();
            if (!isMounted) return;
            // A pending observer must not override an explicitly selected guest session.
            if (mode === 'guest') {
              const guest = await getOrCreateGuestIdentity();
              if (!isMounted) return;
              setGuestIdentity(guest);
              setAuthMode('guest');
              setUser(null);
            } else if (currentUser) {
              setUser(currentUser);
              setAuthMode('firebase');
              setGuestIdentity(null);
              await setStoredAuthMode('firebase');
            } else {
              setUser(null);
              setAuthMode('none');
              setGuestIdentity(null);
            }
          } catch {
            console.warn('Unable to restore the saved authentication session.');
          } finally {
            if (isMounted) setIsLoading(false);
          }
        });
      } catch {
        console.warn('Unable to initialize the authentication session.');
        if (isMounted) setIsLoading(false);
      }
    }

    void initializeSession();
    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  // 1. Email/Password Registration
  const signUpWithEmail = useCallback(async (email: string, password: string): Promise<User> => {
    try {
      const credential = await createUserWithEmailAndPassword(requireFirebaseAuth(), email.trim(), password);
      const newUser = credential.user;

      // Automatically dispatch verification email
      try {
        await sendEmailVerification(newUser);
      } catch (verifyErr) {
        console.warn('Initial verification email dispatch notice:', verifyErr);
      }

      setUser(newUser);
      setAuthMode('firebase');
      setGuestIdentity(null);
      await setStoredAuthMode('firebase');
      return newUser;
    } catch (error: any) {
      throw new Error(normalizeAuthError(error));
    }
  }, []);

  // 2. Email/Password Login
  const signInWithEmail = useCallback(async (email: string, password: string): Promise<User> => {
    try {
      const credential = await signInWithEmailAndPassword(requireFirebaseAuth(), email.trim(), password);
      const loggedInUser = credential.user;
      setUser(loggedInUser);
      setAuthMode('firebase');
      setGuestIdentity(null);
      await setStoredAuthMode('firebase');
      return loggedInUser;
    } catch (error: any) {
      throw new Error(normalizeAuthError(error));
    }
  }, []);

  // 3. Native Google Sign-In linked to Firebase
  const signInWithGoogle = useCallback(async () => {
    try {
      const auth = requireFirebaseAuth();
      const googleResult = await signInWithGoogleNative();

      if (googleResult.cancelled) {
        return { success: false, cancelled: true };
      }

      if (googleResult.error || !googleResult.idToken) {
        return {
          success: false,
          error: normalizeAuthError(googleResult.error || 'Failed to authenticate with Google.'),
        };
      }

      // Exchange Google ID token for Firebase credential
      const credential = GoogleAuthProvider.credential(googleResult.idToken);
      const userCredential = await signInWithCredential(auth, credential);

      setUser(userCredential.user);
      setAuthMode('firebase');
      setGuestIdentity(null);
      await setStoredAuthMode('firebase');

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: normalizeAuthError(error),
      };
    }
  }, []);

  // 4. Send or Resend Verification Email
  const sendVerificationEmailAction = useCallback(async (): Promise<void> => {
    const auth = requireFirebaseAuth();
    if (!auth.currentUser) {
      throw new Error('No user is currently signed in to verify.');
    }
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (error: any) {
      throw new Error(normalizeAuthError(error));
    }
  }, []);

  // 5. Reload User (to refresh email verification status)
  const reloadUser = useCallback(async (): Promise<void> => {
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) return;
    try {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser } as User);
    } catch (error: any) {
      throw new Error(normalizeAuthError(error));
    }
  }, []);

  // 6. Password Reset Email
  const sendPasswordReset = useCallback(async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(requireFirebaseAuth(), email.trim());
    } catch (error: any) {
      throw new Error(normalizeAuthError(error));
    }
  }, []);

  // 7. Offline Local-Only Guest Mode
  const continueAsGuest = useCallback(async (): Promise<GuestIdentity> => {
    const identity = await getOrCreateGuestIdentity();
    setGuestIdentity(identity);
    setAuthMode('guest');
    setUser(null);
    await setStoredAuthMode('guest');
    return identity;
  }, []);

  // 8. Secure Sign Out
  const signOut = useCallback(async (): Promise<void> => {
    try {
      if (authMode === 'guest') {
        await clearGuestIdentity();
      } else if (authMode === 'firebase') {
        const auth = getFirebaseAuth();
        if (auth) await firebaseSignOut(auth);
        await signOutGoogleNative();
      }
    } catch (error) {
      console.warn('Sign out cleanup notice:', error);
    } finally {
      setUser(null);
      setGuestIdentity(null);
      setAuthMode('none');
      await setStoredAuthMode('none');
    }
  }, [authMode]);

  const value: AuthContextType = {
    user,
    guestIdentity,
    authMode,
    isLoading,
    isAuthenticated: authMode !== 'none',
    isGuest: authMode === 'guest',
    emailVerified: user?.emailVerified ?? false,
    isGoogleAvailable: isGoogleSignInAvailable(),
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    sendVerificationEmail: sendVerificationEmailAction,
    reloadUser,
    sendPasswordReset,
    continueAsGuest,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
