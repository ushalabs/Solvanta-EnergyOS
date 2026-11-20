import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING } from '../theme/tokens';
import { Action, Card, CardHeader, Field, Message, Metric, MetricGrid } from './TwinControls';
import { WeatherScene, isDaytime } from './WeatherScene';
import type { WeatherKind } from '../local/weather';

/** The last city that returned weather, kept on this device so the compact card can load without typing. */
export const WEATHER_CITY_KEY = '@solvanta_weather_city';

interface CurrentWeather {
  location: string;
  condition: string;
  kind?: WeatherKind;
  is_day?: boolean;
  temperature_c: number;
  humidity_pct: number;
  wind_kph: number;
  cloud_cover_pct: number;
  updated_at: string;
}

interface WeatherForecast {
  current: CurrentWeather;
  days: Array<{ date: string; condition: string; kind?: WeatherKind; min_c: number; max_c: number; rain_chance_pct: number }>;
}

interface SolarForecast {
  location: string;
  capacity_kwp: number;
  days: Array<{ date: string; energy_kwh: number; peak_power_kw: number }>;
}

/** While the app is open, the reading is refreshed this often. */
export const WEATHER_REFRESH_MS = 15 * 60 * 1000;

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
  const [daytime, setDaytime] = useState(isDaytime());
  const savedCity = useRef('');
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
      savedCity.current = location;
      AsyncStorage.setItem(WEATHER_CITY_KEY, location).catch(() => {});
      if (buildingId) {
        try {
          setSolar(await api.get<SolarForecast>(`/weather/solar/${encodeURIComponent(buildingId)}${query}`));
        } catch (error) {
          setSolarMessage(error instanceof Error ? error.message : 'Solar forecast unavailable.');
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Weather is temporarily unavailable.');
    } finally {
      setLoading(false);
      setDaytime(isDaytime());
    }
  }

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(WEATHER_CITY_KEY)
      .then(saved => { if (active && saved) { savedCity.current = saved; setCity(saved); loadWeather(saved); } })
      .catch(() => {});
    // Stay current while connected; offline the scene still switches between sun and moon.
    const timer = setInterval(() => {
      setDaytime(isDaytime());
      if (active && savedCity.current) loadWeather(savedCity.current);
    }, WEATHER_REFRESH_MS);
    return () => { active = false; clearInterval(timer); };
    // Runs once per mount; the screen remounts this card when the building changes.
  }, []);

  if (compact && !expanded) {
    const updated = weather ? clock(weather.updated_at) : '';
    const isDay = weather?.is_day ?? daytime;
    // Without a reading (offline or failed) the box shows only the sun or the moon for the time of day.
    const hint = loading ? 'Checking weather…' : !message && !city.trim() ? 'Set a city' : '';
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
        <WeatherScene kind={weather?.kind} isDay={isDay} temperatureC={weather?.temperature_c} size={weather ? 40 : 32} />
        {weather ? <View style={{ flexShrink: 1 }}>
          <Text style={{ color: t.textSecondary, fontSize: 12, lineHeight: 16 }}>{weather.condition}</Text>
          <Text style={{ color: t.textPrimary, fontSize: 20, lineHeight: 26, fontWeight: '700' }}>{`${Math.round(weather.temperature_c)}°C`}</Text>
          <Text style={{ color: t.textSecondary, fontSize: 12, lineHeight: 16 }}>{`Cloud ${Math.round(weather.cloud_cover_pct)}% · live${updated ? ` ${updated}` : ''}`}</Text>
        </View> : hint ? <Text style={{ color: t.textSecondary, fontSize: 12, lineHeight: 16 }}>{hint}</Text> : null}
      </TouchableOpacity>
    );
  }

  return (
    <Card>
      <CardHeader title="Weather & solar outlook" subtitle="Current conditions and three-day forecasts from Open-Meteo.com" />
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
          <WeatherScene kind={weather.kind} isDay={weather.is_day ?? daytime} temperatureC={weather.temperature_c} size={64} testID="weather-scene-large" />
          <View style={{ flexShrink: 1 }}><Message>{weather.location} · {weather.condition}</Message></View>
        </View>
        <MetricGrid>
          <Metric label="Temperature" value={weather.temperature_c} unit="°C" />
          <Metric label="Humidity" value={weather.humidity_pct} unit="%" />
          <Metric label="Wind" value={weather.wind_kph} unit="km/h" />
          <Metric label="Cloud cover" value={weather.cloud_cover_pct} unit="%" />
        </MetricGrid>
        <Message>Updated {new Date(weather.updated_at).toLocaleString()}</Message>
      </>}
      {forecast?.days.map(day => (
        <View key={day.date} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <WeatherScene kind={day.kind} isDay temperatureC={day.max_c} size={28} testID="weather-scene-day" />
          <View style={{ flexShrink: 1 }}><Message>
            {day.date} · {day.condition} · {day.min_c}–{day.max_c} °C · {day.rain_chance_pct}% chance of rain
          </Message></View>
        </View>
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
