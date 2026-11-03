// Rooftop screen behaviour around the AR button, the gate and the 2D editor it falls back to.
// This runs without a device, so it covers the routing and geometry only, never camera AR.
const mockCapability = jest.fn();
jest.mock('../src/ar/detectAR', () => {
  const actual = jest.requireActual('../src/ar/detectAR');
  return { detectARCapability: (...args: any[]) => mockCapability(...args) ?? actual.detectARCapability(...args) };
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
jest.mock('react-native-svg', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return { __esModule: true, default: host('Svg'), Polygon: host('Polygon'), Rect: host('Rect'), Circle: host('Circle'), Image: host('SvgImage'), Line: host('Line') };
});
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const Icon = (props: any) => React.createElement('Icon', props);
  return new Proxy({}, { get: (_t, key) => (key === '__esModule' ? true : Icon) });
});
jest.mock('expo-linear-gradient', () => ({ LinearGradient: (props: any) => require('react').createElement('Gradient', props, props.children) }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: (props: any) => require('react').createElement('Safe', props, props.children) }));
jest.mock('expo-router', () => ({ useFocusEffect: (cb: any) => require('react').useEffect(cb, []), router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) } }));
jest.mock('expo-image-picker', () => ({ requestCameraPermissionsAsync: jest.fn(), launchCameraAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('../src/theme/ThemeContext', () => {
  const { darkTokens, HERO_LIME_GRADIENT } = require('../src/theme/tokens');
  return { useTheme: () => ({ tokens: darkTokens, isDark: true, heroGradient: HERO_LIME_GRADIENT }) };
});

import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import RooftopScreen from '../app/(tabs)/rooftop';
import { api, SolvantaApiError } from '../src/api/client';
import { emptyRoof, RoofRecord } from '../src/api/roof';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const BUILDING = 'b1';
const savedRoof: RoofRecord = {
  geometry: { ...emptyRoof(), boundary: [{ x: 100, y: 100 }, { x: 900, y: 100 }, { x: 900, y: 600 }], scale_points: [{ x: 100, y: 100 }, { x: 900, y: 100 }], scale_distance_m: 12 },
  layout: { roof_area_m2: 42, usable_area_m2: 30, panel_count: 6, meters_per_pixel: 0.015, panels: [{ x: 200, y: 200, width: 73, height: 133 }], method: 'Fixed grid' },
};
const notFound = () => new SolvantaApiError(404, { detail: 'Not found' });

let tree: ReactTestRenderer;
let roofResponse: () => Promise<RoofRecord>;
let put: jest.SpyInstance; let post: jest.SpyInstance; let getSpy: jest.SpyInstance;

const texts = () => tree.root.findAll(n => (n.type as any) === 'Text').map(n => [n.props.children].flat(Infinity).filter(c => typeof c === 'string' || typeof c === 'number').join('')).join(' | ');
const press = async (label: string) => {
  const button = tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === label)[0];
  if (!button) throw new Error(`No button labelled ${label}`);
  await act(async () => { button.props.onPress(); });
};
const input = (label: string) => tree.root.findAll(n => (n.type as any) === 'TextInput' && n.props.accessibilityLabel === label)[0];
const type = async (label: string, value: string) => { await act(async () => { input(label).props.onChangeText(value); }); };
const canvas = () => tree.root.findAll(n => (n.type as any) === 'View' && !!n.props.onResponderRelease)[0];
const tapCanvas = async (x: number, y: number) => { await act(async () => { canvas().props.onResponderRelease({ nativeEvent: { locationX: x, locationY: y } }); }); };
const VERTICES = 'Roof vertices (x,y; x,y) — edit to correct';

async function render() {
  await act(async () => { tree = create(<RooftopScreen />); });
  await act(async () => { await Promise.resolve(); });
  // A 300-wide canvas on a 1000-wide roof: one screen unit is 10/3 roof units.
  await act(async () => { canvas().props.onLayout({ nativeEvent: { layout: { width: 300 } } }); });
}

beforeEach(() => {
  jest.clearAllMocks();
  roofResponse = () => Promise.reject(notFound());
  jest.spyOn(api, 'getBuildings').mockResolvedValue([{ id: BUILDING, name: 'Test building' }] as any);
  jest.spyOn(api, 'getCurrentUser').mockResolvedValue({ id: 'u1' } as any);
  getSpy = jest.spyOn(api, 'get').mockImplementation(async (path: string) => {
    if (path.endsWith('/roof')) return roofResponse();
    throw notFound();
  });
  post = jest.spyOn(api, 'post').mockResolvedValue(savedRoof.layout as any);
  put = jest.spyOn(api, 'request').mockResolvedValue(savedRoof as any);
});
afterEach(async () => { await act(async () => tree.unmount()); jest.restoreAllMocks(); });

describe('AR gate on the Rooftop screen', () => {
  // This test run has no native AR module, the same answer a build without ViroReact gives.
  const GATE = /This build has no AR module/;

  test('is hidden until requested', async () => {
    await render();
    expect(texts()).not.toMatch(GATE);
  });

  test('states that AR uses the saved layout and is a visualization', async () => {
    await render();
    expect(texts()).toMatch(/last saved layout, not unsaved changes/);
    expect(texts()).toMatch(/visualization, not a measurement/);
  });

  test('without the native module, opens the gate with no navigation, camera request or API call', async () => {
    roofResponse = async () => savedRoof;
    await render();
    const calls = getSpy.mock.calls.length;
    await press('Preview in AR');
    expect(texts()).toMatch(GATE);
    expect(router.push).not.toHaveBeenCalled();
    expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(getSpy.mock.calls.length).toBe(calls);
    expect(post).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  test('Back to 2D closes the gate and leaves saved geometry and layout intact', async () => {
    roofResponse = async () => savedRoof;
    await render();
    const before = input(VERTICES).props.value;
    await press('Preview in AR');
    await press('Back to 2D layout');
    expect(texts()).not.toMatch(GATE);
    expect(input(VERTICES).props.value).toBe(before);
    expect(tree.root.findAll(n => (n.type as any) === 'Rect')).toHaveLength(savedRoof.layout.panels.length);
    expect(texts()).toMatch(/Loaded saved roof/);
  });

  test('can be reopened, and the 2D editor keeps working while it is open', async () => {
    await render();
    await press('Preview in AR');
    await tapCanvas(30, 30);
    expect(input(VERTICES).props.value).toBe('100,100');
    expect(texts()).toMatch(GATE);
    await press('Back to 2D layout');
    await press('Preview in AR');
    expect(texts()).toMatch(GATE);
  });

  test('works with no building or saved roof, because it needs neither', async () => {
    jest.spyOn(api, 'getBuildings').mockResolvedValue([] as any);
    await render();
    await press('Preview in AR');
    expect(texts()).toMatch(GATE);
  });

  describe('when the capability check answers', () => {
    afterEach(() => { mockCapability.mockReset(); });

    test('ready: opens the AR screen for this building with no gate', async () => {
      mockCapability.mockResolvedValue('ready');
      await render();
      await press('Preview in AR');
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith({ pathname: '/rooftop-ar', params: { buildingId: BUILDING } });
      expect(texts()).not.toMatch(/Back to 2D layout/);
    });

    test('ready: keeps unsaved edits on the Rooftop screen', async () => {
      mockCapability.mockResolvedValue('ready');
      await render();
      await tapCanvas(30, 30);
      await press('Preview in AR');
      expect(input(VERTICES).props.value).toBe('100,100');
    });

    test('unsupported device: names ARCore, stays on the 2D editor and does not navigate', async () => {
      mockCapability.mockResolvedValue('unsupported');
      await render();
      await press('Preview in AR');
      expect(texts()).toMatch(/ARCORE NOT SUPPORTED/);
      expect(router.push).not.toHaveBeenCalled();
      await tapCanvas(30, 30);
      expect(input(VERTICES).props.value).toBe('100,100');
    });

    test('a failed check can be retried from the gate, and a clean answer closes the gate', async () => {
      mockCapability.mockResolvedValueOnce('check-failed').mockResolvedValueOnce('ready');
      await render();
      await press('Preview in AR');
      expect(texts()).toMatch(/ARCORE CHECK FAILED/);
      await press('Check Again');
      expect(texts()).not.toMatch(/ARCORE CHECK FAILED/);
      expect(router.push).toHaveBeenCalledTimes(1);
    });
  });
});

describe('2D roof editor', () => {
  test('tells the user when no roof is saved, and shows other load errors as they are', async () => {
    await render();
    expect(texts()).toMatch(/No saved roof/);
    await act(async () => tree.unmount());
    roofResponse = () => Promise.reject(new SolvantaApiError(500, { detail: 'Database down' }));
    await render();
    expect(texts()).toMatch(/Database down/);
  });

  test('canvas taps become roof vertices through the uniform scale', async () => {
    await render();
    await tapCanvas(30, 21);
    await tapCanvas(270, 21);
    await tapCanvas(270, 189);
    expect(input(VERTICES).props.value).toBe('100,70; 900,70; 900,630');
    expect(tree.root.findAll(n => (n.type as any) === 'Polygon')[0].props.points).toBe('100,70 900,70 900,630');
  });

  test('a release past the canvas edge is clamped to the canvas instead of failing later', async () => {
    await render();
    await tapCanvas(-40, 400);
    await tapCanvas(900, -5);
    expect(input(VERTICES).props.value).toBe('0,700; 1000,0');
  });

  test('undo removes the last vertex; drawing marks the layout as unsaved', async () => {
    roofResponse = async () => savedRoof;
    await render();
    expect(tree.root.findAll(n => (n.type as any) === 'Rect')).toHaveLength(1);
    await tapCanvas(150, 150);
    expect(texts()).toMatch(/Unsaved geometry changes/);
    expect(tree.root.findAll(n => (n.type as any) === 'Rect')).toHaveLength(0);
    await press('Undo Last Point');
    expect(input(VERTICES).props.value).toBe('100,100; 900,100; 900,600');
  });

  test('mode switch routes taps: obstacle drafts need three points before finishing', async () => {
    await render();
    await press('Obstacle');
    await tapCanvas(90, 60);
    await tapCanvas(120, 60);
    const finish = () => tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === 'Finish Obstacle')[0];
    expect(finish().props.disabled).toBe(true);
    await tapCanvas(120, 90);
    expect(finish().props.disabled).toBe(false);
    expect(input(VERTICES).props.value).toBe('');
    await press('Finish Obstacle');
    expect(finish().props.disabled).toBe(true);
  });

  test('a third scale tap starts a new scale line', async () => {
    await render();
    await press('Scale');
    await tapCanvas(30, 30);
    await tapCanvas(270, 30);
    expect(tree.root.findAll(n => (n.type as any) === 'Line')).toHaveLength(1);
    await tapCanvas(60, 60);
    expect(tree.root.findAll(n => (n.type as any) === 'Line')).toHaveLength(0);
    expect(tree.root.findAll(n => (n.type as any) === 'Circle').filter(c => c.props.cx === 200)).toHaveLength(1);
  });

  test.each([
    ['no scale marked', async () => {}],
    ['a scale of zero metres', async () => { await press('Scale'); await tapCanvas(30, 30); await tapCanvas(270, 30); await type('Measured scale distance (m)', '0'); }],
    ['a blank distance', async () => { await press('Scale'); await tapCanvas(30, 30); await tapCanvas(270, 30); }],
  ])('calculate is refused with %s; scale is never guessed', async (_name, arrange) => {
    await render();
    await arrange();
    await press('Calculate Placement');
    expect(texts()).toMatch(/Mark two scale points and enter their measured distance/);
    expect(post).not.toHaveBeenCalled();
  });

  test('an unfinished obstacle blocks calculation', async () => {
    roofResponse = async () => savedRoof;
    await render();
    await press('Obstacle');
    await tapCanvas(90, 60);
    await press('Calculate Placement');
    expect(texts()).toMatch(/Finish or discard the obstacle/);
    expect(post).not.toHaveBeenCalled();
  });

  test('malformed typed vertices show an error and nothing is sent', async () => {
    roofResponse = async () => savedRoof;
    await render();
    await type(VERTICES, '1,2,3');
    await press('Save Roof');
    expect(texts()).toMatch(/Use x,y; x,y coordinates/);
    expect(put).not.toHaveBeenCalled();
  });

  test('preview posts the typed geometry and does not persist it', async () => {
    roofResponse = async () => savedRoof;
    await render();
    await type(VERTICES, '100,100; 800,100; 800,500');
    await press('Calculate Placement');
    expect(post).toHaveBeenCalledTimes(1);
    const [path, payload] = post.mock.calls[0];
    expect(path).toBe(`/buildings/${BUILDING}/roof/preview`);
    expect(payload.boundary).toEqual([{ x: 100, y: 100 }, { x: 800, y: 100 }, { x: 800, y: 500 }]);
    expect(payload.scale_distance_m).toBe(12);
    expect(put).not.toHaveBeenCalled();
    expect(texts()).toMatch(/not saved yet/);
  });

  test('save sends a PUT and server validation errors reach the user', async () => {
    roofResponse = async () => savedRoof;
    await render();
    await press('Save Roof');
    expect(put.mock.calls[0][0]).toBe(`/buildings/${BUILDING}/roof`);
    expect(put.mock.calls[0][1].method).toBe('PUT');
    put.mockRejectedValueOnce(new SolvantaApiError(422, { detail: 'Roof must be a simple polygon with positive area' }));
    await press('Save Roof');
    expect(texts()).toMatch(/simple polygon/);
  });
});

describe('Roof photo import limits', () => {
  test('camera permission denial is explained and the camera does not open', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    await render();
    await press('Take Roof Photo');
    expect(texts()).toMatch(/Camera permission is required/);
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  test('cancelling the picker changes nothing', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true });
    roofResponse = async () => savedRoof;
    await render();
    await press('Import Roof Photo');
    expect(input(VERTICES).props.value).toBe('100,100; 900,100; 900,600');
  });

  test.each([
    ['oversized', { base64: 'x'.repeat(2999901), width: 1000, height: 1000 }, /smaller than 2 MB/],
    ['missing data', { width: 1000, height: 1000 }, /smaller than 2 MB/],
    ['too wide', { base64: 'abc', width: 3000, height: 1000 }, /aspect ratio/],
    ['too tall', { base64: 'abc', width: 1000, height: 3000 }, /aspect ratio/],
  ])('%s photos are rejected', async (_name, asset, message) => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [asset] });
    await render();
    await press('Import Roof Photo');
    expect(texts()).toMatch(message);
  });

  test('a valid photo resets geometry and scales canvas height to its aspect ratio', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ base64: 'abc', width: 1000, height: 500 }] });
    roofResponse = async () => savedRoof;
    await render();
    await press('Import Roof Photo');
    expect(input(VERTICES).props.value).toBe('');
    expect(canvas().props.style.height).toBe(150);
    expect(tree.root.findAll(n => (n.type as any) === 'SvgImage')[0].props.href.uri).toBe('data:image/jpeg;base64,abc');
  });
});
