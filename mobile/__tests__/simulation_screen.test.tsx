// The Simulation screen with the API mocked: scenario control, stats, chart, status tiles, pinned run button, collapsed tools.
jest.mock('react-native', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return {
    Text: host('Text'), View: host('View'), TextInput: host('TextInput'), TouchableOpacity: host('TouchableOpacity'),
    Pressable: host('Pressable'), ScrollView: host('ScrollView'), ActivityIndicator: host('ActivityIndicator'), KeyboardAvoidingView: host('KeyboardAvoidingView'),
    Modal: (props: any) => props.visible ? React.createElement('Modal', props, props.children) : null,
    StyleSheet: { create: (styles: any) => styles, absoluteFill: {} },
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
  };
});
jest.mock('react-native-svg', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return new Proxy({}, { get: (_t, key) => key === '__esModule' ? true : key === 'default' ? host('Svg') : host(String(key)) });
});
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const Icon = (props: any) => React.createElement('Icon', props);
  return new Proxy({}, { get: (_t, key) => (key === '__esModule' ? true : Icon) });
});
jest.mock('expo-linear-gradient', () => ({ LinearGradient: (props: any) => require('react').createElement('Gradient', props, props.children) }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: (props: any) => require('react').createElement('Safe', props, props.children), useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-router', () => ({ useFocusEffect: (cb: any) => require('react').useEffect(cb, []), router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) } }));
jest.mock('../src/theme/ThemeContext', () => {
  const { darkTokens, HERO_LIME_GRADIENT } = require('../src/theme/tokens');
  return { useTheme: () => ({ tokens: darkTokens, isDark: true, heroGradient: HERO_LIME_GRADIENT }) };
});

import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import SimulationScreen from '../app/(tabs)/simulation';
import { api, SolvantaApiError } from '../src/api/client';
import { darkTokens } from '../src/theme/tokens';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const BUILDING = 'b1';
const notFound = () => new SolvantaApiError(404, { detail: 'Not found' });
const step = (i: number, soc: number, extra: any = {}) => ({ minute: i * 15, duration_hours: 0.25, pv_kw: 1, load_kw: 1.2, critical_kw: 0.3, grid_available: true, grid_import_kw: 0.2, grid_export_kw: 0, generator_kw: 0, charge_kw: 0, discharge_kw: 0, curtailed_kw: 0, unmet_kw: 0, unserved_critical_kw: 0, soc_pct: soc, battery_end_kwh: 5, ...extra });
const trace = (from: number, to: number) => Array.from({ length: 96 }, (_, i) => step(i, from + (to - from) * i / 95));
const summary = { load_kwh: 43.21, pv_kwh: 28.64, grid_import_kwh: 18, generator_kwh: 0, unmet_kwh: 0, unserved_critical_kwh: 0, generator_fuel_l: 0, curtailed_kwh: 0, final_soc_pct: 40 };
const savedRun: any = { id: 'abcdef12-aaaa', created_at: '2026-11-17T08:00:00Z', result: { schema_version: '1', step_minutes: 15, trace: trace(80, 40), summary, assumptions: ['Representative day'] }, snapshot: { pv: { source: 'SIMULATED' }, appliances: [
  { id: 'a1', name: 'Fridge', selected: true, earliest_min: 0, required_runtime_min: 1440, critical: true },
  { id: 'a2', name: 'Pump', selected: true, earliest_min: 600, required_runtime_min: 60, critical: false },
  { id: 'a3', name: 'Oven', selected: false, earliest_min: 0, required_runtime_min: 30, critical: false },
] } };
const comparison: any = { id: 'cmp12345-bbbb', created_at: '2026-11-17T09:00:00Z', result: { method: 'm', baseline: { schema_version: '1', step_minutes: 15, trace: trace(80, 20), summary, assumptions: [] }, optimized: { schema_version: '1', step_minutes: 15, trace: trace(80, 55).map(s => ({ ...s, dispatch_reason: 'reserve', protected_future_kwh: 1 })), summary, assumptions: [] }, critical_coverage_pct: 100, baseline_critical_coverage_pct: 90, critical_energy_saved_kwh: 1, status: 'optimal', candidate_selected: true, assumptions: [] } };
const CUSTOM_FIELD = 'Outages: minute ranges (0–1440), separated by commas';

let tree: ReactTestRenderer;
let post: jest.SpyInstance;
const all = (type: string, root: any = tree.root) => root.findAll((n: any) => (n.type as any) === type);
const textOf = (n: any) => [n.props.children].flat(Infinity).filter((c: any) => typeof c === 'string' || typeof c === 'number').join('');
const texts = () => all('Text').map(textOf);
const joined = () => texts().join(' ');
const button = (label: string, root: any = tree.root) => all('TouchableOpacity', root).find((n: any) => n.props.accessibilityLabel === label);
const press = async (label: string) => { const b = button(label); if (!b) throw new Error(`No button ${label}`); await act(async () => { b.props.onPress(); }); };
const input = (label: string) => all('TextInput').find((n: any) => n.props.accessibilityLabel === label);
const footer = () => tree.root.findAll((n: any) => n.props.testID === 'screen-footer' && (n.type as any) === 'View')[0];
const chartLines = () => all('Path').filter((p: any) => p.props.fill === 'none');
const image = () => all('View').find((n: any) => n.props.accessibilityRole === 'image');
const hidden = (node: any) => { let n = node; while (n) { if ((n.type as any) === 'View' && n.props.style?.display === 'none') return true; n = n.parent; } return false; };
const settle = () => act(async () => { await Promise.resolve(); });
const tile = (label: string) => all('View').find((n: any) => (n.props.accessibilityLabel ?? '').startsWith(`${label}:`))!.props.accessibilityLabel;

async function render() {
  await act(async () => { tree = create(<SimulationScreen />); });
  await settle(); await settle();
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(api, 'getBuildings').mockResolvedValue([{ id: BUILDING, name: 'Test building' }] as any);
  jest.spyOn(api, 'getCurrentUser').mockResolvedValue({ id: 'u1' } as any);
  jest.spyOn(api, 'getBuildingEquipment').mockResolvedValue({ battery: { initial_soc_pct: 62 } } as any);
  jest.spyOn(api, 'get').mockImplementation(async (path: string) => { if (path.endsWith('/simulations')) return [] as any; throw notFound(); });
  post = jest.spyOn(api, 'post').mockImplementation(async (path: string) => { if (path.endsWith('/resilience')) return comparison; return savedRun; });
});
afterEach(async () => { await act(async () => tree.unmount()); jest.restoreAllMocks(); });

describe('scenario control', () => {
  test('offers Normal, Outage and Custom, with Outage selected', async () => {
    await render();
    for (const name of ['Normal', 'Outage', 'Custom']) expect(button(name)).toBeTruthy();
    expect(button('Outage')!.props.accessibilityState?.selected).toBe(true);
    expect(button('Normal')!.props.accessibilityState?.selected).toBeFalsy();
  });

  test('Outage shows the preset as a duration and a time span, in clock times only (no invented day)', async () => {
    await render();
    expect(texts()).toContain('2 Hour Outage');
    expect(joined()).toMatch(/08:00 – 10:00 · representative day/);
    expect(joined()).not.toMatch(/Tomorrow/);
  });

  test('Normal means no outage: the run is posted with no outages and the chart has no outage band', async () => {
    await render();
    await press('Normal');
    expect(texts()).toContain('Normal day');
    await press('Run & Save Simulation');
    expect(all('Rect').filter((r: any) => r.props.fill === darkTokens.amberText)).toHaveLength(0);
    expect(post).toHaveBeenCalledWith(`/buildings/${BUILDING}/simulations`, { outages: [], use_generator: false });
  });

  test('Outage posts the preset range', async () => {
    await render();
    await press('Run & Save Simulation');
    expect(post).toHaveBeenCalledWith(`/buildings/${BUILDING}/simulations`, { outages: [{ start_min: 480, end_min: 600 }], use_generator: false });
  });

  test('Custom shows the existing minute-range field and uses what is typed', async () => {
    await render();
    expect(input(CUSTOM_FIELD)).toBeUndefined();
    await press('Custom');
    expect(input(CUSTOM_FIELD)!.props.value).toBe('480-600');
    await act(async () => { input(CUSTOM_FIELD)!.props.onChangeText('600-840'); });
    expect(texts()).toContain('4 Hour Outage');
    expect(joined()).toMatch(/10:00 – 14:00/);
    await press('Run & Save Simulation');
    expect(post).toHaveBeenCalledWith(`/buildings/${BUILDING}/simulations`, { outages: [{ start_min: 600, end_min: 840 }], use_generator: false });
  });

  test('two ranges are listed, and an invalid entry says so and shows the existing error on run', async () => {
    await render();
    await press('Custom');
    await act(async () => { input(CUSTOM_FIELD)!.props.onChangeText('0-60, 720-780'); });
    expect(texts()).toContain('2 outages');
    await act(async () => { input(CUSTOM_FIELD)!.props.onChangeText('nonsense'); });
    expect(texts()).toContain('Custom outage');
    expect(joined()).toMatch(/Check the minute ranges below/);
    await press('Run & Save Simulation');
    expect(post).not.toHaveBeenCalled();
    expect(joined()).toMatch(/Use start-end minutes/);
  });

  test('the pencil opens the Custom scenario', async () => {
    await render();
    await press('Edit outage times');
    expect(button('Custom')!.props.accessibilityState?.selected).toBe(true);
  });

  test('the generator toggle still reaches the run', async () => {
    await render();
    const toggle = all('TouchableOpacity').find((n: any) => /generator/i.test(n.props.accessibilityLabel ?? ''))!;
    await act(async () => { (toggle.props.onPress ?? toggle.props.onValueChange)(true); });
    await press('Run & Save Simulation');
    expect(post.mock.calls[0][1].use_generator).toBe(true);
  });
});

describe('pinned Run Simulation', () => {
  test('is in the footer, reads Run Simulation, and keeps its spoken name', async () => {
    await render();
    const inFooter = all('TouchableOpacity', footer());
    expect(inFooter).toHaveLength(1);
    expect(inFooter[0].props.accessibilityLabel).toBe('Run & Save Simulation');
    expect(all('Text', footer()).map(textOf)).toContain('Run Simulation');
  });

  test('the run button is not repeated in the body', async () => {
    await render();
    expect(all('TouchableOpacity').filter((n: any) => n.props.accessibilityLabel === 'Run & Save Simulation')).toHaveLength(1);
  });

  test('running posts once and reports that nothing was switched', async () => {
    await render();
    await press('Run & Save Simulation');
    expect(post).toHaveBeenCalledTimes(1);
    expect(joined()).toMatch(/Simulation saved\. No physical switching occurred\./);
  });

  test('an API failure is shown and the screen keeps working', async () => {
    post.mockRejectedValueOnce(new Error('Save a roof/PV design first'));
    await render();
    await press('Run & Save Simulation');
    expect(joined()).toMatch(/Save a roof\/PV design first/);
    expect(button('Run & Save Simulation')!.props.disabled).toBeFalsy();
  });
});

describe('before a run', () => {
  test('shows dashes for run numbers, the real starting charge, and an empty chart', async () => {
    await render();
    const t = texts();
    expect(t.filter((x: string) => x === '—').length).toBeGreaterThanOrEqual(4);
    expect(t).toContain('62');
    expect(t).toContain('Start battery');
    expect(t).toContain('Run a simulation to see the battery level.');
    expect(image()).toBeUndefined();
  });

  test('everything numeric is labelled SIMULATED', async () => {
    await render();
    expect(joined()).toMatch(/SIMULATED values for a representative day/);
    expect(texts()).toContain('SIMULATED');
    expect(texts()).toContain('Battery Level (Simulated)');
  });

  test('without equipment data the starting charge is a dash', async () => {
    (api.getBuildingEquipment as jest.Mock).mockRejectedValue(notFound());
    await render();
    expect(texts()).toContain('Start battery');
    expect(texts()).not.toContain('62');
  });

  test('appliance status tiles are dashes and say what is not tracked', async () => {
    await render();
    for (const label of ['Requested', 'Outside window', 'Not selected']) expect(tile(label)).toBe(`${label}: —`);
    expect(joined()).toMatch(/Paused and deferred are not tracked/);
  });
});

describe('after a run', () => {
  test('shows PV and load from the run, and draws the current plan only', async () => {
    await render();
    await press('Run & Save Simulation');
    expect(texts()).toContain('28.6');
    expect(texts()).toContain('43.2');
    expect(chartLines()).toHaveLength(1);
    expect(chartLines()[0].props.stroke).toBe(darkTokens.limeMark);
    expect(joined()).toMatch(/Optimized Plan —/);
    expect(image()!.props.accessibilityLabel).toMatch(/^Battery Level \(Simulated\), simulated\. Current Plan: starts at 80%, ends at 40%, lowest 40% at 23:45\. Optimized Plan: no data\./);
  });

  test('counts appliances from the run snapshot at the start of the outage window, and says so', async () => {
    await render();
    await press('Run & Save Simulation');
    // Outage 08:00: the fridge runs all day, the pump starts at 10:00, the oven is not selected.
    expect(tile('Requested')).toBe('Requested: 1');
    expect(tile('Outside window')).toBe('Outside window: 1');
    expect(tile('Not selected')).toBe('Not selected: 1');
    expect(joined()).toMatch(/Counts are for the start of the outage window, 08:00\./);
    expect(joined()).not.toMatch(/Shown for/);
  });

  test('the counts follow the outage window when the scenario changes', async () => {
    await render();
    await press('Custom');
    await act(async () => { input(CUSTOM_FIELD)!.props.onChangeText('600-720'); });
    await press('Run & Save Simulation');
    expect(tile('Requested')).toBe('Requested: 2');
    expect(joined()).toMatch(/Counts are for the start of the outage window, 10:00\./);
  });

  test('with no outage the caption says the counts are for the start of the day', async () => {
    await render();
    await press('Normal');
    await press('Run & Save Simulation');
    expect(joined()).toMatch(/This scenario has no outage window, so counts are for the start of the day, 00:00\./);
    expect(tile('Requested')).toBe('Requested: 1');
  });

  test('a run without an appliance list has no counts and says so', async () => {
    post.mockResolvedValueOnce({ ...savedRun, snapshot: { pv: { source: 'SIMULATED' } } });
    await render();
    await press('Run & Save Simulation');
    expect(tile('Requested')).toBe('Requested: —');
    expect(joined()).toMatch(/This run has no appliance list, so there are no counts\./);
  });

  test('before a run the caption says counts come after a run', async () => {
    await render();
    expect(joined()).toMatch(/Counts appear after a run\./);
  });

  test('tile labels can wrap onto two lines instead of touching the tile edge', async () => {
    await render();
    const label = all('Text').find((n: any) => textOf(n) === 'Outside window')!;
    expect([label.props.style].flat(Infinity).reduce((a: any, x: any) => ({ ...a, ...x }), {})).toMatchObject({ flex: 1, flexShrink: 1 });
  });

  test('the original result details are kept in a closed section', async () => {
    await render();
    await press('Run & Save Simulation');
    expect(button('Show Run details')).toBeTruthy();
    const metric = () => all('Text').find((n: any) => textOf(n) === 'Critical unmet')!;
    expect(hidden(metric())).toBe(true);
    await press('Show Run details');
    expect(hidden(metric())).toBe(false);
  });
});

describe('comparison on the chart', () => {
  const compare = async () => { await press('Show Resilience comparison'); await press('Compare & Save Resilience'); await settle(); };

  test('adds the optimized plan and takes both lines from the comparison', async () => {
    await render();
    await press('Run & Save Simulation');
    await compare();
    expect(chartLines().map((p: any) => p.props.stroke)).toEqual([darkTokens.limeMark, darkTokens.cyanText]);
    expect(joined()).toMatch(/Both lines come from the saved resilience comparison/);
    expect(image()!.props.accessibilityLabel).toMatch(/Current Plan: starts at 80%, ends at 20%.*Optimized Plan: starts at 80%, ends at 55%/);
  });

  test('works without a prior run, since the comparison has its own baseline', async () => {
    await render();
    await compare();
    expect(chartLines()).toHaveLength(2);
  });

  test('changing the scenario clears the comparison, because it belonged to the old scenario', async () => {
    await render();
    await compare();
    expect(chartLines()).toHaveLength(2);
    await press('Normal');
    await settle();
    expect(chartLines()).toHaveLength(0);
  });

  test('draws the outage window and moves it with the scenario', async () => {
    await render();
    await press('Run & Save Simulation');
    const bands = () => all('Rect').filter((r: any) => r.props.fill === darkTokens.amberText);
    expect(bands()).toHaveLength(1);
    const before = bands()[0].props.x;
    await press('Custom');
    await act(async () => { input(CUSTOM_FIELD)!.props.onChangeText('1080-1200'); });
    expect(bands()[0].props.x).toBeGreaterThan(before);
  });
});

describe('extra tools', () => {
  const sections = ['Telemetry', 'Automation', 'Plans', 'Resilience comparison', 'Forecast', 'Saved runs'];

  test('the six tools and Saved runs are closed by default, and nothing is removed', async () => {
    await render();
    for (const name of sections) {
      const b = button(`Show ${name}`)!;
      expect(b).toBeTruthy();
      expect(b.props.accessibilityState.expanded).toBe(false);
    }
    const action = all('TouchableOpacity').find((n: any) => n.props.accessibilityLabel === 'Compare & Save Resilience')!;
    expect(action).toBeTruthy();
    expect(hidden(action)).toBe(true);
  });

  test('opening a section shows it, and closing hides it again, keeping its state', async () => {
    await render();
    await press('Show Resilience comparison');
    const heading = () => all('TouchableOpacity').find((n: any) => n.props.accessibilityLabel === 'Compare & Save Resilience')!;
    expect(hidden(heading())).toBe(false);
    expect(button('Hide Resilience comparison')!.props.accessibilityState.expanded).toBe(true);
    await press('Hide Resilience comparison');
    expect(hidden(heading())).toBe(true);
  });

  test('replay and run details only appear once there is a run', async () => {
    await render();
    expect(button('Show Digital twin replay')).toBeUndefined();
    await press('Run & Save Simulation');
    expect(button('Show Digital twin replay')).toBeTruthy();
  });

  test('Open Scheduling still goes to the scheduling screen', async () => {
    await render();
    await press('Open Scheduling');
    expect(router.push).toHaveBeenCalledWith('/scheduling');
  });

  test('saved runs open an immutable run', async () => {
    (api.get as jest.Mock).mockImplementation(async (path: string) => { if (path.endsWith('/simulations')) return [{ id: savedRun.id, created_at: savedRun.created_at }]; if (path.endsWith(`/simulations/${savedRun.id}`)) return savedRun; throw notFound(); });
    await render();
    const item = all('TouchableOpacity').find((n: any) => /abcdef12/.test(n.props.accessibilityLabel ?? ''))!;
    await act(async () => { item.props.onPress(); });
    await settle();
    expect(joined()).toMatch(/Loaded immutable saved run\./);
    expect(chartLines()).toHaveLength(1);
  });
});

describe('outage stat tiles', () => {
  const flat = (style: any) => [style].flat(Infinity).reduce((a: any, x: any) => ({ ...a, ...x }), {});
  test('labels are short enough for one line and values sit at the bottom of equal tiles', async () => {
    await render();
    const labels = ['Start battery', 'PV Generation', 'Total Load'];
    for (const label of labels) {
      expect(label.length).toBeLessThanOrEqual(14);
      const tileView = all('View').find((n: any) => (n.props.accessibilityLabel ?? '').startsWith(`${label}:`))!;
      expect(flat(tileView.props.style).justifyContent).toBe('space-between');
    }
    expect(texts()).not.toContain('Battery at start');
  });
});

describe('one primary button', () => {
  const flat = (style: any) => [style].flat(Infinity).reduce((a: any, x: any) => ({ ...a, ...x }), {});
  const limeButtons = () => all('TouchableOpacity').filter((n: any) => flat(n.props.style).minHeight === 50 && flat(n.props.style).backgroundColor === darkTokens.lime).map((n: any) => n.props.accessibilityLabel);

  test('only Run Simulation is a lime button, with every section open and a run loaded', async () => {
    await render();
    await press('Run & Save Simulation');
    for (const name of ['Run details', 'Digital twin replay', 'Telemetry', 'Automation', 'Plans', 'Resilience comparison', 'Forecast', 'Saved runs']) await press(`Show ${name}`);
    expect(limeButtons()).toEqual(['Run & Save Simulation']);
  });

  test('the in-card actions are secondary 50px buttons and keep their names', async () => {
    await render();
    await press('Run & Save Simulation');
    for (const name of ['Create Three Alternatives', 'Compare & Save Resilience', 'Project Energy Shortage', 'Generate Simulated Observations', 'Play Replay']) {
      const b = button(name)!;
      expect(b).toBeTruthy();
      expect(flat(b.props.style)).toMatchObject({ minHeight: 50, backgroundColor: darkTokens.surfaceElevated });
    }
  });
});

describe('section headers', () => {
  const sections: Array<[string, string]> = [['Telemetry', 'Simulated telemetry & incidents'], ['Automation', 'Automation notices'], ['Plans', 'Configuration alternatives & approval'], ['Resilience comparison', 'Outage resilience comparison'], ['Forecast', '24-hour baseline forecast']];

  test('an open section has one title: the card inside draws no second title and no second frame', async () => {
    await render();
    for (const [name, cardTitle] of sections) {
      await press(`Show ${name}`);
      // The card's own title is not drawn, the section header carries it.
      expect(texts()).not.toContain(cardTitle);
      expect(all('Text').filter((n: any) => textOf(n) === name)).toHaveLength(1);
    }
    expect(all('Text').filter((n: any) => textOf(n) === 'Saved runs')).toHaveLength(1);
  });

  test('the card subtitle that carries a warning is still shown under the header', async () => {
    await render();
    await press('Show Telemetry');
    expect(joined()).toMatch(/No physical inverter or smart meter is connected\./);
  });

  test('the open section is one framed block: the header and its content share a single border', async () => {
    await render();
    await press('Show Resilience comparison');
    const framed = all('View').filter((n: any) => n.props.style?.borderWidth === 1 && n.props.style?.borderRadius === 18 && all('TouchableOpacity', n).some((b: any) => b.props.accessibilityLabel === 'Hide Resilience comparison'));
    expect(framed).toHaveLength(1);
    const inner = framed[0].findAll((n: any) => (n.type as any) === 'View' && n !== framed[0] && n.props.style?.borderWidth === 1 && n.props.style?.borderRadius === 18);
    expect(inner).toHaveLength(0);
  });

  test('every section header has an icon and keeps its spoken name', async () => {
    await render();
    for (const [name] of sections) expect(all('Icon', button(`Show ${name}`)).length).toBeGreaterThan(0);
  });
});

describe('header and banner', () => {
  test('keeps the SIMULATED banner and a one-line building header', async () => {
    await render();
    expect(texts()).toContain('SIMULATED • saved 15-minute energy balance');
    expect(texts()).toContain('Simulation');
  });
});
