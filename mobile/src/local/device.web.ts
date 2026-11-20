// Web preview: the on-device database is part of the Android/iOS app. Metro picks this file for web builds,
// so expo-sqlite's WebAssembly worker is never bundled into the static web export.
import { httpError } from '../api/errors';
import type { LocalApi } from './localApi';
import { WeatherService } from './weather';

export const WEB_UNAVAILABLE = 'Building data is stored on the phone. Open Solvanta in the Android app to use this screen.';

export function deviceApi(): Pick<LocalApi, 'handle'> {
  return { handle: async () => { throw httpError(503, WEB_UNAVAILABLE); } };
}

/** Weather works on web too; only the solar forecast needs the building, which lives in the app. */
export function deviceWeather(): WeatherService {
  return new WeatherService(() => Promise.reject(httpError(503, WEB_UNAVAILABLE)));
}
