/**
 * Solvanta EnergyOS — Firebase Authentication Error Normalization
 *
 * Normalizes error codes into user-friendly messages without exposing
 * internal system details or sensitive credentials.
 */

export function normalizeAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const code: string = error.code || (typeof error === 'string' ? error : '');
  const message: string = error.message || '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account was found with this email. Please check the spelling or create an account.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect email or password. Please verify your credentials or reset your password.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 8 characters with numbers or symbols.';
    case 'auth/too-many-requests':
      return 'Access temporarily blocked due to multiple failed attempts. Please wait a few moments or reset your password.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact support.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is currently disabled. Please contact support.';
    case 'auth/requires-recent-login':
      return 'This operation is sensitive and requires recent authentication. Please sign in again.';
    case 'auth/expired-action-code':
      return 'The verification or reset link has expired. Please request a new one.';
    case 'auth/invalid-action-code':
      return 'The verification or reset link is invalid or has already been used.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completion.';
    case 'google/cancelled':
      return 'Google sign-in was cancelled.';
    case 'google/configuration-missing':
      return 'Google Sign-In is unavailable in this build. Configure the Google Web client ID.';
    case 'google/play-services-missing':
      return 'Google Play Services is unavailable or outdated on this device.';
    case 'google/expo-go-unsupported':
      return 'Google Sign-In requires an Android development build. In Expo Go, please use Email/Password or Continue Without Account.';
    default:
      if (message.includes('network') || message.includes('offline')) {
        return 'Network connection unavailable. Please check your internet connection.';
      }
      return message || 'Authentication failed. Please verify your details and try again.';
  }
}
