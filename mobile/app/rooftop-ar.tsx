import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SolvantaScreen } from '../src/components/SolvantaScreen';
import { Action, Card, CardHeader, Message, ScreenHeader } from '../src/components/TwinControls';
import { ARCapabilityFallback } from '../src/components/ARCapabilityFallback';
import { api } from '../src/api/client';
import type { RoofRecord } from '../src/api/roof';
import type { ARCapability } from '../src/ar/arCapability';
import { CameraPermission, isCameraGranted, requestCamera } from '../src/ar/cameraPermission';
import { detectARCapability } from '../src/ar/detectAR';
import { ARLayout, layoutToAR } from '../src/ar/roofToAr';
import { loadRoofARView } from '../src/ar/viroNative';

type RoofLoad = { status: 'loading' } | { status: 'unavailable'; message: string } | { status: 'ready'; layout: ARLayout };

const NO_LAYOUT = 'No saved panel layout for this building. Draw the roof, calculate and save it in the 2D layout, then open AR again.';

async function loadLayout(buildingId?: string): Promise<RoofLoad> {
  if (!buildingId) return { status: 'unavailable', message: NO_LAYOUT };
  try {
    const roof = await api.get<RoofRecord>(`/buildings/${buildingId}/roof`);
    const layout = layoutToAR(roof.layout);
    return layout.panels.length ? { status: 'ready', layout } : { status: 'unavailable', message: NO_LAYOUT };
  } catch (e: any) {
    return { status: 'unavailable', message: e.status === 404 ? NO_LAYOUT : e.message };
  }
}

/** Stops a JavaScript failure inside the AR view from taking the app down, and keeps the way back open. */
class ARErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function RooftopARScreen() {
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();
  const [capability, setCapability] = useState<ARCapability | 'checking'>('checking');
  const [roof, setRoof] = useState<RoofLoad>({ status: 'loading' });
  const [camera, setCamera] = useState<CameraPermission>('unknown');

  const back = useCallback(() => { if (router.canGoBack()) router.back(); else router.replace('/rooftop'); }, []);
  const check = useCallback(async () => { setCapability('checking'); setCapability(await detectARCapability()); }, []);
  const askCamera = useCallback(async () => {
    try { setCamera((await isCameraGranted()) ? 'granted' : await requestCamera()); } catch { setCamera('denied'); }
  }, []);

  useEffect(() => { check(); }, [check]);
  useEffect(() => {
    if (capability !== 'ready') return;
    let active = true;
    setRoof({ status: 'loading' });
    loadLayout(buildingId).then(result => { if (active) setRoof(result); });
    return () => { active = false; };
  }, [capability, buildingId]);
  const roofReady = roof.status === 'ready';
  useEffect(() => { if (roofReady) askCamera(); }, [roofReady, askCamera]);
  // The user may grant the permission in Settings. Only upgrade here: a plain check cannot tell denied from blocked.
  useEffect(() => {
    if (camera !== 'denied' && camera !== 'blocked') return;
    const subscription = AppState.addEventListener('change', async state => {
      if (state === 'active' && await isCameraGranted().catch(() => false)) setCamera('granted');
    });
    return () => subscription.remove();
  }, [camera]);

  const backAction = <Action title="Back to 2D layout" variant="secondary" onPress={back} />;
  const panel = (message: React.ReactNode, ...actions: React.ReactNode[]) => (
    <SolvantaScreen banner="AR PREVIEW - Visualization only, not a measurement">
      <ScreenHeader title="AR preview" subtitle="Your saved panel layout on a flat surface" />
      <Card><CardHeader title="Before AR can start" />{message}{actions}{backAction}</Card>
    </SolvantaScreen>
  );

  if (capability === 'checking') return panel(<Message>Checking AR support on this device.</Message>);
  if (capability !== 'ready') {
    return (
      <SolvantaScreen banner="AR PREVIEW - Visualization only, not a measurement">
        <ScreenHeader title="AR preview" subtitle="Your saved panel layout on a flat surface" />
        <ARCapabilityFallback capability={capability} onContinue2D={back} onRetry={capability === 'check-failed' ? check : undefined} />
      </SolvantaScreen>
    );
  }
  if (roof.status === 'loading') return panel(<Message>Loading the saved panel layout.</Message>);
  if (roof.status === 'unavailable') return panel(<Message tone="warning">{roof.message}</Message>);
  if (camera === 'unknown') return panel(<Message>Waiting for camera permission. AR uses the camera to find a flat surface.</Message>);
  if (camera === 'denied') return panel(<Message tone="warning">Camera permission was denied, so AR cannot start. The 2D layout does not need the camera.</Message>, <Action key="allow" title="Allow Camera" onPress={askCamera} />);
  if (camera === 'blocked') return panel(<Message tone="warning">Camera permission is turned off for Solvanta. Allow it in Settings to use AR. The 2D layout does not need the camera.</Message>, <Action key="settings" title="Open Settings" onPress={() => { Linking.openSettings(); }} />);

  const RoofARView = loadRoofARView();
  const failed = panel(<Message tone="danger">The AR view could not start on this device. The 2D layout is unaffected.</Message>);
  if (!RoofARView) return <ARCapabilityFallback capability="no-module" onContinue2D={back} />;
  return <ARErrorBoundary fallback={failed}><RoofARView layout={roof.layout} onBack={back} /></ARErrorBoundary>;
}
