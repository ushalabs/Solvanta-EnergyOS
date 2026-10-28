let mockStorage: Record<string, string> = {};

jest.mock('react-native', () => ({
  Platform: { OS: 'android', select: (objs: any) => objs.android },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage[key] || null),
    setItem: jest.fn(async (key: string, val: string) => { mockStorage[key] = val; }),
    removeItem: jest.fn(async (key: string) => { delete mockStorage[key]; }),
    clear: jest.fn(async () => { mockStorage = {}; }),
  },
}));

import { SolvantaApiClient, getBaseApiUrl, AUTH_TOKEN_KEY } from '../src/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Solvanta Mobile API Client', () => {
  beforeEach(async () => {
    mockStorage = {};
    (globalThis as any).fetch = jest.fn();
  });

  test('resolves default base API url', () => {
    const url = getBaseApiUrl();
    expect(url).toContain('/api/v1');
  });

  test('stores and clears auth tokens in AsyncStorage', async () => {
    const client = new SolvantaApiClient('http://test-server/api/v1');
    expect(await client.getToken()).toBeNull();

    await client.setToken('test-token-xyz');
    expect(await client.getToken()).toBe('test-token-xyz');

    await client.clearToken();
    expect(await client.getToken()).toBeNull();
  });

  test('attaches Authorization header when token is present', async () => {
    const client = new SolvantaApiClient('http://test-server/api/v1');
    await client.setToken('jwt-access-token-123');

    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', version: '1.0.0' }),
    });

    const res = await client.get('/system/health');
    expect(res).toEqual({ status: 'ok', version: '1.0.0' });

    expect((globalThis as any).fetch).toHaveBeenCalled();
    const callArgs = (globalThis as any).fetch.mock.calls[0];
    expect(callArgs[0]).toBe('http://test-server/api/v1/system/health');
  });
});
