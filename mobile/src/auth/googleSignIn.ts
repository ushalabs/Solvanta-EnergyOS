/**
 * Solvanta EnergyOS — Native Google Sign-In Integration
 *
 * Implements a safe runtime boundary for @react-native-google-signin/google-signin.
 * Prevents native module crashes when running inside Expo Go or on Web,
 * while providing full native Google Sign-In with ID token exchange
 * when running inside an Android development build.
 */

import { Platform, TurboModuleRegistry, NativeModules } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { GOOGLE_OAUTH_WEB_CLIENT_ID } from './firebaseConfig';

export interface GoogleSignInResult {
  idToken?: string;
  cancelled?: boolean;
  error?: string;
}

/**
 * Checks whether native Google Sign-In can safely execute on the current runtime.
 * Returns false on Web or inside Expo Go where the native Android Google Sign-In binary is not bundled.
 */
export function isGoogleSignInAvailable(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }

  // Check if running in Expo Go client
  const isExpoGo =
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  if (isExpoGo) {
    return false;
  }

  // Check if native module is linked without throwing TurboModule getEnforcing exception
  try {
    const hasTurbo = !!(TurboModuleRegistry?.get && TurboModuleRegistry.get('RNGoogleSignin'));
    const hasLegacy = !!(NativeModules && NativeModules.RNGoogleSignin);
    return hasTurbo || hasLegacy;
  } catch {
    return false;
  }
}

let isConfigured = false;

/**
 * Configure Google Sign-In with the Firebase Web Client ID.
 */
export async function configureGoogleSignIn(): Promise<boolean> {
  if (!isGoogleSignInAvailable()) {
    return false;
  }

  if (!GOOGLE_OAUTH_WEB_CLIENT_ID) return false;

  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    GoogleSignin.configure({
      webClientId: GOOGLE_OAUTH_WEB_CLIENT_ID,
      offlineAccess: true,
      scopes: ['profile', 'email'],
    });
    isConfigured = true;
    return true;
  } catch (error) {
    console.warn('Failed to configure Google Sign-In:', error);
    return false;
  }
}

/**
 * Execute native Google Sign-In flow.
 * Returns the verified ID token for Firebase credential linking, or cancellation/error states.
 */
export async function signInWithGoogleNative(): Promise<GoogleSignInResult> {
  if (!isGoogleSignInAvailable()) {
    return {
      error: 'google/expo-go-unsupported',
    };
  }

  try {
    const { GoogleSignin, statusCodes } = await import('@react-native-google-signin/google-signin');

    if (!isConfigured) {
      if (!await configureGoogleSignIn()) return { error: 'google/configuration-missing' };
    }

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    } catch {
      return { error: 'google/play-services-missing' };
    }

    const response = await GoogleSignin.signIn();

    // Check cancellation
    if ((response as any).type === 'cancelled') {
      return { cancelled: true };
    }

    // Extract ID token from response data (v13+ data.idToken, or top-level idToken fallback)
    const idToken =
      (response as any).data?.idToken ||
      (response as any).idToken;

    if (!idToken) {
      return { error: 'Failed to retrieve Google ID token from sign-in response.' };
    }

    return { idToken };
  } catch (error: any) {
    if (error?.code === 'SIGN_IN_CANCELLED' || error?.message?.includes('cancelled')) {
      return { cancelled: true };
    }
    if (error?.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      return { error: 'google/play-services-missing' };
    }
    return { error: error?.message || 'Google sign-in failed.' };
  }
}

/**
 * Sign out of native Google Sign-In to allow user switching.
 */
export async function signOutGoogleNative(): Promise<void> {
  if (!isGoogleSignInAvailable()) {
    return;
  }

  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {
    // Ignore sign-out errors
  }
}
