const mockPlatform = { OS: 'android' };
const mockConfigured = jest.fn(() => true);
const mockApp = { name: '[DEFAULT]' };
const mockAuth = { currentUser: null };
const mockPersistence = { type: 'LOCAL' };
jest.mock('react-native', () => ({ Platform: mockPlatform }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
jest.mock('../src/auth/firebaseConfig', () => ({ FIREBASE_WEB_CONFIG: {}, isFirebaseConfigured: () => mockConfigured() }));
jest.mock('firebase/app', () => ({ getApps: jest.fn(() => []), getApp: jest.fn(() => mockApp), initializeApp: jest.fn(() => mockApp) }));
jest.mock('firebase/auth', () => ({ getAuth: jest.fn(() => mockAuth), initializeAuth: jest.fn(() => mockAuth), getReactNativePersistence: jest.fn(() => mockPersistence) }));
import * as app from 'firebase/app';
import * as auth from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

function load() {
  let module!: typeof import('../src/auth/firebase');
  jest.isolateModules(() => { module = require('../src/auth/firebase'); });
  return module;
}
beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform.OS = 'android';
  mockConfigured.mockReturnValue(true);
  jest.mocked(app.getApps).mockReturnValue([]);
  jest.mocked(auth.initializeAuth).mockImplementation(() => mockAuth as any);
  delete (globalThis as any).window;
});
afterEach(() => { delete (globalThis as any).window; });

test('importing the Firebase module creates neither app nor Auth', () => {
  load();
  expect(app.initializeApp).not.toHaveBeenCalled();
  expect(auth.getAuth).not.toHaveBeenCalled();
  expect(auth.initializeAuth).not.toHaveBeenCalled();
});

test('static web rendering never initializes Auth, even with configuration', () => {
  mockPlatform.OS = 'web';
  expect(load().getFirebaseAuth()).toBeNull();
  expect(app.initializeApp).not.toHaveBeenCalled();
  expect(auth.getAuth).not.toHaveBeenCalled();
  expect(auth.initializeAuth).not.toHaveBeenCalled();
});

test('missing configuration stays unavailable without a Firebase exception', () => {
  mockConfigured.mockReturnValue(false);
  const module = load();
  expect(module.getFirebaseAuth()).toBeNull();
  expect(module.requireFirebaseAuth).toThrow('Configure the Firebase Web app settings');
  expect(app.initializeApp).not.toHaveBeenCalled();
});

test('native first initialization installs AsyncStorage persistence before any getAuth call', () => {
  const module = load();
  expect(module.getFirebaseAuth()).toBe(mockAuth);
  expect(auth.getReactNativePersistence).toHaveBeenCalledWith(AsyncStorage);
  expect(auth.initializeAuth).toHaveBeenCalledWith(mockApp, { persistence: mockPersistence });
  expect(auth.getAuth).not.toHaveBeenCalled();
  expect(module.getFirebaseAuth()).toBe(mockAuth);
  expect(auth.initializeAuth).toHaveBeenCalledTimes(1);
});

test('fast refresh reuses an existing Auth only after already-initialized', () => {
  jest.mocked(app.getApps).mockReturnValue([mockApp as any]);
  jest.mocked(auth.initializeAuth).mockImplementation(() => { throw { code: 'auth/already-initialized' }; });
  expect(load().getFirebaseAuth()).toBe(mockAuth);
  expect(app.getApp).toHaveBeenCalled();
  expect(app.initializeApp).not.toHaveBeenCalled();
  expect(auth.getAuth).toHaveBeenCalledWith(mockApp);
  expect(jest.mocked(auth.initializeAuth).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(auth.getAuth).mock.invocationCallOrder[0]);
});

test('persistence errors propagate instead of silently creating a memory-only session', () => {
  jest.mocked(auth.initializeAuth).mockImplementation(() => { throw new Error('Persistence unavailable'); });
  expect(load().getFirebaseAuth).toThrow('Persistence unavailable');
  expect(auth.getAuth).not.toHaveBeenCalled();
});

test('browser hydration initializes platform-default persistent Auth lazily', () => {
  mockPlatform.OS = 'web';
  (globalThis as any).window = {};
  const module = load();
  expect(auth.getAuth).not.toHaveBeenCalled();
  expect(module.getFirebaseAuth()).toBe(mockAuth);
  expect(auth.getAuth).toHaveBeenCalledWith(mockApp);
  expect(auth.initializeAuth).not.toHaveBeenCalled();
});
