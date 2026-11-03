import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

const SIZE = 180;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC = CIRCUMFERENCE * 0.75;

/** 270-degree state-of-charge gauge for a simulated interval; never a thermostat or live reading. */
export function SocGauge({ socPct, caption }: { socPct: number; caption: string }) {
  const { tokens: t } = useTheme();
  const filled = ARC * Math.min(Math.max(socPct, 0), 100) / 100;
  return <View accessible accessibilityRole="image" accessibilityLabel={`Simulated battery ${socPct.toFixed(1)} percent. ${caption}`} style={{ alignSelf: 'center', width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute' }}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={t.surfaceElevated} strokeWidth={STROKE} fill="none" strokeLinecap="round" strokeDasharray={`${ARC} ${CIRCUMFERENCE}`} rotation={135} origin={`${SIZE / 2},${SIZE / 2}`} />
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={t.limeMark} strokeWidth={STROKE} fill="none" strokeLinecap="round" strokeDasharray={`${filled} ${CIRCUMFERENCE}`} rotation={135} origin={`${SIZE / 2},${SIZE / 2}`} />
      </Svg>
    </View>
    <Text style={{ color: t.textPrimary, fontSize: 32, lineHeight: 38, fontWeight: '700' }}>{socPct.toFixed(1)}%</Text>
    <Text style={{ color: t.textSecondary, fontSize: 12, lineHeight: 17, textAlign: 'center', maxWidth: 110 }}>{caption}</Text>
  </View>;
}
