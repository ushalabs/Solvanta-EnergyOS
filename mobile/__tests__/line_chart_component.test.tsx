jest.mock('react-native', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return { View: host('View'), Text: host('Text'), StyleSheet: { create: (s: any) => s }, Platform: { OS: 'android', select: (o: any) => o.android ?? o.default } };
});
jest.mock('react-native-svg', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return { __esModule: true, default: host('Svg'), Line: host('Line'), Path: host('Path'), Rect: host('Rect'), Text: host('SvgText') };
});
jest.mock('../src/theme/ThemeContext', () => {
  const { darkTokens, HERO_LIME_GRADIENT } = require('../src/theme/tokens');
  return { useTheme: () => ({ tokens: darkTokens, isDark: true, heroGradient: HERO_LIME_GRADIENT }) };
});

import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { LineChart, LineChartProps } from '../src/components/LineChart';
import { darkTokens } from '../src/theme/tokens';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let tree: ReactTestRenderer;
const base: LineChartProps = {
  title: 'Battery Level', badge: 'SIMULATED', xDomain: [0, 1440], yDomain: [0, 100],
  xTicks: [{ value: 0, label: '00:00' }, { value: 720, label: '12:00' }, { value: 1440, label: '24:00' }],
  yTicks: [{ value: 0, label: '0%' }, { value: 50, label: '50%' }, { value: 100, label: '100%' }],
  series: [
    { id: 'current', label: 'Current Plan', tone: 'lime', area: true, points: [{ x: 0, y: 80 }, { x: 720, y: 30 }, { x: 1425, y: 50 }] },
    { id: 'optimized', label: 'Optimized Plan', tone: 'cyan', points: [] },
  ],
  bands: [{ from: 480, to: 600 }], bandLabel: 'Outage',
};
const render = async (props: Partial<LineChartProps> = {}) => { await act(async () => { tree = create(<LineChart {...base} {...props} />); }); };
const all = (type: string) => tree.root.findAll(n => (n.type as any) === type);
const text = () => all('Text').map(n => [n.props.children].flat(Infinity).join('')).join(' | ');
afterEach(async () => { await act(async () => tree.unmount()); });

describe('LineChart', () => {
  test('draws one line per series that has data, in the token colours', async () => {
    await render();
    const lines = all('Path').filter(p => p.props.fill === 'none');
    expect(lines).toHaveLength(1);
    expect(lines[0].props.stroke).toBe(darkTokens.limeMark);
    expect(lines[0].props.d).toMatch(/^M/);
  });
  test('both lines show once both series have data', async () => {
    await render({ series: [base.series[0], { ...base.series[1], points: [{ x: 0, y: 80 }, { x: 1425, y: 70 }] }] });
    expect(all('Path').filter(p => p.props.fill === 'none').map(p => p.props.stroke)).toEqual([darkTokens.limeMark, darkTokens.cyanText]);
  });
  test('has axes labels, a legend and the badge', async () => {
    await render();
    const svgText = all('SvgText').map(n => n.props.children);
    expect(svgText).toEqual(expect.arrayContaining(['0%', '50%', '100%', '00:00', '12:00', '24:00']));
    expect(text()).toMatch(/Current Plan/);
    expect(text()).toMatch(/SIMULATED/);
    expect(text()).toMatch(/Outage/);
  });
  test('a series without data is in the legend with a dash, not drawn', async () => {
    await render();
    expect(text()).toMatch(/Optimized Plan —/);
  });
  test('draws the outage band in a visible tint, behind the lines', async () => {
    await render();
    expect(all('Rect')).toHaveLength(1);
    expect(all('Rect')[0].props.fill).toBe(darkTokens.amberText);
    expect(all('Rect')[0].props.fillOpacity).toBeGreaterThanOrEqual(0.12);
    // The band is the first thing in the plot, so the lines are drawn over it.
    const kids = all('Svg')[0].findAll(n => ['Rect', 'Path'].includes(n.type as string)).map(n => n.type);
    expect(kids[0]).toBe('Rect');
  });

  test('the plot keeps room under the axis labels and the legend sits below the plot', async () => {
    await render({ height: 180 });
    const svg = all('Svg')[0];
    expect(svg.props.height).toBe(180);
    const labels = all('SvgText').filter(n => ['00:00', '12:00', '24:00'].includes(n.props.children));
    for (const l of labels) expect(l.props.y).toBeLessThanOrEqual(180 - 4);
    // The legend text comes after the plot in the tree.
    expect(text().indexOf('Current Plan')).toBeGreaterThan(-1);
  });
  test('the accessible summary gives start, end and lowest point per series', async () => {
    await render();
    const image = tree.root.findAll(n => (n.type as any) === 'View' && n.props.accessibilityRole === 'image')[0];
    expect(image.props.accessibilityLabel).toBe('Battery Level, simulated. Current Plan: starts at 80%, ends at 50%, lowest 30% at 12:00. Optimized Plan: no data.');
  });
  test('without any data it shows the empty text and no plot', async () => {
    await render({ series: base.series.map(s => ({ ...s, points: [] })), emptyText: 'Run a simulation to see the battery level.' });
    expect(text()).toMatch(/Run a simulation to see the battery level\./);
    expect(all('Svg')).toHaveLength(0);
    expect(tree.root.findAll(n => n.props.accessibilityRole === 'image')).toHaveLength(0);
  });
});
