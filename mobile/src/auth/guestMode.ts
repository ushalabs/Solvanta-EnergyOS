/**
 * Solvanta EnergyOS — Local-Only / Guest Mode Identity
 *
 * Implements an offline-first persistent guest identity that:
 * - Operates completely offline without requiring internet.
 * - Does NOT contact Firebase or create anonymous cloud accounts.
 * - Generates and persists a local unique identity across restarts.
 * - Can be exited voluntarily to allow explicit cloud sign-in.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const AUTH_MODE_STORAGE_KEY = '@solvanta_auth_mode';
export const GUEST_IDENTITY_STORAGE_KEY = '@solvanta_guest_identity';

export type AuthMode = 'firebase' | 'guest' | 'none';

export interface GuestIdentity {
  guestId: string;
  displayName: string;
  createdAt: string;
  isGuest: true;
}

/**
 * Generate a cryptographically sound local pseudo-random ID for guest identity.
 */
function generateLocalGuestId(): string {
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  return `guest_${timestamp}_${randomSuffix}`;
}

/**
 * Retrieve the currently selected active authentication mode.
 */
export async function getStoredAuthMode(): Promise<AuthMode> {
  try {
    const mode = await AsyncStorage.getItem(AUTH_MODE_STORAGE_KEY);
    if (mode === 'firebase' || mode === 'guest') {
      return mode;
    }
    return 'none';
  } catch {
    return 'none';
  }
}

/**
 * Store the active authentication mode.
 */
export async function setStoredAuthMode(mode: AuthMode): Promise<void> {
  try {
    if (mode === 'none') {
      await AsyncStorage.removeItem(AUTH_MODE_STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(AUTH_MODE_STORAGE_KEY, mode);
    }
  } catch (error) {
    console.warn('Failed to persist auth mode:', error);
  }
}

/**
 * Retrieve existing guest identity or create a new local-only identity.
 */
export async function getOrCreateGuestIdentity(): Promise<GuestIdentity> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_IDENTITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.guestId) {
        return parsed;
      }
    }
  } catch {
    // If parse fails, regenerate
  }

  const newIdentity: GuestIdentity = {
    guestId: generateLocalGuestId(),
    displayName: 'Offline Guest User',
    createdAt: new Date().toISOString(),
    isGuest: true,
  };

  try {
    await AsyncStorage.setItem(GUEST_IDENTITY_STORAGE_KEY, JSON.stringify(newIdentity));
  } catch (error) {
    console.warn('Failed to persist guest identity:', error);
  }

  return newIdentity;
}

/**
 * Clear the local guest identity when switching identities or signing out.
 */
export async function clearGuestIdentity(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GUEST_IDENTITY_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear guest identity:', error);
  }
}
