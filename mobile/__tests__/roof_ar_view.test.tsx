// The component tree handed to ViroReact, with Viro itself mocked. This shows the props and wiring are
// what the Viro source asks for. It does not show that the scene renders or tracks on a device.
const mockSelector = { handleAnchorFound: jest.fn(), handleAnchorUpdated: jest.fn(), handleAnchorRemoved: jest.fn(), reset: jest.fn() };
const mockCreateMaterials = jest.fn();
jest.mock('@reactvision/react-viro', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return {
    ViroARScene: host('ViroARScene'),
    ViroQuad: host('ViroQuad'),
    ViroARPlaneSelector: React.forwardRef((props: any, ref: any) => { React.useImperativeHandle(ref, () => mockSelector); return React.createElement('ViroARPlaneSelector', props, props.children); }),
    ViroARSceneNavigator: (props: any) => {
      const Scene = props.initialScene.scene;
      return React.createElement('ViroARSceneNavigator', props, React.createElement(Scene, { arSceneNavigator: { viroAppProps: props.viroAppProps } }));
    },
    ViroMaterials: { createMaterials: (...args: any[]) => mockCreateMaterials(...args) },
    ViroTrackingStateConstants: { TRACKING_UNAVAILABLE: 1, TRACKING_LIMITED: 2, TRACKING_NORMAL: 3 },
    ViroARTrackingReasonConstants: { TRACKING_REASON_NONE: 1, TRACKING_REASON_EXCESSIVE_MOTION: 2, TRACKING_REASON_INSUFFICIENT_FEATURES: 3 },
  };
});
jest.mock('react-native', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return {
    Text: host('Text'), View: host('View'), TextInput: host('TextInput'), TouchableOpacity: host('TouchableOpacity'),
    Pressable: host('Pressable'), ScrollView: host('ScrollView'), ActivityIndicator: host('ActivityIndicator'),
    StyleSheet: { create: (styles: any) => styles },
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
  };
});
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const Icon = (props: any) => React.createElement('Icon', props);
  return new Proxy({}, { get: (_t, key) => (key === '__esModule' ? true : Icon) });
});
jest.mock('expo-linear-gradient', () => ({ LinearGradient: (props: any) => require('react').createElement('Gradient', props, props.children) }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: (props: any) => require('react').createElement('Safe', props, props.children) }));
jest.mock('expo-router', () => ({ useFocusEffect: (cb: any) => require('react').useEffect(cb, []), router: { push: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) } }));
jest.mock('../src/theme/ThemeContext', () => {
  const { darkTokens } = require('../src/theme/tokens');
  return { useTheme: () => ({ tokens: darkTokens, isDark: true }) };
});

import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { RoofARView, trackingMessage } from '../src/ar/RoofARView';
import { layoutToAR } from '../src/ar/roofToAr';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const layout = layoutToAR({ meters_per_pixel: 0.01, panels: [{ x: 0, y: 0, width: 110, height: 200 }, { x: 120, y: 0, width: 110, height: 200 }] });
let tree: ReactTestRenderer;
let onBack: jest.Mock;

const find = (type: string) => tree.root.findAll(n => (n.type as any) === type);
const texts = () => find('Text').map(n => [n.props.children].flat(Infinity).filter(c => typeof c === 'string').join('')).join(' | ');
const labels = () => find('TouchableOpacity').map(n => n.props.accessibilityLabel);
const press = async (label: string) => { await act(async () => { find('TouchableOpacity').find(n => n.props.accessibilityLabel === label)!.props.onPress(); }); };
const selector = () => find('ViroARPlaneSelector')[0];
const scene = () => find('ViroARScene')[0];

beforeEach(async () => {
  jest.clearAllMocks();
  onBack = jest.fn();
  await act(async () => { tree = create(<RoofARView layout={layout} onBack={onBack} />); });
});
afterEach(async () => { await act(async () => tree.unmount()); });

describe('scene', () => {
  test('asks for no cloud or location provider', () => {
    expect(find('ViroARSceneNavigator')[0].props.provider).toBe('none');
  });

  test('looks only for upward-facing horizontal planes', () => {
    expect(scene().props.anchorDetectionTypes).toEqual(['PlanesHorizontal']);
    expect(selector().props.alignment).toBe('HorizontalUpward');
  });

  test('forwards anchor events to the selector, as the Viro source requires', async () => {
    const anchor = { anchorId: 'a', type: 'plane' };
    await act(async () => {
      scene().props.onAnchorFound(anchor);
      scene().props.onAnchorUpdated(anchor);
      scene().props.onAnchorRemoved(anchor);
      scene().props.onAnchorRemoved(undefined);
    });
    expect(mockSelector.handleAnchorFound).toHaveBeenCalledWith(anchor);
    expect(mockSelector.handleAnchorUpdated).toHaveBeenCalledWith(anchor);
    expect(mockSelector.handleAnchorRemoved).toHaveBeenCalledTimes(1);
  });

  test('draws one flat quad per panel at real size and offset', () => {
    const quads = find('ViroQuad');
    expect(quads).toHaveLength(2);
    expect(quads[0].props.width).toBeCloseTo(1.1);
    expect(quads[0].props.height).toBeCloseTo(2);
    expect(quads[0].props.rotation).toEqual([-90, 0, 0]);
    expect(quads[1].props.position[0] - quads[0].props.position[0]).toBeCloseTo(1.2);
  });
});

describe('overlay', () => {
  test('is labelled as visualization and claims no measurement', () => {
    expect(texts()).toMatch(/VISUALIZATION ONLY/);
    expect(texts()).toMatch(/Not a measurement or a certified placement/);
    expect(texts()).not.toMatch(/centimet|accura|calibrated/i);
  });

  test('always offers Back to 2D layout, which calls the handler', async () => {
    expect(labels()).toContain('Back to 2D layout');
    await press('Back to 2D layout');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('guides from scanning, to choosing a surface, to placed', async () => {
    expect(texts()).toMatch(/Move the phone slowly over a flat surface/);
    await act(async () => { expect(selector().props.onPlaneDetected()).toBe(true); });
    expect(texts()).toMatch(/Tap a highlighted surface/);
    await act(async () => { selector().props.onPlaneSelected({ anchorId: 'p1' }); });
    expect(texts()).toMatch(/2 panels placed where you tapped/);
  });

  test('Choose Another Surface appears only once placed, and resets the selector', async () => {
    expect(labels()).not.toContain('Choose Another Surface');
    await act(async () => { selector().props.onPlaneDetected(); selector().props.onPlaneSelected({ anchorId: 'p1' }); });
    await press('Choose Another Surface');
    expect(mockSelector.reset).toHaveBeenCalledTimes(1);
    expect(texts()).toMatch(/Tap a highlighted surface/);
  });

  test('losing the chosen plane asks the user to choose again; losing another plane does not', async () => {
    await act(async () => { selector().props.onPlaneDetected(); selector().props.onPlaneSelected({ anchorId: 'p1' }); });
    await act(async () => { selector().props.onPlaneRemoved('other'); });
    expect(texts()).toMatch(/2 panels placed/);
    await act(async () => { selector().props.onPlaneRemoved('p1'); });
    expect(texts()).toMatch(/Tap a highlighted surface/);
  });

  test('shows tracking problems and clears them when tracking recovers', async () => {
    await act(async () => { scene().props.onTrackingUpdated(2, 2); });
    expect(texts()).toMatch(/Move the phone more slowly/);
    await act(async () => { scene().props.onTrackingUpdated(3, 1); });
    expect(texts()).not.toMatch(/Tracking is/);
  });

  test('states the layout size as approximate', () => {
    expect(texts()).toMatch(/about 2\.3 × 2\.0 m/);
  });
});

describe('trackingMessage', () => {
  test.each([
    [3, 1, null],
    [1, 1, /not available yet/],
    [2, 2, /more slowly/],
    [2, 3, /textured, well-lit/],
    [2, 1, /Tracking is limited/],
  ])('state %i reason %i', (state, reason, expected) => {
    const message = trackingMessage(state, reason);
    if (expected === null) expect(message).toBeNull();
    else expect(message).toMatch(expected);
  });
});

test('one panel reads in the singular', async () => {
  await act(async () => tree.unmount());
  const single = layoutToAR({ meters_per_pixel: 0.01, panels: [{ x: 0, y: 0, width: 110, height: 200 }] });
  await act(async () => { tree = create(<RoofARView layout={single} onBack={onBack} />); });
  await act(async () => { selector().props.onPlaneSelected({ anchorId: 'p1' }); });
  expect(texts()).toMatch(/1 panel placed/);
});
