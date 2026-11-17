import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING } from '../theme/tokens';
import { Action } from './TwinControls';
import { OutageRow, TIME_STEP, DAY, addRow, canAddRow, removeRow, setFrom, setTo, stepTime } from '../api/outageRows';

const two = (n: number) => String(n).padStart(2, '0');

/** One step button, always 44px. */
function StepButton({ label, onPress, disabled, icon }: { label: string; onPress: () => void; disabled: boolean; icon: 'minus' | 'plus' }) {
  const { tokens: t } = useTheme();
  const Icon = icon === 'minus' ? Minus : Plus;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} activeOpacity={0.8} onPress={onPress} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surfaceElevated, borderWidth: 1, borderColor: t.border, opacity: disabled ? 0.45 : 1 }}><Icon size={18} color={t.textPrimary} /></TouchableOpacity>;
}

/** An hour and a minute with a step button either side of each. Hours move by 1, minutes by 15, so it works with taps alone on any phone. */
function TimeControl({ name, value, min, max, onChange }: { name: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  const { tokens: t } = useTheme();
  const hour = Math.floor(value / 60), minute = value % 60;
  const part = (kind: 'hour' | 'minute', delta: number, text: string) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <StepButton icon="minus" label={`${name} ${kind} down`} disabled={value - delta < min} onPress={() => onChange(stepTime(value, -delta, min, max))} />
    <Text style={{ minWidth: 30, textAlign: 'center', color: t.textPrimary, fontSize: 20, lineHeight: 26, fontWeight: '700' }}>{text}</Text>
    <StepButton icon="plus" label={`${name} ${kind} up`} disabled={value + delta > max} onPress={() => onChange(stepTime(value, delta, min, max))} />
  </View>;
  return <View accessible={false} accessibilityLabel={`${name} ${two(hour)}:${two(minute)}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    {part('hour', 60, two(hour))}
    <Text style={{ color: t.textSecondary, fontSize: 20, fontWeight: '700' }}>:</Text>
    {part('minute', TIME_STEP, two(minute))}
  </View>;
}

/** Outage rows with From and To times, an Add another outage button and a remove button per row. */
export function OutageRows({ rows, onChange, problem }: { rows: OutageRow[]; onChange: (rows: OutageRow[]) => void; problem?: string | null }) {
  const { tokens: t } = useTheme();
  const update = (i: number, row: OutageRow) => onChange(rows.map((r, j) => j === i ? row : r));
  return <View style={{ gap: SPACING.sm }}>
    {rows.map((row, i) => {
      const name = `Outage ${i + 1}`;
      return <View key={i} testID="outage-row" accessibilityLabel={`${name}, from ${two(Math.floor(row.from / 60))}:${two(row.from % 60)} to ${two(Math.floor(row.to / 60))}:${two(row.to % 60)}`} style={{ gap: SPACING.sm, padding: 12, borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: t.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: '600' }}>{name}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remove ${name}`} activeOpacity={0.8} onPress={() => onChange(removeRow(rows, i))} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}><Trash2 size={18} color={t.redText} /></TouchableOpacity>
        </View>
        <View style={{ gap: 2 }}><Text style={{ color: t.textSecondary, fontSize: 12, lineHeight: 16 }}>From</Text><TimeControl name={`${name} from`} value={row.from} min={0} max={DAY - TIME_STEP} onChange={v => update(i, setFrom(row, v))} /></View>
        <View style={{ gap: 2 }}><Text style={{ color: t.textSecondary, fontSize: 12, lineHeight: 16 }}>To</Text><TimeControl name={`${name} to`} value={row.to} min={TIME_STEP} max={DAY} onChange={v => update(i, setTo(row, v))} /></View>
      </View>;
    })}
    {!rows.length && <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 18 }}>No outage rows: the grid is available all day.</Text>}
    {problem ? <Text accessibilityRole="alert" style={{ color: t.amberText, fontSize: 13, lineHeight: 18 }}>{problem}</Text> : null}
    <Action title="Add another outage" variant="secondary" disabled={!canAddRow(rows)} onPress={() => onChange(addRow(rows))} />
  </View>;
}
