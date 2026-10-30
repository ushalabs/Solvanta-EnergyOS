/**
 * Solvanta EnergyOS — Firebase & Google OAuth Configuration
 *
 * Firebase Project ID: solvanta-3c123
 * Android Package: com.solvanta.energyos
 *
 * Note: Never store private keys or client secrets here.
 * The Web Client ID below is public and required by Google Sign-In SDK
 * to request an ID token that Firebase Authentication can verify.
 */

export const FIREBASE_WEB_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
};

export function isFirebaseConfigured(): boolean {
  return [FIREBASE_WEB_CONFIG.apiKey, FIREBASE_WEB_CONFIG.authDomain,
    FIREBASE_WEB_CONFIG.projectId, FIREBASE_WEB_CONFIG.appId]
    .every(value => !!value.trim() && !value.startsWith('YOUR_'));
}

/**
 * Google OAuth Web Client ID (Client Type 3 in google-services.json).
 * Used for backend token exchange with Firebase GoogleAuthProvider.
 */
export const GOOGLE_OAUTH_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
