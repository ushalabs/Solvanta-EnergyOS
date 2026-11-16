import type { ComponentType } from 'react';
import { NativeModules } from 'react-native';
import { ARProbeResult, probeResultFromError } from './arCapability';
import type { RoofARViewProps } from './roofArViewProps';

export const hasViroNativeModule = (): boolean => !!NativeModules.VRTARSceneNavigatorModule;

// ViroReact is required on demand. Loading it registers materials with its native module,
// which fails in a binary without that module, such as Expo Go. Check hasViroNativeModule first.
export async function probeARSupport(): Promise<ARProbeResult> {
  const { isARSupportedOnDevice } = require('@reactvision/react-viro');
  try {
    return (await isARSupportedOnDevice()).isARSupported ? 'SUPPORTED' : 'UNSUPPORTED';
  } catch (error) {
    return probeResultFromError(error);
  }
}

export const loadRoofARView = (): ComponentType<RoofARViewProps> | null =>
  hasViroNativeModule() ? require('./RoofARView').RoofARView : null;
