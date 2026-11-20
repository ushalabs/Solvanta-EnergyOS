// The Size Solar from Bill screen must open even when the build has no document picker or file system module.
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
  const Icon = (props: any) => React.createElement('Icon', props);
  return new Proxy({}, { get: (_t, key) => (key === '__esModule' ? true : Icon) });
});
jest.mock('expo-linear-gradient', () => ({ LinearGradient: (props: any) => require('react').createElement('Gradient', props, props.children) }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: (props: any) => require('react').createElement('Safe', props, props.children), useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-router', () => ({ useFocusEffect: () => undefined, router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
jest.mock('../src/theme/ThemeContext', () => {
  const { darkTokens, HERO_LIME_GRADIENT } = require('../src/theme/tokens');
  return { useTheme: () => ({ tokens: darkTokens, isDark: true, heroGradient: HERO_LIME_GRADIENT }) };
});

const mockGetDocument = jest.fn();
// FormData only accepts a Blob, as on a phone where File is one.
class MockFile extends Blob { constructor(public uri: string) { super(['bill']); } }
// The screen tests replace only the loader, so React stays a single copy. The loader has its own tests below.
const mockLoad = jest.fn();
jest.mock('../src/api/billPicker', () => ({ ...jest.requireActual('../src/api/billPicker'), loadBillPicker: (...args: unknown[]) => mockLoad(...args) }));
// Bill text recognition runs on the device; the screen tests replace it, it has its own tests in bill_ocr.test.ts.
const mockReadBill = jest.fn();
jest.mock('../src/local/billOcr', () => ({ ...jest.requireActual('../src/local/billOcr'), readBillOnDevice: (...args: unknown[]) => mockReadBill(...args) }));

import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import SolarSizing from '../app/solar-sizing';
import { BillPickerUnavailableError, PICKER_UNAVAILABLE } from '../src/api/billPicker';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let tree: ReactTestRenderer;
const hosts = (type: string) => tree.root.findAll((n: any) => n.type === type);
const flatText = (n: any): string => [n.props.children].flat(Infinity).map((c: any) => typeof c === 'string' || typeof c === 'number' ? c : c?.props ? flatText(c) : '').join('');
const texts = () => hosts('Text').map(flatText);
const upload = () => hosts('TouchableOpacity').find((b: any) => b.props.accessibilityLabel === 'Upload bill')!;
const ok = () => mockLoad.mockReturnValue({ DocumentPicker: { getDocumentAsync: (...args: unknown[]) => mockGetDocument(...args) }, File: MockFile });
const unavailable = () => mockLoad.mockImplementation(() => { throw new BillPickerUnavailableError(); });

async function render() {
  await act(async () => { tree = create(<SolarSizing />); });
}

beforeEach(() => {
  mockGetDocument.mockReset();
  mockReadBill.mockReset();
  mockLoad.mockReset();
  ok();
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); jest.restoreAllMocks(); });

// What Expo Go does: requiring a native module that the build lacks throws. Each case loads a fresh copy of the loader.
describe('loadBillPicker', () => {
  const load = (picker: 'ok' | 'missing', files: 'ok' | 'missing', platform: string) => {
    let outcome: () => { DocumentPicker: any; File: unknown } = () => { throw new Error('not run'); };
    jest.isolateModules(() => {
      jest.doMock('expo-document-picker', () => { if (picker === 'missing') throw new Error("Cannot find native module 'ExpoDocumentPicker'"); return { getDocumentAsync: jest.fn() }; });
      jest.doMock('expo-file-system', () => { if (files === 'missing') throw new Error("Cannot find native module 'ExpoFileSystem'"); return { File: MockFile }; });
      // The loader runs here, inside the isolated registry, so the mocks above are the ones it sees.
      try { const value = jest.requireActual('../src/api/billPicker').loadBillPicker(platform); outcome = () => value; }
      catch (error) { outcome = () => { throw error; }; }
    });
    return outcome;
  };

  test('returns the picker and the file class when both modules exist', () => {
    const { DocumentPicker, File } = load('ok', 'ok', 'android')();
    expect(DocumentPicker.getDocumentAsync).toBeDefined();
    expect(File).toBe(MockFile);
  });
  test('importing the loader does not touch either native module', () => {
    let touched = false;
    jest.isolateModules(() => {
      jest.doMock('expo-document-picker', () => { touched = true; return {}; });
      jest.doMock('expo-file-system', () => { touched = true; return {}; });
      jest.requireActual('../src/api/billPicker');
    });
    expect(touched).toBe(false);
  });
  test('on web it does not load the file system module at all', () => {
    expect(load('ok', 'missing', 'web')().File).toBeNull();
  });
  test('a missing document picker module becomes one clear error', () => {
    const run = load('missing', 'ok', 'android');
    expect(run).toThrow(PICKER_UNAVAILABLE);
    expect(run).toThrow(expect.objectContaining({ name: 'BillPickerUnavailableError' }));
  });
  test('a missing file system module becomes the same error on a phone', () => {
    expect(load('ok', 'missing', 'android')).toThrow(PICKER_UNAVAILABLE);
  });
});

describe('Size Solar from Bill screen', () => {
  test('opens and works when neither native module exists', async () => {
    unavailable();
    await render();
    expect(texts()).toContain('Solar sizing');
    expect(upload()).toBeDefined();
    expect(hosts('TextInput').length).toBeGreaterThan(0);
  });

  test('tapping Upload bill without the module shows the short message and does not crash', async () => {
    unavailable();
    await render();
    await act(async () => { upload().props.onPress(); });
    expect(texts()).toContain(PICKER_UNAVAILABLE);
    expect(upload().props.disabled).toBeFalsy();
    expect(upload().props.accessibilityState.busy).toBe(false);
  });

  test('the same message shows and no file dialog opens when only the file system module is missing', async () => {
    unavailable();
    await render();
    await act(async () => { upload().props.onPress(); });
    expect(texts()).toContain(PICKER_UNAVAILABLE);
    expect(mockGetDocument).not.toHaveBeenCalled();
  });

  test('manual entry still works after the picker was unavailable', async () => {
    unavailable();
    await render();
    await act(async () => { upload().props.onPress(); });
    const field = hosts('TextInput')[0];
    await act(async () => { field.props.onChangeText('2026-02'); });
    expect(hosts('TextInput')[0].props.value).toBe('2026-02');
  });

  test('with the modules present a cancelled pick changes nothing and shows no error', async () => {
    mockGetDocument.mockResolvedValue({ canceled: true });
    await render();
    await act(async () => { upload().props.onPress(); });
    expect(mockGetDocument).toHaveBeenCalledWith({ type: ['image/jpeg', 'image/png'], base64: false });
    expect(texts()).not.toContain(PICKER_UNAVAILABLE);
  });

  test('with the modules present a picked image is read on the device and the readings are used', async () => {
    const asset = { uri: 'file:///bill.png', name: 'bill.png', size: 1000, mimeType: 'image/png' };
    mockGetDocument.mockResolvedValue({ canceled: false, assets: [asset] });
    mockReadBill.mockResolvedValue([{ month: '2026-01', units_kwh: 500 }]);
    await render();
    await act(async () => { upload().props.onPress(); });
    expect(mockReadBill).toHaveBeenCalledWith(asset);
    expect(texts().join(' ')).toContain('Read 1 month.');
  });

  test('a file over 8 MB is refused before any upload', async () => {
    mockGetDocument.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///big.png', name: 'big.png', size: 9 * 1024 * 1024 }] });
    await render();
    await act(async () => { upload().props.onPress(); });
    expect(mockReadBill).not.toHaveBeenCalled();
    expect(texts()).toContain('Choose a JPG or PNG under 8 MB.');
  });

  test('a reading failure still shows its own error, not the build message', async () => {
    mockGetDocument.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///bill.png', name: 'bill.png', size: 10 }] });
    mockReadBill.mockRejectedValue(new Error('The bill could not be read.'));
    await render();
    await act(async () => { upload().props.onPress(); });
    expect(texts()).toContain('The bill could not be read.');
    expect(texts()).not.toContain(PICKER_UNAVAILABLE);
  });
});
