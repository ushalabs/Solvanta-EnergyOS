jest.mock('react-native', () => {
  const React = require('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return {
    Text: host('Text'),
    View: host('View'),
    TouchableOpacity: host('TouchableOpacity'),
    ActivityIndicator: host('ActivityIndicator'),
    StyleSheet: { create: (styles: any) => styles },
    Platform: { OS: 'android', select: (o: any) => o.android || o.default },
  };
});
let mockTokens: any;
jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({ tokens: mockTokens }),
}));

import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { ARCapabilityFallback } from '../src/components/ARCapabilityFallback';
import { darkTokens, lightTokens } from '../src/theme/tokens';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => { mockTokens = darkTokens; });

const render = async (onContinue2D = jest.fn()) => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<ARCapabilityFallback onContinue2D={onContinue2D} />); });
  const text = tree.root.findAllByType('Text' as any).map((n: any) => [].concat(n.props.children).join('')).join(' | ');
  return { tree, text, onContinue2D };
};

test('AR gate states plainly that native AR is not integrated', async () => {
  const { text } = await render();
  expect(text).toMatch(/NATIVE AR NOT INTEGRATED/);
  expect(text).toMatch(/ARCore/);
  expect(text).toMatch(/development client/i);
});

test('AR gate never claims AR or camera anchoring is working', async () => {
  const { text } = await render();
  expect(text).not.toMatch(/\b(AR|camera|anchoring|tracking)\b[^|.]{0,20}\b(is\s+)?(ready|enabled|active|running|working|supported)\b/i);
});

test('Return to 2D calls the handler exactly once', async () => {
  const { tree, onContinue2D } = await render();
  const button = tree.root.findByType('TouchableOpacity' as any);
  await act(async () => button.props.onPress());
  expect(onContinue2D).toHaveBeenCalledTimes(1);
});

test('rendering alone does not leave the gate', async () => {
  const { onContinue2D } = await render();
  expect(onContinue2D).not.toHaveBeenCalled();
});

test('explains why it is blocked and that Expo Go and web cannot run AR', async () => {
  const { text } = await render();
  expect(text).toMatch(/Expo Go/);
  expect(text).toMatch(/web preview/);
  expect(text).toMatch(/SDK 58/);
  expect(text).toMatch(/no native AR module/);
  expect(text).toMatch(/no physical ARCore device/);
});

test('points to the 2D editor as the working alternative', async () => {
  const { text } = await render();
  expect(text).toMatch(/measured 2D editor and saved panel placement are available/);
});

test('makes no accuracy or placement claim', async () => {
  const { text } = await render();
  expect(text).not.toMatch(/centimet|accura|certified|calibrated/i);
});

test('offers exactly one action, a named button that leaves the gate', async () => {
  const { tree } = await render();
  const buttons = tree.root.findAllByType('TouchableOpacity' as any);
  expect(buttons).toHaveLength(1);
  expect(buttons[0].props.accessibilityRole).toBe('button');
  expect(buttons[0].props.accessibilityLabel).toBe('Return to 2D Layout Preview');
  expect(buttons[0].props.disabled).toBeFalsy();
});

test('is announced to screen readers and has a heading', async () => {
  const { tree } = await render();
  expect(tree.root.findAll((n: any) => n.props.accessibilityLiveRegion === 'polite').length).toBeGreaterThan(0);
  expect(tree.root.findAll((n: any) => n.props.accessibilityRole === 'header').length).toBeGreaterThan(0);
});

test.each([['dark', darkTokens], ['light', lightTokens]])('uses readable theme colours in %s mode', async (_mode, tokens) => {
  mockTokens = tokens;
  const { tree } = await render();
  const colours = tree.root.findAllByType('Text' as any).map((n: any) => [n.props.style].flat().find((s: any) => s?.color)?.color);
  expect(colours).toContain(tokens.amberText);
  expect(colours).toContain(tokens.textPrimary);
  expect(colours).not.toContain(tokens.textMuted);
});

// These fail on purpose the day an AR dependency lands, so this honest gate cannot go stale silently.
describe('the gate matches what is actually installed', () => {
  const fs: any = require('fs');
  const path: any = require('path');
  const root: string = (process as any).cwd();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const installed = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

  test('no AR runtime or camera module is a dependency', () => {
    expect(installed.filter(name => /viro|arcore|arkit|expo-camera|vision-camera|expo-gl|expo-three/i.test(name))).toEqual([]);
  });
  test('the Expo SDK the gate names is the one in package.json', () => {
    expect(pkg.dependencies.expo).toMatch(/^~58\./);
  });
  test('the app config asks for no camera-AR native plugin', () => {
    const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    expect(JSON.stringify(app.expo.plugins)).not.toMatch(/viro|arcore|arkit/i);
  });
  test('no app source imports an AR module', () => {
    const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e: any) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
    const sources = [...walk(path.join(root, 'app')), ...walk(path.join(root, 'src'))].filter(f => /\.tsx?$/.test(f));
    expect(sources.length).toBeGreaterThan(20);
    for (const file of sources) expect(fs.readFileSync(file, 'utf8')).not.toMatch(/from\s+['"][^'"]*(viro|arcore|arkit)[^'"]*['"]/i);
  });
});
