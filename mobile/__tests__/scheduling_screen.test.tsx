// The Scheduling screen with the API mocked: scenario control, shared timeline lanes, the optimized card, appliance rows and tags, the pinned action.
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
import Scheduling from '../app/(tabs)/scheduling';
import { api, SolvantaApiError } from '../src/api/client';
import { darkTokens } from '../src/theme/tokens';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const BUILDING = 'b1';
const notFound = () => new SolvantaApiError(404, { detail: 'Not found' });
const appliance = (id: string, name: string, extra: any = {}) => ({ id, building_id: BUILDING, name, rated_power_w: 500, priority: 'medium', critical: false, flexible: false, selected: true, required_runtime_min: 60, earliest_min: 0, latest_min: 1440, interruptible: false, max_interruptions: 0, ...extra });
const appliances = { items: [
  appliance('a1', 'Fridge', { priority: 'critical', critical: true, flexible: false, rated_power_w: 150 }),
  appliance('a2', 'Water pump', { flexible: true, earliest_min: 360, latest_min: 1320, rated_power_w: 750, interruptible: true }),
  appliance('a3', 'Washer', { priority: 'low', flexible: true, earliest_min: 600, latest_min: 1380, rated_power_w: 500 }),
], summary: { requested_kw: 1.4, critical_kw: 0.15, selected_count: 3 }, disclaimer: '' };
const entry = (id: string, name: string, priority: string, power: number, segments: Array<[number, number]>) => ({ appliance_id: id, name, priority, rated_power_w: power, segments: segments.map(([s, e]) => ({ start_min: s, end_min: e })) });
const schedule: any = { id: 'sched123-aaaa', created_at: '2026-11-17T08:00:00Z', result: { status: 'OPTIMAL', validated: true, reasons: [], supply_policy: 'PV plus available grid.', objective_description: 'Minimise unmet energy.', demand_kwh: 2.5, entries: [
  entry('a3', 'Washer', 'low', 500, [[1200, 1290]]),
  entry('a1', 'Fridge', 'critical', 150, [[0, 1440]]),
  entry('a2', 'Water pump', 'medium', 750, [[600, 660], [780, 840]]),
] } };
const pvRecord = { saved: true, parameters: {}, profile: { timeline: Array.from({ length: 24 }, (_, h) => ({ hour: h, poa_w_m2: 0, ac_kw: h >= 6 && h < 18 ? 2 : 0, energy_kwh: 0 })) } };
const CUSTOM_FIELD = 'Outages (minute ranges, e.g. 480-600)';

let tree: ReactTestRenderer;
let post: jest.SpyInstance;
const all = (type: string, root: any = tree.root) => root.findAll((n: any) => (n.type as any) === type);
const textOf = (n: any) => [n.props.children].flat(Infinity).filter((c: any) => typeof c === 'string' || typeof c === 'number').join('');
const texts = (root: any = tree.root) => all('Text', root).map(textOf);
const joined = () => texts().join(' ');
const button = (label: string, root: any = tree.root) => all('TouchableOpacity', root).find((n: any) => n.props.accessibilityLabel === label);
const press = async (label: string) => { const b = button(label); if (!b) throw new Error(`No button ${label}`); await act(async () => { b.props.onPress(); }); };
const input = (label: string) => all('TextInput').find((n: any) => n.props.accessibilityLabel === label);
const footer = () => tree.root.findAll((n: any) => n.props.testID === 'screen-footer' && (n.type as any) === 'View')[0];
const byId = (id: string) => all('View').filter((n: any) => n.props.testID === id);
const lane = (id: string) => byId(`lane-${id}`)[0];
const bars = (node: any) => all('View', node).filter((n: any) => n.props.testID === 'lane-bar');
const flat = (style: any) => [style].flat(Infinity).reduce((a: any, x: any) => ({ ...a, ...x }), {});
const settle = () => act(async () => { await Promise.resolve(); });
const rows = () => byId('schedule-row');
const hidden = (node: any) => { let n = node; while (n) { if ((n.type as any) === 'View' && n.props.style?.display === 'none') return true; n = n.parent; } return false; };

async function render() {
  await act(async () => { tree = create(<Scheduling />); });
  await settle(); await settle();
}
const solve = async () => { await press('Solve & Save Schedule'); await settle(); };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(api, 'getBuildings').mockResolvedValue([{ id: BUILDING, name: 'Test building' }] as any);
  jest.spyOn(api, 'getCurrentUser').mockResolvedValue({ id: 'u1' } as any);
  jest.spyOn(api, 'get').mockImplementation(async (path: string) => {
    if (path.endsWith('/schedules')) return [] as any;
    if (path.endsWith('/pv')) return pvRecord as any;
    if (path.endsWith('/appliances')) return appliances as any;
    throw notFound();
  });
  post = jest.spyOn(api, 'post').mockResolvedValue(schedule);
});
afterEach(async () => { await act(async () => tree.unmount()); jest.restoreAllMocks(); });

describe('scenario control', () => {
  test('offers Normal, Outage and Custom, with Outage selected, and says what the outage is', async () => {
    await render();
    for (const name of ['Normal', 'Outage', 'Custom']) expect(button(name)).toBeTruthy();
    expect(button('Outage')!.props.accessibilityState?.selected).toBe(true);
    expect(joined()).toMatch(/Outage 08:00 – 10:00\./);
    expect(joined()).not.toMatch(/Tomorrow/);
  });

  test('keeps the old default: the first run posts 08:00 to 10:00 with no generator, and the same timeout', async () => {
    await render();
    await solve();
    expect(post).toHaveBeenCalledWith(`/buildings/${BUILDING}/schedules`, { outages: [{ start_min: 480, end_min: 600 }], use_generator: false }, 30000);
  });

  test('Normal posts no outages and the grid lane covers the whole day', async () => {
    await render();
    await press('Normal');
    expect(joined()).toMatch(/No outage: the grid is available all day\./);
    expect(bars(lane('grid'))).toHaveLength(1);
    expect(flat(bars(lane('grid'))[0].props.style)).toMatchObject({ left: '0%' });
    expect(byId('timeline-band')).toHaveLength(0);
    await solve();
    expect(post).toHaveBeenCalledWith(`/buildings/${BUILDING}/schedules`, { outages: [], use_generator: false }, 30000);
  });

  test('Custom shows the existing field, uses what is typed and moves the outage band', async () => {
    await render();
    expect(input(CUSTOM_FIELD)).toBeUndefined();
    await press('Custom');
    expect(input(CUSTOM_FIELD)!.props.value).toBe('480-600');
    await act(async () => { input(CUSTOM_FIELD)!.props.onChangeText('1080-1200'); });
    expect(joined()).toMatch(/Outage 18:00 – 20:00\./);
    expect(flat(byId('timeline-band')[0].props.style).left).toBe('75%');
    await solve();
    expect(post.mock.calls[0][1]).toEqual({ outages: [{ start_min: 1080, end_min: 1200 }], use_generator: false });
  });

  test('an invalid entry is reported by the existing error and nothing is sent', async () => {
    await render();
    await press('Custom');
    await act(async () => { input(CUSTOM_FIELD)!.props.onChangeText('nonsense'); });
    expect(joined()).toMatch(/Check the minute ranges\./);
    await solve();
    expect(post).not.toHaveBeenCalled();
    expect(joined()).toMatch(/Use start-end minutes/);
  });
});

describe('custom outage rows', () => {
  const outageRows = () => byId('outage-row');
  const rowLabels = () => outageRows().map((r: any) => r.props.accessibilityLabel);
  const raw = () => input(CUSTOM_FIELD)!.props.value;
  const openCustom = async () => { await render(); await press('Custom'); };

  test('Custom shows outage rows with From and To times instead of the minute-range field', async () => {
    await openCustom();
    expect(rowLabels()).toEqual(['Outage 1, from 08:00 to 10:00']);
    expect(texts()).toEqual(expect.arrayContaining(['From', 'To']));
    expect(hidden(input(CUSTOM_FIELD))).toBe(true);
    expect(button('Add another outage')).toBeTruthy();
    expect(button('Remove Outage 1')).toBeTruthy();
  });

  test('hour and minute steppers move a time, keep the raw field in step and update the plain-English line', async () => {
    await openCustom();
    await press('Outage 1 from hour up');
    expect(rowLabels()).toEqual(['Outage 1, from 09:00 to 10:00']);
    expect(raw()).toBe('540-600');
    expect(joined()).toMatch(/Outage 09:00 – 10:00\./);
    await press('Outage 1 to minute up');
    expect(raw()).toBe('540-615');
    await press('Outage 1 to hour down');
    expect(raw()).toBe('540-555');
    await press('Outage 1 from minute down');
    expect(raw()).toBe('525-555');
  });

  test('moving From past To pushes To along, so a row is never empty', async () => {
    await openCustom();
    for (let i = 0; i < 3; i++) await press('Outage 1 from hour up');
    expect(raw()).toBe('660-675');
  });

  test('a step that would leave the day is not offered', async () => {
    await openCustom();
    await act(async () => { input(CUSTOM_FIELD)!.props.onChangeText('0-60'); });
    expect(button('Outage 1 from hour down')!.props.disabled).toBe(true);
    expect(button('Outage 1 from minute down')!.props.disabled).toBe(true);
    await act(async () => { input(CUSTOM_FIELD)!.props.onChangeText('1380-1440'); });
    expect(button('Outage 1 to hour up')!.props.disabled).toBe(true);
    expect(button('Add another outage')!.props.disabled).toBe(true);
  });

  test('Add another outage appends a one-hour row after the last, and both reach the request unchanged', async () => {
    await openCustom();
    await press('Add another outage');
    expect(rowLabels()).toEqual(['Outage 1, from 08:00 to 10:00', 'Outage 2, from 10:00 to 11:00']);
    expect(raw()).toBe('480-600, 600-660');
    await solve();
    expect(post).toHaveBeenCalledWith(`/buildings/${BUILDING}/schedules`, { outages: [{ start_min: 480, end_min: 600 }, { start_min: 600, end_min: 660 }], use_generator: false }, 30000);
  });

  test('each row has its own remove button, and with none left the grid is available all day', async () => {
    await openCustom();
    await press('Add another outage');
    await press('Remove Outage 1');
    expect(rowLabels()).toEqual(['Outage 1, from 10:00 to 11:00']);
    expect(raw()).toBe('600-660');
    await press('Remove Outage 1');
    expect(rowLabels()).toEqual([]);
    expect(raw()).toBe('');
    expect(joined()).toMatch(/No outage rows: the grid is available all day\./);
    expect(joined()).toMatch(/No outage ranges\./);
    await solve();
    expect(post.mock.calls[0][1]).toEqual({ outages: [], use_generator: false });
  });

  test('the Expert field is collapsed, and typing in it updates the rows', async () => {
    await openCustom();
    expect(button('Expert settings')).toBeTruthy();
    expect(hidden(input(CUSTOM_FIELD))).toBe(true);
    await press('Expert settings');
    expect(hidden(input(CUSTOM_FIELD))).toBe(false);
    expect(button('Hide expert settings')).toBeTruthy();
    await act(async () => { input(CUSTOM_FIELD)!.props.onChangeText('0-60, 720-780'); });
    expect(rowLabels()).toEqual(['Outage 1, from 00:00 to 01:00', 'Outage 2, from 12:00 to 13:00']);
  });

  test('raw text that cannot be shown as rows is flagged and the rows step aside, with no change to the request check', async () => {
    await openCustom();
    await act(async () => { input(CUSTOM_FIELD)!.props.onChangeText('nonsense'); });
    expect(outageRows()).toHaveLength(0);
    expect(joined()).toMatch(/These minute ranges cannot be shown as rows\. Fix them in Expert settings\./);
    await solve();
    expect(post).not.toHaveBeenCalled();
    expect(joined()).toMatch(/Use start-end minutes/);
  });

  test('overlapping rows are warned about and the existing validation still stops the request', async () => {
    await openCustom();
    await act(async () => { input(CUSTOM_FIELD)!.props.onChangeText('480-600, 540-660'); });
    expect(joined()).toMatch(/These outages overlap\./);
    await solve();
    expect(post).not.toHaveBeenCalled();
    expect(joined()).toMatch(/Outages cannot overlap\./);
  });

  test('every step, add and remove button is a 44px target', async () => {
    await openCustom();
    const names = ['Outage 1 from hour down', 'Outage 1 from hour up', 'Outage 1 from minute down', 'Outage 1 from minute up', 'Outage 1 to hour down', 'Outage 1 to hour up', 'Outage 1 to minute down', 'Outage 1 to minute up', 'Remove Outage 1'];
    for (const n of names) expect(flat(button(n)!.props.style)).toMatchObject({ width: 44, height: 44 });
    expect(flat(button('Add another outage')!.props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  test('switching to Normal or Outage still ignores the custom rows', async () => {
    await openCustom();
    await press('Add another outage');
    await press('Outage');
    await solve();
    expect(post.mock.calls[0][1]).toEqual({ outages: [{ start_min: 480, end_min: 600 }], use_generator: false });
    expect(outageRows()).toHaveLength(0);
  });
});

describe('pinned action', () => {
  test('Solve Schedule is the only button in the footer and keeps its spoken name', async () => {
    await render();
    const inFooter = all('TouchableOpacity', footer());
    expect(inFooter).toHaveLength(1);
    expect(inFooter[0].props.accessibilityLabel).toBe('Solve & Save Schedule');
    expect(texts(footer())).toContain('Solve Schedule');
    expect(all('TouchableOpacity').filter((n: any) => n.props.accessibilityLabel === 'Solve & Save Schedule')).toHaveLength(1);
  });

  test('it is the only lime button on the screen', async () => {
    await render();
    await solve();
    const lime = all('TouchableOpacity').filter((n: any) => flat(n.props.style).minHeight === 50 && flat(n.props.style).backgroundColor === darkTokens.lime).map((n: any) => n.props.accessibilityLabel);
    expect(lime).toEqual(['Solve & Save Schedule']);
  });

  test('a failed solve shows the API message and leaves the button usable', async () => {
    post.mockRejectedValueOnce(new Error('Solver timed out'));
    await render();
    await solve();
    expect(joined()).toMatch(/Solver timed out/);
    expect(button('Solve & Save Schedule')!.props.disabled).toBeFalsy();
  });

  test('Back to Simulation still goes back to Simulation', async () => {
    await render();
    await press('Back to Simulation');
    expect(router.replace).toHaveBeenCalledWith('/simulation');
  });
});

describe('timeline lanes', () => {
  test('before a solve there are Solar and Grid lanes and a legend, labelled SIMULATED and estimated', async () => {
    await render();
    expect(byId('lane-solar')).toHaveLength(1);
    expect(byId('lane-grid')).toHaveLength(1);
    expect(all('View').filter((n: any) => (n.props.testID ?? '').startsWith('lane-app-'))).toHaveLength(0);
    expect(texts()).toContain('SIMULATED');
    expect(texts()).toContain('Solar (estimated)');
    expect(texts()).toContain('Appliance');
    expect(texts()).toContain('Outage');
    expect(texts()).not.toContain('Battery');
  });

  test('the solar lane is drawn from the PV estimate hours, and the grid lane from the outage', async () => {
    await render();
    const solar = bars(lane('solar'));
    expect(solar).toHaveLength(1);
    expect(flat(solar[0].props.style)).toMatchObject({ left: '25%', width: '50%', backgroundColor: darkTokens.limeMark });
    const grid = bars(lane('grid'));
    expect(grid.map((g: any) => flat(g.props.style).left)).toEqual(['0%', `${600 / 14.4}%`]);
    expect(flat(grid[0].props.style).backgroundColor).toBe(darkTokens.textSecondary);
    expect(lane('solar').props.accessibilityLabel).toMatch(/Solar, estimated from the PV design: 06:00 – 18:00/);
  });

  test('without a PV estimate the solar lane says so instead of drawing bars', async () => {
    (api.get as jest.Mock).mockImplementation(async (path: string) => { if (path.endsWith('/schedules')) return []; if (path.endsWith('/appliances')) return appliances; throw notFound(); });
    await render();
    expect(bars(lane('solar'))).toHaveLength(0);
    expect(texts(lane('solar'))).toContain('No PV estimate');
    expect(lane('solar').props.accessibilityLabel).toMatch(/no estimate/);
  });

  test('after a solve each appliance gets a lane on the same axis, in start order, with bars from its segments', async () => {
    await render();
    await solve();
    const appLanes = all('View').filter((n: any) => (n.props.testID ?? '').startsWith('lane-app-'));
    expect(appLanes.map((l: any) => texts(l)[0])).toEqual(['Fridge', 'Water pump', 'Washer']);
    expect(bars(lane('app-a2')).map((b: any) => flat(b.props.style).left)).toEqual([`${600 / 14.4}%`, `${780 / 14.4}%`]);
    expect(flat(bars(lane('app-a2'))[0].props.style).backgroundColor).toBe(darkTokens.amberText);
    expect(lane('app-a2').props.accessibilityLabel).toBe('Water pump scheduled 10:00 to 11:00, 13:00 to 14:00');
  });

  test('draws the outage band and the axis from 00:00 to 24:00', async () => {
    await render();
    expect(byId('timeline-band')).toHaveLength(1);
    expect(flat(byId('timeline-band')[0].props.style)).toMatchObject({ left: `${480 / 14.4}%` });
    expect(texts()).toEqual(expect.arrayContaining(['00:00', '06:00', '12:00', '18:00', '24:00']));
  });
});

describe('optimized schedule card', () => {
  test('before a solve it claims nothing', async () => {
    await render();
    expect(texts()).toContain('No schedule yet');
    expect(all('Gradient')).toHaveLength(0);
  });

  test('after an optimal solve it is a short lime card: icon tile, SIMULATED chip, headline, one line and the run id', async () => {
    await render();
    await solve();
    expect(all('Gradient')).toHaveLength(1);
    const card = all('Gradient')[0];
    expect(all('View', card).filter((n: any) => n.props.testID === 'hero-icon')).toHaveLength(1);
    expect(flat(all('View', card).find((n: any) => n.props.testID === 'hero-icon')!.props.style)).toMatchObject({ width: 44, height: 44, borderRadius: 22 });
    expect(texts(card)).toEqual(expect.arrayContaining(['SIMULATED', 'Optimized schedule ready', '3 appliances · 2.50 kWh requested', 'Saved run sched123', 'How this was scheduled']));
    expect(joined()).not.toMatch(/Save 2\.3|backup|1\.6 hours|AI Recommendation|Recommendation/i);
    expect(texts(card).join(' ')).not.toMatch(/saving|saved? \d/i);
  });

  test('the headline line no longer carries the validation claim, which moves under How this was scheduled', async () => {
    await render();
    await solve();
    expect(texts()).not.toContain('3 appliances · 2.50 kWh requested · independently validated');
    expect(texts()).toContain('Independently validated');
  });

  test('the explanation is closed by default, wording unchanged, and opens and closes from a 44px toggle', async () => {
    await render();
    await solve();
    const toggle = () => button('Show how this was scheduled') ?? button('Hide how this was scheduled');
    expect(toggle()!.props.accessibilityState.expanded).toBe(false);
    expect(flat(toggle()!.props.style).minHeight).toBeGreaterThanOrEqual(44);
    const lines = ['PV plus available grid.', 'Minimise unmet energy.', 'Independently validated'];
    for (const line of lines) expect(hidden(all('Text').find((n: any) => textOf(n) === line)!)).toBe(true);
    await press('Show how this was scheduled');
    for (const line of lines) expect(hidden(all('Text').find((n: any) => textOf(n) === line)!)).toBe(false);
    expect(button('Hide how this was scheduled')!.props.accessibilityState.expanded).toBe(true);
    await press('Hide how this was scheduled');
    for (const line of lines) expect(hidden(all('Text').find((n: any) => textOf(n) === line)!)).toBe(true);
  });

  test('a schedule the solver did not validate does not claim it was', async () => {
    post.mockResolvedValueOnce({ ...schedule, result: { ...schedule.result, validated: false } });
    await render();
    await solve();
    expect(texts()).not.toContain('Independently validated');
  });

  test('without a saved id there is no run id line', async () => {
    post.mockResolvedValueOnce({ ...schedule, id: null });
    await render();
    await solve();
    expect(joined()).not.toMatch(/Saved run/);
  });

  test('a feasible but not optimal schedule is called feasible', async () => {
    post.mockResolvedValueOnce({ ...schedule, result: { ...schedule.result, status: 'FEASIBLE', validated: false } });
    await render();
    await solve();
    expect(texts(all('Gradient')[0])).toEqual(expect.arrayContaining(['Feasible schedule ready', '3 appliances · 2.50 kWh requested']));
    expect(texts()).not.toContain('Independently validated');
  });

  test('a failed solve is not lime: it says no schedule was saved and lists the conflicts', async () => {
    post.mockResolvedValueOnce({ id: null, result: { status: 'INFEASIBLE', validated: false, reasons: ['Fridge cannot finish inside its window'], supply_policy: 'PV plus available grid.', entries: [] } });
    await render();
    await solve();
    expect(all('Gradient')).toHaveLength(0);
    expect(texts()).toContain('No schedule saved');
    expect(joined()).toMatch(/Fridge cannot finish inside its window/);
    expect(joined()).toMatch(/No schedule saved; see conflict details below\./);
    expect(rows()).toHaveLength(0);
  });
});

describe('appliance rows and tags', () => {
  test('one row per appliance in start order, with times, minutes and power', async () => {
    await render();
    await solve();
    expect(rows().map((r: any) => texts(r)[0])).toEqual(['Fridge', 'Water pump', 'Washer']);
    const pump = rows()[1];
    expect(texts(pump).join(' ')).toMatch(/10:00 – 11:00, 13:00 – 14:00 · 120 min · 0\.75 kW/);
    expect(pump.props.accessibilityLabel).toBe('Water pump, 10:00 – 11:00, 13:00 – 14:00');
  });

  test('tags come from priority, flexible and the number of parts, and the window from the appliance', async () => {
    await render();
    await solve();
    const [fridge, pump, washer] = rows();
    expect(texts(fridge)).toEqual(expect.arrayContaining(['CRITICAL', 'FIXED TIME', 'Allowed 00:00 – 24:00']));
    expect(texts(fridge)).not.toContain('FLEXIBLE');
    expect(texts(pump)).toEqual(expect.arrayContaining(['MEDIUM', 'FLEXIBLE', 'SPLIT INTO 2', 'Allowed 06:00 – 22:00']));
    expect(texts(washer)).toEqual(expect.arrayContaining(['LOW', 'FLEXIBLE', 'Allowed 10:00 – 23:00']));
    expect(texts(washer).filter((x: string) => /SPLIT/.test(x))).toHaveLength(0);
  });

  test('a critical load that is not top priority also shows the critical tag', async () => {
    (api.get as jest.Mock).mockImplementation(async (path: string) => { if (path.endsWith('/schedules')) return []; if (path.endsWith('/pv')) return pvRecord; if (path.endsWith('/appliances')) return { ...appliances, items: [appliance('a3', 'Washer', { priority: 'low', critical: true, flexible: true })] }; throw notFound(); });
    await render();
    await solve();
    expect(texts(rows().find((r: any) => texts(r)[0] === 'Washer'))).toEqual(expect.arrayContaining(['LOW', 'CRITICAL DEMAND']));
  });

  test('without the appliance list only the priority is tagged, and the window is a dash', async () => {
    (api.get as jest.Mock).mockImplementation(async (path: string) => { if (path.endsWith('/schedules')) return []; if (path.endsWith('/pv')) return pvRecord; throw notFound(); });
    await render();
    await solve();
    const fridge = rows()[0];
    expect(texts(fridge)).toEqual(expect.arrayContaining(['CRITICAL', 'Allowed —']));
    expect(texts(fridge)).not.toContain('FIXED TIME');
    expect(texts(fridge)).not.toContain('FLEXIBLE');
  });

  test('every tag is a real field: nothing like Optimized, Balanced or Always on is invented', async () => {
    await render();
    await solve();
    expect(joined()).not.toMatch(/Always on|Run flexible|Balanced|Load shedding|Evening routine|Essential appliances/);
  });
});

describe('saved schedules', () => {
  test('are in a closed section and open an immutable result', async () => {
    (api.get as jest.Mock).mockImplementation(async (path: string) => { if (path.endsWith('/schedules')) return [schedule]; if (path.endsWith('/pv')) return pvRecord; if (path.endsWith('/appliances')) return appliances; throw notFound(); });
    await render();
    expect(button('Show Saved schedules')!.props.accessibilityState.expanded).toBe(false);
    const item = all('TouchableOpacity').find((n: any) => /sched123/.test(n.props.accessibilityLabel ?? ''))!;
    expect(hidden(item)).toBe(true);
    await press('Show Saved schedules');
    expect(hidden(item)).toBe(false);
    await act(async () => { item.props.onPress(); });
    expect(rows()).toHaveLength(3);
    expect(texts()).toContain('Optimized schedule ready');
  });

  test('with none saved it says so', async () => {
    await render();
    expect(joined()).toMatch(/No saved schedules yet\./);
  });
});
