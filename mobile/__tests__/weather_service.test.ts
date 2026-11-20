// Weather from Open-Meteo through the same /weather routes the backend served, with fetch mocked.
import { WeatherService, weatherKind, conditionText } from '../src/local/weather';

const GEO = { results: [
  { name: 'Lahore', country: 'Pakistan', country_code: 'PK', latitude: 31.55, longitude: 74.34 },
  { name: 'Lahore', country: 'India', country_code: 'IN', latitude: 30.0, longitude: 75.0 },
] };
const FORECAST = {
  utc_offset_seconds: 18000,
  current: { time: '2026-11-20T21:00', temperature_2m: 14.2, relative_humidity_2m: 71, wind_speed_10m: 6.5, cloud_cover: 90, weather_code: 63, is_day: 0 },
  daily: { time: ['2026-11-20', '2026-11-21', '2026-11-22'], weather_code: [63, 0, 95], temperature_2m_max: [22, 24, 20], temperature_2m_min: [11, 10, 12], precipitation_probability_max: [80, null, 60] },
};
const hours = (day: string) => Array.from({ length: 24 }, (_, h) => `${day}T${String(h).padStart(2, '0')}:00`);
const SOLAR = { hourly: {
  time: [...hours('2026-11-20'), ...hours('2026-11-21')],
  global_tilted_irradiance: Array.from({ length: 48 }, (_, i) => (i % 24 >= 7 && i % 24 <= 16 ? 600 : 0)),
  temperature_2m: Array.from({ length: 48 }, () => 25),
} };
const BUILDING = { pv_capacity_kwp: 5, inverter_rating_kw: 4, pv_panel_tilt_deg: 25, pv_panel_azimuth_deg: 90, pv_system_losses_pct: 14, inverter_efficiency_pct: 96 };

function service(responses: Record<string, unknown>, ok = true) {
  const urls: string[] = [];
  const fetchFn = jest.fn(async (url: string) => {
    urls.push(url);
    const key = Object.keys(responses).find(k => url.includes(k))!;
    return { ok, status: ok ? 200 : 500, json: async () => responses[key] };
  });
  return { urls, weather: new WeatherService(async () => BUILDING, fetchFn as any) };
}

test('maps WMO codes to a condition and a scene kind', () => {
  expect([0, 2, 3, 45, 53, 63, 81, 73, 95].map(weatherKind)).toEqual(['clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'rain', 'snow', 'thunder']);
  expect(conditionText(63)).toBe('Rain');
});

test('forecast: geocodes "city, country", reports night and rain, keeps the old response shape', async () => {
  const { weather, urls } = service({ 'geocoding-api': GEO, 'api.open-meteo.com': FORECAST });
  const result: any = await weather.handle('GET', '/weather/forecast?city=Lahore%2C%20India');
  expect(urls[0]).toContain('name=Lahore');
  expect(urls[1]).toContain('latitude=30&longitude=75');
  expect(result.current).toEqual({
    location: 'Lahore, India', condition: 'Rain', kind: 'rain', is_day: false, temperature_c: 14.2, humidity_pct: 71,
    wind_kph: 6.5, cloud_cover_pct: 90, updated_at: '2026-11-20T16:00:00.000Z',
  });
  expect(result.days.map((d: any) => [d.kind, d.rain_chance_pct])).toEqual([['rain', 80], ['clear', 0], ['thunder', 60]]);
});

test('coordinates skip geocoding', async () => {
  const { weather, urls } = service({ 'api.open-meteo.com': FORECAST });
  await weather.handle('GET', '/weather/current?city=31.5%2C%2074.3');
  expect(urls).toHaveLength(1);
  expect(urls[0]).toContain('latitude=31.5&longitude=74.3');
});

test('solar forecast uses the building array, its orientation and the inverter limit', async () => {
  const { weather, urls } = service({ 'geocoding-api': GEO, 'api.open-meteo.com': SOLAR });
  const result: any = await weather.handle('GET', '/weather/solar/b1?city=Lahore');
  expect(urls[1]).toContain('tilt=25&azimuth=-90'); // building 90° (east) is Open-Meteo -90°
  // 5 kWp × 0.6 × (1 - 0.004 × 18 °C) × 0.86 × 0.96 = 2.2985 kW, under the 4 kW inverter, for 10 hours
  expect(result.days).toHaveLength(2);
  expect(result.days[0].peak_power_kw).toBeCloseTo(2.2985, 3);
  expect(result.days[0].energy_kwh).toBeCloseTo(22.985, 2);
  expect(result).toMatchObject({ location: 'Lahore, Pakistan', capacity_kwp: 5 });
});

test('no network or a failed provider becomes one readable error', async () => {
  const offline = new WeatherService(async () => BUILDING, (async () => { throw new TypeError('Network request failed'); }) as any);
  await expect(offline.handle('GET', '/weather/forecast?city=Lahore')).rejects.toMatchObject({ status: 502, message: expect.stringContaining('temporarily unavailable') });
  const { weather } = service({ 'geocoding-api': { results: [] } });
  await expect(weather.handle('GET', '/weather/forecast?city=Nowhere')).rejects.toMatchObject({ status: 404 });
  await expect(weather.handle('GET', '/weather/forecast?city=')).rejects.toMatchObject({ status: 422 });
});
