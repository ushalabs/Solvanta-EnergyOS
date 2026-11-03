// The Appliances screen with the API mocked: the delete confirmation and the add/edit modal.
jest.mock('react-native', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return {
    Text: host('Text'), View: host('View'), TextInput: host('TextInput'), TouchableOpacity: host('TouchableOpacity'),
    Pressable: host('Pressable'), ScrollView: host('ScrollView'), ActivityIndicator: host('ActivityIndicator'), KeyboardAvoidingView: host('KeyboardAvoidingView'),
    // Like the real Modal, children only exist while visible.
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
import AppliancesScreen from '../app/(tabs)/appliances';
import { api, SolvantaApiError } from '../src/api/client';
import { Appliance, ApplianceList } from '../src/api/appliances';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const BUILDING = 'b1';
const appliance = (id: string, name: string, extra: Partial<Appliance> = {}): Appliance => ({ id, building_id: BUILDING, selected: true, name, rated_power_w: 500, priority: 'medium', critical: false, flexible: false, required_runtime_min: 60, earliest_min: 0, latest_min: 1440, interruptible: false, max_interruptions: 0, ...extra });
const listOf = (...items: Appliance[]): ApplianceList => ({ items, summary: { requested_kw: 1, critical_kw: 0, selected_count: items.length }, disclaimer: '' });

let tree: ReactTestRenderer;
let getSpy: jest.SpyInstance; let postSpy: jest.SpyInstance; let requestSpy: jest.SpyInstance; let deleteSpy: jest.SpyInstance;

const hosts = (type: string, within: any = tree.root) => within.findAll((n: any) => n.type === type);
const flatText = (n: any): string => [n.props.children].flat(Infinity).map((c: any) => typeof c === 'string' || typeof c === 'number' ? c : c?.props ? flatText(c) : '').join('');
const texts = (within: any = tree.root) => hosts('Text', within).map(flatText).join(' | ');
const modals = () => hosts('Modal');
const modalWith = (name: string) => modals().find((m: any) => texts(m).includes(name));
const buttonIn = (within: any, label: string) => hosts('TouchableOpacity', within).find((b: any) => b.props.accessibilityLabel === label);
const press = async (within: any, label: string) => {
  const button = buttonIn(within, label);
  if (!button) throw new Error(`No button labelled ${label}`);
  await act(async () => { button.props.onPress(); });
};
const input = (label: string) => hosts('TextInput').find((n: any) => n.props.accessibilityLabel === label);
const type = async (label: string, value: string) => { await act(async () => { input(label).props.onChangeText(value); }); };
const flatStyle = (style: any): any => Array.isArray(style) ? Object.assign({}, ...style.map(flatStyle)) : style || {};

async function render(items: Appliance[] = [appliance('a1', 'Water pump'), appliance('a2', 'Air conditioner')]) {
  getSpy.mockImplementation(async (path: string) => {
    if (path.endsWith('/appliances')) return listOf(...items);
    throw new SolvantaApiError(404, { detail: 'Not found' });
  });
  await act(async () => { tree = create(<AppliancesScreen />); });
  await act(async () => { await Promise.resolve(); });
}

beforeEach(() => {
  jest.spyOn(api, 'getBuildings').mockResolvedValue([{ id: BUILDING, name: 'Test building' }] as any);
  jest.spyOn(api, 'getCurrentUser').mockResolvedValue({ id: 'u1' } as any);
  getSpy = jest.spyOn(api, 'get');
  postSpy = jest.spyOn(api, 'post').mockResolvedValue({} as any);
  requestSpy = jest.spyOn(api, 'request').mockResolvedValue({} as any);
  deleteSpy = jest.spyOn(api, 'delete').mockResolvedValue({} as any);
});
afterEach(async () => { await act(async () => tree.unmount()); jest.restoreAllMocks(); });

describe('Delete confirmation', () => {
  test('the row Delete button only opens the popup, naming the appliance', async () => {
    await render();
    expect(modals()).toHaveLength(0);
    await press(tree.root, 'Delete Water pump');
    expect(deleteSpy).not.toHaveBeenCalled();
    const dialog = modalWith('Delete appliance?');
    expect(texts(dialog)).toContain('Water pump');
    expect(texts(dialog)).not.toContain('Air conditioner');
    expect(hosts('View', dialog).some((v: any) => v.props.role === 'alertdialog')).toBe(true);
    expect(buttonIn(dialog, 'Cancel')).toBeDefined();
    expect(buttonIn(dialog, 'Delete')).toBeDefined();
  });

  test('Cancel closes it and deletes nothing', async () => {
    await render();
    await press(tree.root, 'Delete Water pump');
    await press(modalWith('Delete appliance?'), 'Cancel');
    expect(modals()).toHaveLength(0);
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(texts()).toContain('Water pump');
  });

  test('tapping outside closes it and deletes nothing', async () => {
    await render();
    await press(tree.root, 'Delete Water pump');
    const backdrop = hosts('View', modalWith('Delete appliance?')).find((p: any) => p.props.testID === 'modal-backdrop');
    expect(backdrop.props.onStartShouldSetResponder()).toBe(true);
    await act(async () => { backdrop.props.onResponderRelease(); });
    expect(modals()).toHaveLength(0);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  test('the backdrop is not a keyboard or screen reader stop', async () => {
    await render();
    await press(tree.root, 'Delete Water pump');
    const backdrop = hosts('View', modalWith('Delete appliance?')).find((p: any) => p.props.testID === 'modal-backdrop');
    expect(backdrop.props.accessible).toBeFalsy();
    expect(backdrop.props.onPress).toBeUndefined();
    expect(backdrop.props.tabIndex).toBeUndefined();
  });

  test('Android back or web Escape closes it and deletes nothing', async () => {
    await render();
    await press(tree.root, 'Delete Water pump');
    await act(async () => { modalWith('Delete appliance?').props.onRequestClose(); });
    expect(modals()).toHaveLength(0);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  test('Delete removes exactly that appliance once and closes', async () => {
    await render();
    await press(tree.root, 'Delete Air conditioner');
    await press(modalWith('Delete appliance?'), 'Delete');
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith(`/buildings/${BUILDING}/appliances/a2`);
    expect(modals()).toHaveLength(0);
    expect(texts()).toContain('Appliance removed.');
  });

  test('a failed delete closes the popup and shows the server error', async () => {
    deleteSpy.mockRejectedValueOnce(new SolvantaApiError(500, { detail: 'Database down' }));
    await render();
    await press(tree.root, 'Delete Water pump');
    await press(modalWith('Delete appliance?'), 'Delete');
    expect(modals()).toHaveLength(0);
    expect(texts()).toContain('Database down');
    expect(texts()).toContain('Water pump');
  });

  test('Delete cannot be pressed while another change is saving', async () => {
    let finish!: (v: ApplianceList) => void;
    requestSpy.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    await render();
    const toggle = hosts('TouchableOpacity').find((b: any) => b.props.accessibilityLabel === 'Water pump scenario selection');
    await act(async () => { toggle.props.onPress(); });
    await press(tree.root, 'Delete Water pump');
    expect(buttonIn(modalWith('Delete appliance?'), 'Delete').props.disabled).toBe(true);
    await act(async () => { finish(listOf(appliance('a1', 'Water pump'))); });
  });

  test('both buttons meet the touch target and the action uses the danger style', async () => {
    const { darkTokens } = require('../src/theme/tokens');
    await render();
    await press(tree.root, 'Delete Water pump');
    const dialog = modalWith('Delete appliance?');
    for (const label of ['Cancel', 'Delete']) expect(flatStyle(buttonIn(dialog, label).props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(flatStyle(buttonIn(dialog, 'Delete').props.style).borderColor).toBe(darkTokens.redText);
  });
});

describe('Add and edit modal', () => {
  const formIsOpen = () => !!input('Appliance name');

  test('the form exists only inside the modal, after Add Appliance is pressed', async () => {
    await render();
    expect(formIsOpen()).toBe(false);
    await press(tree.root, 'Add Appliance');
    const modal = modalWith('New appliance');
    expect(modal).toBeDefined();
    expect(hosts('TextInput', modal).length).toBeGreaterThan(0);
    expect(hosts('TextInput', modal)).toHaveLength(hosts('TextInput').length);
  });

  test('it can scroll and handles the keyboard', async () => {
    await render();
    await press(tree.root, 'Add Appliance');
    const modal = modalWith('New appliance');
    expect(hosts('KeyboardAvoidingView', modal)).toHaveLength(1);
    const scroll = hosts('ScrollView', modal)[0];
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(hosts('TextInput', scroll)).toHaveLength(6);
    // Save stays outside the scrolling body, so it is reachable with the keyboard open.
    expect(buttonIn(scroll, 'Save Appliance')).toBeUndefined();
    expect(buttonIn(modal, 'Save Appliance')).toBeDefined();
  });

  test.each([
    ['a missing name', async () => {}, 'Enter an appliance name.'],
    ['non-numeric power', async () => { await type('Appliance name', 'Pump'); await type('Rated power (W)', 'abc'); }, 'Enter valid numbers in all numeric fields.'],
    ['a runtime longer than its window', async () => { await type('Appliance name', 'Pump'); await type('Required runtime (minutes)', '5000'); }, 'Required runtime must fit the time window.'],
  ])('validation stops %s, stays open and shows the reason in the modal', async (_name, fill, expected) => {
    await render();
    await press(tree.root, 'Add Appliance');
    await fill();
    await press(modalWith('New appliance'), 'Save Appliance');
    expect(postSpy).not.toHaveBeenCalled();
    expect(formIsOpen()).toBe(true);
    expect(texts(modalWith('New appliance'))).toContain(expected);
  });

  test('saving posts the form, closes and reports success', async () => {
    await render();
    await press(tree.root, 'Add Appliance');
    await type('Appliance name', 'Fridge');
    await type('Rated power (W)', '250');
    await press(modalWith('New appliance'), 'Save Appliance');
    expect(postSpy).toHaveBeenCalledTimes(1);
    const [path, body] = postSpy.mock.calls[0];
    expect(path).toBe(`/buildings/${BUILDING}/appliances`);
    expect(body).toMatchObject({ name: 'Fridge', rated_power_w: 250 });
    expect(formIsOpen()).toBe(false);
    expect(texts()).toContain('Appliance created.');
  });

  test('a server rejection keeps the modal open with typed values and shows the error', async () => {
    postSpy.mockRejectedValueOnce(new SolvantaApiError(422, { detail: 'Name already used' }));
    await render();
    await press(tree.root, 'Add Appliance');
    await type('Appliance name', 'Fridge');
    await press(modalWith('New appliance'), 'Save Appliance');
    expect(formIsOpen()).toBe(true);
    expect(input('Appliance name').props.value).toBe('Fridge');
    expect(texts(modalWith('New appliance'))).toContain('Name already used');
  });

  test('Edit opens prefilled and saves with PUT to that appliance', async () => {
    await render();
    await press(tree.root, 'Edit Air conditioner');
    const modal = modalWith('Edit appliance');
    expect(modal).toBeDefined();
    expect(input('Appliance name').props.value).toBe('Air conditioner');
    await type('Rated power (W)', '1500');
    await press(modalWith('Edit appliance'), 'Save Appliance');
    expect(postSpy).not.toHaveBeenCalled();
    const [path, options] = requestSpy.mock.calls[0];
    expect(path).toBe(`/buildings/${BUILDING}/appliances/a2`);
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toMatchObject({ name: 'Air conditioner', rated_power_w: 1500 });
    expect(formIsOpen()).toBe(false);
    expect(texts()).toContain('Appliance updated.');
  });

  test('Cancel closes without saving, and reopening starts clean', async () => {
    await render();
    await press(tree.root, 'Add Appliance');
    await press(modalWith('New appliance'), 'Save Appliance');
    await type('Appliance name', 'Abandoned');
    await press(modalWith('New appliance'), 'Cancel');
    expect(formIsOpen()).toBe(false);
    expect(postSpy).not.toHaveBeenCalled();
    await press(tree.root, 'Add Appliance');
    expect(input('Appliance name').props.value).toBe('');
    expect(texts(modalWith('New appliance'))).not.toContain('Enter an appliance name.');
  });

  test('a stray tap outside does not lose the form, but back or Escape closes it', async () => {
    await render();
    await press(tree.root, 'Add Appliance');
    const modal = modalWith('New appliance');
    expect(hosts('View', modal).find((p: any) => p.props.testID === 'modal-backdrop').props.onStartShouldSetResponder()).toBe(false);
    await act(async () => { modalWith('New appliance').props.onRequestClose(); });
    expect(formIsOpen()).toBe(false);
  });

  test('Save is disabled while the save is in flight', async () => {
    let finish!: (v: unknown) => void;
    postSpy.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    await render();
    await press(tree.root, 'Add Appliance');
    await type('Appliance name', 'Fridge');
    await press(modalWith('New appliance'), 'Save Appliance');
    expect(buttonIn(modalWith('New appliance'), 'Save Appliance').props.disabled).toBe(true);
    await act(async () => { finish({}); });
    expect(formIsOpen()).toBe(false);
  });

  test('form buttons and toggles meet the touch target', async () => {
    await render();
    await press(tree.root, 'Add Appliance');
    for (const b of hosts('TouchableOpacity', modalWith('New appliance'))) expect(flatStyle(b.props.style).minHeight).toBeGreaterThanOrEqual(44);
  });
});
