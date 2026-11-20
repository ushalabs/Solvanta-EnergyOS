// Live weather and a weather-based solar forecast, fetched straight from Open-Meteo (free, no API key).
// Replaces backend/app/api/v1/endpoints/weather.py; the routes and response shapes stay the same.
// The solar forecast turns Open-Meteo's hourly irradiance on the panel plane into AC power with the
// building's own PV assumptions, so no paid "solar" plan is needed.
import { httpError } from '../api/errors';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 8000;
export const WEATHER_SOURCE = 'Open-Meteo.com';

type Fetch = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;
type Place = { name: string; latitude: number; longitude: number };
type Body = Record<string, any>;

/** WMO weather interpretation codes, as Open-Meteo reports them. */
const WMO: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Depositing rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle', 56: 'Light freezing drizzle', 57: 'Freezing drizzle',
  61: 'Slight rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Light freezing rain', 67: 'Freezing rain',
  71: 'Slight snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Slight rain showers', 81: 'Rain showers',
  82: 'Violent rain showers', 85: 'Slight snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
};
export const conditionText = (code: unknown) => WMO[Number(code)] ?? 'Unknown conditions';

/** What the weather scene draws. */
export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';

export function weatherKind(code: unknown): WeatherKind {
  const c = Number(code);
  if (c === 0 || c === 1) return 'clear';
  if (c === 2) return 'partly';
  if (c === 3) return 'cloudy';
  if (c === 45 || c === 48) return 'fog';
  if (c >= 51 && c <= 57) return 'drizzle';
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if (c >= 95) return 'thunder';
  return 'cloudy';
}

const finite = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('incomplete');
  return value;
};

export class WeatherService {
  constructor(
    private getBuilding: (id: string) => Promise<Body>,
    private fetchFn: Fetch = (url, init) => fetch(url, init),
  ) {}

  async handle(method: string, path: string): Promise<unknown> {
    const url = new URL(path, 'http://device');
    const city = url.searchParams.get('city') ?? '';
    if (method.toUpperCase() !== 'GET') throw httpError(405, 'Weather is read-only.');
    if (url.pathname === '/weather/current') return (await this.forecast(city)).current;
    if (url.pathname === '/weather/forecast') return this.forecast(city);
    const solar = /^\/weather\/solar\/([^/]+)$/.exec(url.pathname);
    if (solar) return this.solar(decodeURIComponent(solar[1]), city);
    throw httpError(404, 'Not available on this device');
  }

  private async get(url: string): Promise<Body> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await this.fetchFn(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch {
      throw httpError(502, 'Weather is temporarily unavailable. Check the internet connection and try again.');
    } finally {
      clearTimeout(timer);
    }
  }

  /** "Lahore", "Lahore, Pakistan" or "31.52, 74.36". */
  async place(query: string): Promise<Place> {
    const text = query.trim();
    if (!text) throw httpError(422, 'Enter a city for the weather lookup.');
    if (text.length > 100) throw httpError(422, 'Enter a shorter city name.');
    const coordinates = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(text);
    if (coordinates) {
      const latitude = Number(coordinates[1]), longitude = Number(coordinates[2]);
      if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw httpError(422, 'Coordinates must be latitude, longitude.');
      return { name: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`, latitude, longitude };
    }
    const [name, ...rest] = text.split(',').map(part => part.trim()).filter(Boolean);
    const country = rest.join(', ').toLowerCase();
    const data = await this.get(`${GEOCODING_URL}?name=${encodeURIComponent(name)}&count=10&language=en&format=json`);
    const results: Body[] = Array.isArray(data.results) ? data.results : [];
    const match = (country && results.find(r => [r.country, r.country_code, r.admin1].some(v => typeof v === 'string' && v.toLowerCase() === country))) || results[0];
    if (!match) throw httpError(404, 'Location not found. Try including the country.');
    return { name: [match.name, match.country].filter(Boolean).join(', '), latitude: match.latitude, longitude: match.longitude };
  }

  async forecast(city: string) {
    const place = await this.place(city);
    const data = await this.get(`${FORECAST_URL}?latitude=${place.latitude}&longitude=${place.longitude}`
      + '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover,weather_code,is_day'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
      + '&timezone=auto&forecast_days=3');
    try {
      const c = data.current, d = data.daily;
      const offset = finite(data.utc_offset_seconds ?? 0);
      const current = {
        location: place.name, condition: conditionText(c.weather_code), kind: weatherKind(c.weather_code), is_day: c.is_day !== 0,
        temperature_c: finite(c.temperature_2m),
        humidity_pct: finite(c.relative_humidity_2m), wind_kph: finite(c.wind_speed_10m), cloud_cover_pct: finite(c.cloud_cover),
        // Open-Meteo gives local time without an offset when timezone=auto.
        updated_at: new Date(Date.parse(`${c.time}Z`) - offset * 1000).toISOString(),
      };
      const days = (d.time as string[]).slice(0, 3).map((date, i) => ({
        date, condition: conditionText(d.weather_code[i]), kind: weatherKind(d.weather_code[i]), min_c: finite(d.temperature_2m_min[i]), max_c: finite(d.temperature_2m_max[i]),
        rain_chance_pct: typeof d.precipitation_probability_max?.[i] === 'number' ? d.precipitation_probability_max[i] : 0,
      }));
      if (!days.length) throw new Error('incomplete');
      return { current, days };
    } catch {
      throw httpError(502, 'Weather provider returned incomplete forecast data.');
    }
  }

  async solar(buildingId: string, city: string) {
    const b = await this.getBuilding(buildingId);
    if (!(b.pv_capacity_kwp > 0) || !(b.inverter_rating_kw > 0)) throw httpError(422, 'Save a positive solar capacity and inverter rating in Settings first.');
    const place = await this.place(city);
    // Open-Meteo azimuth: 0 = south, -90 = east, 90 = west. Buildings store 180 = south, 90 = east.
    const azimuth = ((((b.pv_panel_azimuth_deg ?? 180) - 180) % 360) + 540) % 360 - 180;
    const data = await this.get(`${FORECAST_URL}?latitude=${place.latitude}&longitude=${place.longitude}`
      + `&hourly=global_tilted_irradiance,temperature_2m&tilt=${b.pv_panel_tilt_deg ?? 25}&azimuth=${azimuth}`
      + '&timezone=auto&forecast_days=3');
    try {
      const times: string[] = data.hourly.time;
      const byDay = new Map<string, number[]>();
      times.forEach((time, i) => {
        const poa = Math.max(0, finite(data.hourly.global_tilted_irradiance[i]));
        const air = finite(data.hourly.temperature_2m[i]);
        // Same preliminary model as the PV estimate: temperature coefficient -0.4 %/°C, then losses and inverter limit.
        // Cell temperature from air temperature and irradiance (Ross model, 0.03 °C per W/m²).
        const cell = air + 0.03 * poa;
        const dc = Math.max(0, b.pv_capacity_kwp * poa / 1000 * (1 - 0.004 * (cell - 25)) * (1 - (b.pv_system_losses_pct ?? 14) / 100));
        const ac = Math.min(b.inverter_rating_kw, dc * (b.inverter_efficiency_pct ?? 96) / 100);
        const day = time.slice(0, 10);
        byDay.set(day, [...(byDay.get(day) ?? []), ac]);
      });
      const days = [...byDay.entries()].slice(0, 3).map(([date, hours]) => ({
        date, energy_kwh: hours.reduce((t, kw) => t + kw, 0), peak_power_kw: Math.max(0, ...hours),
      }));
      if (!days.length) throw new Error('incomplete');
      return { location: place.name, capacity_kwp: b.pv_capacity_kwp, days };
    } catch {
      throw httpError(502, 'Weather provider returned incomplete solar forecast data.');
    }
  }
}
