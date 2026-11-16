import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { ARCapability, checkARCapability } from './arCapability';
import { hasViroNativeModule, probeARSupport } from './viroNative';

export function detectARCapability(): Promise<ARCapability> {
  return checkARCapability({
    platform: Platform.OS,
    isExpoGo: Constants.executionEnvironment === 'storeClient',
    hasNativeModule: hasViroNativeModule(),
    probe: probeARSupport,
  });
}
