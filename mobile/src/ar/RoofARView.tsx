// Native only: reached through loadRoofARView in viroNative.native.ts, never from a web route.
import React, { useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ViroARPlaneSelector,
  ViroARScene,
  ViroARSceneNavigator,
  ViroARTrackingReasonConstants,
  ViroMaterials,
  ViroQuad,
  ViroTrackingStateConstants,
} from '@reactvision/react-viro';
import { Action, ActionRow } from '../components/TwinControls';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING } from '../theme/tokens';
import type { ARPanel } from './roofToAr';
import type { RoofARViewProps } from './roofArViewProps';

ViroMaterials.createMaterials({
  // The dark theme's limeMark at partial opacity, so the surface stays visible through the panels.
  solvantaArPanel: { lightingModel: 'Constant', diffuseColor: 'rgba(198, 244, 61, 0.6)', blendMode: 'Alpha', cullMode: 'None' },
});

export function trackingMessage(state: number, reason: number): string | null {
  if (state === ViroTrackingStateConstants.TRACKING_NORMAL) return null;
  if (state === ViroTrackingStateConstants.TRACKING_UNAVAILABLE) return 'Tracking is not available yet. Hold the phone steady and point it at the surface.';
  if (reason === ViroARTrackingReasonConstants.TRACKING_REASON_EXCESSIVE_MOTION) return 'Tracking is limited. Move the phone more slowly.';
  if (reason === ViroARTrackingReasonConstants.TRACKING_REASON_INSUFFICIENT_FEATURES) return 'Tracking is limited. Point at a textured, well-lit surface.';
  return 'Tracking is limited. Move the phone slowly over the surface.';
}

type SceneProps = {
  panels: ARPanel[];
  selectorRef: React.RefObject<ViroARPlaneSelector | null>;
  onTracking: (state: number, reason: number) => void;
  onPlaneFound: () => void;
  onPlaced: (anchorId: string) => void;
  onPlaneRemoved: (anchorId: string) => void;
};

function RoofARScene({ arSceneNavigator }: { arSceneNavigator: { viroAppProps: SceneProps } }) {
  const { panels, selectorRef, onTracking, onPlaneFound, onPlaced, onPlaneRemoved } = arSceneNavigator.viroAppProps;
  return (
    <ViroARScene
      anchorDetectionTypes={['PlanesHorizontal']}
      onTrackingUpdated={onTracking}
      onAnchorFound={anchor => selectorRef.current?.handleAnchorFound(anchor)}
      onAnchorUpdated={anchor => selectorRef.current?.handleAnchorUpdated(anchor)}
      onAnchorRemoved={anchor => { if (anchor) selectorRef.current?.handleAnchorRemoved(anchor); }}
    >
      <ViroARPlaneSelector
        ref={selectorRef}
        alignment="HorizontalUpward"
        onPlaneDetected={() => { onPlaneFound(); return true; }}
        onPlaneSelected={plane => onPlaced(plane.anchorId)}
        onPlaneRemoved={onPlaneRemoved}
      >
        {panels.map(panel => (
          <ViroQuad key={panel.key} position={panel.position} rotation={panel.rotation} width={panel.width} height={panel.height} materials={['solvantaArPanel']} />
        ))}
      </ViroARPlaneSelector>
    </ViroARScene>
  );
}

export function RoofARView({ layout, onBack }: RoofARViewProps) {
  const { tokens: t } = useTheme();
  const selectorRef = useRef<ViroARPlaneSelector | null>(null);
  const placedOn = useRef<string | null>(null);
  const [tracking, setTracking] = useState<string | null>('Starting the camera and tracking.');
  const [planeFound, setPlaneFound] = useState(false);
  const [placed, setPlaced] = useState(false);

  const sceneProps = useMemo<SceneProps>(() => ({
    panels: layout.panels,
    selectorRef,
    onTracking: (state, reason) => setTracking(trackingMessage(state, reason)),
    onPlaneFound: () => setPlaneFound(true),
    onPlaced: anchorId => { placedOn.current = anchorId; setPlaced(true); },
    // ARCore can merge a plane into another one. The selector then clears its selection, so ask again.
    onPlaneRemoved: anchorId => { if (placedOn.current === anchorId) { placedOn.current = null; setPlaced(false); } },
  }), [layout.panels]);

  const placeAgain = () => { placedOn.current = null; setPlaced(false); selectorRef.current?.reset(); };
  const count = layout.panels.length;
  const instruction = placed
    ? `${count} ${count === 1 ? 'panel' : 'panels'} placed where you tapped. Walk around to view the layout.`
    : planeFound
      ? 'Tap a highlighted surface to place the layout.'
      : 'Move the phone slowly over a flat surface until it is highlighted.';

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <ViroARSceneNavigator
        autofocus
        provider="none"
        initialScene={{ scene: RoofARScene as unknown as () => React.JSX.Element }}
        viroAppProps={sceneProps}
        style={{ flex: 1 }}
      />
      <SafeAreaView pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', padding: SPACING.md }}>
        <View style={{ alignSelf: 'flex-start', maxWidth: '100%', padding: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: t.amberTint }}>
          <Text style={{ color: t.amberText, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 }}>VISUALIZATION ONLY</Text>
          <Text style={{ color: t.amberText, fontSize: 12, lineHeight: 17 }}>Not a measurement or a certified placement.</Text>
        </View>
        <View style={{ gap: SPACING.sm, padding: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}>
          <View accessibilityLiveRegion="polite" style={{ gap: 4 }}>
            <Text style={{ color: t.textPrimary, fontSize: 14, lineHeight: 20, fontWeight: '700' }}>{instruction}</Text>
            {tracking && <Text style={{ color: t.amberText, fontSize: 13, lineHeight: 18 }}>{tracking}</Text>}
            <Text style={{ color: t.textSecondary, fontSize: 12, lineHeight: 17 }}>{`Drawn at the scale saved with your roof, about ${layout.spanX_m.toFixed(1)} × ${layout.spanZ_m.toFixed(1)} m.`}</Text>
          </View>
          <ActionRow>
            {placed && <Action title="Choose Another Surface" variant="secondary" onPress={placeAgain} />}
            <Action title="Back to 2D layout" onPress={onBack} />
          </ActionRow>
        </View>
      </SafeAreaView>
    </View>
  );
}
