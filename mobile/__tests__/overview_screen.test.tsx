// The Energy Overview (Home) screen with the API mocked.
jest.mock('react-native', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return {
    Text: host('Text'), View: host('View'), TextInput: host('TextInput'), TouchableOpacity: host('TouchableOpacity'),
    ScrollView: host('ScrollView'), ActivityIndicator: host('ActivityIndicator'), Image: host('Image'),
    StyleSheet: { create: (styles: any) => styles },
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
  };
});
jest.mock('react-native-svg', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return { __esModule: true, default: host('Svg'), Path: host('Path'), Circle: host('Circle') };
});
let mockReducedMotion = false;
const mockWithRepeat = jest.fn((animation: unknown) => animation);
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const createAnimatedComponent = (Component: any) => (props: any) => React.createElement('Animated', { ...props, animates: Component });
  return {
    __esModule: true,
    default: { createAnimatedComponent },
    createAnimatedComponent,
    useSharedValue: (value: number) => React.useRef({ value }).current,
    useAnimatedProps: (worklet: () => object) => worklet(),
    useAnimatedStyle: (worklet: () => object) => worklet(),
    useReducedMotion: () => mockReducedMotion,
    withRepeat: (animation: unknown) => mockWithRepeat(animation),
    withTiming: (value: number) => value,
    cancelAnimation: jest.fn(),
    Easing: { linear: (x: number) => x },
  };
});
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const icon = (name: string) => (props: any) => React.createElement('Icon', { ...props, name });
  return new Proxy({}, { get: (_t, key) => (key === '__esModule' ? true : icon(String(key))) });
});
jest.mock('expo-linear-gradient', () => ({ LinearGradient: (props: any) => require('react').createElement('Gradient', props, props.children) }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: (props: any) => require('react').createElement('Safe', props, props.children),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useFocusEffect: (cb: any) => require('react').useEffect(cb, []), router: { push: (path: string) => mockPush(path), replace: jest.fn() } }));
const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStore[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockStore[key] = value; }),
    removeItem: jest.fn(async (key: string) => { delete mockStore[key]; }),
  },
}));
jest.mock('../src/theme/ThemeContext', () => {
  const { darkTokens, HERO_LIME_GRADIENT } = require('../src/theme/tokens');
  return { useTheme: () => ({ tokens: darkTokens, isDark: true, heroGradient: HERO_LIME_GRADIENT }) };
});
jest.mock('../assets/images/home-house.png', () => 'house-image');

import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Overview from '../app/(tabs)/index';
import { api, SolvantaApiError } from '../src/api/client';
import { WEATHER_CITY_KEY } from '../src/components/WeatherCard';
import { darkTokens } from '../src/theme/tokens';
import type { EnergyStep } from '../src/api/simulation';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const BUILDING = 'b1';
const RUN_ID = 'abcdef12-0000-0000-0000-000000000000';
const step = (minute: number, extra: Partial<EnergyStep> = {}): EnergyStep => ({
  minute, duration_hours: 0.25, pv_kw: 0, load_kw: 0, critical_kw: 0, grid_available: true, grid_import_kw: 0, grid_export_kw: 0,
  generator_kw: 0, charge_kw: 0, discharge_kw: 0, curtailed_kw: 0, unmet_kw: 0, unserved_critical_kw: 0,
  battery_start_kwh: 5, battery_end_kwh: 5, soc_pct: 50, balance_error_kw: 0, ...extra,
});
// Only the 12:00 interval carries power, so a wrong interval would show zeros.
const NOON = { pv_kw: 4.2, load_kw: 2.9, grid_import_kw: 0.8, discharge_kw: 2.1, soc_pct: 61.4 };
const trace = (noon: Partial<EnergyStep> = NOON) => Array.from({ length: 96 }, (_, i) => step(i * 15, i === 48 ? noon : {}));
const SUMMARY = { load_kwh: 7.5, pv_kwh: 68.57, unmet_kwh: 0, unserved_critical_kwh: 0, final_soc_pct: 100 };
const PV = {
  parameters: {}, saved: true,
  profile: {
    schema_version: 'pv-profile-v1', source: 'SIMULATED fixed equinox irradiance', time_basis: 'Representative equinox solar day',
    panel_count: 24, dc_capacity_kwp: 13.2, inverter_kw: 8, dc_ac_ratio: 1.65, daily_energy_kwh: 68.57, warnings: [],
    timeline: Array.from({ length: 24 }, (_, hour) => ({ hour, duration_hours: 1, poa_w_m2: 0, dc_kw: 0, ac_kw: hour >= 6 && hour < 18 ? 5 : 0, energy_kwh: hour >= 6 && hour < 18 ? 5 : 0 })),
  },
};
const EQUIPMENT = { building_id: BUILDING, building_name: 'Demo home', solar: { pv_capacity_kwp: 10 }, inverter: { rating_kw: 8 }, battery: { nominal_capacity_kwh: 10, initial_soc_pct: 70 }, grid: { import_limit_kw: 15 }, generator: {}, is_valid: true, validation_messages: [] };
const WEATHER = { current: { location: 'Lahore, Pakistan', condition: 'Sunny', temperature_c: 28.4, humidity_pct: 40, wind_kph: 9, cloud_cover_pct: 12, updated_at: '2026-11-17T07:00:00Z' }, days: [{ date: '2026-11-17', condition: 'Sunny', min_c: 14, max_c: 29, rain_chance_pct: 0 }] };

type Server = { runs?: Array<{ id: string; summary: Record<string, number> }>; run?: object; pv?: object | Error; incidents?: Array<{ state: string }>; weather?: object | Error };
let tree: ReactTestRenderer;
let getSpy: jest.SpyInstance; let equipmentSpy: jest.SpyInstance;

function serve({ runs = [{ id: RUN_ID, summary: SUMMARY }], run, pv = PV, incidents = [], weather = WEATHER }: Server = {}) {
  getSpy.mockImplementation(async (path: string) => {
    if (path === `/buildings/${BUILDING}/simulations`) return runs;
    if (path === `/buildings/${BUILDING}/simulations/${RUN_ID}`) return run ?? { id: RUN_ID, created_at: '2026-11-17T00:00:00Z', snapshot: { pv: { source: 'x' } }, result: { schema_version: '1', step_minutes: 15, trace: trace(), summary: SUMMARY, assumptions: [] } };
    if (path === `/buildings/${BUILDING}/pv`) { if (pv instanceof Error) throw pv; return pv; }
    if (path === `/buildings/${BUILDING}/incidents`) return incidents;
    if (path.startsWith('/weather/forecast')) { if (weather instanceof Error) throw weather; return weather; }
    throw new SolvantaApiError(404, { detail: 'Not found' });
  });
}

const hosts = (type: string, within: any = tree.root) => within.findAll((n: any) => n.type === type);
const flatText = (n: any): string => [n.props.children].flat(Infinity).map((c: any) => typeof c === 'string' || typeof c === 'number' ? c : c?.props ? flatText(c) : '').join('');
const texts = (within: any = tree.root): string[] => hosts('Text', within).map(flatText);
const byTestId = (id: string) => tree.root.findAll((n: any) => n.props.testID === id && typeof n.type === 'string');
const icons = (within: any): string[] => within.findAll((n: any) => n.type === 'Icon').map((n: any) => n.props.name);
const button = (label: string | RegExp) => hosts('TouchableOpacity').find((b: any) => typeof label === 'string' ? b.props.accessibilityLabel === label : label.test(b.props.accessibilityLabel));
const press = async (label: string | RegExp) => {
  const target = button(label);
  if (!target) throw new Error(`No button labelled ${label}`);
  await act(async () => { target.props.onPress(); });
};
const nodeCard = (name: string) => hosts('View').find((v: any) => v.props.accessible && typeof v.props.accessibilityLabel === 'string' && v.props.accessibilityLabel.startsWith(`${name}:`) && v.props.onLayout);
const nodeValue = (name: string) => texts(nodeCard(name)).join(' ');
const flat = (style: any): any => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean).map(flat)) : style || {};

async function render() {
  await act(async () => { tree = create(<Overview />); });
  for (let i = 0; i < 4; i++) await act(async () => { await Promise.resolve(); });
}
/** Gives the flow diagram measured sizes, as the device would: a 300px house block above two columns of cards. */
async function layout() {
  const fire = (node: any, rect: object) => node.props.onLayout({ nativeEvent: { layout: rect } });
  await act(async () => {
    fire(byTestId('energy-flow')[0], { x: 0, y: 0, width: 336, height: 560 });
    fire(byTestId('flow-top')[0], { x: 0, y: 0, width: 336, height: 300 });
    fire(byTestId('flow-nodes')[0], { x: 0, y: 0, width: 336, height: 148 });
    // Positions are deliberately wrong here: on web they go stale, so only the sizes may be used.
    for (const name of ['Solar', 'Grid', 'Battery', 'Home']) fire(nodeCard(name), { x: 999, y: 999, width: 160, height: 64 });
  });
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 10, 17, 12, 7), doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'performance', 'hrtime'] });
  for (const key of Object.keys(mockStore)) delete mockStore[key];
  mockReducedMotion = false;
  mockPush.mockClear(); mockWithRepeat.mockClear();
  (AsyncStorage.setItem as jest.Mock).mockClear();
  jest.spyOn(api, 'getBuildings').mockResolvedValue([{ id: BUILDING, name: 'Demo home', address: 'Lahore, Pakistan' }] as any);
  jest.spyOn(api, 'getCurrentUser').mockResolvedValue({ id: 'u1' } as any);
  equipmentSpy = jest.spyOn(api, 'getBuildingEquipment').mockResolvedValue(EQUIPMENT as any);
  getSpy = jest.spyOn(api, 'get');
  serve();
});
afterEach(async () => { await act(async () => tree.unmount()); jest.restoreAllMocks(); jest.useRealTimers(); });

describe('header', () => {
  test('shows the building and its place, and still loads equipment and the saved runs', async () => {
    await render();
    expect(texts()).toContain('Solvanta');
    expect(texts()).toContain('Demo home · Lahore');
    expect(equipmentSpy).toHaveBeenCalledWith(BUILDING);
    expect(getSpy).toHaveBeenCalledWith(`/buildings/${BUILDING}/simulations`);
  });

  test('the title opens and closes the building picker', async () => {
    await render();
    expect(texts()).not.toContain('Building digital twin');
    await press('Change building: Demo home');
    expect(texts()).toContain('Building digital twin');
    await press('Change building: Demo home');
    expect(texts()).not.toContain('Building digital twin');
  });

  test('with no backend sign-in the picker shows by itself with a way forward', async () => {
    jest.spyOn(api, 'getBuildings').mockRejectedValue(new SolvantaApiError(401, { detail: 'Not authenticated' }));
    await render();
    expect(texts()).toContain('Not authenticated');
    expect(button('Open Settings')).toBeDefined();
    expect(button('Choose a building')).toBeDefined();
  });

  test('the bell opens Operations and has no dot when nothing is open', async () => {
    serve({ incidents: [{ state: 'VERIFIED' }, { state: 'CLOSED' }] });
    await render();
    expect(byTestId('incident-dot')).toHaveLength(0);
    await press('Operations: no open incidents');
    expect(mockPush).toHaveBeenCalledWith('/ai');
  });

  test('the red dot appears only for open incidents, and the label counts them', async () => {
    serve({ incidents: [{ state: 'OPEN' }, { state: 'VERIFIED' }, { state: 'OPEN' }] });
    await render();
    expect(byTestId('incident-dot')).toHaveLength(1);
    expect(flat(byTestId('incident-dot')[0].props.style).backgroundColor).toBe(darkTokens.red);
    expect(button('Operations: 2 open incidents')).toBeDefined();
  });

  test('a failed incident request shows no dot instead of guessing', async () => {
    getSpy.mockImplementation(async (path: string) => { if (path.endsWith('/incidents')) throw new Error('down'); return []; });
    await render();
    expect(byTestId('incident-dot')).toHaveLength(0);
  });
});

describe('node cards', () => {
  test('show the saved run at the current time of day, labelled as simulated', async () => {
    await render();
    expect(nodeValue('Solar')).toContain('4.20');
    expect(nodeValue('Grid')).toContain('0.80');
    expect(nodeValue('Battery')).toContain('2.10');
    expect(nodeValue('Battery')).toContain('Discharging');
    expect(nodeValue('Battery')).toContain('61%');
    expect(nodeValue('Home')).toContain('2.90');
    expect(nodeCard('Solar').props.accessibilityLabel).toBe('Solar: 4.20 kW, simulated at 12:00');
    expect(texts()).toContain('SIMULATED');
    expect(texts().join(' ')).toContain('Saved run abcdef12 at 12:00 on a representative day. Not live readings.');
    expect(texts().join(' ')).not.toMatch(/\bLIVE\b/);
  });

  test('the battery bar is its state of charge', async () => {
    await render();
    const bar = hosts('View', nodeCard('Battery')).find((v: any) => flat(v.props.style).width === '61.4%');
    expect(bar).toBeDefined();
  });

  test('show dashes, not zeros, when there is no saved run', async () => {
    serve({ runs: [] });
    await render();
    for (const name of ['Solar', 'Grid', 'Battery', 'Home']) {
      expect(nodeValue(name)).toContain('—');
      expect(nodeValue(name)).not.toMatch(/\d\.\d\d/);
    }
    expect(nodeCard('Battery').props.accessibilityLabel).toBe('Battery: no reading');
    expect(texts().join(' ')).toContain('No saved simulation yet. Run one to see numerical energy results.');
  });

  test('show dashes and the error when the API fails', async () => {
    equipmentSpy.mockRejectedValue(new Error('Network failure connecting to the API'));
    await render();
    expect(nodeValue('Solar')).toContain('—');
    expect(texts().join(' ')).toContain('Network failure connecting to the API');
  });

  test('an outage and unmet demand are stated, and unmet power is not counted as served', async () => {
    serve({ run: { id: RUN_ID, created_at: '', snapshot: { pv: { source: 'x' } }, result: { schema_version: '1', step_minutes: 15, summary: SUMMARY, assumptions: [], trace: trace({ load_kw: 3, unmet_kw: 1.2, grid_available: false, charge_kw: 0.5, pv_kw: 2.3, soc_pct: 20 }) } } });
    await render();
    expect(nodeValue('Grid')).toContain('Outage');
    expect(nodeValue('Home')).toContain('1.80');
    expect(nodeValue('Home')).toContain('Unmet 1.20 kW');
    expect(nodeValue('Battery')).toContain('Charging');
  });

  test('move to the next interval as the clock does, and stop the timer on leaving', async () => {
    const start = jest.spyOn(globalThis, 'setInterval');
    const stop = jest.spyOn(globalThis, 'clearInterval');
    await render();
    expect(nodeValue('Solar')).toContain('4.20');
    const minuteTimer = start.mock.calls.find(([, ms]) => ms === 60000)!;
    const timerId = start.mock.results[start.mock.calls.indexOf(minuteTimer)].value;
    jest.setSystemTime(new Date(2026, 10, 17, 12, 16));
    await act(async () => { (minuteTimer[0] as () => void)(); });
    expect(nodeValue('Solar')).toContain('0.00');
    expect(texts().join(' ')).toContain('Saved run abcdef12 at 12:15');
    await act(async () => tree.unmount());
    expect(stop).toHaveBeenCalledWith(timerId);
    await act(async () => { tree = create(<Overview />); });
  });
});

describe('flow diagram', () => {
  const lines = () => byTestId('flow-line');
  const pulses = () => tree.root.findAll((n: any) => n.type === 'Animated' && n.props.d !== undefined);

  test('draws nothing until the layout has been measured', async () => {
    await render();
    expect(lines()).toHaveLength(0);
    expect(byTestId('flow-hub')).toHaveLength(0);
  });

  test('draws five 2px lime lines, four end dots and the hub from the measured layout', async () => {
    await render();
    await layout();
    expect(lines()).toHaveLength(5);
    for (const line of lines()) expect(line.props).toMatchObject({ strokeWidth: 1.5, stroke: darkTokens.flowLine, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' });
    expect(darkTokens.flowLine).toBe('#6AE800');
    expect(darkTokens.flowLine).not.toBe(darkTokens.lime);
    // A wider, faint stroke under each core line gives the glow; the core itself stays thin.
    const glows = byTestId('flow-glow');
    expect(glows).toHaveLength(5);
    glows.forEach((glow: any, i: number) => expect(glow.props).toMatchObject({ strokeWidth: 6, strokeOpacity: 0.25, stroke: darkTokens.flowLine, d: lines()[i].props.d }));
    expect(byTestId('flow-dot').every((d: any) => d.props.fill === darkTokens.flowLine)).toBe(true);
    expect(lines()[0].props.d).toBe('M168 272 L168 374');
    expect(byTestId('flow-dot').map((d: any) => [d.props.cx, d.props.cy])).toEqual([[88, 364], [176, 332], [160, 416], [248, 384]]);
    expect(flat(byTestId('flow-hub')[0].props.style)).toMatchObject({ left: 146, top: 352, width: 44, height: 44, backgroundColor: darkTokens.flowLine });
    expect(hosts('Icon', byTestId('flow-hub')[0])[0].props).toMatchObject({ name: 'Zap', color: darkTokens.onLime });
    // The ring is centred on the hub, wider, faint, and drawn first so it sits behind it.
    const ring = flat(byTestId('flow-hub-glow')[0].props.style);
    expect(ring).toMatchObject({ left: 134, top: 340, width: 68, height: 68, borderRadius: 34, backgroundColor: darkTokens.flowLine, opacity: 0.25 });
    const order = tree.root.findAll((n: any) => ['flow-hub-glow', 'flow-hub'].includes(n.props.testID) && typeof n.type === 'string').map((n: any) => n.props.testID);
    expect(order).toEqual(['flow-hub-glow', 'flow-hub']);
  });

  test('follows a different measured layout instead of fixed coordinates', async () => {
    await render();
    await layout();
    await act(async () => { for (const name of ['Grid', 'Home']) nodeCard(name).props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 136, height: 64 } } }); });
    expect(lines()[0].props.d).toBe('M180 272 L180 374');
    expect(flat(byTestId('flow-hub')[0].props.style).left).toBe(158);
  });

  test('moves with the house: a taller block above shifts the lines, dots and hub down', async () => {
    await render();
    await layout();
    await act(async () => { byTestId('flow-top')[0].props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 336, height: 420 } } }); });
    expect(lines()[0].props.d).toBe('M168 392 L168 494');
    expect(byTestId('flow-dot')[0].props.cy).toBe(484);
    expect(flat(byTestId('flow-hub')[0].props.style).top).toBe(472);
  });

  test('a taller first row moves the hub and the second row down', async () => {
    await render();
    await layout();
    await act(async () => { nodeCard('Solar').props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 160, height: 90 } } }); });
    expect(flat(byTestId('flow-hub')[0].props.style).top).toBe(378);
    expect(byTestId('flow-dot')[3].props.cy).toBe(410);
  });

  test('pulses run on the main line and on every node that has power', async () => {
    await render();
    await layout();
    expect(pulses()).toHaveLength(5);
    expect(pulses().every((p: any) => p.props.stroke === darkTokens.flowLine && p.props.strokeWidth === 1.5)).toBe(true);
    expect(mockWithRepeat).toHaveBeenCalled();
    // Solar is a source, so its pulse travels from the card to the hub.
    expect(pulses()[1].props.d).toBe('M88 364 L88 374 L168 374');
    // Home is a load, so its pulse travels from the hub to the card.
    expect(pulses()[4].props.d).toBe('M168 374 L248 374 L248 384');
  });

  test('a node with no power has a line but no pulse', async () => {
    serve({ run: { id: RUN_ID, created_at: '', snapshot: { pv: { source: 'x' } }, result: { schema_version: '1', step_minutes: 15, summary: SUMMARY, assumptions: [], trace: trace({ pv_kw: 3, load_kw: 3 }) } } });
    await render();
    await layout();
    expect(lines()).toHaveLength(5);
    expect(pulses()).toHaveLength(3);
  });

  test('nothing moves when there is no data', async () => {
    serve({ runs: [] });
    await render();
    await layout();
    expect(lines()).toHaveLength(5);
    expect(pulses()).toHaveLength(0);
    expect(mockWithRepeat).not.toHaveBeenCalled();
  });

  test('nothing moves when the device asks for reduced motion', async () => {
    mockReducedMotion = true;
    await render();
    await layout();
    expect(lines()).toHaveLength(5);
    expect(pulses()).toHaveLength(0);
    expect(mockWithRepeat).not.toHaveBeenCalled();
  });

  test('the house is a plain, labelled image and is never animated', async () => {
    await render();
    await layout();
    const images = hosts('Image');
    expect(images).toHaveLength(1);
    expect(images[0].props.source).toBe('house-image');
    expect(images[0].props.accessibilityLabel).toBe('Illustration of a house with rooftop solar panels');
    expect(pulses().every((p: any) => p.props.animates !== images[0].type)).toBe(true);
    expect(tree.root.findAll((n: any) => n.type === 'Animated' && hosts('Image', n).length > 0)).toHaveLength(0);
  });
});

describe('generation chart', () => {
  test('draws the hourly PV estimate with an honest title and no percentage badge', async () => {
    await render();
    expect(byTestId('chart-bar')).toHaveLength(24);
    expect(texts()).toContain('Estimated generation');
    expect(texts()).toContain('Hourly PV estimate, representative day');
    expect(texts().join(' ')).toContain('68.6 kWh per day');
    expect(texts().join(' ')).toContain("Not today's measured output. SIMULATED fixed equinox irradiance");
    expect(texts().some(t => /^[+-]\d+(\.\d+)?%$/.test(t.trim()))).toBe(false);
    expect(texts().join(' ')).not.toMatch(/Today's Generation/);
  });

  test('night hours are flat and daylight hours are tall', async () => {
    await render();
    const heights = byTestId('chart-bar').map((b: any) => flat(b.props.style).height);
    expect(heights[0]).toBe(2);
    expect(heights[12]).toBe(120);
  });

  test('shows a dash and the reason when there is no PV estimate', async () => {
    serve({ pv: new SolvantaApiError(404, { detail: 'No roof' }) });
    await render();
    expect(byTestId('chart-bar')).toHaveLength(0);
    expect(texts().join(' ')).toContain('— kWh per day');
    expect(texts()).toContain('Save a measured roof to see the PV estimate.');
  });
});

describe('weather', () => {
  test('with no remembered city it asks for one and makes no weather request', async () => {
    await render();
    expect(button(/^Weather: Set a city/)).toBeDefined();
    expect(getSpy.mock.calls.some(([path]) => String(path).startsWith('/weather'))).toBe(false);
  });

  test('loads the remembered city into the compact card', async () => {
    mockStore[WEATHER_CITY_KEY] = 'Lahore';
    await render();
    expect(getSpy).toHaveBeenCalledWith('/weather/forecast?city=Lahore');
    const card = button(/^Live weather in Lahore, Pakistan: Sunny, 28 °C, cloud cover 12%/);
    expect(card).toBeDefined();
    expect(texts(card)).toContain('28°C');
    expect(texts(card).join(' ')).toMatch(/Cloud 12% · live/);
  });

  test('the detailed card stays reachable and can be closed again', async () => {
    await render();
    await press(/^Weather: Set a city/);
    expect(texts()).toContain('Weather & solar outlook');
    expect(button('Check weather')).toBeDefined();
    await press('Hide weather details');
    expect(texts()).not.toContain('Weather & solar outlook');
  });

  test('a successful check is remembered on the device', async () => {
    await render();
    await press(/^Weather: Set a city/);
    const field = hosts('TextInput').find((n: any) => n.props.accessibilityLabel === 'City or coordinates');
    await act(async () => { field.props.onChangeText('Karachi'); });
    await press('Check weather');
    expect(getSpy).toHaveBeenCalledWith('/weather/forecast?city=Karachi');
    expect(mockStore[WEATHER_CITY_KEY]).toBe('Karachi');
  });

  test('a failed check is not remembered, and the compact card says so', async () => {
    mockStore[WEATHER_CITY_KEY] = 'Lahore';
    (AsyncStorage.setItem as jest.Mock).mockClear();
    serve({ weather: new SolvantaApiError(503, { detail: 'Live weather is not configured yet.' }) });
    await render();
    const card = button(/^Weather: Weather unavailable/);
    expect(card).toBeDefined();
    expect((AsyncStorage.setItem as jest.Mock).mock.calls.some(([key]) => key === WEATHER_CITY_KEY)).toBe(false);
    // Offline the box shows only the sun or moon for the time of day: no text, no cloud or rain.
    expect(texts(card)).toEqual([]);
    expect(icons(card).filter(n => n === 'Sun' || n === 'Moon')).toHaveLength(1);
    expect(icons(card)).not.toContain('Cloud');
  });

  test('rain at night shows the moon behind a cloud with falling drops', async () => {
    mockStore[WEATHER_CITY_KEY] = 'Lahore';
    serve({ weather: { ...WEATHER, current: { ...WEATHER.current, condition: 'Rain', kind: 'rain', is_day: false, temperature_c: 14 } } });
    await render();
    const card = button(/^Live weather in Lahore, Pakistan: Rain/);
    expect(icons(card)).toEqual(expect.arrayContaining(['Moon', 'Cloud']));
    expect(icons(card)).not.toContain('Sun');
    expect(card.findAll((n: any) => n.props.testID === 'weather-drop' && typeof n.type !== 'string').length).toBeGreaterThan(0);
  });

  test('a clear hot day shows the sun in red, a clear cold night the moon in blue', async () => {
    mockStore[WEATHER_CITY_KEY] = 'Lahore';
    serve({ weather: { ...WEATHER, current: { ...WEATHER.current, kind: 'clear', is_day: true, temperature_c: 38 } } });
    await render();
    const sun = button(/^Live weather/).findAll((n: any) => n.props.name === 'Sun')[0];
    expect(sun.props.color).toBe(darkTokens.redText);
    await act(async () => tree.unmount());
    serve({ weather: { ...WEATHER, current: { ...WEATHER.current, condition: 'Clear sky', kind: 'clear', is_day: false, temperature_c: 4 } } });
    await render();
    const moon = button(/^Live weather/).findAll((n: any) => n.props.name === 'Moon')[0];
    expect(moon.props.color).toBe(darkTokens.cyanText);
  });
});

describe('action tiles', () => {
  test.each([
    ['Simulate, Compare & Approve', '/simulation'],
    ['Configure Appliances', '/appliances'],
    ['Open Rooftop & PV Design', '/rooftop'],
    ['Size Solar from Bill', '/solar-sizing'],
    ['Schedule Appliances', '/scheduling'],
    ['Open Operations', '/ai'],
    ['Open Settings', '/settings'],
  ])('%s opens %s', async (label, path) => {
    await render();
    await press(label);
    expect(mockPush).toHaveBeenCalledWith(path);
  });

  test('every tile and header control is at least 44px', async () => {
    await render();
    for (const b of hosts('TouchableOpacity')) {
      const style = flat(b.props.style);
      const inner = hosts('View', b).map((v: any) => flat(v.props.style).minHeight ?? 0).concat(hosts('Gradient', b).map((v: any) => flat(v.props.style).minHeight ?? 0));
      expect(Math.max(style.minHeight ?? 0, style.height ?? 0, ...inner)).toBeGreaterThanOrEqual(44);
    }
  });
});
