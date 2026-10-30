/**
 * Solvanta EnergyOS — Centralized Firebase Initialization Module
 *
 * Implements strict singleton behavior across hot reloads and React renders.
 * Configures React Native AsyncStorage-backed session persistence.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  Auth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { FIREBASE_WEB_CONFIG, isFirebaseConfigured } from './firebaseConfig';

let auth: Auth | undefined;

/** Imports and server rendering must never create an Auth instance. */
export function getFirebaseAuth(): Auth | null {
  if (Platform.OS === 'web' && typeof window === 'undefined') return null;
  if (!isFirebaseConfigured()) return null;
  if (auth) return auth;

  const app: FirebaseApp = getApps().some(candidate => candidate.name === '[DEFAULT]')
    ? getApp()
    : initializeApp(FIREBASE_WEB_CONFIG);

  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    try {
      // getAuth() initializes defaults; it must not run before this call.
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (error) {
      // Fast refresh may retain an existing instance. Do not hide other errors
      // by silently falling back to nonpersistent sessions.
      if ((error as { code?: string }).code !== 'auth/already-initialized') throw error;
      auth = getAuth(app);
    }
  }
  return auth;
}

export function requireFirebaseAuth(): Auth {
  const instance = getFirebaseAuth();
  if (!instance) {
    throw Object.assign(new Error('Firebase sign-in is unavailable in this build. Configure the Firebase Web app settings or continue without an account.'), {
      code: 'auth/configuration-missing',
    });
  }
  return instance;
}
