import { PermissionsAndroid } from 'react-native';

export type CameraPermission = 'unknown' | 'granted' | 'denied' | 'blocked';

export async function isCameraGranted(): Promise<boolean> {
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
}

/** Android answers never_ask_again once the user has refused for good; only Settings can undo that. */
export async function requestCamera(): Promise<CameraPermission> {
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Camera for AR preview',
    message: 'Solvanta uses the camera to show your saved panel layout on a flat surface. The preview is a visualization, not a measurement. Camera images are not saved or uploaded.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });
  if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
}
