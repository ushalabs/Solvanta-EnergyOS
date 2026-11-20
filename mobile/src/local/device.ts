// The app's single on-device database (expo-sqlite), opened on first use.
import type { SqlDb } from './db';
import { LocalApi } from './localApi';
import { WeatherService } from './weather';
import { withDemoBuilding } from './demo';

export function expoSqliteDb(name = 'solvanta.db'): SqlDb {
  let database: Promise<any> | null = null;
  // Loaded lazily so screens and tests that never touch data do not need the native module.
  const open = () => (database ??= require('expo-sqlite').openDatabaseAsync(name));
  return {
    exec: async sql => { await (await open()).execAsync(sql); },
    run: async (sql, params = []) => { await (await open()).runAsync(sql, params); },
    all: async (sql, params = []) => (await open()).getAllAsync(sql, params),
    get: async (sql, params = []) => (await open()).getFirstAsync(sql, params),
  };
}

let instance: LocalApi | null = null;
let seeded: ReturnType<typeof withDemoBuilding> | null = null;

/** The on-device API. A device without any building gets the demo building on first use. */
export function deviceApi(): ReturnType<typeof withDemoBuilding> {
  instance ??= new LocalApi(expoSqliteDb());
  return (seeded ??= withDemoBuilding(instance));
}

let weather: WeatherService | null = null;

/** Live weather from Open-Meteo; the solar forecast reads the building from the on-device database. */
export function deviceWeather(): WeatherService {
  return (weather ??= new WeatherService(id => deviceApi().handle('GET', `/buildings/${encodeURIComponent(id)}`) as Promise<Record<string, any>>));
}
