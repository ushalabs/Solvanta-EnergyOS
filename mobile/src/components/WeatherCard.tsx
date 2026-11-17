import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cloud, CloudRain, CloudSun, Sun } from 'lucide-react-native';
import { api, SolvantaApiError } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING } from '../theme/tokens';
import { Action, Card, CardHeader, Field, Message, Metric, MetricGrid } from './TwinControls';

/** The last city that returned weather, kept on this device so the compact card can load without typing. */
export const WEATHER_CITY_KEY = '@solvanta_weather_city';

interface CurrentWeather {
  location: string;
  condition: string;
  temperature_c: number;
  humidity_pct: number;
  wind_kph: number;
  cloud_cover_pct: number;
  updated_at: string;
}

interface WeatherForecast {
  current: CurrentWeather;
  days: Array<{ date: string; condition: string; min_c: number; max_c: number; rain_chance_pct: number }>;
}

interface SolarForecast {
  location: string;
  capacity_kwp: number;
  days: Array<{ date: string; energy_kwh: number; peak_power_kw: number }>;
}

function conditionIcon(condition: string) {
  const text = condition.toLowerCase();
  if (/rain|drizzle|shower|thunder|storm/.test(text)) return CloudRain;
  if (/partly|mostly|interval/.test(text)) return CloudSun;
  if (/cloud|overcast|mist|fog|haze/.test(text)) return Cloud;
  if (/sun|clear/.test(text)) return Sun;
  return CloudSun;
}

const clock = (iso: string) => {
  const time = new Date(iso);
  return Number.isNaN(time.getTime()) ? '' : time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * `compact` starts as a small summary that opens the full card when pressed.
 * Either way the last city is remembered on the device and loaded on mount.
 */
export function WeatherCard({ buildingId, compact = false }: { buildingId?: string; compact?: boolean }) {
  const { tokens: t } = useTheme();
  const [city, setCity] = useState('');
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [solar, setSolar] = useState<SolarForecast | null>(null);
  const [solarMessage, setSolarMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(!compact);
  const weather = forecast?.current;

  async function loadWeather(requested = city) {
    const location = requested.trim();
    if (!location || location.length > 100 || loading) return;

    setLoading(true);
    setMessage('');
    setForecast(null);
    setSolar(null);
    setSolarMessage('');
    try {
      const query = `?city=${encodeURIComponent(location)}`;
      const reading = await api.get<WeatherForecast>(`/weather/forecast${query}`);
      setForecast(reading);
      AsyncStorage.setItem(WEATHER_CITY_KEY, location).catch(() => {});
      if (buildingId) {
        try {
          setSolar(await api.get<SolarForecast>(`/weather/solar/${encodeURIComponent(buildingId)}${query}`));
        } catch (error) {
          setSolarMessage(error instanceof Error ? error.message : 'Solar forecast unavailable.');
        }
      }
    } catch (error) {
      setMessage(error instanceof SolvantaApiError && error.status === 401
        ? 'Sign in to the Solvanta backend in Settings to check the weather.'
        : error instanceof Error ? error.message : 'Weather is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(WEATHER_CITY_KEY)
      .then(saved => { if (active && saved) { setCity(saved); loadWeather(saved); } })
      .catch(() => {});
    return () => { active = false; };
    // Runs once per mount; the screen remounts this card when the building changes.
  }, []);

  if (compact && !expanded) {
    const Icon = weather ? conditionIcon(weather.condition) : CloudSun;
    const updated = weather ? clock(weather.updated_at) : '';
    const status = loading ? 'Checking weather…' : message ? 'Weather unavailable' : city.trim() ? 'No reading yet' : 'Set a city';
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={weather
          ? `Live weather in ${weather.location}: ${weather.condition}, ${Math.round(weather.temperature_c)} °C, cloud cover ${Math.round(weather.cloud_cover_pct)}%. Show details`
          : `Weather: ${status}. Show details`}
        onPress={() => setExpanded(true)}
        style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 64, maxWidth: '100%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface }}
      >
        <Icon size={28} color={t.amberText} />
        <View style={{ flexShrink: 1 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, lineHeight: 16 }}>{weather ? weather.condition : 'Weather'}</Text>
          <Text style={{ color: t.textPrimary, fontSize: 20, lineHeight: 26, fontWeight: '700' }}>{weather ? `${Math.round(weather.temperature_c)}°C` : '—'}</Text>
          <Text style={{ color: t.textSecondary, fontSize: 12, lineHeight: 16 }}>
            {weather ? `Cloud ${Math.round(weather.cloud_cover_pct)}% · live${updated ? ` ${updated}` : ''}` : status}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Card>
      <CardHeader title="Weather & solar outlook" subtitle="Current conditions and three-day forecasts from WeatherAPI.com" />
      <Field label="City or coordinates" value={city} onChange={setCity} hint="Use your site's city and country, or latitude, longitude." />
      <Action
        title="Check weather"
        onPress={() => loadWeather()}
        disabled={!city.trim() || city.trim().length > 100 || loading}
        loading={loading}
        variant="secondary"
      />
      {message ? <Message tone="warning">{message}</Message> : null}
      {weather && <>
        <Message>{weather.location} · {weather.condition}</Message>
        <MetricGrid>
          <Metric label="Temperature" value={weather.temperature_c} unit="°C" />
          <Metric label="Humidity" value={weather.humidity_pct} unit="%" />
          <Metric label="Wind" value={weather.wind_kph} unit="km/h" />
          <Metric label="Cloud cover" value={weather.cloud_cover_pct} unit="%" />
        </MetricGrid>
        <Message>Updated {new Date(weather.updated_at).toLocaleString()}</Message>
      </>}
      {forecast?.days.map(day => (
        <Message key={day.date}>
          {day.date} · {day.condition} · {day.min_c}–{day.max_c} °C · {day.rain_chance_pct}% chance of rain
        </Message>
      ))}
      {solarMessage ? <Message tone="warning">Solar forecast · {solarMessage}</Message> : null}
      {solar && <Card nested>
        <CardHeader title="Solar production forecast" subtitle={`${solar.location} · ${solar.capacity_kwp} kWp saved array`} badge="FORECAST" />
        {solar.days.map(day => (
          <Message key={day.date}>
            {day.date} · {day.energy_kwh.toFixed(2)} kWh estimated AC generation · {day.peak_power_kw.toFixed(2)} kW peak
          </Message>
        ))}
      </Card>}
      {compact ? <Action title="Hide weather details" variant="secondary" onPress={() => setExpanded(false)} /> : null}
    </Card>
  );
}
