// The Solvanta AI screen with the API mocked: greeting, shortcut chips, request state, readable results and friendly errors.
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

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const BUILDING = 'b1';
const ALL_TOOLS = ['get_building_profile', 'get_energy_scenario', 'run_outage_simulation', 'forecast_energy', 'optimize_appliance_schedule', 'optimize_resilience', 'compare_energy_configurations', 'get_energy_anomalies', 'propose_energy_plan'];
const runs = [{ id: 'run11111-aaaa', created_at: '2026-11-17T08:00:00Z' }, { id: 'run22222-bbbb', created_at: '2026-11-16T08:00:00Z' }];
const summary = { load_kwh: 43.215, pv_kwh: 28.64, unmet_kwh: 0, unserved_critical_kwh: 0, grid_import_kwh: 18, generator_fuel_l: 0, curtailed_kwh: 0.2, final_soc_pct: 40 };
const toolResult = (tool: string, data: any, source = 'SIMULATED') => ({ tool, source, building_id: BUILDING, scenario_id: 'run11111-aaaa', record_id: null, provenance: 'Immutable saved scenario; deterministic engines', units: { power: 'kW' }, data });
const outageResult = toolResult('run_outage_simulation', { result: { summary, assumptions: ['Representative day'] } });
const incidents = [{ id: 'i1', source: 'SIMULATED', code: 'PV_DROPOUT', state: 'OPEN', possible_cause: 'Inverter offline' }];

let tree: ReactTestRenderer;
let post: jest.SpyInstance;
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

const CHIPS = { sim: 'Re-run my saved outage scenario', schedule: 'Optimize my appliance schedule', compare: 'Compare three configurations', anomalies: 'Check for anomalies' };

async function render() {
  await act(async () => { tree = create(<Operations />); });
  await settle(); await settle();
}
const apiError = (status: number, detail: string) => new SolvantaApiError(status, { detail });

let toolList = ALL_TOOLS;
let runList = runs;
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
  test('greets by first name, says these are guided shortcuts, and says free-form questions are not answered', async () => {
    await render();
    const bubble = byId('greeting-bubble')[0];
    const t = texts(bubble);
    expect(t[0]).toBe('Hello Usman!');
    expect(t.join(' ')).toMatch(/guided shortcuts to your system's tools/);
    expect(t.join(' ')).toMatch(/cannot answer free-form questions: no language model is connected/);
  });

  test('without a usable name it greets plainly', async () => {
    // The building list asks for the user first; only the greeting's own request fails.
    (api.getCurrentUser as jest.Mock).mockResolvedValueOnce({ id: 'u1' }).mockRejectedValue(apiError(401, 'Not authenticated'));
    await render();
    expect(texts(byId('greeting-bubble')[0])[0]).toBe('Hello!');
  });

  test('a sign-in that is an email or junk is never used as a name', async () => {
    (api.getCurrentUser as jest.Mock).mockResolvedValue({ id: 'u1', full_name: 'guest@home.pk' });
    await render();
    expect(texts(byId('greeting-bubble')[0])[0]).toBe('Hello!');
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
    const chips = all('TouchableOpacity').map((n: any) => n.props.accessibilityLabel ?? '');
    for (const c of chips.filter((c: string) => c)) expect(c).not.toMatch(/\?|explain my|do i need/i);
  });

  test('the other tools are under More shortcuts, closed by default, and nothing was removed', async () => {
    await render();
    const toggle = button('Show More shortcuts')!;
    expect(toggle.props.accessibilityState.expanded).toBe(false);
    const others = ['Show my building profile', 'Show my saved scenario', 'Project the next 24 hours', 'Compare resilience plans', 'Propose a plan for review'];
    for (const o of others) { expect(hidden(button(o)!)).toBe(true); }
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
    expect(button(CHIPS.sim)).toBeTruthy();
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

  test('a saved scenario can be chosen, and the chips then use it', async () => {
    await render();
    expect(button('Show Saved scenario')!.props.accessibilityState.expanded).toBe(false);
    await press('Show Saved scenario');
    const second = all('TouchableOpacity').find((n: any) => /run22222/.test(n.props.accessibilityLabel ?? ''))!;
    await act(async () => { second.props.onPress(); });
    await press(CHIPS.sim);
    expect(post.mock.calls[0][1]).toEqual({ scenario_id: 'run22222-bbbb' });
  });

  test('a saved run without a date is labelled by its id, not Invalid Date', async () => {
    runList = [{ id: 'run33333-cccc' } as any];
    await render();
    expect(joined()).toMatch(/Using run33333/);
    expect(joined()).not.toMatch(/Invalid Date/);
    await press('Show Saved scenario');
    expect(all('TouchableOpacity').some((n: any) => n.props.accessibilityLabel === '✓ run33333')).toBe(true);
  });

  test('the tool list failing to load is a friendly message, not the server text', async () => {
    (api.get as jest.Mock).mockImplementation(async (path: string) => { if (path === '/operations/tools') throw apiError(500, 'Traceback: db exploded at 10.0.0.5'); return runs; });
    await render();
    expect(joined()).toMatch(/The server had a problem\. Try again in a moment\./);
    expect(joined()).not.toMatch(/Traceback|10\.0\.0\.5/);
  });
});

describe('request state', () => {
  test('shows the tapped shortcut as a message and a running state while the call is in flight, then the result', async () => {
    let resolve!: (v: any) => void;
    post.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    await render();
    await press(CHIPS.sim);
    expect(texts(byId('echo-bubble')[0])).toEqual([CHIPS.sim]);
    expect(byId('request-running')).toHaveLength(1);
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
    expect(byId('echo-bubble')).toHaveLength(0);
    expect(byId('request-running')).toHaveLength(0);
    expect(byId('request-done')).toHaveLength(0);
    expect(byId('request-error')).toHaveLength(0);
  });

  test('tools that save something say so under the result', async () => {
    await render();
    await press(CHIPS.sim);
    expect(joined()).toMatch(/Saves a new simulated run\./);
  });
});

describe('result cards', () => {
  test('an outage simulation shows a SIMULATED badge, a sentence and the figures with units, and no raw data', async () => {
    await render();
    await press(CHIPS.sim);
    const card = byId('request-done')[0];
    const t = texts(card);
    expect(t).toEqual(expect.arrayContaining(['Outage simulation', 'SIMULATED', 'No unmet energy on this representative day.', 'Requested', '43.22 kWh', 'Final battery', '40.0%', 'Representative day']));
    expect(t.join(' ')).not.toMatch(/[{}\[\]"]|undefined|NaN/);
    expect(t.join(' ')).toMatch(/Saved scenario run11111/);
  });

  test('a building profile is marked CONFIGURATION and shows dashes for what is missing', async () => {
    post.mockResolvedValueOnce({ ...toolResult('get_building_profile', { building_name: 'Demo House', solar: { pv_capacity_kwp: 4.4 } }, 'CONFIGURATION'), scenario_id: null });
    await render();
    await press('Show More shortcuts');
    await press('Show my building profile');
    const t = texts(byId('request-done')[0]);
    expect(t).toEqual(expect.arrayContaining(['Building profile', 'CONFIGURATION', 'Demo House', '4.40 kWp', '—']));
    expect(t.join(' ')).toMatch(/Building configuration/);
  });

  test('a schedule lists each appliance with its times and shows a conflict as a warning', async () => {
    post.mockResolvedValueOnce(toolResult('optimize_appliance_schedule', { status: 'OPTIMAL', validated: true, demand_kwh: 1.5, reasons: [], entries: [{ name: 'Pump', priority: 'medium', rated_power_w: 750, segments: [{ start_min: 600, end_min: 660 }] }], supply_policy: 'PV plus available grid only' }));
    await render();
    await press(CHIPS.schedule);
    const card = byId('request-done')[0];
    const items = byId('result-item');
    expect(items).toHaveLength(1);
    expect(texts(items[0])).toEqual(['Pump', '10:00 – 11:00', 'Medium priority · 0.75 kW']);
    expect(texts(card)).toEqual(expect.arrayContaining(['Optimal schedule · 1 appliance · 1.50 kWh requested', 'PV plus available grid only']));
  });

  test('anomalies are listed, and an empty result says there are none', async () => {
    post.mockResolvedValueOnce(toolResult('get_energy_anomalies', { incidents, meaning: 'SIMULATED detector evidence; hypotheses are not physical diagnoses' }));
    await render();
    await press(CHIPS.anomalies);
    expect(texts(byId('result-item')[0])).toEqual(['PV_DROPOUT · OPEN', 'SIMULATED', 'Inverter offline']);
    expect(joined()).toMatch(/hypotheses are not physical diagnoses/);
    post.mockResolvedValueOnce(toolResult('get_energy_anomalies', { incidents: [] }));
    await press(CHIPS.anomalies);
    expect(byId('result-item')).toHaveLength(0);
    expect(texts(byId('request-done')[0])).toContain('No incidents found.');
  });

  test('a configuration comparison says the changes are hypothetical', async () => {
    post.mockResolvedValueOnce(toolResult('compare_energy_configurations', { variants: [{ name: 'Battery capacity +50%', summary, tradeoff: ['Larger hypothetical battery'] }] }));
    await render();
    await press(CHIPS.compare);
    expect(joined()).toMatch(/1 configuration compared\. These are hypothetical changes, not installed equipment\./);
    expect(texts(byId('result-item')[0])).toEqual(['Battery capacity +50%', 'Unmet 0.00 kWh · critical unmet 0.00 kWh · final battery 40.0%', 'Larger hypothetical battery']);
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
  test('a failed call shows a friendly message and never the server text', async () => {
    post.mockRejectedValueOnce(apiError(422, 'body.scenario_id: Value error, Scheduler budget excludes generator; select a scenario without generator dispatch'));
    await render();
    await press(CHIPS.schedule);
    const box = byId('request-error')[0];
    expect(texts(box)).toContain('The schedule optimizer excludes the generator. Choose a saved scenario that does not use it.');
    expect(joined()).not.toMatch(/Value error|body\.scenario_id|budget/);
    expect(byId('request-running')).toHaveLength(0);
    expect(byId('request-done')).toHaveLength(0);
  });

  test('a network failure says the server could not be reached', async () => {
    post.mockRejectedValueOnce(apiError(0, 'Network failure connecting to http://192.168.0.5:8000/api/v1'));
    await render();
    await press(CHIPS.sim);
    expect(joined()).toMatch(/I could not reach the server\. Check your connection and try again\./);
    expect(joined()).not.toMatch(/192\.168|http/);
  });

  test('a timeout, a missing scenario and a sign-in problem each have their own wording', async () => {
    const cases: Array<[number, string, RegExp]> = [[408, 'API request timed out after 30000ms', /That took too long/], [404, 'Saved scenario not found', /saved scenario was not found/], [401, 'Not authenticated', /signed in/]];
    for (const [status, detail, expected] of cases) {
      post.mockRejectedValueOnce(apiError(status, detail));
      await render();
      await press(CHIPS.sim);
      expect(joined()).toMatch(expected);
      await act(async () => tree.unmount());
    }
  });

  test('a plain unexpected error gets the generic message', async () => {
    post.mockRejectedValueOnce(new Error('kaboom internal detail'));
    await render();
    await press(CHIPS.sim);
    expect(joined()).toMatch(/That did not work\. Try again, or pick another shortcut\./);
    expect(joined()).not.toMatch(/kaboom/);
  });

  test('the error is announced as an alert, and the shortcuts stay usable', async () => {
    post.mockRejectedValueOnce(apiError(500, 'boom'));
    await render();
    await press(CHIPS.sim);
    const message = all('View', byId('request-error')[0]).find((n: any) => n.props.accessibilityRole === 'alert');
    expect(message).toBeTruthy();
    expect(button(CHIPS.sim)!.props.disabled).toBeFalsy();
  });

  test('Try again runs the same shortcut again and can succeed', async () => {
    post.mockRejectedValueOnce(apiError(500, 'boom'));
    await render();
    await press(CHIPS.sim);
    expect(post).toHaveBeenCalledTimes(1);
    await press('Try again');
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1]).toEqual(post.mock.calls[0]);
    expect(byId('request-error')).toHaveLength(0);
    expect(byId('request-done')).toHaveLength(1);
  });

  test('choosing another scenario clears an old error', async () => {
    post.mockRejectedValueOnce(apiError(500, 'boom'));
    await render();
    await press(CHIPS.sim);
    expect(byId('request-error')).toHaveLength(1);
    await press('Show Saved scenario');
    const second = all('TouchableOpacity').find((n: any) => /run22222/.test(n.props.accessibilityLabel ?? ''))!;
    await act(async () => { second.props.onPress(); });
    expect(byId('request-error')).toHaveLength(0);
    expect(byId('echo-bubble')).toHaveLength(0);
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

  test('an incidents failure is friendly', async () => {
    (api.getReady as jest.Mock).mockRejectedValue(apiError(0, 'Network failure connecting to http://x'));
    await render();
    expect(joined()).toMatch(/I could not reach the server/);
  });

  test('Open Human Plan Review and Open Simulation & Plan Review still go to Simulation', async () => {
    await render();
    await press('Open Human Plan Review');
    expect(router.push).toHaveBeenLastCalledWith('/simulation');
    await press('Open Simulation & Plan Review');
    expect(router.push).toHaveBeenLastCalledWith('/simulation');
  });
});
