// The native bridge file, with the native module and ViroReact mocked. No device is involved.
let mockNativeModules: any = {};
const mockIsSupported = jest.fn();
const mockViroLoaded = jest.fn();
jest.mock('react-native', () => ({ get NativeModules() { return mockNativeModules; } }));
jest.mock('@reactvision/react-viro', () => { mockViroLoaded(); return { isARSupportedOnDevice: () => mockIsSupported() }; });
jest.mock('../src/ar/RoofARView', () => { mockViroLoaded(); return { RoofARView: 'RoofARView' }; });

import { hasViroNativeModule, loadRoofARView, probeARSupport } from '../src/ar/viroNative.native';
import * as stub from '../src/ar/viroNative';

beforeEach(() => { jest.clearAllMocks(); mockNativeModules = { VRTARSceneNavigatorModule: {} }; });

describe('native bridge', () => {
  test('sees the module only when the binary includes it', () => {
    expect(hasViroNativeModule()).toBe(true);
    mockNativeModules = {};
    expect(hasViroNativeModule()).toBe(false);
  });

  test('importing it and asking about the module does not load ViroReact', () => {
    hasViroNativeModule();
    expect(mockViroLoaded).not.toHaveBeenCalled();
  });

  test('never loads the AR view into a binary without the module', () => {
    mockNativeModules = {};
    expect(loadRoofARView()).toBeNull();
    expect(mockViroLoaded).not.toHaveBeenCalled();
  });

  test('loads the AR view when the module is present', () => {
    expect(loadRoofARView()).toBe('RoofARView');
  });

  test.each([
    ['supported', async () => ({ isARSupported: true }), 'SUPPORTED'],
    ['missing module answer', async () => ({ isARSupported: false }), 'UNSUPPORTED'],
    ['unsupported rejection', async () => { throw new Error('UNSUPPORTED'); }, 'UNSUPPORTED'],
    ['transient rejection', async () => { throw new Error('TRANSIENT'); }, 'TRANSIENT'],
    ['unknown rejection', async () => { throw new Error('UNKNOWN'); }, 'UNKNOWN'],
    ['string rejection', async () => { throw 'AR Support Unknown.'; }, 'UNKNOWN'],
  ])('maps a %s to the capability check', async (_name, answer, expected) => {
    mockIsSupported.mockImplementation(answer);
    expect(await probeARSupport()).toBe(expected);
  });
});

describe('web and test stub', () => {
  test('reports no AR and offers no view', async () => {
    expect(stub.hasViroNativeModule()).toBe(false);
    expect(stub.loadRoofARView()).toBeNull();
    expect(await stub.probeARSupport()).toBe('UNKNOWN');
  });
});
