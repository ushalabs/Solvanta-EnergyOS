jest.mock('react-native', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return {
    Text: host('Text'), View: host('View'), TextInput: host('TextInput'), TouchableOpacity: host('TouchableOpacity'),
    ActivityIndicator: host('ActivityIndicator'),
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
jest.mock('expo-router', () => ({ useFocusEffect: () => undefined, router: { push: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
jest.mock('../src/theme/ThemeContext', () => {
  const { lightTokens, HERO_LIME_GRADIENT_LIGHT } = require('../src/theme/tokens');
  return { useTheme: () => ({ tokens: lightTokens, isDark: false, heroGradient: HERO_LIME_GRADIENT_LIGHT }) };
});

import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Action, Chip, IconButton, Message, Metric, Tile, BuildingPicker } from '../src/components/TwinControls';
import { Toggle } from '../src/components/Toggle';
import { PillSegmentedControl } from '../src/components/PillSegmentedControl';
import { LimeCTA } from '../src/components/LimeCTA';
import { lightTokens } from '../src/theme/tokens';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const render = async (element: React.ReactElement) => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(element); });
  return tree;
};
const flat = (style: any): any => Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : style || {};
const touchable = (tree: ReactTestRenderer) => tree.root.findAll(n => (n.type as any) === 'TouchableOpacity')[0];

describe('touch targets stay at least 44dp', () => {
  test.each([
    ['Action', <Action title="Go" onPress={() => {}} />],
    ['Chip', <Chip label="X" onPress={() => {}} />],
    ['Toggle', <Toggle label="X" value onValueChange={() => {}} />],
    ['Toggle without visible label', <Toggle a11yLabel="X" value onValueChange={() => {}} />],
  ])('%s', async (_name, element) => {
    const style = flat(touchable(await render(element)).props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });
  test('IconButton is 44 by 44', async () => {
    const style = flat(touchable(await render(<IconButton label="Back" onPress={() => {}}><></></IconButton>)).props.style);
    expect([style.width, style.height]).toEqual([44, 44]);
  });
  test('segmented options', async () => {
    const tree = await render(<PillSegmentedControl selectedId="a" onSelect={() => {}} options={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} />);
    for (const n of tree.root.findAll(x => (x.type as any) === 'TouchableOpacity')) expect(flat(n.props.style).minHeight).toBeGreaterThanOrEqual(44);
  });
});

describe('accessible names and state', () => {
  test('Action keeps a full name when its visible text is short', async () => {
    const b = touchable(await render(<Action title="Edit" label="Edit Water pump" onPress={() => {}} />));
    expect(b.props.accessibilityRole).toBe('button');
    expect(b.props.accessibilityLabel).toBe('Edit Water pump');
  });
  test('disabled Action reports it and uses readable graphite rather than faded lime', async () => {
    const onPress = jest.fn();
    const b = touchable(await render(<Action title="Run" disabled onPress={onPress} />));
    expect(b.props.disabled).toBe(true);
    expect(b.props.accessibilityState.disabled).toBe(true);
    expect(flat(b.props.style).backgroundColor).toBe(lightTokens.surfaceElevated);
    expect(flat(b.props.style).opacity).toBeUndefined();
  });
  test('Chip exposes selection in both native and web forms', async () => {
    const b = touchable(await render(<Chip label="All" selected onPress={() => {}} />));
    expect(b.props.accessibilityState.selected).toBe(true);
    expect(b.props['aria-selected']).toBe(true);
  });
  test('segmented control uses radio semantics', async () => {
    const tree = await render(<PillSegmentedControl a11yLabel="Mode" selectedId="b" onSelect={() => {}} options={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} />);
    const options = tree.root.findAll(x => (x.type as any) === 'TouchableOpacity');
    expect(options.map(o => [o.props.accessibilityRole, o.props['aria-checked']])).toEqual([['radio', false], ['radio', true]]);
  });
  test('Metric reads label, value and unit together', async () => {
    const tree = await render(<Metric label="Battery" value={10} unit="kWh" />);
    expect(tree.root.findAll(n => n.props.accessibilityLabel === 'Battery: 10 kWh').length).toBeGreaterThan(0);
  });
  test('danger Message is announced as an alert', async () => {
    const tree = await render(<Message tone="danger">Failed</Message>);
    expect(tree.root.findAll(n => n.props.accessibilityRole === 'alert').length).toBeGreaterThan(0);
  });
  test('LimeCTA is a named button and loading blocks presses', async () => {
    const b = touchable(await render(<LimeCTA title="Save" loading onPress={() => {}} />));
    expect(b.props.accessibilityRole).toBe('button');
    expect(b.props.accessibilityLabel).toBe('Save');
    expect(b.props.disabled).toBe(true);
  });
  test('Tile name matches its text and pressing navigates', async () => {
    const onPress = jest.fn();
    const b = touchable(await render(<Tile title="Open Operations" icon={() => null} onPress={onPress} />));
    expect(b.props.accessibilityLabel).toBe('Open Operations');
    b.props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('Toggle', () => {
  test('flips the value and reports checked state', async () => {
    const onChange = jest.fn();
    const b = touchable(await render(<Toggle label="Scenario" value={false} onValueChange={onChange} />));
    expect(b.props.accessibilityRole).toBe('switch');
    expect(b.props['aria-checked']).toBe(false);
    expect(b.props.accessibilityState.checked).toBe(false);
    b.props.onPress();
    expect(onChange).toHaveBeenCalledWith(true);
  });
  test('disabled state is exposed', async () => {
    const b = touchable(await render(<Toggle label="Scenario" value disabled onValueChange={() => {}} />));
    expect(b.props.disabled).toBe(true);
    expect(b.props.accessibilityState.disabled).toBe(true);
  });
});

describe('BuildingPicker', () => {
  const state = (over: object) => ({ buildings: [], id: '', setId: jest.fn(), error: '', ...over });
  test('marks the active building and switches on press', async () => {
    const setId = jest.fn();
    const tree = await render(<BuildingPicker state={state({ buildings: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }], id: 'a', setId })} />);
    const chips = tree.root.findAll(n => (n.type as any) === 'TouchableOpacity');
    expect(chips.map(c => c.props.accessibilityLabel)).toEqual(['✓ Alpha', 'Beta']);
    chips[1].props.onPress();
    expect(setId).toHaveBeenCalledWith('b');
  });
  test('errors offer a way forward', async () => {
    const tree = await render(<BuildingPicker state={state({ error: 'Not authenticated' })} />);
    expect(tree.root.findAll(n => (n.type as any) === 'TouchableOpacity')[0].props.accessibilityLabel).toBe('Open Settings / Sign In');
  });
});
