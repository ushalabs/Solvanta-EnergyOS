// The app's single on-device database (expo-sqlite), opened on first use.
import type { SqlDb } from './db';
import { LocalApi } from './localApi';
import { WeatherService } from './weather';
import { withDemoBuilding } from './demo';

/**
 * One connection and one API for the whole JavaScript runtime. They live on globalThis, not in module variables,
 * because a module can run again (Fast Refresh during development). A second connection to the same file would be
 * closed when the first one is garbage-collected, and would interleave transactions with it.
 */
type DeviceState = { database?: Promise<any>; api?: ReturnType<typeof withDemoBuilding>; weather?: WeatherService };
const state: DeviceState = ((globalThis as any).__solvantaDevice ??= {});

export function expoSqliteDb(name = 'solvanta.db'): SqlDb {
  // Loaded lazily so screens and tests that never touch data do not need the native module.
  const open = () => (state.database ??= require('expo-sqlite').openDatabaseAsync(name));
  return {
    exec: async sql => { await (await open()).execAsync(sql); },
    run: async (sql, params = []) => { await (await open()).runAsync(sql, params); },
    all: async (sql, params = []) => (await open()).getAllAsync(sql, params),
    get: async (sql, params = []) => (await open()).getFirstAsync(sql, params),
  };
}

/** The on-device API. A device without any building gets the demo building on first use. */
export function deviceApi(): ReturnType<typeof withDemoBuilding> {
  return (state.api ??= withDemoBuilding(new LocalApi(expoSqliteDb())));
}

/** Live weather from Open-Meteo; the solar forecast reads the building from the on-device database. */
export function deviceWeather(): WeatherService {
  return (state.weather ??= new WeatherService(id => deviceApi().handle('GET', `/buildings/${encodeURIComponent(id)}`) as Promise<Record<string, any>>));
}
