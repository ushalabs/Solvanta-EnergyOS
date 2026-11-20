// A small animated weather picture: sun or moon by day/night, clouds, falling rain or snow, lightning.
// Colour follows temperature (cold blue, mild amber, hot red). Motion stops when the system asks for reduced motion.
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Cloud, Moon, Sun, Zap } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { WeatherKind } from '../local/weather';

const AnimatedView = Animated.createAnimatedComponent(View);

/** Without a reading (offline, or no city yet) the scene shows only the sun or the moon for the local time. */
export const isDaytime = (date = new Date()) => date.getHours() >= 6 && date.getHours() < 18;

export type TemperatureBand = 'cold' | 'mild' | 'hot';
export const temperatureBand = (celsius?: number | null): TemperatureBand =>
  celsius == null || !Number.isFinite(celsius) ? 'mild' : celsius <= 10 ? 'cold' : celsius >= 32 ? 'hot' : 'mild';

const CLOUDY: WeatherKind[] = ['partly', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'thunder'];

/** 0 → 1 forever, or held at `rest` when motion is reduced or there is no live reading. */
function useLoop(duration: number, rest = 0, still = false) {
  const reduced = useReducedMotion() || still;
  const progress = useSharedValue(rest);
  useEffect(() => {
    if (reduced) { progress.value = rest; return; }
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(progress);
  }, [reduced, duration]);
  return progress;
}

function Particle({ x, size, duration, snow, color, travel }: { x: number; size: number; duration: number; snow: boolean; color: string; travel: number }) {
  const progress = useLoop(duration, 0.5);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * travel }, { translateX: snow ? Math.sin(progress.value * Math.PI * 2) * 2 : -progress.value * 3 }],
    opacity: progress.value < 0.85 ? 1 : (1 - progress.value) / 0.15,
  }));
  const shape = snow
    ? { width: size * 0.09, height: size * 0.09, borderRadius: size }
    : { width: Math.max(1.5, size * 0.04), height: size * 0.16, borderRadius: size };
  return <AnimatedView testID={snow ? 'weather-snow' : 'weather-drop'} style={[{ position: 'absolute', left: x, top: size * 0.62, backgroundColor: color }, shape, style]} />;
}

export function WeatherScene({ kind, isDay, temperatureC, size = 40, testID = 'weather-scene' }: { kind?: WeatherKind | null; isDay: boolean; temperatureC?: number | null; size?: number; testID?: string }) {
  const { tokens: t } = useTheme();
  const band = temperatureBand(temperatureC);
  const sunColor = band === 'cold' ? t.cyanText : band === 'hot' ? t.redText : t.amberText;
  const moonColor = band === 'cold' ? t.cyanText : t.textPrimary;
  // Offline (no kind) the scene is a still sun or moon; only a live reading moves.
  const still = !kind;
  const spin = useLoop(24000, 0, still);
  const glow = useLoop(3200, 0.5, still);
  const flash = useLoop(2600, 0, !kind || kind !== 'thunder');
  const sunStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const starStyle = useAnimatedStyle(() => ({ opacity: 0.35 + 0.65 * Math.abs(Math.sin(glow.value * Math.PI)) }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value > 0.82 && flash.value < 0.9 ? 1 : 0.15 }));
  const cloudy = !!kind && CLOUDY.includes(kind);
  const wet = kind === 'rain' || kind === 'drizzle' || kind === 'thunder';
  const body = cloudy ? size * 0.62 : size * 0.86;
  const particles = kind === 'snow' ? 4 : kind === 'drizzle' ? 3 : wet ? 5 : 0;
  const label = `${isDay ? 'Day' : 'Night'}${kind ? `, ${kind}` : ''}${temperatureC != null && Number.isFinite(temperatureC) ? `, ${band}` : ''}`;
  return (
    <View testID={testID} accessible accessibilityLabel={label} style={{ width: size, height: size, overflow: 'hidden' }}>
      <AnimatedView style={[{ position: 'absolute', left: cloudy ? 0 : (size - body) / 2, top: cloudy ? 0 : (size - body) / 2 }, isDay ? sunStyle : null]}>
        {isDay ? <Sun testID="weather-sun" size={body} color={sunColor} /> : <Moon testID="weather-moon" size={body} color={moonColor} />}
      </AnimatedView>
      {!isDay && !cloudy && <>
        <AnimatedView style={[{ position: 'absolute', right: size * 0.06, top: size * 0.08, width: size * 0.07, height: size * 0.07, borderRadius: size, backgroundColor: moonColor }, starStyle]} />
        <AnimatedView style={[{ position: 'absolute', right: size * 0.2, bottom: size * 0.14, width: size * 0.05, height: size * 0.05, borderRadius: size, backgroundColor: moonColor }, starStyle]} />
      </>}
      {cloudy && <View style={{ position: 'absolute', right: 0, top: size * 0.18, opacity: kind === 'fog' ? 0.6 : 1 }}>
        <Cloud testID="weather-cloud" size={size * 0.78} color={t.textSecondary} fill={t.surfaceElevated} />
      </View>}
      {kind === 'thunder' && <AnimatedView style={[{ position: 'absolute', left: size * 0.42, top: size * 0.5 }, flashStyle]}>
        <Zap testID="weather-lightning" size={size * 0.36} color={t.amberText} fill={t.amberText} />
      </AnimatedView>}
      {Array.from({ length: particles }, (_, i) => (
        <Particle key={i} x={size * (0.3 + i * 0.13)} size={size} snow={kind === 'snow'} color={kind === 'snow' ? t.textPrimary : t.cyanText}
          duration={(kind === 'snow' ? 2400 : kind === 'drizzle' ? 1300 : 800) + i * 137} travel={size * 0.34} />
      ))}
    </View>
  );
}
