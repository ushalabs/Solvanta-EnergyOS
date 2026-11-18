// The Solvanta AI screen with the API mocked: greeting, shortcut chips, request state, readable results, errors and the pinned row.
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
import Operations from '../app/(tabs)/ai';
import { api, SolvantaApiError } from '../src/api/client';
import { darkTokens } from '../src/theme/tokens';
import { COULD_NOT_RUN } from '../src/api/toolResult';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const BUILDING = 'b1';
const ALL_TOOLS = ['get_building_profile', 'get_energy_scenario', 'run_outage_simulation', 'forecast_energy', 'optimize_appliance_schedule', 'optimize_resilience', 'compare_energy_configurations', 'get_energy_anomalies', 'propose_energy_plan'];
// Dates are built from today so the labels are the same whenever the test runs.
const todayAt = (h: number, m: number, daysAgo = 0) => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysAgo, h, m).toISOString(); };
const runs = [{ id: 'run11111-aaaa', created_at: todayAt(13, 39) }, { id: 'run22222-bbbb', created_at: todayAt(19, 56, 1) }, { id: 'run33333-cccc', created_at: new Date(new Date().getFullYear() - 1, 10, 3, 14, 55).toISOString() }];
const LATEST = 'Latest run · Today 1:39 PM', YESTERDAY = 'Yesterday 7:56 PM', OLD = `3 Nov ${new Date().getFullYear() - 1} 2:55 PM`;
const summary = { load_kwh: 43.215, pv_kwh: 28.64, unmet_kwh: 0, unserved_critical_kwh: 0, grid_import_kwh: 18, generator_fuel_l: 0, curtailed_kwh: 0.2, final_soc_pct: 40 };
const toolResult = (tool: string, data: any, source = 'SIMULATED') => ({ tool, source, building_id: BUILDING, scenario_id: 'run11111-aaaa', record_id: null, provenance: 'Immutable saved scenario; deterministic engines', units: { power: 'kW' }, data });
const outageResult = { ...toolResult('run_outage_simulation', { result: { summary, assumptions: ['Representative day; quarter-hour mean AC powers'] } }), record_id: 'rec99999-dddd' };
const incidents = [{ id: 'i1', source: 'SIMULATED', code: 'PV_DROPOUT', state: 'OPEN', possible_cause: 'Inverter offline' }];

let tree: ReactTestRenderer;
let post: jest.SpyInstance;
const scrollTo = jest.fn();
const all = (type: string, root: any = tree.root) => root.findAll((n: any) => (n.type as any) === type);
const textOf = (n: any) => [n.props.children].flat(Infinity).filter((c: any) => typeof c === 'string' || typeof c === 'number').join('');
const texts = (root: any = tree.root) => all('Text', root).map(textOf);
const joined = () => texts().join(' ');
const button = (label: string) => all('TouchableOpacity').find((n: any) => n.props.accessibilityLabel === label);
const press = async (label: string) => { const b = button(label); if (!b) throw new Error(`No button ${label}`); await act(async () => { b.props.onPress(); }); await settle(); };
const byId = (id: string) => all('View').filter((n: any) => n.props.testID === id);
const flat = (style: any) => [style].flat(Infinity).reduce((a: any, x: any) => ({ ...a, ...x }), {});
const hidden = (node: any) => { let n = node; while (n) { if ((n.type as any) === 'View' && n.props.style?.display === 'none') return true; n = n.parent; } return false; };
const settle = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const footer = () => tree.root.findAll((n: any) => n.props.testID === 'screen-footer' && (n.type as any) === 'View')[0];
const textNode = (value: string, root: any = tree.root) => all('Text', root).find((n: any) => textOf(n) === value)!;
const visibleText = (root: any) => all('Text', root).filter((n: any) => !hidden(n)).map(textOf).join(' ');

const CHIPS = { sim: 'Re-run my saved outage scenario', schedule: 'Optimize my appliance schedule', compare: 'Compare three configurations', anomalies: 'Check for anomalies' };
const quick = (key: keyof typeof CHIPS) => `Quick shortcut: ${CHIPS[key]}`;

async function render() {
  await act(async () => { tree = create(<Operations />, { createNodeMock: (el: any) => (el.type === 'ScrollView' ? { scrollTo } : null) }); });
  await settle(); await settle();
}
const apiError = (status: number, detail: string) => new SolvantaApiError(status, { detail });

let toolList = ALL_TOOLS;
let runList: any[] = runs;
beforeEach(() => {
  jest.clearAllMocks();
  toolList = ALL_TOOLS; runList = runs;
  jest.spyOn(api, 'getBuildings').mockResolvedValue([{ id: BUILDING, name: 'Test building' }] as any);
  jest.spyOn(api, 'getCurrentUser').mockResolvedValue({ id: 'u1', full_name: 'Usman Khan', email: 'u@x.pk' } as any);
  jest.spyOn(api, 'getReady').mockResolvedValue({ ready: true, database: 'ok', engines: 'ok', timestamp: 'x' } as any);
  jest.spyOn(api, 'get').mockImplementation(async (path: string) => {
    if (path === '/operations/tools') return { tools: toolList.map(name => ({ name })) } as any;
    if (path.endsWith('/simulations')) return runList as any;
    if (path.endsWith('/incidents')) return incidents as any;
    throw apiError(404, 'Not found');
  });
  post = jest.spyOn(api, 'post').mockResolvedValue(outageResult as any);
});
afterEach(async () => { await act(async () => tree.unmount()); jest.restoreAllMocks(); });

describe('greeting and honesty', () => {
  test('opens with the new line, says these are guided shortcuts, and says free-form questions are not answered', async () => {
    await render();
    const t = texts(byId('greeting-bubble')[0]);
    expect(t[0]).toBe('Hi, I can run these checks on your saved building.');
    expect(t.join(' ')).toMatch(/guided shortcuts to your system's tools/);
    expect(t.join(' ')).toMatch(/cannot answer free-form questions: no language model is connected/);
    expect(joined()).not.toMatch(/Hello/);
  });

  test('the header and banner say Solvanta AI and guided shortcuts, not an assistant that can answer anything', async () => {
    await render();
    expect(texts()).toContain('Solvanta AI');
    expect(texts()).toContain('GUIDED SHORTCUTS • no language model is connected');
    expect(joined()).not.toMatch(/Ask anything|Your Energy Assistant|How can I help you today/i);
  });

  test('there is no free-text input and no send button', async () => {
    await render();
    expect(all('TextInput')).toHaveLength(0);
    expect(all('TouchableOpacity').some((n: any) => /send/i.test(n.props.accessibilityLabel ?? ''))).toBe(false);
  });

  test('keeps the statement that tools never approve plans or control equipment', async () => {
    await render();
    expect(joined()).toMatch(/tools never approve plans or control physical equipment/);
  });
});

describe('suggestion chips', () => {
  test('the four primary shortcuts are shown under Ask about your system, in order, as 50px secondary buttons', async () => {
    await render();
    expect(texts()).toContain('Ask about your system');
    for (const chip of Object.values(CHIPS)) {
      const b = button(chip)!;
      expect(b).toBeTruthy();
      expect(flat(b.props.style)).toMatchObject({ minHeight: 50, backgroundColor: darkTokens.surfaceElevated });
    }
    const order = all('TouchableOpacity').map((n: any) => n.props.accessibilityLabel).filter((l: string) => Object.values(CHIPS).includes(l));
    expect(order).toEqual([CHIPS.sim, CHIPS.schedule, CHIPS.compare, CHIPS.anomalies]);
  });

  test('chip text never claims to answer a question', async () => {
    await render();
    for (const c of all('TouchableOpacity').map((n: any) => n.props.accessibilityLabel ?? '').filter((c: string) => c)) expect(c).not.toMatch(/\?|explain my|do i need/i);
  });

  test('the other tools are under More shortcuts, closed by default, and nothing was removed', async () => {
    await render();
    expect(button('Show More shortcuts')!.props.accessibilityState.expanded).toBe(false);
    const others = ['Show my building profile', 'Show my saved scenario', 'Project the next 24 hours', 'Compare resilience plans', 'Propose a plan for review'];
    for (const o of others) expect(hidden(button(o)!)).toBe(true);
    await press('Show More shortcuts');
    for (const o of others) expect(hidden(button(o)!)).toBe(false);
  });

  test('the chips run exactly the tools and arguments the screen already used', async () => {
    await render();
    await press(CHIPS.sim);
    expect(post).toHaveBeenLastCalledWith('/operations/tools/run_outage_simulation', { scenario_id: 'run11111-aaaa' }, 30000);
    await press(CHIPS.schedule);
    expect(post).toHaveBeenLastCalledWith('/operations/tools/optimize_appliance_schedule', { scenario_id: 'run11111-aaaa' }, 30000);
    await press(CHIPS.compare);
    expect(post).toHaveBeenLastCalledWith('/operations/tools/compare_energy_configurations', { scenario_id: 'run11111-aaaa', variations: [0, 1, 2] }, 30000);
    await press(CHIPS.anomalies);
    expect(post).toHaveBeenLastCalledWith('/operations/tools/get_energy_anomalies', { building_id: BUILDING }, 30000);
    await press('Show my building profile');
    expect(post).toHaveBeenLastCalledWith('/operations/tools/get_building_profile', { building_id: BUILDING }, 30000);
    await press('Project the next 24 hours');
    expect(post).toHaveBeenLastCalledWith('/operations/tools/forecast_energy', { scenario_id: 'run11111-aaaa' }, 30000);
    expect(post).toHaveBeenCalledTimes(6);
  });

  test('a tool the API does not list is not offered', async () => {
    toolList = ['get_energy_anomalies', 'run_outage_simulation'];
    await render();
    expect(button(CHIPS.anomalies)).toBeTruthy();
    expect(button(CHIPS.schedule)).toBeUndefined();
    expect(button('Show More shortcuts')).toBeUndefined();
  });

  test('without a saved simulation, scenario shortcuts are disabled and the building ones still work', async () => {
    runList = [];
    await render();
    expect(button(CHIPS.sim)!.props.disabled).toBe(true);
    expect(button(CHIPS.schedule)!.props.disabled).toBe(true);
    expect(button(CHIPS.anomalies)!.props.disabled).toBe(false);
    expect(joined()).toMatch(/Save a simulation first to enable scenario shortcuts\./);
  });

  test('the tool list failing to load is the friendly sentence, not the server text', async () => {
    (api.get as jest.Mock).mockImplementation(async (path: string) => { if (path === '/operations/tools') throw apiError(500, 'Traceback: db exploded at 10.0.0.5'); return runs; });
    await render();
    expect(joined()).toContain(COULD_NOT_RUN);
    expect(joined()).not.toMatch(/Traceback|10\.0\.0\.5/);
  });
});

describe('saved scenario labels', () => {
  test('runs read like Latest run · Today 1:39 PM, Yesterday 7:56 PM and 3 Nov 2:55 PM, with no hash or full date', async () => {
    await render();
    expect(joined()).toContain(`Using ${LATEST}`);
    await press('Show Saved scenario');
    const labels = all('TouchableOpacity').map((n: any) => n.props.accessibilityLabel).filter((l: string) => /Latest run|Yesterday|Nov/.test(l ?? ''));
    expect(labels).toEqual([`✓ ${LATEST}`, YESTERDAY, OLD]);
    expect(joined()).not.toMatch(/run11111|run22222|run33333|\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  test('another run can be chosen, and the chips then use it', async () => {
    await render();
    await press('Show Saved scenario');
    await press(YESTERDAY);
    expect(joined()).toContain(`Using ${YESTERDAY}`);
    await press(CHIPS.sim);
    expect(post.mock.calls[0][1]).toEqual({ scenario_id: 'run22222-bbbb' });
  });

  test('a run without a date is labelled Latest run or Saved run, never Invalid Date or its id', async () => {
    runList = [{ id: 'run44444-dddd' }];
    await render();
    expect(joined()).toContain('Using Latest run');
    expect(joined()).not.toMatch(/Invalid Date|run44444/);
  });

  test('the hash is in Technical details only', async () => {
    await render();
    await press(CHIPS.sim);
    const row = byId('technical-row').find((r: any) => /Saved scenario/.test(texts(r).join(' ')))!;
    expect(texts(row)).toEqual(['Saved scenario', 'run11111-aaaa']);
    expect(hidden(row)).toBe(true);
  });
});

describe('request state', () => {
  test('shows the tapped shortcut and a loading card while the call is in flight, then the result', async () => {
    let resolve!: (v: any) => void;
    post.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    await render();
    await press(CHIPS.sim);
    expect(texts(byId('echo-bubble')[0])).toEqual([CHIPS.sim]);
    expect(texts(byId('request-running')[0])).toContain('Running outage simulation…');
    expect(byId('request-running')[0].props.accessibilityState).toMatchObject({ busy: true });
    expect(button(CHIPS.anomalies)!.props.disabled).toBe(true);
    await act(async () => { resolve(outageResult); });
    await settle();
    expect(byId('request-running')).toHaveLength(0);
    expect(byId('request-done')).toHaveLength(1);
    expect(button(CHIPS.anomalies)!.props.disabled).toBe(false);
  });

  test('the echo bubble is the lime message on the right', async () => {
    await render();
    await press(CHIPS.anomalies);
    expect(flat(byId('echo-bubble')[0].props.style)).toMatchObject({ alignSelf: 'flex-end', backgroundColor: darkTokens.lime });
  });

  test('nothing is shown as a request before a shortcut is tapped', async () => {
    await render();
    for (const id of ['echo-bubble', 'request-running', 'request-done', 'request-error', 'request-block']) expect(byId(id)).toHaveLength(0);
  });
});

describe('result cards', () => {
  test('an outage result is the headline, four numbers, then folded sections', async () => {
    await render();
    await press(CHIPS.sim);
    const card = byId('request-done')[0];
    const t = texts(card);
    expect(t).toEqual(expect.arrayContaining(['Outage simulation', 'SIMULATED', 'No unmet energy on this representative day.', 'Unmet', 'Critical unmet', 'Grid import', 'Final battery', '40.0%']));
    for (const shown of ['Unmet', 'Critical unmet', 'Grid import', 'Final battery']) expect(hidden(textNode(shown, card))).toBe(false);
    for (const rest of ['Requested', 'PV', 'Generator fuel', 'Curtailed']) expect(hidden(textNode(rest, card))).toBe(true);
    expect(t.join(' ')).not.toMatch(/[{}\[\]"]|undefined|NaN/);
  });

  test('Show all details reveals the rest of the figures', async () => {
    await render();
    await press(CHIPS.sim);
    const toggle = all('TouchableOpacity', byId('request-done')[0]).find((n: any) => n.props.accessibilityLabel === 'Show Show all details')!;
    expect(toggle.props.accessibilityState.expanded).toBe(false);
    await act(async () => { toggle.props.onPress(); });
    expect(hidden(textNode('PV', byId('request-done')[0]))).toBe(false);
    expect(texts(byId('request-done')[0])).toContain('43.22 kWh');
  });

  test('How this was calculated is closed and holds the fine print and the Technical details', async () => {
    await render();
    await press(CHIPS.sim);
    const card = byId('request-done')[0];
    const how = all('TouchableOpacity', card).find((n: any) => n.props.accessibilityLabel === 'Show How this was calculated')!;
    expect(how.props.accessibilityState.expanded).toBe(false);
    for (const line of ['Representative day; quarter-hour mean AC powers', 'Immutable saved scenario; deterministic engines', 'Technical details']) expect(hidden(textNode(line, card))).toBe(true);
    const rows = byId('technical-row').map((r: any) => texts(r));
    expect(rows).toContainEqual(['Saved scenario', 'run11111-aaaa']);
    expect(rows).toContainEqual(['Saved record', 'rec99999-dddd']);
    await act(async () => { how.props.onPress(); });
    for (const line of ['Representative day; quarter-hour mean AC powers', 'Immutable saved scenario; deterministic engines', 'Technical details']) expect(hidden(textNode(line, card))).toBe(false);
  });

  test('no id or fine print is visible before the sections are opened', async () => {
    await render();
    await press(CHIPS.sim);
    expect(visibleText(byId('request-done')[0])).not.toMatch(/run11111|rec99999|Immutable saved scenario|quarter-hour|Saved scenario/);
  });

  test('a building profile is marked CONFIGURATION, shows what was checked, and dashes for what is missing', async () => {
    post.mockResolvedValueOnce({ ...toolResult('get_building_profile', { building_name: 'Demo House', solar: { pv_capacity_kwp: 4.4 } }, 'CONFIGURATION'), scenario_id: null });
    await render();
    await press('Show More shortcuts');
    await press('Show my building profile');
    expect(texts(byId('request-done')[0])).toEqual(expect.arrayContaining(['Building profile', 'CONFIGURATION', 'Demo House', '4.40 kWp', '—', 'Checked: Authorized building records, Building configuration']));
  });

  test('the schedule keeps its save note inside the card, and offers a link to Scheduling', async () => {
    post.mockResolvedValueOnce(toolResult('optimize_appliance_schedule', { status: 'OPTIMAL', validated: true, demand_kwh: 1.5, reasons: [], entries: [{ name: 'Pump', priority: 'medium', rated_power_w: 750, segments: [{ start_min: 600, end_min: 660 }] }], supply_policy: 'PV plus available grid only' }));
    await render();
    await press(CHIPS.schedule);
    const card = byId('request-done')[0];
    expect(texts(card)).toContain('Saves the schedule when it validates. Nothing is switched.');
    expect(texts(byId('result-item')[0])).toEqual(['Pump', '10:00 – 11:00', 'Medium priority · 0.75 kW']);
    expect(hidden(textNode('PV plus available grid only', card))).toBe(true);
    const link = all('TouchableOpacity', card).find((n: any) => n.props.accessibilityLabel === 'Open in Scheduling')!;
    expect(link.props.accessibilityRole).toBe('link');
    await act(async () => { link.props.onPress(); });
    expect(router.push).toHaveBeenLastCalledWith('/scheduling');
    expect(texts().filter((x: string) => x === 'Saves the schedule when it validates. Nothing is switched.')).toHaveLength(1);
  });

  test('only the schedule result links to Scheduling', async () => {
    await render();
    await press(CHIPS.sim);
    expect(button('Open in Scheduling')).toBeUndefined();
    await press(CHIPS.anomalies);
    expect(button('Open in Scheduling')).toBeUndefined();
  });

  test('a configuration comparison is a three-row table with the three columns, and keeps the hypothetical line', async () => {
    const v = (name: string, s: any) => ({ name, summary: { ...summary, ...s }, tradeoff: ['Existing equipment assumptions retained'] });
    post.mockResolvedValueOnce(toolResult('compare_energy_configurations', { variants: [v('Current configuration', { unmet_kwh: 1.5 }), v('Battery capacity +50%', { unmet_kwh: 0.9, final_soc_pct: 50 }), v('PV capacity +25%', { unmet_kwh: 0.6, final_soc_pct: 60 })] }));
    await render();
    await press(CHIPS.compare);
    expect(texts(byId('result-table')[0]).slice(0, 3)).toEqual(['Unmet', 'Critical unmet', 'Final battery']);
    const rows = byId('result-table-row');
    expect(rows).toHaveLength(3);
    expect(texts(rows[1])).toEqual(['Battery capacity +50%', '0.90 kWh', '0.00 kWh', '50.0%']);
    expect(rows[1].props.accessibilityLabel).toBe('Battery capacity +50%: Unmet 0.90 kWh, Critical unmet 0.00 kWh, Final battery 50.0%');
    expect(joined()).toMatch(/3 configurations compared\. These are hypothetical changes, not installed equipment\./);
    expect(joined()).not.toMatch(/All three configurations cover your load/);
  });

  test('identical configurations add one line saying there is no difference', async () => {
    const v = (name: string) => ({ name, summary, tradeoff: [] });
    post.mockResolvedValueOnce(toolResult('compare_energy_configurations', { variants: ['Current configuration', 'Battery capacity +50%', 'PV capacity +25%'].map(v) }));
    await render();
    await press(CHIPS.compare);
    expect(texts().filter((x: string) => x === 'All three configurations cover your load on this day, so there is no difference to show.')).toHaveLength(1);
    expect(joined()).toMatch(/hypothetical changes, not installed equipment/);
    expect(byId('result-table-row')).toHaveLength(3);
  });

  test('anomalies with none say so in one plain line, with the simulated-detector note and what was checked', async () => {
    post.mockResolvedValueOnce({ ...toolResult('get_energy_anomalies', { incidents: [], meaning: 'SIMULATED detector evidence; hypotheses are not physical diagnoses' }), scenario_id: null, provenance: 'Authorized building records' });
    await render();
    await press(CHIPS.anomalies);
    const card = byId('request-done')[0];
    expect(texts(card)).toEqual(expect.arrayContaining(['No incidents found', 'SIMULATED detector, not a physical diagnosis', 'Checked: Authorized building records, Building configuration']));
    expect(byId('result-item')).toHaveLength(0);
    expect(texts(card)).not.toContain('No incidents found.');
  });

  test('anomalies that exist are listed under the same note', async () => {
    post.mockResolvedValueOnce({ ...toolResult('get_energy_anomalies', { incidents }), scenario_id: null });
    await render();
    await press(CHIPS.anomalies);
    expect(texts(byId('result-item')[0])).toEqual(['PV_DROPOUT · OPEN', 'SIMULATED', 'Inverter offline']);
    expect(joined()).toMatch(/SIMULATED detector, not a physical diagnosis/);
  });

  test('tools that save something say so inside the card', async () => {
    await render();
    await press(CHIPS.sim);
    expect(texts(byId('request-done')[0])).toContain('Saves a new simulated run.');
  });

  test('a result with an unknown shape shows an empty state and none of its data', async () => {
    post.mockResolvedValueOnce(toolResult('mystery_tool', { secret: { a: 1 } }));
    await render();
    await press(CHIPS.sim);
    expect(texts(byId('request-done')[0])).toContain('No readable summary is available for this result.');
    expect(joined()).not.toMatch(/secret/);
  });

  test('a new shortcut replaces the previous result', async () => {
    await render();
    await press(CHIPS.sim);
    post.mockResolvedValueOnce(toolResult('get_energy_anomalies', { incidents: [] }));
    await press(CHIPS.anomalies);
    expect(byId('request-done')).toHaveLength(1);
    expect(texts(byId('request-done')[0])).toContain('Anomaly check');
    expect(texts(byId('echo-bubble')[0])).toEqual([CHIPS.anomalies]);
  });
});

describe('error state', () => {
  const errorBox = () => byId('request-error')[0];
  test('an unreachable backend gives the friendly card with Retry, and the raw error under Technical details only', async () => {
    post.mockRejectedValueOnce(apiError(0, 'Network failure connecting to http://192.168.0.5:8000/api/v1'));
    await render();
    await press(CHIPS.sim);
    expect(texts(errorBox())).toContain(COULD_NOT_RUN);
    expect(button('Retry')).toBeTruthy();
    const raw = all('Text', errorBox()).find((n: any) => n.props.testID === 'raw-error')!;
    expect(textOf(raw)).toBe('Status 0: Network failure connecting to http://192.168.0.5:8000/api/v1');
    expect(hidden(raw)).toBe(true);
    expect(visibleText(errorBox())).not.toMatch(/192\.168|Network failure|http/);
    await press('Show Technical details');
    expect(hidden(raw)).toBe(false);
  });

  test('a server error, a timeout and an unexpected error all get the same friendly sentence', async () => {
    for (const e of [apiError(500, 'Traceback: boom'), apiError(408, 'API request timed out after 30000ms'), new Error('kaboom internal detail')]) {
      post.mockRejectedValueOnce(e);
      await render();
      await press(CHIPS.sim);
      expect(texts(errorBox())).toContain(COULD_NOT_RUN);
      expect(visibleText(errorBox())).not.toMatch(/Traceback|timed out|kaboom/);
      await act(async () => tree.unmount());
    }
  });

  test('a generator conflict and a missing scenario keep their own friendly wording', async () => {
    post.mockRejectedValueOnce(apiError(422, 'body.scenario_id: Value error, Scheduler budget excludes generator; select a scenario without generator dispatch'));
    await render();
    await press(CHIPS.schedule);
    expect(texts(errorBox())).toContain('The schedule optimizer excludes the generator. Choose a saved scenario that does not use it.');
    expect(visibleText(errorBox())).not.toMatch(/Value error|body\.scenario_id|budget/);
    await act(async () => tree.unmount());
    post.mockRejectedValueOnce(apiError(404, 'Saved scenario not found'));
    await render();
    await press(CHIPS.sim);
    expect(texts(errorBox())).toContain('That saved scenario was not found. Pick another one, or save a simulation first.');
  });

  test('the error is announced as an alert, and the shortcuts stay usable', async () => {
    post.mockRejectedValueOnce(apiError(500, 'boom'));
    await render();
    await press(CHIPS.sim);
    expect(all('View', errorBox()).find((n: any) => n.props.accessibilityRole === 'alert')).toBeTruthy();
    expect(button(CHIPS.sim)!.props.disabled).toBeFalsy();
    expect(byId('request-running')).toHaveLength(0);
    expect(byId('request-done')).toHaveLength(0);
  });

  test('Retry runs the same shortcut again and can succeed', async () => {
    post.mockRejectedValueOnce(apiError(500, 'boom'));
    await render();
    await press(CHIPS.sim);
    expect(post).toHaveBeenCalledTimes(1);
    await press('Retry');
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1]).toEqual(post.mock.calls[0]);
    expect(byId('request-error')).toHaveLength(0);
    expect(byId('request-done')).toHaveLength(1);
  });

  test('every chip gives the friendly card when the backend is down', async () => {
    post.mockRejectedValue(apiError(0, 'Network failure connecting to http://x'));
    await render();
    await press('Show More shortcuts');
    for (const label of [...Object.values(CHIPS), 'Show my building profile', 'Show my saved scenario', 'Project the next 24 hours', 'Compare resilience plans', 'Propose a plan for review']) {
      await press(label);
      expect(texts(errorBox())).toContain(COULD_NOT_RUN);
      expect(byId('request-done')).toHaveLength(0);
    }
    expect(post).toHaveBeenCalledTimes(9);
  });

  test('choosing another scenario clears an old error', async () => {
    post.mockRejectedValueOnce(apiError(500, 'boom'));
    await render();
    await press(CHIPS.sim);
    expect(byId('request-error')).toHaveLength(1);
    await press('Show Saved scenario');
    await press(YESTERDAY);
    expect(byId('request-error')).toHaveLength(0);
    expect(byId('echo-bubble')).toHaveLength(0);
  });
});

describe('quick shortcuts above the dock', () => {
  test('are not shown before the first result', async () => {
    await render();
    expect(all('ScrollView').filter((n: any) => n.props.horizontal)).toHaveLength(0);
    expect(footer()).toBeUndefined();
  });

  test('after a result, a horizontal row of the four shortcuts is pinned in the footer, as compact chips', async () => {
    await render();
    await press(CHIPS.sim);
    const row = all('ScrollView', footer()).find((n: any) => n.props.horizontal)!;
    expect(row).toBeTruthy();
    expect(row.props.showsHorizontalScrollIndicator).toBe(false);
    const chips = all('TouchableOpacity', row);
    expect(chips.map((c: any) => c.props.accessibilityLabel)).toEqual([quick('sim'), quick('schedule'), quick('compare'), quick('anomalies')]);
    expect(texts(row)).toEqual(Object.values(CHIPS));
    for (const c of chips) expect(flat(c.props.style).minHeight).toBe(36);
    for (const chip of Object.values(CHIPS)) expect(button(chip)).toBeTruthy();
  });

  test('a quick chip runs the same tool as the full one', async () => {
    await render();
    await press(CHIPS.sim);
    await press(quick('anomalies'));
    expect(post).toHaveBeenLastCalledWith('/operations/tools/get_energy_anomalies', { building_id: BUILDING }, 30000);
    expect(texts(byId('echo-bubble')[0])).toEqual([CHIPS.anomalies]);
    await press(quick('compare'));
    expect(post).toHaveBeenLastCalledWith('/operations/tools/compare_energy_configurations', { scenario_id: 'run11111-aaaa', variations: [0, 1, 2] }, 30000);
  });

  test('the quick chips are disabled while a request is running', async () => {
    let resolve!: (v: any) => void;
    await render();
    await press(CHIPS.sim);
    post.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    await press(quick('schedule'));
    expect(button(quick('sim'))!.props.disabled).toBe(true);
    await act(async () => { resolve(toolResult('optimize_appliance_schedule', { status: 'OPTIMAL', validated: true, entries: [], reasons: [] })); });
    await settle();
    expect(button(quick('sim'))!.props.disabled).toBeFalsy();
  });

  test('they stay available after a failed run once there has been a result', async () => {
    await render();
    await press(CHIPS.sim);
    post.mockRejectedValueOnce(apiError(0, 'Network failure'));
    await press(quick('compare'));
    expect(byId('request-error')).toHaveLength(1);
    expect(button(quick('sim'))).toBeTruthy();
  });

  test('a failure before any result does not show them', async () => {
    post.mockRejectedValueOnce(apiError(0, 'Network failure'));
    await render();
    await press(CHIPS.sim);
    expect(button(quick('sim'))).toBeUndefined();
  });

  test('building shortcuts work from the row even with no saved simulation, and scenario ones are disabled', async () => {
    runList = [];
    await render();
    await press(CHIPS.anomalies);
    expect(button(quick('anomalies'))!.props.disabled).toBeFalsy();
    expect(button(quick('sim'))!.props.disabled).toBe(true);
  });

  test('the row sits in the footer, which the screen keeps clear of the dock', async () => {
    await render();
    await press(CHIPS.sim);
    expect(byId('footer-backing')).toHaveLength(1);
  });
});

describe('scrolling to the new result', () => {
  const layout = (y: number) => ({ nativeEvent: { layout: { y, x: 0, width: 300, height: 200 } } });
  const root = () => tree.root.findAll((n: any) => (n.type as any) === 'View' && typeof n.props.onLayout === 'function' && n.props.style?.gap === 12 && !n.props.testID)[0];

  test('the loading card, and then the result, are brought to the top of the visible area', async () => {
    let resolve!: (v: any) => void;
    post.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    await render();
    await act(async () => { root().props.onLayout(layout(100)); });
    await press(CHIPS.sim);
    expect(byId('request-running')).toHaveLength(1);
    await act(async () => { byId('request-block')[0].props.onLayout(layout(900)); });
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 992, animated: true });
    await act(async () => { resolve(outageResult); });
    await settle();
    await act(async () => { byId('request-block')[0].props.onLayout(layout(910)); });
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 1002, animated: true });
  });

  test('it never scrolls above the top', async () => {
    await render();
    await press(CHIPS.sim);
    await act(async () => { byId('request-block')[0].props.onLayout(layout(0)); });
    expect(scrollTo.mock.calls.every(([arg]) => arg.y >= 0)).toBe(true);
  });

  test('nothing scrolls before a shortcut is run', async () => {
    await render();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe('incidents and links', () => {
  test('incidents are in a closed section and still list what the API returns', async () => {
    await render();
    expect(button('Show Incidents')!.props.accessibilityState.expanded).toBe(false);
    const code = all('Text').find((n: any) => /PV_DROPOUT/.test(textOf(n)))!;
    expect(hidden(code)).toBe(true);
    await press('Show Incidents');
    expect(hidden(code)).toBe(false);
    expect(joined()).toMatch(/Inverter offline/);
  });

  test('with no incidents it says so, and when the server is not ready it says that', async () => {
    (api.get as jest.Mock).mockImplementation(async (path: string) => { if (path === '/operations/tools') return { tools: [] }; if (path.endsWith('/incidents')) return []; return runs; });
    await render();
    expect(joined()).toMatch(/No incidents found\./);
    await act(async () => tree.unmount());
    (api.getReady as jest.Mock).mockResolvedValue({ ready: false, database: 'down', engines: 'x', timestamp: 'x' });
    await render();
    expect(joined()).toMatch(/The server is not ready yet\./);
    expect(joined()).not.toMatch(/database down/);
  });

  test('an incidents failure is the friendly sentence', async () => {
    (api.getReady as jest.Mock).mockRejectedValue(apiError(0, 'Network failure connecting to http://x'));
    await render();
    expect(joined()).toContain(COULD_NOT_RUN);
  });

  test('Open Human Plan Review and Open Simulation & Plan Review still go to Simulation', async () => {
    await render();
    await press('Open Human Plan Review');
    expect(router.push).toHaveBeenLastCalledWith('/simulation');
    await press('Open Simulation & Plan Review');
    expect(router.push).toHaveBeenLastCalledWith('/simulation');
  });
});
