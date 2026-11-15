import { AR_UNAVAILABLE_COPY, AREnvironment, ARProbeResult, checkARCapability, probeResultFromError } from '../src/ar/arCapability';

const env = (over: Partial<AREnvironment> = {}): AREnvironment => ({
  platform: 'android',
  isExpoGo: false,
  hasNativeModule: true,
  probe: jest.fn(async () => 'SUPPORTED' as ARProbeResult),
  wait: jest.fn(async () => undefined),
  ...over,
});

describe('checkARCapability', () => {
  test('is ready only when ARCore reports the device as supported', async () => {
    expect(await checkARCapability(env())).toBe('ready');
  });

  test.each([
    ['web', { platform: 'web' }],
    ['platform', { platform: 'ios' }],
    ['expo-go', { isExpoGo: true }],
    ['no-module', { hasNativeModule: false }],
  ])('reports %s without asking the native module', async (expected, over) => {
    const e = env(over);
    expect(await checkARCapability(e)).toBe(expected);
    expect(e.probe).not.toHaveBeenCalled();
  });

  test('web wins over every other condition', async () => {
    expect(await checkARCapability(env({ platform: 'web', isExpoGo: true, hasNativeModule: false }))).toBe('web');
  });

  test('Expo Go is named as the cause, not a missing module', async () => {
    expect(await checkARCapability(env({ isExpoGo: true, hasNativeModule: false }))).toBe('expo-go');
  });

  test('an unsupported device is reported as unsupported', async () => {
    expect(await checkARCapability(env({ probe: async () => 'UNSUPPORTED' }))).toBe('unsupported');
  });

  test('an unknown answer is a failed check, never ready', async () => {
    expect(await checkARCapability(env({ probe: async () => 'UNKNOWN' }))).toBe('check-failed');
  });

  test('a probe that throws is a failed check, not a crash', async () => {
    expect(await checkARCapability(env({ probe: async () => { throw new Error('native failure'); } }))).toBe('check-failed');
  });

  test('asks again while ARCore is still checking', async () => {
    const answers: ARProbeResult[] = ['TRANSIENT', 'TRANSIENT', 'SUPPORTED'];
    const e = env({ probe: jest.fn(async () => answers.shift()!) });
    expect(await checkARCapability(e)).toBe('ready');
    expect(e.probe).toHaveBeenCalledTimes(3);
    expect(e.wait).toHaveBeenCalledTimes(2);
  });

  test('gives up when ARCore never stops checking', async () => {
    const e = env({ probe: jest.fn(async () => 'TRANSIENT' as ARProbeResult) });
    expect(await checkARCapability(e)).toBe('check-failed');
    expect(e.probe).toHaveBeenCalledTimes(5);
  });

  test('a native callback that never fires ends as a failed check', async () => {
    jest.useFakeTimers();
    try {
      const pending = checkARCapability(env({ probe: () => new Promise<ARProbeResult>(() => undefined) }));
      await jest.advanceTimersByTimeAsync(5000);
      expect(await pending).toBe('check-failed');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('probeResultFromError', () => {
  test.each([
    [new Error('UNSUPPORTED'), 'UNSUPPORTED'],
    [new Error('TRANSIENT'), 'TRANSIENT'],
    [new Error('UNKNOWN'), 'UNKNOWN'],
    [new Error('anything else'), 'UNKNOWN'],
    ['AR Support Unknown.', 'UNKNOWN'],
    [undefined, 'UNKNOWN'],
  ])('maps %s to %s', (error, expected) => {
    expect(probeResultFromError(error)).toBe(expected);
  });
});

describe('unavailable messages', () => {
  const copies = Object.entries(AR_UNAVAILABLE_COPY);

  test('exist for all six reasons and are distinct', () => {
    expect(copies.map(([k]) => k).sort()).toEqual(['check-failed', 'expo-go', 'no-module', 'platform', 'unsupported', 'web']);
    expect(new Set(copies.map(([, c]) => c.title)).size).toBe(6);
  });

  test.each(copies)('%s makes no accuracy or success claim', (_key, copy) => {
    const text = `${copy.badge} ${copy.title} ${copy.body}`;
    expect(text).not.toMatch(/centimet|accura|certified|calibrated|precise/i);
    expect(text).not.toMatch(/\b(AR|camera|anchoring|tracking)\b[^.]{0,20}\b(is\s+)?(ready|enabled|active|running|working)\b/i);
  });

  test('name the actual cause', () => {
    expect(AR_UNAVAILABLE_COPY.web.body).toMatch(/web browser/);
    expect(AR_UNAVAILABLE_COPY['expo-go'].body).toMatch(/Expo Go/);
    expect(AR_UNAVAILABLE_COPY['expo-go'].body).toMatch(/development build/);
    expect(AR_UNAVAILABLE_COPY['no-module'].body).toMatch(/ViroReact/);
    expect(AR_UNAVAILABLE_COPY.unsupported.body).toMatch(/ARCore/);
    expect(AR_UNAVAILABLE_COPY.platform.body).toMatch(/iOS has not been/);
    expect(AR_UNAVAILABLE_COPY['check-failed'].body).toMatch(/Google Play Services for AR/);
  });
});
