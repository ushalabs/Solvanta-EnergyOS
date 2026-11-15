import React, { useState } from 'react';
import { api, SolvantaApiError } from '../api/client';
import { Action, Card, CardHeader, Field, Message, Metric, MetricGrid } from './TwinControls';

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

export function WeatherCard({ buildingId }: { buildingId?: string }) {
  const [city, setCity] = useState('');
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [solar, setSolar] = useState<SolarForecast | null>(null);
  const [solarMessage, setSolarMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const weather = forecast?.current;

  async function loadWeather() {
    const location = city.trim();
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

  return (
    <Card>
      <CardHeader title="Weather & solar outlook" subtitle="Current conditions and three-day forecasts from WeatherAPI.com" />
      <Field label="City or coordinates" value={city} onChange={setCity} hint="Use your site's city and country, or latitude, longitude." />
      <Action
        title="Check weather"
        onPress={loadWeather}
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
        <CardHeader title="Solar production forecast" subtitle={`${solar.location} · ${solar.capacity_kwp} kWp saved array`} />
        {solar.days.map(day => (
          <Message key={day.date}>
            {day.date} · {day.energy_kwh.toFixed(2)} kWh estimated AC generation · {day.peak_power_kw.toFixed(2)} kW peak
          </Message>
        ))}
      </Card>}
    </Card>
  );
}
