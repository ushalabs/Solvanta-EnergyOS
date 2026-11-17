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
    KeyboardAvoidingView: host('KeyboardAvoidingView'),
    // Like the real Modal, children only exist while visible.
    Modal: (props: any) => props.visible ? React.createElement('Modal', props, props.children) : null,
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
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }), SafeAreaView: (props: any) => require('react').createElement('Safe', props, props.children) }));
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
const pressAR = async () => { await press('AR'); await act(async () => { await Promise.resolve(); }); await press('Preview in AR'); };
const VERTICES = 'Roof vertices (x,y; x,y) — edit to correct';

// The roof editor is a full-screen popup. Most tests draw in it, so render() opens it; renderPreview() leaves it closed.
async function renderPreview() {
  await act(async () => { tree = create(<RooftopScreen />); });
  await act(async () => { await Promise.resolve(); });
}
async function render() {
  await renderPreview();
  await press('Edit roof layout');
  // A 300-wide canvas on a 1000-wide roof: one screen unit is 10/3 roof units.
  await act(async () => { canvas().props.onLayout({ nativeEvent: { layout: { width: 300 } } }); });
}

beforeEach(() => {
  jest.clearAllMocks(); mockCapability.mockReset();
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
    await pressAR();
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
    await pressAR();
    await press('Back to 2D layout');
    expect(texts()).not.toMatch(GATE);
    expect(input(VERTICES).props.value).toBe(before);
    expect(tree.root.findAll(n => (n.type as any) === 'Rect')).toHaveLength(savedRoof.layout.panels.length);
    expect(texts()).toMatch(/Loaded saved roof/);
  });

  test('can be reopened, and the 2D editor keeps working while it is open', async () => {
    await render();
    await pressAR();
    await tapCanvas(30, 30);
    expect(input(VERTICES).props.value).toBe('100,100');
    expect(texts()).toMatch(GATE);
    await press('Back to 2D layout');
    await pressAR();
    expect(texts()).toMatch(GATE);
  });

  test('works with no building or saved roof, because it needs neither', async () => {
    jest.spyOn(api, 'getBuildings').mockResolvedValue([] as any);
    await render();
    await pressAR();
    expect(texts()).toMatch(GATE);
  });

  describe('when the capability check answers', () => {
    afterEach(() => { mockCapability.mockReset(); });

    test('ready: opens the AR screen for this building with no gate', async () => {
      mockCapability.mockResolvedValue('ready');
      await render();
      await pressAR();
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith({ pathname: '/rooftop-ar', params: { buildingId: BUILDING } });
      expect(texts()).not.toMatch(/Back to 2D layout/);
    });

    test('ready: keeps unsaved edits on the Rooftop screen', async () => {
      mockCapability.mockResolvedValue('ready');
      await render();
      await tapCanvas(30, 30);
      await pressAR();
      expect(input(VERTICES).props.value).toBe('100,100');
    });

    test('unsupported device: names ARCore, stays on the 2D editor and does not navigate', async () => {
      mockCapability.mockResolvedValue('unsupported');
      await render();
      await pressAR();
      expect(texts()).toMatch(/ARCORE NOT SUPPORTED/);
      expect(router.push).not.toHaveBeenCalled();
      await tapCanvas(30, 30);
      expect(input(VERTICES).props.value).toBe('100,100');
    });

    test('a failed check can be retried from the gate, and a clean answer closes the gate', async () => {
      roofResponse = async () => savedRoof;
      mockCapability.mockResolvedValueOnce('check-failed').mockResolvedValue('ready');
      await render();
      await press('AR');
      await act(async () => { await Promise.resolve(); });
      expect(texts()).toMatch(/ARCORE CHECK FAILED/);
      await press('Check Again');
      await act(async () => { await Promise.resolve(); });
      expect(texts()).not.toMatch(/ARCORE CHECK FAILED/);
      expect(router.push).not.toHaveBeenCalled();
      await press('Preview in AR');
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
    roofResponse = async () => savedRoof;
    await render();
    await press('Obstacle');
    await tapCanvas(150, 45);
    await tapCanvas(210, 45);
    const finish = () => tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === 'Finish Obstacle')[0];
    expect(finish().props.disabled).toBe(true);
    await tapCanvas(210, 90);
    expect(finish().props.disabled).toBe(false);
    expect(input(VERTICES).props.value).toBe('100,100; 900,100; 900,600');
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
    expect(texts()).toMatch(/at least 3 corners, not cross itself/);
    expect(texts()).not.toMatch(/simple polygon/);
  });

  test('a raw validation error about an obstacle is shown as a plain sentence', async () => {
    roofResponse = async () => savedRoof;
    await render();
    put.mockRejectedValueOnce(new SolvantaApiError(422, { detail: [{ loc: ['body'], msg: 'Value error, Obstacle must be a valid polygon inside the roof' }] }));
    await press('Save Roof');
    expect(texts()).toMatch(/Obstacle must stay inside the roof and not cross itself/);
    expect(texts()).not.toMatch(/Value error/);
    expect(texts()).not.toMatch(/body:/);
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

describe('Rooftop layout', () => {
  const hiddenTexts = () => tree.root.findAll(n => (n.type as any) === 'View' && n.props.style?.display === 'none').map(n => n.findAll(c => (c.type as any) === 'Text').map(c => [c.props.children].flat(Infinity).join('')).join(' ')).join(' || ');
  const footerButton = () => tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === 'Preview in AR')[0];

  test('opens on Design, with the Photo and AR sections mounted but hidden', async () => {
    await render();
    expect(hiddenTexts()).toMatch(/Take Roof Photo/);
    expect(hiddenTexts()).toMatch(/last saved layout/);
    expect(hiddenTexts()).not.toMatch(/Calculate Placement/);
  });

  const footerLabels = () => tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && ['Preview in AR', 'Calculate Placement', 'Continue to Design'].includes(n.props.accessibilityLabel)).map(n => n.props.accessibilityLabel);
  const tabs = async (name: string) => { await press(name); await act(async () => { await Promise.resolve(); }); };

  test('the pinned button follows the tab', async () => {
    await render();
    expect(footerLabels()).toEqual(['Calculate Placement']);
    await tabs('Photo');
    expect(footerLabels()).toEqual(['Continue to Design']);
    await press('Continue to Design');
    expect(footerLabels()).toEqual(['Calculate Placement']);
    await tabs('AR');
    expect(footerLabels()).toEqual(['Preview in AR']);
    expect(texts()).toMatch(/View in AR/);
  });

  test('Calculate Placement is not repeated inside the Roof actions card', async () => {
    await render();
    expect(tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === 'Calculate Placement').length).toBe(1);
    expect(texts()).toMatch(/Roof actions/);
    expect(texts()).not.toMatch(/Measurements/);
  });

  test('without a saved roof the AR button is disabled and the card says why', async () => {
    mockCapability.mockResolvedValue('ready');
    await render();
    await tabs('AR');
    const button = tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === 'Preview in AR')[0];
    expect(button.props.disabled).toBe(true);
    expect(texts()).toMatch(/Save a roof layout first/);
    expect(texts()).toMatch(/Saved roof \| No/);
  });

  test('with a saved roof and a supported device the AR button is enabled and shows real data', async () => {
    mockCapability.mockResolvedValue('ready');
    roofResponse = async () => savedRoof;
    await render();
    await tabs('AR');
    const button = tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === 'Preview in AR')[0];
    expect(button.props.disabled).toBe(false);
    expect(texts()).toMatch(/AR supported/);
    expect(texts()).toMatch(/Panels \(saved\) \| 6/);
    expect(texts()).toMatch(/Saved on \| —/);
    expect(texts()).toMatch(/Tilt angle \| —/);
  });

  test('an unsupported device disables the button and shows the reason', async () => {
    mockCapability.mockResolvedValue('unsupported');
    roofResponse = async () => savedRoof;
    await render();
    await tabs('AR');
    const button = tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === 'Preview in AR')[0];
    expect(button.props.disabled).toBe(true);
    expect(texts()).toMatch(/ARCORE NOT SUPPORTED/);
  });

  test('Roof area sits in Advanced and is not repeated in a second stats block', async () => {
    roofResponse = async () => savedRoof;
    await render();
    expect(texts().match(/Roof area/gi)?.length).toBe(1);
    expect(texts().match(/Usable area/gi)?.length).toBe(1);
  });

  test('the three canvas buttons are one compact row with full spoken names', async () => {
    await render();
    for (const name of ['Undo Last Point', 'Finish Obstacle', 'Remove Last Obstacle']) {
      const b = tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === name)[0];
      const style = [b.props.style].flat(Infinity).reduce((a: any, x: any) => ({ ...a, ...x }), {});
      expect(style.minHeight).toBe(44);
      expect(style.flex).toBe(1);
    }
  });

  test('panel configuration rows are short and have no chevrons', async () => {
    await render();
    const row = tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && /^Panel Type:/.test(n.props.accessibilityLabel))[0];
    expect(row.props.style.minHeight).toBe(36);
    expect(row.props.hitSlop).toEqual({ top: 4, bottom: 4 });
    expect(row.findAll(n => (n.type as any) === 'Icon').length).toBe(0);
  });

  test('stats show dashes and the estimate is labelled simulated when nothing is known', async () => {
    await render();
    expect(texts()).toMatch(/Usable Area \| —|USABLE AREA/i);
    expect(texts()).toMatch(/SIMULATED/);
    expect(texts()).toMatch(/Panel Type \| — \| Tilt Angle \| — \| Orientation \| —/);
  });

  test('a saved roof fills Usable Area and Panels', async () => {
    roofResponse = async () => savedRoof;
    await render();
    expect(texts()).toMatch(/30\.0/);
    expect(texts()).toMatch(/\| 6 \|/);
  });

  test('advanced settings stay hidden until opened and the fields remain mounted', async () => {
    await render();
    expect(hiddenTexts()).toMatch(/Vertices, scale, setback and panel size/);
    await press('Advanced settings');
    expect(hiddenTexts()).not.toMatch(/Vertices, scale, setback and panel size/);
    expect(input(VERTICES)).toBeTruthy();
  });

  test('the AR gate shows on the AR tab and Back to 2D returns to Design', async () => {
    await render();
    await tabs('AR');
    expect(texts()).toMatch(/This build has no AR module/);
    await press('Back to 2D layout');
    expect(footerLabels()).toEqual(['Calculate Placement']);
  });

  test('placed panels use the panel fill with the lime outline', async () => {
    roofResponse = async () => savedRoof;
    await render();
    const rect = tree.root.findAll(n => (n.type as any) === 'Rect')[0];
    expect(rect.props.fill).toBe(require('../src/theme/tokens').darkTokens.panelFill);
  });
});

describe('Rooftop guidance and state', () => {
  const footerNames = () => tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && ['Save Roof', 'Calculate Placement'].includes(n.props.accessibilityLabel)).map(n => n.props.accessibilityLabel);
  const stepLine = () => tree.root.findAll(n => (n.type as any) === 'View' && n.props.accessibilityLabel === 'Roof steps')[0];
  const currentStep = () => stepLine().findAll(n => (n.type as any) === 'Text' && n.props.accessibilityState?.selected).map(n => n.props.children).flat();
  const fieldInside = (label: string) => tree.root.findAll(n => (n.type as any) === 'TextInput' && n.props.accessibilityLabel === label)[0];
  const climbTo = (node: any, test: (n: any) => boolean) => { let n = node; while (n && !test(n)) n = n.parent; return n; };
  const inHidden = (node: any) => !!climbTo(node, n => (n.type as any) === 'View' && n.props.style?.display === 'none');

  test('there is no step line, and each mode has one short hint inside the editor', async () => {
    await render();
    expect(texts()).not.toMatch(/1 Roof outline|2 Obstacles|3 Scale|4 Calculate/);
    expect(tree.root.findAll(n => (n.props.accessibilityLabel ?? '') === 'Roof steps')).toHaveLength(0);
    expect(texts()).toMatch(/Tap each corner of the roof in order/);
    await press('Obstacle');
    expect(texts()).toMatch(/Tap the corners of an obstacle, then Finish/);
    await press('Scale');
    expect(texts()).toMatch(/Tap two points on a length you measured, then enter the distance/);
    expect(texts()).not.toMatch(/Current mode/);
  });

  test('shows a corner count that follows taps', async () => {
    await render();
    expect(texts()).toMatch(/Corners: 0/);
    await tapCanvas(30, 30);
    expect(texts()).toMatch(/Corners: 1/);
    await press('Scale');
    expect(texts()).toMatch(/Scale points: 0 of 2/);
  });

  test('explains why Finish is disabled, in each mode', async () => {
    await render();
    expect(texts()).toMatch(/Finish is for obstacles\. Switch to Obstacle mode/);
    await press('Obstacle');
    expect(texts()).toMatch(/Finish needs at least 3 obstacle corners/);
    await tapCanvas(10, 10); await tapCanvas(60, 10); await tapCanvas(60, 60);
    expect(texts()).not.toMatch(/Finish needs at least 3/);
  });

  test('warns, without blocking, about fewer than 3 corners and about a crossing outline', async () => {
    await render();
    expect(texts()).not.toMatch(/needs at least 3 corners/);
    await tapCanvas(30, 30);
    expect(texts()).toMatch(/needs at least 3 corners\. Tap more corners, or press Undo/);
    await tapCanvas(270, 200); await tapCanvas(270, 30);
    expect(texts()).not.toMatch(/crosses itself/);
    await tapCanvas(30, 200);
    expect(texts()).toMatch(/outline crosses itself/);
    expect(input(VERTICES).props.value.split(';').length).toBe(4);
    await press('Undo Last Point');
    expect(texts()).not.toMatch(/crosses itself/);
  });

  test('an empty canvas offers a starting rectangle that can still be edited', async () => {
    await render();
    await press('Start with a rectangle');
    expect(input(VERTICES).props.value.split(';').length).toBe(4);
    expect(texts()).toMatch(/Corners: 4/);
    expect(texts()).not.toMatch(/Start with a rectangle/);
    expect(texts()).not.toMatch(/crosses itself/);
    await press('Undo Last Point');
    expect(texts()).toMatch(/Corners: 3/);
  });

  test('the scale distance field sits under the canvas in Scale mode and is not duplicated', async () => {
    await render();
    const count = () => tree.root.findAll(n => (n.type as any) === 'TextInput' && n.props.accessibilityLabel === 'Measured scale distance (m)').length;
    expect(count()).toBe(1);
    expect(inHidden(fieldInside('Measured scale distance (m)'))).toBe(true);
    await press('Scale');
    expect(count()).toBe(1);
    expect(inHidden(fieldInside('Measured scale distance (m)'))).toBe(false);
    await type('Measured scale distance (m)', '12');
    await press('Obstacle');
    expect(fieldInside('Measured scale distance (m)').props.value).toBe('12');
  });

  test('Advanced groups its fields and keeps the raw vertices and PV extras in collapsed Expert groups', async () => {
    await render();
    expect(texts()).toMatch(/Roof settings/);
    expect(texts()).toMatch(/Panel size/);
    expect(inHidden(input(VERTICES))).toBe(true);
    const pvExtra = tree.root.findAll(n => (n.type as any) === 'TextInput' && /plane-of-array/.test(n.props.accessibilityLabel ?? ''))[0];
    expect(pvExtra).toBeTruthy();
    expect(inHidden(pvExtra)).toBe(true);
    const moduleRating = fieldInside('Module rating (W)');
    expect(moduleRating).toBeTruthy();
    expect(texts()).toMatch(/Expert settings/);
  });

  test('after the roof changes all three tiles are dashes with an Outdated note, then recover on calculate', async () => {
    roofResponse = async () => savedRoof;
    await render();
    expect(texts()).not.toMatch(/Outdated/);
    await tapCanvas(150, 150);
    expect(texts()).toMatch(/Outdated: the roof changed/);
    expect(texts()).toMatch(/Usable Area \| — \| Panels \| — \| Est\. Daily \(SIMULATED\) \| —/);
    await press('Calculate Placement');
    expect(texts()).not.toMatch(/Outdated/);
    expect(texts()).toMatch(/Usable Area \| 30\.0/);
  });

  test('typing a new scale distance also marks the tiles outdated', async () => {
    roofResponse = async () => savedRoof;
    await render();
    await press('Scale');
    await type('Measured scale distance (m)', '13');
    expect(texts()).toMatch(/Outdated/);
  });

  test('after Calculate Placement the pinned button becomes Save Roof, and saving returns it', async () => {
    roofResponse = async () => savedRoof;
    await render();
    await tapCanvas(150, 150);
    expect(footerNames().sort()).toEqual(['Calculate Placement', 'Save Roof']);
    await press('Calculate Placement');
    expect(footerNames()).toEqual(['Save Roof']);
    expect(texts()).toMatch(/Press Save Roof to keep it/);
    await press('Save Roof');
    expect(put).toHaveBeenCalled();
    expect(footerNames().sort()).toEqual(['Calculate Placement', 'Save Roof']);
  });

  test('the unsaved note says what to press first', async () => {
    await render();
    await tapCanvas(30, 30);
    expect(texts()).toMatch(/Press Calculate Placement first, then Save Roof/);
  });
});

describe('Roof canvas drawing', () => {
  const polygons = () => tree.root.findAll(n => (n.type as any) === 'Polygon');
  const outline = () => polygons().find(n => n.props.fill === require('../src/theme/tokens').darkTokens.surfaceElevated);
  const handles = () => tree.root.findAll(n => (n.type as any) === 'View' && /^Roof corner/.test(n.props.accessibilityLabel ?? ''));
  const labelled = (text: string) => tree.root.findAll(n => (n.type as any) === 'View' && (n.props.accessibilityLabel ?? '').startsWith(text));

  test('1 or 2 corners draw handles only, 3 or more draw a closed filled outline', async () => {
    await render();
    await tapCanvas(30, 30); await tapCanvas(270, 30);
    expect(outline()).toBeUndefined();
    expect(handles()).toHaveLength(2);
    await tapCanvas(270, 200);
    const shape = outline()!;
    expect(shape).toBeTruthy();
    expect(shape.props.strokeLinejoin).toBe('round');
    expect(shape.props.points.split(' ')).toHaveLength(3);
  });

  test('corner handles give a 44px touch area and moving one updates the vertices', async () => {
    await render();
    await tapCanvas(30, 30); await tapCanvas(270, 30); await tapCanvas(270, 200);
    const h = handles()[0];
    expect(20 + h.props.hitSlop.left + h.props.hitSlop.right).toBeGreaterThanOrEqual(44);
    expect(20 + h.props.hitSlop.top + h.props.hitSlop.bottom).toBeGreaterThanOrEqual(44);
    await act(async () => { h.props.onResponderGrant({ nativeEvent: { pageX: 100, pageY: 100 } }); });
    await act(async () => { handles()[0].props.onResponderMove({ nativeEvent: { pageX: 130, pageY: 120 } }); });
    await act(async () => { handles()[0].props.onResponderRelease(); });
    // 300px canvas on a 1000 roof: 30px right and 20px down is 100 and 67 roof units.
    expect(input(VERTICES).props.value).toBe('200,167; 900,100; 900,667');
    expect(texts()).toMatch(/Outdated|Unsaved geometry changes/);
  });

  test('handles only show in Roof mode, so taps in other modes reach the canvas', async () => {
    await render();
    await tapCanvas(30, 30);
    expect(handles()).toHaveLength(1);
    await press('Obstacle');
    expect(handles()).toHaveLength(0);
  });

  test('placed panels are cells with a thin border, and each contiguous group gets one lime outline', async () => {
    roofResponse = async () => savedRoof;
    await render();
    const cells = tree.root.findAll(n => (n.type as any) === 'Rect');
    expect(cells).toHaveLength(1);
    expect(cells[0].props.fill).toBe(require('../src/theme/tokens').darkTokens.panelFill);
    const lime = require('../src/theme/tokens').darkTokens.limeMark;
    const outlines = polygons().filter(p => p.props.fill === 'none' && p.props.stroke === lime);
    expect(outlines).toHaveLength(1);
    expect(cells[0].props.strokeWidth).toBeLessThan(outlines[0].props.strokeWidth);
  });

  test('two separate blocks of panels get two outlines', async () => {
    roofResponse = async () => ({ ...savedRoof, layout: { ...savedRoof.layout, panels: [{ x: 100, y: 100, width: 50, height: 90 }, { x: 155, y: 100, width: 50, height: 90 }, { x: 700, y: 400, width: 50, height: 90 }] } });
    await render();
    expect(polygons().filter(p => p.props.fill === 'none')).toHaveLength(2);
  });

  test('obstacles are drawn as muted rounded shapes labelled Obstacle', async () => {
    roofResponse = async () => savedRoof;
    await render();
    await press('Obstacle');
    await tapCanvas(150, 45); await tapCanvas(210, 45); await tapCanvas(210, 90);
    await press('Finish Obstacle');
    const shape = polygons().find(p => p.props.strokeLinejoin === 'round' && p.props.fillOpacity === 0.35)!;
    expect(shape).toBeTruthy();
    const labels = tree.root.findAll(n => (n.type as any) === 'View' && n.props.pointerEvents === 'none').flatMap(v => v.findAll(c => (c.type as any) === 'Text').map(c => c.props.children));
    expect(labels).toContain('Obstacle');
  });

  test('a north arrow sits in the top left and says it is an assumption', async () => {
    await render();
    const arrow = labelled('North arrow')[0];
    expect(arrow.props.style.left).toBe(8);
    expect(arrow.props.style.top).toBe(8);
    expect(arrow.props.accessibilityLabel).toMatch(/assumed/);
  });

  test('the usable width line shows only with placement data and a scale', async () => {
    await render();
    expect(labelled('Usable width')).toHaveLength(0);
    await act(async () => { tree.unmount(); });
    roofResponse = async () => savedRoof;
    await render();
    // One panel 73 roof units wide at 0.015 m per unit.
    expect(labelled('Usable width')).toHaveLength(1);
    expect(labelled('Usable width')[0].props.accessibilityLabel).toBe('Usable width 1.1 metres');
    await tapCanvas(150, 150);
    expect(labelled('Usable width')).toHaveLength(0);
  });
});

describe('Panel Configuration selectors', () => {
  const pvRecord = {
    saved: true,
    parameters: { module_wattage_w: 450, inverter_kw: 8, inverter_efficiency_pct: 96, tilt_deg: 20, azimuth_deg: 180, losses_pct: 14, latitude_deg: 31.52, cell_temperature_c: 25, temperature_coefficient_per_c: -0.004, string_specs: null, poa_w_m2: null },
    profile: { panel_count: 6, dc_capacity_kwp: 2.7, inverter_kw: 8, dc_ac_ratio: 0.34, daily_energy_kwh: 12.34, timeline: [], warnings: [], source: 'SIMULATED', time_basis: 'Representative day' },
  };
  const withPv = () => getSpy.mockImplementation(async (path: string) => {
    if (path.endsWith('/roof')) return roofResponse();
    if (path.endsWith('/pv')) return pvRecord as any;
    throw notFound();
  });
  const row = (name: string) => tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && new RegExp(`^${name}:`).test(n.props.accessibilityLabel ?? ''))[0];
  const modalText = () => tree.root.findAll(n => (n.type as any) === 'Modal').flatMap(m => m.findAll(c => (c.type as any) === 'Text').map(c => [c.props.children].flat(Infinity).join(''))).join(' | ');
  const field = (label: string) => tree.root.findAll(n => (n.type as any) === 'TextInput' && n.props.accessibilityLabel === label)[0];
  const open = async (name: string) => { await act(async () => { row(name).props.onPress(); }); };
  const pick = async (label: string) => { const b = tree.root.findAll(n => (n.type as any) === 'Modal')[0].findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === label)[0]; await act(async () => { b.props.onPress(); }); };

  test('rows show dashes until data exists and keep their spoken names', async () => {
    await renderPreview();
    for (const name of ['Panel Type', 'Tilt Angle', 'Orientation']) expect(row(name).props.accessibilityLabel).toBe(`${name}: —`);
  });

  test('rows show saved values, with the orientation as a compass word', async () => {
    withPv();
    await renderPreview();
    expect(row('Panel Type').props.accessibilityLabel).toBe('Panel Type: 450 W');
    expect(row('Tilt Angle').props.accessibilityLabel).toBe('Tilt Angle: 20°');
    expect(row('Orientation').props.accessibilityLabel).toBe('Orientation: South');
  });

  test('Panel Type offers 400 to 600 W and sets the module rating field', async () => {
    withPv();
    await renderPreview();
    await open('Panel Type');
    for (const w of [400, 450, 500, 550, 600]) expect(modalText()).toContain(`${w} W`);
    await pick('600 W module');
    expect(field('Module rating (W)').props.value).toBe('600');
    expect(row('Panel Type').props.accessibilityLabel).toBe('Panel Type: 600 W');
  });

  test('Tilt steps by one degree between 0 and 45 and sets the tilt field', async () => {
    withPv();
    await renderPreview();
    await open('Tilt Angle');
    await pick('Increase tilt');
    expect(field('Tilt (degrees)').props.value).toBe('21');
    await pick('Decrease tilt'); await pick('Decrease tilt');
    expect(field('Tilt (degrees)').props.value).toBe('19');
    await pick('Tilt 40 degrees');
    for (let i = 0; i < 8; i++) await pick('Increase tilt');
    expect(field('Tilt (degrees)').props.value).toBe('45');
    const plus = tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === 'Increase tilt')[0];
    expect(plus.props.disabled).toBe(true);
    await pick('Tilt 10 degrees');
    for (let i = 0; i < 12; i++) await pick('Decrease tilt');
    expect(field('Tilt (degrees)').props.value).toBe('0');
  });

  test('Orientation offers eight compass choices and 180 is South', async () => {
    withPv();
    await renderPreview();
    await open('Orientation');
    for (const c of ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']) expect(modalText()).toContain(c);
    await pick('Face East');
    expect(field('Azimuth (degrees from north)').props.value).toBe('90');
    expect(row('Orientation').props.accessibilityLabel).toBe('Orientation: East');
    await pick('Face South');
    expect(field('Azimuth (degrees from north)').props.value).toBe('180');
  });

  test('choices are at least 44px tall', async () => {
    withPv();
    await renderPreview();
    await open('Panel Type');
    const b = tree.root.findAll(n => (n.type as any) === 'Modal')[0].findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === '500 W module')[0];
    const style = [b.props.style].flat(Infinity).reduce((a: any, x: any) => ({ ...a, ...x }), {});
    expect((style.minHeight ?? 0) + (b.props.hitSlop?.top ?? 0) + (b.props.hitSlop?.bottom ?? 0)).toBeGreaterThanOrEqual(44);
  });

  test('changing a value marks Est. Daily as outdated until it is recalculated', async () => {
    withPv();
    await renderPreview();
    expect(texts()).toMatch(/Est\. Daily \(SIMULATED\) \| 12\.3 \| +kWh/);
    expect(texts()).not.toMatch(/Est\. Daily is outdated/);
    await open('Panel Type');
    await pick('500 W module');
    expect(texts()).toMatch(/Est\. Daily \(SIMULATED\) \| —/);
    expect(texts()).toMatch(/Est\. Daily is outdated/);
    post.mockResolvedValue({ ...pvRecord.profile, daily_energy_kwh: 15.5 } as any);
    await press('Calculate PV Estimate');
    expect(texts()).not.toMatch(/Est\. Daily is outdated/);
    expect(texts()).toMatch(/Est\. Daily \(SIMULATED\) \| 15\.5/);
  });

  test('the roof tiles are not marked outdated by a panel setting change', async () => {
    withPv();
    roofResponse = async () => savedRoof;
    await renderPreview();
    await open('Tilt Angle');
    await pick('Increase tilt');
    expect(texts()).not.toMatch(/Outdated: the roof changed/);
    expect(texts()).toMatch(/Usable Area \| 30\.0/);
  });

  test('there is no Panel Count row or count control; the Panels tile says how many fit', async () => {
    roofResponse = async () => savedRoof;
    await renderPreview();
    expect(texts()).not.toMatch(/Panel Count/);
    expect(texts()).toMatch(/Panels \| 6 \| +fit/);
    expect(tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && /panel count|more panels|fewer panels/i.test(n.props.accessibilityLabel ?? ''))).toHaveLength(0);
  });

  test('the Panels tile shows a dash before placement', async () => {
    await renderPreview();
    expect(texts()).toMatch(/Panels \| —/);
    expect(texts()).not.toMatch(/fit/);
  });
});

describe('Full-screen roof editor', () => {
  const editor = () => tree.root.findAll(n => (n.type as any) === 'Modal').find(m => m.findAll(c => (c.type as any) === 'Text').some(c => c.props.children === 'Edit roof layout'));
  const polygons = () => tree.root.findAll(n => (n.type as any) === 'Polygon');
  const red = () => require('../src/theme/tokens').darkTokens.redText;
  const finish = () => tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === 'Finish Obstacle')[0];
  const previewCanvas = () => tree.root.findAll(n => (n.type as any) === 'View' && /^Roof preview/.test(n.props.accessibilityLabel ?? ''))[0];
  // Roof from savedRoof is a triangle (100,100) (900,100) (900,600); in a 300px canvas that is (30,30) (270,30) (270,180).

  test('the Design tab shows a read-only preview and an Edit roof layout button, with no editor yet', async () => {
    roofResponse = async () => savedRoof;
    await renderPreview();
    expect(editor()).toBeUndefined();
    expect(previewCanvas()).toBeTruthy();
    expect(previewCanvas().props.onResponderRelease).toBeUndefined();
    expect(tree.root.findAll(n => (n.type as any) === 'View' && /^Roof corner/.test(n.props.accessibilityLabel ?? ''))).toHaveLength(0);
    expect(tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === 'Undo Last Point')).toHaveLength(0);
    expect(tree.root.findAll(n => (n.type as any) === 'Rect')).toHaveLength(1);
  });

  test('Edit roof layout opens the editor with the mode switch, toolbar, Done and Cancel', async () => {
    await renderPreview();
    await press('Edit roof layout');
    expect(editor()).toBeTruthy();
    for (const name of ['Roof', 'Obstacle', 'Scale', 'Undo Last Point', 'Finish Obstacle', 'Remove Last Obstacle', 'Done editing roof', 'Cancel roof edit']) {
      expect(tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === name).length).toBeGreaterThan(0);
    }
    expect(canvas()).toBeTruthy();
  });

  test('Done keeps the edit on the Design tab', async () => {
    await renderPreview();
    await press('Edit roof layout');
    await act(async () => { canvas().props.onLayout({ nativeEvent: { layout: { width: 300 } } }); });
    await tapCanvas(30, 30); await tapCanvas(270, 30); await tapCanvas(270, 180);
    await press('Done editing roof');
    expect(editor()).toBeUndefined();
    expect(input(VERTICES).props.value).toBe('100,100; 900,100; 900,600');
    expect(previewCanvas().props.accessibilityLabel).toMatch(/3 roof vertices/);
    expect(texts()).toMatch(/Outdated: the roof changed/);
  });

  test('Cancel discards everything done in the editor', async () => {
    roofResponse = async () => savedRoof;
    await renderPreview();
    await press('Edit roof layout');
    await act(async () => { canvas().props.onLayout({ nativeEvent: { layout: { width: 300 } } }); });
    await tapCanvas(100, 100);
    await press('Obstacle');
    await press('Scale');
    await type('Measured scale distance (m)', '99');
    expect(input(VERTICES).props.value).toBe('100,100; 900,100; 900,600; 333,333');
    await press('Cancel roof edit');
    expect(editor()).toBeUndefined();
    expect(input(VERTICES).props.value).toBe('100,100; 900,100; 900,600');
    expect(input('Measured scale distance (m)').props.value).toBe('12');
    expect(texts()).not.toMatch(/Outdated/);
    expect(texts()).toMatch(/Usable Area \| 30\.0/);
  });

  test('Android back closes the editor like Cancel', async () => {
    roofResponse = async () => savedRoof;
    await renderPreview();
    await press('Edit roof layout');
    await act(async () => { canvas().props.onLayout({ nativeEvent: { layout: { width: 300 } } }); });
    await tapCanvas(100, 100);
    await act(async () => { editor()!.props.onRequestClose(); });
    expect(editor()).toBeUndefined();
    expect(input(VERTICES).props.value).toBe('100,100; 900,100; 900,600');
  });

  test('the scale distance field is in the editor in Scale mode', async () => {
    await renderPreview();
    await press('Edit roof layout');
    await press('Scale');
    const field = input('Measured scale distance (m)');
    expect(field).toBeTruthy();
    let n: any = field; let insideEditor = false;
    while (n) { if (n === editor()) insideEditor = true; n = n.parent; }
    expect(insideEditor).toBe(true);
  });

  test('an empty roof gets a canvas shaped like the editor area, never shorter than the default', async () => {
    await renderPreview();
    await press('Edit roof layout');
    const area = tree.root.findAll(n => (n.type as any) === 'View' && typeof n.props.onLayout === 'function' && n.props.style?.flex === 1 && n.props.style?.justifyContent === 'center')[0];
    await act(async () => { area.props.onLayout({ nativeEvent: { layout: { width: 376, height: 600 } } }); });
    await act(async () => { canvas().props.onLayout({ nativeEvent: { layout: { width: 360 } } }); });
    // 1000 * 584 / 360 = 1622, capped at 1400.
    expect(canvas().props.style.height).toBeCloseTo(360 * 1400 / 1000);
  });
});

describe('Obstacle validation in the editor', () => {
  const finish = () => tree.root.findAll(n => (n.type as any) === 'TouchableOpacity' && n.props.accessibilityLabel === 'Finish Obstacle')[0];
  const polygons = () => tree.root.findAll(n => (n.type as any) === 'Polygon');
  const redText = () => require('../src/theme/tokens').darkTokens.redText;
  const startObstacle = async () => { roofResponse = async () => savedRoof; await render(); await press('Obstacle'); };

  test('fewer than 3 corners keeps Finish disabled with the reason', async () => {
    await startObstacle();
    await tapCanvas(150, 45); await tapCanvas(210, 45);
    expect(finish().props.disabled).toBe(true);
    expect(texts()).toMatch(/Finish needs at least 3 obstacle corners/);
  });

  test('a bow-tie obstacle gets a red outline and a message, and cannot be finished', async () => {
    await startObstacle();
    await tapCanvas(150, 45); await tapCanvas(210, 90); await tapCanvas(210, 45); await tapCanvas(150, 90);
    expect(finish().props.disabled).toBe(true);
    expect(texts()).toMatch(/The obstacle crosses itself/);
    expect(polygons().some(p => p.props.stroke === redText())).toBe(true);
    await press('Finish Obstacle');
    expect(tree.root.findAll(n => (n.type as any) === 'Polygon').filter(p => p.props.fillOpacity === 0.35)).toHaveLength(0);
  });

  test('an obstacle outside the roof is refused with a message and a red outline', async () => {
    await startObstacle();
    await tapCanvas(30, 150); await tapCanvas(100, 150); await tapCanvas(100, 190);
    expect(finish().props.disabled).toBe(true);
    expect(texts()).toMatch(/The obstacle must stay inside the roof/);
    expect(polygons().some(p => p.props.stroke === redText())).toBe(true);
  });

  test('an obstacle with no roof asks for the roof first', async () => {
    await render();
    await press('Obstacle');
    await tapCanvas(100, 100); await tapCanvas(150, 100); await tapCanvas(150, 140);
    expect(finish().props.disabled).toBe(true);
    expect(texts()).toMatch(/Draw the roof outline first/);
  });

  test('a valid obstacle is accepted, drawn muted and not red', async () => {
    await startObstacle();
    await tapCanvas(150, 45); await tapCanvas(210, 45); await tapCanvas(210, 90);
    expect(finish().props.disabled).toBe(false);
    expect(polygons().some(p => p.props.stroke === redText())).toBe(false);
    await press('Finish Obstacle');
    expect(polygons().filter(p => p.props.fillOpacity === 0.35)).toHaveLength(1);
  });

  test('moving a roof corner so an obstacle sticks out marks it red', async () => {
    await startObstacle();
    await tapCanvas(150, 45); await tapCanvas(210, 45); await tapCanvas(210, 90);
    await press('Finish Obstacle');
    await press('Roof');
    const handle = () => tree.root.findAll(n => (n.type as any) === 'View' && /^Roof corner 2/.test(n.props.accessibilityLabel ?? ''))[0];
    await act(async () => { handle().props.onResponderGrant({ nativeEvent: { pageX: 270, pageY: 30 } }); });
    await act(async () => { handle().props.onResponderMove({ nativeEvent: { pageX: 100, pageY: 30 } }); });
    expect(polygons().some(p => p.props.stroke === redText())).toBe(true);
    expect(texts()).toMatch(/Obstacle 1 is outside the roof/);
  });
});

describe('Invalid geometry is not sent to the API', () => {
  const setup = async () => { roofResponse = async () => savedRoof; await render(); };

  test('a self-crossing roof is blocked before Calculate Placement and Save Roof', async () => {
    await setup();
    await type(VERTICES, '100,100; 900,600; 900,100; 100,600');
    await press('Calculate Placement');
    expect(post).not.toHaveBeenCalled();
    expect(texts()).toMatch(/roof outline crosses itself/);
    await press('Save Roof');
    expect(put).not.toHaveBeenCalled();
  });

  test('a roof with fewer than 3 corners is not sent', async () => {
    await setup();
    await type(VERTICES, '100,100; 900,600');
    await press('Calculate Placement');
    expect(post).not.toHaveBeenCalled();
    expect(texts()).toMatch(/at least 3 corners/);
  });

  test('an obstacle that sticks out of the roof is not sent, and the message names it', async () => {
    roofResponse = async () => ({ ...savedRoof, geometry: { ...savedRoof.geometry, obstacles: [[{ x: 100, y: 500 }, { x: 200, y: 500 }, { x: 200, y: 600 }]] } });
    await render();
    await press('Calculate Placement');
    expect(post).not.toHaveBeenCalled();
    expect(texts()).toMatch(/Obstacle 1: The obstacle must stay inside the roof/);
  });

  test('a valid roof is still sent', async () => {
    await setup();
    await press('Calculate Placement');
    expect(post).toHaveBeenCalledTimes(1);
  });

  test('a server rejection of a preview is also shown as a plain sentence', async () => {
    await setup();
    post.mockRejectedValueOnce(new SolvantaApiError(422, { detail: [{ loc: ['body'], msg: 'Value error, Obstacle must be a valid polygon inside the roof' }] }));
    await press('Calculate Placement');
    expect(texts()).toMatch(/Obstacle must stay inside the roof and not cross itself/);
    expect(texts()).not.toMatch(/Value error/);
  });

  test('the status message is shown under the preview so a failed save is not hidden', async () => {
    roofResponse = async () => savedRoof;
    await renderPreview();
    put.mockRejectedValueOnce(new SolvantaApiError(422, { detail: 'Calibrated canvas must be at most 200 m on each axis' }));
    await press('Save Roof');
    let card: any = tree.root.findAll(n => (n.type as any) === 'View' && /^Roof preview/.test(n.props.accessibilityLabel ?? ''))[0];
    while (card && !card.findAll((c: any) => (c.type as any) === 'Text' && c.props.children === 'Roof layout').length) card = card.parent;
    const text = card.findAll((c: any) => (c.type as any) === 'Text').map((c: any) => [c.props.children].flat(Infinity).join('')).join(' | ');
    expect(text).toMatch(/larger than 200 m/);
  });
});
