// Shared layout pieces: the floating dock, the screen header and the pinned footer slot.
jest.mock('react-native', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return {
    Text: host('Text'), View: host('View'), TextInput: host('TextInput'), TouchableOpacity: host('TouchableOpacity'),
    ScrollView: host('ScrollView'), ActivityIndicator: host('ActivityIndicator'),
    StyleSheet: { create: (styles: any) => styles },
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
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
jest.mock('expo-router', () => ({ useFocusEffect: () => undefined, router: { push: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: (props: any) => require('react').createElement('Safe', props, props.children),
  useSafeAreaInsets: () => mockInsets,
}));
jest.mock('../src/theme/ThemeContext', () => {
  const { darkTokens, HERO_LIME_GRADIENT } = require('../src/theme/tokens');
  return { useTheme: () => ({ tokens: darkTokens, isDark: true, heroGradient: HERO_LIME_GRADIENT }) };
});

import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { FloatingTabDock } from '../src/components/FloatingTabDock';
import { SolvantaScreen } from '../src/components/SolvantaScreen';
import { ScreenHeader } from '../src/components/TwinControls';
import { darkTokens, DOCK } from '../src/theme/tokens';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const render = async (element: React.ReactElement) => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(element); });
  return tree;
};
const flat = (style: any): any => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean).map(flat)) : style || {};
const hosts = (tree: ReactTestRenderer, type: string) => tree.root.findAll(n => (n.type as any) === type);

beforeEach(() => { mockInsets = { top: 0, bottom: 0, left: 0, right: 0 }; });

describe('FloatingTabDock', () => {
  test('keeps the five tabs, in order, with the accessible names other tests and flows use', async () => {
    const tabs = hosts(await render(<FloatingTabDock currentTab="index" onSelectTab={() => {}} />), 'TouchableOpacity');
    expect(tabs.map(t => t.props.accessibilityLabel)).toEqual(['Home tab', 'Loads tab', 'Sim tab', 'Roof tab', 'AI tab']);
    expect(tabs.every(t => t.props.accessibilityRole === 'tab')).toBe(true);
  });

  test('shows icons only: no visible label text', async () => {
    const tree = await render(<FloatingTabDock currentTab="simulation" onSelectTab={() => {}} />);
    expect(hosts(tree, 'Text')).toHaveLength(0);
    expect(hosts(tree, 'Icon').map(i => i.props.name)).toEqual(['House', 'LayoutGrid', 'ChartNoAxesColumn', 'MapPin', 'MessageCircle']);
  });

  test.each(['index', 'appliances', 'simulation', 'rooftop', 'ai'] as const)('on the %s tab the active indicator is a 44px lime circle with a round glow', async current => {
    const tree = await render(<FloatingTabDock currentTab={current} onSelectTab={() => {}} />);
    const active = tree.root.findAll(n => n.props.testID === 'dock-active' && (n.type as any) === 'View');
    const glow = tree.root.findAll(n => n.props.testID === 'dock-glow' && (n.type as any) === 'View');
    expect(active).toHaveLength(1);
    expect(glow).toHaveLength(1);
    const circle = flat(active[0].props.style);
    expect(circle).toMatchObject({ width: 44, height: 44, borderRadius: 22, backgroundColor: darkTokens.lime });
    // Equal sides and a radius of half the side: a circle, never a rounded square.
    expect(circle.borderRadius).toBe(circle.width / 2);
    // Nothing on the circle can be clipped or redrawn as a square on Android.
    expect(circle.boxShadow).toBeUndefined();
    expect(circle.elevation).toBeUndefined();
    expect(circle.shadowOpacity).toBeUndefined();
    const ring = flat(glow[0].props.style);
    expect(ring).toMatchObject({ width: 58, height: 58, borderRadius: 29, backgroundColor: darkTokens.limeGlow, position: 'absolute' });
    expect(ring.boxShadow).toBeUndefined();
    // The ring is centred on the circle.
    expect(ring.left).toBe(-7);
    expect(ring.top).toBe(-7);
  });

  test('only the selected tab has a fill; the others are plain icons', async () => {
    const tree = await render(<FloatingTabDock currentTab="rooftop" onSelectTab={() => {}} />);
    const tabs = hosts(tree, 'TouchableOpacity');
    const idle = tree.root.findAll(n => n.props.testID === 'dock-idle' && (n.type as any) === 'View');
    expect(idle).toHaveLength(4);
    for (const view of idle) expect(flat(view.props.style).backgroundColor).toBeUndefined();
    expect(tabs[3].findAll(n => (n.type as any) === 'Icon')[0].props.color).toBe(darkTokens.onLime);
    expect(tabs[0].findAll(n => (n.type as any) === 'Icon')[0].props.color).toBe(darkTokens.textSecondary);
  });

  test('moving to another tab swaps the element in that tab instead of restyling it', async () => {
    let tree!: ReactTestRenderer;
    await act(async () => { tree = create(<FloatingTabDock currentTab="index" onSelectTab={() => {}} />); });
    const ids = (i: number) => hosts(tree, 'TouchableOpacity')[i].findAll(n => typeof n.props.testID === 'string' && n.props.testID.startsWith('dock-') && (n.type as any) === 'View').map(n => n.props.testID);
    expect(ids(1)).toEqual(['dock-idle']);
    expect(ids(0)).toEqual(['dock-glow', 'dock-active']);
    await act(async () => { tree.update(<FloatingTabDock currentTab="appliances" onSelectTab={() => {}} />); });
    expect(ids(1)).toEqual(['dock-glow', 'dock-active']);
    expect(ids(0)).toEqual(['dock-idle']);
  });

  test('selection is exposed for native and web, and every tab is at least 44px', async () => {
    const tabs = hosts(await render(<FloatingTabDock currentTab="ai" onSelectTab={() => {}} />), 'TouchableOpacity');
    expect(tabs.map(t => t.props['aria-selected'])).toEqual([false, false, false, false, true]);
    expect(tabs.map(t => t.props.accessibilityState.selected)).toEqual([false, false, false, false, true]);
    for (const tab of tabs) expect(flat(tab.findAll(n => (n.type as any) === 'View')[0].props.style).height).toBeGreaterThanOrEqual(44);
  });

  test('pressing a tab reports it', async () => {
    const onSelect = jest.fn();
    const tabs = hosts(await render(<FloatingTabDock currentTab="index" onSelectTab={onSelect} />), 'TouchableOpacity');
    tabs[1].props.onPress();
    expect(onSelect).toHaveBeenCalledWith('appliances');
  });

  test('sits above the device inset', async () => {
    mockInsets = { top: 0, bottom: 34, left: 0, right: 0 };
    const tree = await render(<FloatingTabDock currentTab="index" onSelectTab={() => {}} />);
    expect(flat(hosts(tree, 'View')[0].props.style).bottom).toBe(34);
  });
});

describe('ScreenHeader', () => {
  test('title is a 19px semibold heading', async () => {
    const tree = await render(<ScreenHeader title="Appliances" subtitle="Saved loads" />);
    const title = tree.root.findAll(n => (n.type as any) === 'Text' && n.props.accessibilityRole === 'header')[0];
    expect(title.props.children).toBe('Appliances');
    expect(flat(title.props.style)).toMatchObject({ fontSize: 19, fontWeight: '600' });
  });

  test('back button keeps its label and a 44px target', async () => {
    const onBack = jest.fn();
    const back = hosts(await render(<ScreenHeader title="Scheduling" onBack={onBack} backLabel="Back to Simulation" />), 'TouchableOpacity')[0];
    expect(back.props.accessibilityLabel).toBe('Back to Simulation');
    expect(flat(back.props.style)).toMatchObject({ width: 44, height: 44 });
    back.props.onPress();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('renders left and right slots', async () => {
    const tree = await render(<ScreenHeader title="Solvanta" left={<Logo />} right={<Bell />} />);
    expect(tree.root.findAllByType(Logo)).toHaveLength(1);
    expect(tree.root.findAllByType(Bell)).toHaveLength(1);
    expect(hosts(tree, 'TouchableOpacity')).toHaveLength(0);
  });

  test('with onTitlePress the title block is one named 44px button with a chevron', async () => {
    const onPress = jest.fn();
    const tree = await render(<ScreenHeader title="Solvanta" subtitle="Demo home · Lahore" onTitlePress={onPress} titlePressLabel="Change building: Demo home" />);
    const button = hosts(tree, 'TouchableOpacity')[0];
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Change building: Demo home');
    expect(flat(button.props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(button.findAll(n => (n.type as any) === 'Icon').map(i => i.props.name)).toEqual(['ChevronDown']);
    button.props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
const Logo = () => null;
const Bell = () => null;

describe('SolvantaScreen', () => {
  const footerOf = (tree: ReactTestRenderer) => tree.root.findAll(n => n.props.testID === 'screen-footer' && (n.type as any) === 'View')[0];
  const wrapperOf = (tree: ReactTestRenderer) => hosts(tree, 'View').find(v => v.props.pointerEvents === 'box-none' && v.findAll(n => n.props.testID === 'screen-footer').length > 0)!;
  const scrollPadding = (tree: ReactTestRenderer) => flat(hosts(tree, 'ScrollView')[0].props.contentContainerStyle).paddingBottom;

  test('without a footer nothing is pinned and the dock clearance is unchanged', async () => {
    const tree = await render(<SolvantaScreen banner="SIMULATED"><Logo /></SolvantaScreen>);
    expect(footerOf(tree)).toBeUndefined();
    expect(scrollPadding(tree)).toBe(110);
  });

  test('a footer is pinned above the dock on tab screens', async () => {
    const tree = await render(<SolvantaScreen footer={<Bell />}><Logo /></SolvantaScreen>);
    expect(tree.root.findAllByType(Bell)).toHaveLength(1);
    expect(flat(wrapperOf(tree).props.style)).toMatchObject({ position: 'absolute', bottom: DOCK.minBottom + DOCK.height + 10 });
  });

  test('on a stack screen the footer sits at the bottom inset', async () => {
    mockInsets = { top: 0, bottom: 34, left: 0, right: 0 };
    const tree = await render(<SolvantaScreen footer={<Bell />} footerClearsDock={false}><Logo /></SolvantaScreen>);
    expect(flat(wrapperOf(tree).props.style).bottom).toBe(34);
  });

  test('the scroll area grows by the measured footer height so content is not hidden', async () => {
    const tree = await render(<SolvantaScreen footer={<Bell />}><Logo /></SolvantaScreen>);
    await act(async () => { footerOf(tree).props.onLayout({ nativeEvent: { layout: { height: 50 } } }); });
    expect(scrollPadding(tree)).toBe(110 + 50 + 10);
  });

  test('the provenance banner shows by default and can be turned off by a screen that labels its own data', async () => {
    const shown = await render(<SolvantaScreen banner="SIMULATED results"><Logo /></SolvantaScreen>);
    expect(hosts(shown, 'Text').map(t => t.props.children)).toContain('SIMULATED results');
    const hidden = await render(<SolvantaScreen banner={null}><Logo /></SolvantaScreen>);
    expect(hosts(hidden, 'Text')).toHaveLength(0);
  });
});
