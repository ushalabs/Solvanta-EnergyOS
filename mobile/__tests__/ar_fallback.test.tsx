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
import { AR_UNAVAILABLE_COPY, ARUnavailable } from '../src/ar/arCapability';
import { darkTokens, lightTokens } from '../src/theme/tokens';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => { mockTokens = darkTokens; });

const render = async (capability: ARUnavailable = 'unsupported', onContinue2D = jest.fn(), onRetry?: () => void) => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<ARCapabilityFallback capability={capability} onContinue2D={onContinue2D} onRetry={onRetry} />); });
  const text = tree.root.findAllByType('Text' as any).map((n: any) => [].concat(n.props.children).join('')).join(' | ');
  return { tree, text, onContinue2D };
};
const REASONS = Object.keys(AR_UNAVAILABLE_COPY) as ARUnavailable[];

test.each(REASONS)('%s shows its own badge, title and message', async capability => {
  const { text } = await render(capability);
  const copy = AR_UNAVAILABLE_COPY[capability];
  expect(text).toContain(copy.badge);
  expect(text).toContain(copy.title);
  expect(text).toContain(copy.body);
});

test.each(REASONS)('%s never claims AR or camera anchoring is working', async capability => {
  const { text } = await render(capability);
  expect(text).not.toMatch(/\b(AR|camera|anchoring|tracking)\b[^|.]{0,20}\b(is\s+)?(ready|enabled|active|running|working|supported)\b/i);
  expect(text).not.toMatch(/centimet|accura|certified|calibrated/i);
});

test.each(REASONS)('%s points to the 2D editor as the working alternative', async capability => {
  const { text } = await render(capability);
  expect(text).toMatch(/measured 2D editor and saved panel placement still work/);
});

test('Back to 2D calls the handler exactly once', async () => {
  const { tree, onContinue2D } = await render();
  const button = tree.root.findByType('TouchableOpacity' as any);
  await act(async () => button.props.onPress());
  expect(onContinue2D).toHaveBeenCalledTimes(1);
});

test('rendering alone does not leave the gate', async () => {
  const { onContinue2D } = await render();
  expect(onContinue2D).not.toHaveBeenCalled();
});

test('offers one named button that leaves the gate when there is nothing to retry', async () => {
  const { tree } = await render();
  const buttons = tree.root.findAllByType('TouchableOpacity' as any);
  expect(buttons).toHaveLength(1);
  expect(buttons[0].props.accessibilityRole).toBe('button');
  expect(buttons[0].props.accessibilityLabel).toBe('Back to 2D layout');
  expect(buttons[0].props.disabled).toBeFalsy();
});

test('offers Check Again only when given a retry handler', async () => {
  const onRetry = jest.fn();
  const { tree } = await render('check-failed', jest.fn(), onRetry);
  const buttons = tree.root.findAllByType('TouchableOpacity' as any);
  expect(buttons.map((b: any) => b.props.accessibilityLabel)).toEqual(['Check Again', 'Back to 2D layout']);
  await act(async () => buttons[0].props.onPress());
  expect(onRetry).toHaveBeenCalledTimes(1);
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

// These fail on purpose if the native AR setup drifts from what the docs and the test plan describe.
describe('the AR setup matches the repository', () => {
  const fs: any = require('fs');
  const path: any = require('path');
  const root: string = (process as any).cwd();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
  const viro = app.plugins.find((p: any) => Array.isArray(p) && p[0] === '@reactvision/react-viro');
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e: any) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
  const sources = [...walk(path.join(root, 'app')), ...walk(path.join(root, 'src'))].filter(f => /\.tsx?$/.test(f));
  const relative = (file: string) => path.relative(root, file).split(path.sep).join('/');

  test('ViroReact is pinned to the version whose peer ranges were checked, on the SDK they allow', () => {
    expect(pkg.dependencies['@reactvision/react-viro']).toBe('3.0.3');
    expect(pkg.dependencies.expo).toMatch(/^~57\./);
    expect(pkg.dependencies['react-native']).toMatch(/^0\.86\./);
  });
  test('the development client is installed, and no second AR or camera runtime', () => {
    const installed = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(installed).toContain('expo-dev-client');
    expect(installed.filter(name => /arcore|arkit|expo-camera|vision-camera|expo-gl|expo-three/i.test(name))).toEqual([]);
  });
  test('the app config asks for AR mode only, with no cloud or location provider', () => {
    expect(viro).toBeDefined();
    expect(viro[1].android.xRMode).toEqual(['AR']);
    expect(viro[1].provider).toBe('none');
  });
  test('the app config declares the camera, with its reason labelled as visualization, and no microphone', () => {
    expect(app.android.permissions).toContain('android.permission.CAMERA');
    expect(app.android.blockedPermissions).toContain('android.permission.RECORD_AUDIO');
    expect(viro[1].ios.cameraUsagePermission).toMatch(/visualization, not a measurement/);
  });
  test('the config stays valid for native builds: square-icon path and splash in its plugin', () => {
    expect(app.splash).toBeUndefined();
    expect(app.plugins.find((p: any) => Array.isArray(p) && p[0] === 'expo-splash-screen')).toBeDefined();
    const icon = fs.readFileSync(path.join(root, app.icon));
    expect(icon.readUInt32BE(16)).toBe(icon.readUInt32BE(20));
  });
  test('the EAS development profile builds a dev client APK', () => {
    const profile = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8')).build.development;
    expect(profile.developmentClient).toBe(true);
    expect(profile.android.buildType).toBe('apk');
  });
  test('only the two native-only files reference ViroReact, so web and Expo Go never load it', () => {
    expect(sources.length).toBeGreaterThan(20);
    const users = sources.filter(file => /(from|require\()\s*['"]@reactvision\/react-viro/.test(fs.readFileSync(file, 'utf8'))).map(relative).sort();
    expect(users).toEqual(['src/ar/RoofARView.tsx', 'src/ar/viroNative.native.ts']);
    const importers = sources.filter(file => /(from|require\()\s*['"]\.\/RoofARView['"]/.test(fs.readFileSync(file, 'utf8'))).map(relative);
    expect(importers).toEqual(['src/ar/viroNative.native.ts']);
  });
  test('a web-resolved file provides the same exports as the native file', () => {
    const exported = (name: string) => [...fs.readFileSync(path.join(root, 'src/ar', name), 'utf8').matchAll(/export (?:async )?(?:const|function) (\w+)/g)].map((m: any) => m[1]).sort();
    expect(exported('viroNative.ts')).toEqual(exported('viroNative.native.ts'));
  });
});
