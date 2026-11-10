// The AR route's order of checks: capability, then saved layout, then camera, then the AR view.
// ViroReact is replaced by a stub view, so nothing here shows that camera AR works on a device.
const mockHasModule = jest.fn(() => true);
const mockProbe = jest.fn(async () => 'SUPPORTED');
const mockLoadView = jest.fn();
jest.mock('../src/ar/viroNative', () => ({
  hasViroNativeModule: () => mockHasModule(),
  probeARSupport: () => mockProbe(),
  loadRoofARView: () => mockLoadView(),
}));
const mockCheck = jest.fn(async () => false);
const mockRequest = jest.fn(async () => 'granted');
const mockOpenSettings = jest.fn(async () => undefined);
let mockAppStateListener: ((state: string) => void) | null = null;
jest.mock('react-native', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return {
    Text: host('Text'), View: host('View'), TextInput: host('TextInput'), TouchableOpacity: host('TouchableOpacity'),
    Pressable: host('Pressable'), ScrollView: host('ScrollView'), ActivityIndicator: host('ActivityIndicator'),
    StyleSheet: { create: (styles: any) => styles },
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
    Linking: { openSettings: () => mockOpenSettings() },
    AppState: { addEventListener: (_event: string, listener: any) => { mockAppStateListener = listener; return { remove: () => { mockAppStateListener = null; } }; } },
    PermissionsAndroid: {
      PERMISSIONS: { CAMERA: 'android.permission.CAMERA' },
      RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
      check: (...args: any[]) => (mockCheck as any)(...args),
      request: (...args: any[]) => (mockRequest as any)(...args),
    },
  };
});
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const Icon = (props: any) => React.createElement('Icon', props);
  return new Proxy({}, { get: (_t, key) => (key === '__esModule' ? true : Icon) });
});
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
let mockConstants: any = { expoConfig: {}, executionEnvironment: 'standalone' };
jest.mock('expo-linear-gradient', () => ({ LinearGradient: (props: any) => require('react').createElement('Gradient', props, props.children) }));
jest.mock('expo-constants', () => ({ __esModule: true, get default() { return mockConstants; } }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: (props: any) => require('react').createElement('Safe', props, props.children) }));
let mockParams: any = { buildingId: 'b1' };
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: any) => require('react').useEffect(cb, []),
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: () => mockCanGoBack },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) } }));
jest.mock('../src/theme/ThemeContext', () => {
  const { darkTokens } = require('../src/theme/tokens');
  return { useTheme: () => ({ tokens: darkTokens, isDark: true }) };
});

import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import RooftopARScreen from '../app/rooftop-ar';
import { api, SolvantaApiError } from '../src/api/client';
import { emptyRoof, RoofRecord } from '../src/api/roof';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const savedRoof: RoofRecord = {
  geometry: emptyRoof(),
  layout: { roof_area_m2: 42, usable_area_m2: 30, panel_count: 2, meters_per_pixel: 0.015, method: 'Fixed grid', panels: [{ x: 100, y: 100, width: 100, height: 200 }, { x: 300, y: 100, width: 100, height: 200 }] },
};
const FakeARView = (props: any) => React.createElement('FakeARView', props);

let tree: ReactTestRenderer;
let getRoof: jest.SpyInstance;

const texts = () => tree.root.findAll(n => (n.type as any) === 'Text').map(n => [n.props.children].flat(Infinity).filter(c => typeof c === 'string' || typeof c === 'number').join('')).join(' | ');
const buttons = () => tree.root.findAll(n => (n.type as any) === 'TouchableOpacity').map(n => n.props.accessibilityLabel);
const press = async (label: string) => {
  const button = tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === label)[0];
  if (!button) throw new Error(`No button labelled ${label}; found ${buttons().join(', ')}`);
  await act(async () => { button.props.onPress(); });
};
const arView = () => tree.root.findAll(n => (n.type as any) === 'FakeARView')[0];
const render = async () => { await act(async () => { tree = create(<RooftopARScreen />); }); };

beforeEach(() => {
  jest.clearAllMocks();
  mockConstants = { expoConfig: {}, executionEnvironment: 'standalone' };
  mockParams = { buildingId: 'b1' };
  mockCanGoBack = true;
  mockAppStateListener = null;
  mockHasModule.mockReturnValue(true);
  mockProbe.mockResolvedValue('SUPPORTED');
  mockLoadView.mockReturnValue(FakeARView);
  mockCheck.mockResolvedValue(false);
  mockRequest.mockResolvedValue('granted');
  getRoof = jest.spyOn(api, 'get').mockResolvedValue(savedRoof as any);
});
afterEach(async () => { await act(async () => tree.unmount()); jest.restoreAllMocks(); });

describe('capability', () => {
  test.each([
    ['an unsupported device', () => mockProbe.mockResolvedValue('UNSUPPORTED'), /ARCORE NOT SUPPORTED/],
    ['a build without the module', () => mockHasModule.mockReturnValue(false), /This build has no AR module/],
    ['Expo Go', () => { mockConstants = { expoConfig: {}, executionEnvironment: 'storeClient' }; }, /Expo Go cannot open AR/],
  ])('%s gets a clear message, with no roof request, camera request or AR view', async (_name, arrange, message) => {
    arrange();
    await render();
    expect(texts()).toMatch(message);
    expect(getRoof).not.toHaveBeenCalled();
    expect(mockCheck).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
    expect(arView()).toBeUndefined();
  });

  test('the gate returns to the 2D layout', async () => {
    mockProbe.mockResolvedValue('UNSUPPORTED');
    await render();
    await press('Back to 2D layout');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  test('a failed check can be retried and then continues', async () => {
    mockProbe.mockResolvedValueOnce('UNKNOWN');
    await render();
    expect(texts()).toMatch(/Could not confirm ARCore support/);
    await press('Check Again');
    expect(arView()).toBeDefined();
  });

  test('with no history, back goes to the Rooftop route instead of leaving the app', async () => {
    mockProbe.mockResolvedValue('UNSUPPORTED');
    mockCanGoBack = false;
    await render();
    await press('Back to 2D layout');
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/rooftop');
  });
});

describe('saved layout', () => {
  test('loads the roof of the building in the route', async () => {
    await render();
    expect(getRoof).toHaveBeenCalledWith('/buildings/b1/roof');
  });

  test.each([
    ['no saved roof', () => getRoof.mockRejectedValue(new SolvantaApiError(404, { detail: 'Not found' })), /No saved panel layout/],
    ['a roof with no panels', () => getRoof.mockResolvedValue({ ...savedRoof, layout: { ...savedRoof.layout, panels: [] } } as any), /No saved panel layout/],
    ['a server error', () => getRoof.mockRejectedValue(new SolvantaApiError(500, { detail: 'Database down' })), /Database down/],
    ['a missing scale', () => getRoof.mockResolvedValue({ ...savedRoof, layout: { ...savedRoof.layout, meters_per_pixel: 0 } } as any), /no usable scale/],
  ])('%s explains itself and never asks for the camera', async (_name, arrange, message) => {
    arrange();
    await render();
    expect(texts()).toMatch(message);
    expect(mockRequest).not.toHaveBeenCalled();
    expect(arView()).toBeUndefined();
    expect(buttons()).toContain('Back to 2D layout');
  });

  test('no building in the route asks for a saved layout without calling the API', async () => {
    mockParams = {};
    await render();
    expect(texts()).toMatch(/No saved panel layout/);
    expect(getRoof).not.toHaveBeenCalled();
  });
});

describe('camera permission', () => {
  test('an already granted permission starts AR without a prompt', async () => {
    mockCheck.mockResolvedValue(true);
    await render();
    expect(mockRequest).not.toHaveBeenCalled();
    expect(arView()).toBeDefined();
  });

  test('asks once, with a reason that says visualization', async () => {
    await render();
    expect(mockRequest).toHaveBeenCalledTimes(1);
    const [permission, rationale] = mockRequest.mock.calls[0] as any;
    expect(permission).toBe('android.permission.CAMERA');
    expect(rationale.message).toMatch(/visualization, not a measurement/);
    expect(arView()).toBeDefined();
  });

  test('denied shows a recoverable message, and allowing later starts AR', async () => {
    mockRequest.mockResolvedValueOnce('denied');
    await render();
    expect(texts()).toMatch(/Camera permission was denied/);
    expect(arView()).toBeUndefined();
    expect(buttons()).toEqual(expect.arrayContaining(['Allow Camera', 'Back to 2D layout']));
    await press('Allow Camera');
    expect(arView()).toBeDefined();
  });

  test('blocked points to Settings', async () => {
    mockRequest.mockResolvedValue('never_ask_again');
    await render();
    expect(texts()).toMatch(/turned off for Solvanta/);
    expect(buttons()).not.toContain('Allow Camera');
    await press('Open Settings');
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
    expect(arView()).toBeUndefined();
  });

  test('coming back from Settings with the permission granted starts AR', async () => {
    mockRequest.mockResolvedValue('never_ask_again');
    await render();
    mockCheck.mockResolvedValue(true);
    await act(async () => { await mockAppStateListener!('active'); });
    expect(arView()).toBeDefined();
  });

  test('coming back still refused keeps the Settings message, not the softer one', async () => {
    mockRequest.mockResolvedValue('never_ask_again');
    await render();
    await act(async () => { await mockAppStateListener!('active'); });
    expect(texts()).toMatch(/turned off for Solvanta/);
  });

  test('a permission API failure counts as denied rather than crashing', async () => {
    mockCheck.mockRejectedValue(new Error('activity gone'));
    await render();
    expect(texts()).toMatch(/Camera permission was denied/);
  });
});

describe('AR view', () => {
  test('receives the saved layout in metres and the way back', async () => {
    await render();
    const { layout, onBack } = arView().props;
    expect(layout.panels).toHaveLength(2);
    expect(layout.panels[0].width).toBeCloseTo(1.5);
    expect(layout.panels[0].height).toBeCloseTo(3);
    onBack();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  test('never writes to the roof', async () => {
    const post = jest.spyOn(api, 'post');
    const put = jest.spyOn(api, 'request');
    await render();
    expect(post).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  test('a build where the view cannot load falls back to the gate', async () => {
    mockCheck.mockResolvedValue(true);
    mockLoadView.mockReturnValue(null);
    await render();
    expect(texts()).toMatch(/This build has no AR module/);
  });

  test('a JavaScript failure inside the view keeps the way back open', async () => {
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockLoadView.mockReturnValue(() => { throw new Error('renderer failed'); });
    await render();
    expect(texts()).toMatch(/AR view could not start/);
    expect(buttons()).toContain('Back to 2D layout');
    quiet.mockRestore();
  });

  test('every screen before AR is labelled as visualization only', async () => {
    mockRequest.mockResolvedValue('denied');
    await render();
    expect(texts()).toMatch(/Visualization only, not a measurement/);
  });
});
