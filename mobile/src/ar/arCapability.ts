/** The values ViroReact's Android module reports for ARCore availability. */
export type ARProbeResult = 'SUPPORTED' | 'UNSUPPORTED' | 'TRANSIENT' | 'UNKNOWN';
export type ARUnavailable = 'web' | 'platform' | 'expo-go' | 'no-module' | 'unsupported' | 'check-failed';
export type ARCapability = 'ready' | ARUnavailable;

export type AREnvironment = {
  platform: string;
  isExpoGo: boolean;
  hasNativeModule: boolean;
  probe: () => Promise<ARProbeResult>;
  wait?: (ms: number) => Promise<void>;
};

// ARCore answers TRANSIENT while it is still checking the device, so ask again before giving up.
const PROBE_ATTEMPTS = 5;
const PROBE_RETRY_MS = 400;
const PROBE_TIMEOUT_MS = 5000;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function withTimeout(probe: Promise<ARProbeResult>): Promise<ARProbeResult> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<ARProbeResult>(resolve => { timer = setTimeout(() => resolve('UNKNOWN'), PROBE_TIMEOUT_MS); });
  return Promise.race([probe, timeout]).finally(() => clearTimeout(timer));
}

/** Decide whether AR can start here, without touching the camera or loading native AR code unless it is present. */
export async function checkARCapability(env: AREnvironment): Promise<ARCapability> {
  if (env.platform === 'web') return 'web';
  if (env.platform !== 'android') return 'platform';
  if (env.isExpoGo) return 'expo-go';
  if (!env.hasNativeModule) return 'no-module';
  const wait = env.wait ?? sleep;
  try {
    for (let attempt = 1; attempt <= PROBE_ATTEMPTS; attempt++) {
      const result = await withTimeout(env.probe());
      if (result === 'SUPPORTED') return 'ready';
      if (result === 'UNSUPPORTED') return 'unsupported';
      if (result === 'UNKNOWN') return 'check-failed';
      if (attempt < PROBE_ATTEMPTS) await wait(PROBE_RETRY_MS);
    }
  } catch {
    return 'check-failed';
  }
  return 'check-failed';
}

/** isARSupportedOnDevice rejects with the availability name when the answer is not SUPPORTED. */
export function probeResultFromError(error: unknown): ARProbeResult {
  const text = error instanceof Error ? error.message : String(error);
  return text === 'UNSUPPORTED' || text === 'TRANSIENT' ? text : 'UNKNOWN';
}

export const AR_UNAVAILABLE_COPY: Record<ARUnavailable, { badge: string; title: string; body: string }> = {
  web: {
    badge: 'AR NOT AVAILABLE ON WEB',
    title: 'AR preview needs the Android app',
    body: 'Camera AR runs only in the Android development build on a phone with ARCore. It cannot run in a web browser.',
  },
  platform: {
    badge: 'ANDROID ONLY FOR NOW',
    title: 'AR preview is not set up on this platform',
    body: 'This AR preview is built for Android with ARCore. iOS has not been configured or tested.',
  },
  'expo-go': {
    badge: 'DEVELOPMENT BUILD NEEDED',
    title: 'Expo Go cannot open AR',
    body: 'ViroReact needs native code that Expo Go does not include. Install the Solvanta development build to open AR.',
  },
  'no-module': {
    badge: 'DEVELOPMENT BUILD NEEDED',
    title: 'This build has no AR module',
    body: 'The native ViroReact module is missing from this build. Install a Solvanta development build made from this branch.',
  },
  unsupported: {
    badge: 'ARCORE NOT SUPPORTED',
    title: 'This device cannot run AR',
    body: 'ARCore reports that this device is not supported, so camera AR cannot start here.',
  },
  'check-failed': {
    badge: 'ARCORE CHECK FAILED',
    title: 'Could not confirm ARCore support',
    body: 'The device did not give a clear answer about ARCore. Check the internet connection and Google Play Services for AR, then try again.',
  },
};
