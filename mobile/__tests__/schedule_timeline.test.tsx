jest.mock('react-native', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return { View: host('View'), Text: host('Text'), StyleSheet: { create: (s: any) => s }, Platform: { OS: 'android', select: (o: any) => o.android ?? o.default } };
});
jest.mock('../src/theme/ThemeContext', () => {
  const { darkTokens, HERO_LIME_GRADIENT } = require('../src/theme/tokens');
  return { useTheme: () => ({ tokens: darkTokens, isDark: true, heroGradient: HERO_LIME_GRADIENT }) };
});

import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { ScheduleTimeline } from '../src/components/ScheduleTimeline';
import { PriorityBadge } from '../src/components/PriorityBadge';
import { darkTokens } from '../src/theme/tokens';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let tree: ReactTestRenderer;
const all = (type: string) => tree.root.findAll(n => (n.type as any) === type);
const text = () => all('Text').map(n => [n.props.children].flat(Infinity).join(''));
const flat = (style: any) => [style].flat(Infinity).reduce((a: any, x: any) => ({ ...a, ...x }), {});
afterEach(async () => { await act(async () => tree.unmount()); });

describe('ScheduleTimeline shared lanes', () => {
  const lanes = [
    { id: 'solar', label: 'Solar', tone: 'solar' as const, segments: [{ start_min: 360, end_min: 1080 }] },
    { id: 'tv', label: 'TV', tone: 'appliance' as const, segments: [{ start_min: 0, end_min: 60 }, { start_min: 1380, end_min: 1440 }] },
    { id: 'empty', label: 'Pump', tone: 'appliance' as const, segments: [], emptyNote: 'Not scheduled' },
  ];
  const render = async (props: any = {}) => { await act(async () => { tree = create(<ScheduleTimeline lanes={lanes} {...props} />); }); };

  test('one lane per entry on a shared axis, each bar placed by its minutes', async () => {
    await render();
    const bars = (id: string) => tree.root.findAll(n => (n.type as any) === 'View' && n.props.testID === `lane-${id}`)[0].findAll(n => (n.type as any) === 'View' && n.props.testID === 'lane-bar').map(n => flat(n.props.style));
    expect(bars('solar')).toEqual([expect.objectContaining({ left: '25%', width: '50%' })]);
    expect(bars('tv').map(b => parseFloat(b.left))[0]).toBe(0);
    expect(parseFloat(bars('tv')[1].left)).toBeCloseTo(95.83, 1);
    expect(bars('empty')).toEqual([]);
    expect(text()).toContain('Not scheduled');
  });

  test('bar colours follow the lane tone and the theme tokens', async () => {
    await render();
    const colour = (id: string) => flat(tree.root.findAll(n => (n.type as any) === 'View' && n.props.testID === `lane-${id}`)[0].findAll(n => (n.type as any) === 'View' && n.props.testID === 'lane-bar')[0].props.style).backgroundColor;
    expect(colour('solar')).toBe(darkTokens.limeMark);
    expect(colour('tv')).toBe(darkTokens.amberText);
  });

  test('lane names get 96px so common appliance names are not cut', async () => {
    await render();
    const name = tree.root.findAll(n => (n.type as any) === 'Text' && n.props.children === 'Solar')[0];
    expect(flat(name.props.style).width).toBe(96);
    expect(name.props.numberOfLines).toBe(1);
  });

  test('every lane has a spoken description', async () => {
    await render();
    expect(tree.root.findAll(n => (n.type as any) === 'View' && n.props.testID === 'lane-tv')[0].props.accessibilityLabel).toBe('TV: 00:00 to 01:00, 23:00 to 24:00');
    expect(tree.root.findAll(n => (n.type as any) === 'View' && n.props.testID === 'lane-empty')[0].props.accessibilityLabel).toBe('Pump: none');
  });

  test('shows the title, source tag, axis, shaded bands and legend', async () => {
    await render({ title: 'TIMELINE', sourceTag: 'SIMULATED', bands: [{ from: 480, to: 600 }], legend: [{ tone: 'solar', label: 'Solar (estimated)' }, { tone: 'outage', label: 'Outage' }] });
    expect(text()).toEqual(expect.arrayContaining(['TIMELINE', 'SIMULATED', '00:00', '06:00', '12:00', '18:00', '24:00', 'Solar (estimated)', 'Outage']));
    const band = tree.root.findAll(n => (n.type as any) === 'View' && n.props.testID === 'timeline-band');
    expect(band).toHaveLength(1);
    expect(flat(band[0].props.style).left).toBe(`${480 / 14.4}%`);
  });

  test('a lane that is too short to see still gets a minimum width', async () => {
    await act(async () => { tree = create(<ScheduleTimeline lanes={[{ id: 'a', label: 'A', tone: 'appliance', segments: [{ start_min: 100, end_min: 101 }] }]} />); });
    expect(parseFloat(flat(tree.root.findAll(n => (n.type as any) === 'View' && n.props.testID === 'lane-bar')[0].props.style).width)).toBeGreaterThanOrEqual(1.5);
  });
});

describe('ScheduleTimeline single bars (unchanged)', () => {
  test('still draws one band per task', async () => {
    await act(async () => { tree = create(<ScheduleTimeline tasks={[{ name: 'Pump', startHour: 6, durationHours: 3, priority: 'low' }]} />); });
    expect(text()).toContain('Pump');
    expect(text()).toContain('OR-TOOLS SOLVER');
    expect(all('Text').filter(n => n.props.children === 'Pump')).toHaveLength(1);
  });
});

describe('PriorityBadge tags', () => {
  const render = async (props: any) => { await act(async () => { tree = create(<PriorityBadge priority="medium" {...props} />); }); };
  test('fixed shows FIXED TIME, but not together with flexible', async () => {
    await render({ fixed: true });
    expect(text()).toEqual(['MEDIUM', 'FIXED TIME']);
    await act(async () => tree.unmount());
    await render({ fixed: true, flexible: true });
    expect(text()).toEqual(['MEDIUM', 'FLEXIBLE']);
  });
  test('extra tags are upper-cased and neutral', async () => {
    await render({ tags: ['Split into 2'] });
    expect(text()).toEqual(['MEDIUM', 'SPLIT INTO 2']);
  });
  test('nothing extra without the new props', async () => {
    await render({});
    expect(text()).toEqual(['MEDIUM']);
  });
});
