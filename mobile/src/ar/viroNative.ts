// Web and Jest resolve this file; Android and iOS resolve viroNative.native.ts.
// It keeps @reactvision/react-viro, and its web renderer peer, out of the web bundle.
import type { ComponentType } from 'react';
import type { ARProbeResult } from './arCapability';
import type { RoofARViewProps } from './roofArViewProps';

export const hasViroNativeModule = (): boolean => false;
export const probeARSupport = async (): Promise<ARProbeResult> => 'UNKNOWN';
export const loadRoofARView = (): ComponentType<RoofARViewProps> | null => null;
