import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Building2, Check, Info, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../theme/tokens';
import { api } from '../api/client';
import { Toggle } from './Toggle';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MIN_TARGET = 44;
export type Tone = 'primary' | 'secondary' | 'accent' | 'warning' | 'danger' | 'success' | 'info';

function useToneColor() {
  const { tokens: t } = useTheme();
  return (tone: Tone) => ({ primary: t.textPrimary, secondary: t.textSecondary, accent: t.limeText, warning: t.amberText, danger: t.redText, success: t.greenText, info: t.cyanText })[tone];
}
export function Card({ children, nested = false, style }: { children: React.ReactNode; nested?: boolean; style?: StyleProp<ViewStyle> }) {
  const { tokens: t } = useTheme();
  return <View style={[{ padding: nested ? 14 : SPACING.cardPadding, gap: SPACING.md, borderRadius: nested ? 16 : RADIUS.card, borderWidth: 1, borderColor: t.border, backgroundColor: nested ? t.backgroundRaised : t.surface, marginVertical: nested ? 0 : 6 }, style]}>{children}</View>;
}
export function CardHeader({ title, subtitle, icon, badge }: { title: string; subtitle?: string; icon?: React.ReactNode; badge?: string }) {
  const { tokens: t } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    {icon && <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.limeTint }}>{icon}</View>}
    <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: t.textPrimary, fontSize: TYPOGRAPHY.sectionTitle, fontWeight: '700', lineHeight: 21 }}>{title}</Text>{subtitle && <Text style={{ color: t.textSecondary, fontSize: TYPOGRAPHY.caption, lineHeight: 17, marginTop: 1 }}>{subtitle}</Text>}</View>
    {badge && <Badge label={badge} />}
  </View>;
}
export function Badge({ label, tone = 'accent' }: { label: string; tone?: Tone }) {
  const { tokens: t } = useTheme();
  const color = useToneColor();
  const background = { accent: t.limeTint, warning: t.amberTint, danger: t.redTint, success: t.greenTint, info: t.cyanTint, primary: t.surfaceElevated, secondary: t.surfaceElevated }[tone];
  return <View style={{ alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.pill, backgroundColor: background }}><Text style={{ color: color(tone), fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>{label}</Text></View>;
}
export function Label({ children, tone = 'primary', caption = false, strong = false }: { children: React.ReactNode; tone?: Tone; caption?: boolean; strong?: boolean }) {
  const color = useToneColor();
  return <Text style={{ color: color(tone), fontSize: caption ? TYPOGRAPHY.caption : TYPOGRAPHY.body, lineHeight: caption ? 18 : 21, fontWeight: strong ? '700' : '400' }}>{children}</Text>;
}
export function Message({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'success' | 'warning' | 'danger' }) {
  const { tokens: t } = useTheme();
  const color = useToneColor()(tone);
  const Icon = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: AlertTriangle }[tone];
  const background = { info: t.surfaceElevated, success: t.greenTint, warning: t.amberTint, danger: t.redTint }[tone];
  return <View accessibilityLiveRegion="polite" accessibilityRole={tone === 'danger' ? 'alert' : undefined} style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: RADIUS.md, backgroundColor: background }}><Icon size={16} color={color} style={{ marginTop: 2 }} /><Text style={{ flex: 1, color: tone === 'info' ? t.textSecondary : color, fontSize: 13, lineHeight: 19 }}>{children}</Text></View>;
}
export function Field({ label, value, onChange, numeric = false, hint }: { label: string; value: string; onChange: (v: string) => void; numeric?: boolean; hint?: string }) {
  const { tokens: t } = useTheme();
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 6 }}><Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: '600', lineHeight: 18 }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} keyboardType={numeric ? 'decimal-pad' : 'default'} placeholderTextColor={t.textSecondary} style={{ minHeight: 48, color: t.textPrimary, fontSize: 15, backgroundColor: t.surfaceElevated, borderRadius: RADIUS.md, paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1, borderColor: focused ? t.limeMark : t.border }} />{hint && <Label tone="secondary" caption>{hint}</Label>}</View>;
}
/** Lays fields out in two columns on phones; they stack when text scaling leaves too little room. */
export function FieldRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md }}>{React.Children.map(children, child => child && <View style={{ flexGrow: 1, flexBasis: 140, justifyContent: 'flex-end' }}>{child}</View>)}</View>;
}
type ActionVariant = 'primary' | 'secondary' | 'danger';
export function Action({ title, onPress, disabled = false, selected = false, variant = 'primary', icon, label, loading = false, style }: { title: string; onPress: () => void; disabled?: boolean; selected?: boolean; variant?: ActionVariant; icon?: React.ReactNode; label?: string; loading?: boolean; style?: StyleProp<ViewStyle> }) {
  const { tokens: t } = useTheme();
  const palette = disabled ? { background: t.surfaceElevated, foreground: t.textSecondary, border: t.border }
    : { primary: { background: t.lime, foreground: t.onLime, border: t.lime }, secondary: { background: t.surfaceElevated, foreground: t.textPrimary, border: selected ? t.limeMark : t.border }, danger: { background: 'transparent', foreground: t.redText, border: t.redText } }[variant];
  return <TouchableOpacity activeOpacity={0.82} accessibilityRole="button" accessibilityLabel={label ?? title} accessibilityState={{ disabled, selected, busy: loading }} disabled={disabled} onPress={onPress} style={[{ flexDirection: 'row', gap: 8, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background, borderWidth: selected ? 2 : 1, borderColor: selected && variant === 'primary' ? t.textPrimary : palette.border }, style]}>{loading ? <ActivityIndicator size="small" color={palette.foreground} /> : icon}<Text style={{ flexShrink: 1, color: palette.foreground, fontSize: 14, lineHeight: 19, fontWeight: variant === 'primary' && !disabled ? '800' : '700', textAlign: 'center' }}>{title}</Text></TouchableOpacity>;
}
export function ActionRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>{React.Children.map(children, child => child && <View style={{ flexGrow: 1, flexBasis: 130 }}>{child}</View>)}</View>;
}
export function Chip({ label, selected = false, onPress, disabled = false, a11yLabel }: { label: string; selected?: boolean; onPress: () => void; disabled?: boolean; a11yLabel?: string }) {
  const { tokens: t } = useTheme();
  const foreground = selected ? t.onLime : disabled ? t.textSecondary : t.textPrimary;
  return <TouchableOpacity activeOpacity={0.82} accessibilityRole="button" accessibilityLabel={a11yLabel ?? label} accessibilityState={{ selected, disabled }} aria-selected={selected} disabled={disabled} onPress={onPress} style={{ flexDirection: 'row', flexShrink: 1, alignItems: 'center', gap: 6, minHeight: MIN_TARGET, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: selected ? t.lime : t.border, backgroundColor: selected ? t.lime : t.surfaceElevated }}>{selected && <Check size={14} color={foreground} strokeWidth={3} />}<Text style={{ flexShrink: 1, color: foreground, fontSize: 13, lineHeight: 18, fontWeight: selected ? '800' : '600' }}>{label}</Text></TouchableOpacity>;
}
export function ChipGroup({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>{children}</View>;
}
export { Toggle };
export function Metric({ label, value, unit, tone = 'primary' }: { label: string; value: string | number; unit?: string; tone?: Tone }) {
  const { tokens: t } = useTheme();
  const color = useToneColor();
  return <View accessible accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`} style={{ flexGrow: 1, flexBasis: 130, padding: 12, gap: 2, borderRadius: RADIUS.md, backgroundColor: t.surfaceElevated }}><Text style={{ color: t.textSecondary, fontSize: TYPOGRAPHY.caption, lineHeight: 17 }}>{label}</Text><Text style={{ color: color(tone), fontSize: 22, lineHeight: 28, fontWeight: '700' }}>{value}{unit && <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: '600' }}> {unit}</Text>}</Text></View>;
}
export function MetricGrid({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>{children}</View>;
}
export function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  const { tokens: t } = useTheme();
  return <TouchableOpacity activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width: MIN_TARGET, height: MIN_TARGET, borderRadius: MIN_TARGET / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border, backgroundColor: t.surface }}>{children}</TouchableOpacity>;
}
export function ScreenHeader({ title, subtitle, onBack, backLabel = 'Back', right }: { title: string; subtitle?: string; onBack?: () => void; backLabel?: string; right?: React.ReactNode }) {
  const { tokens: t } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: 6 }}>
    {onBack && <IconButton label={backLabel} onPress={onBack}><ArrowLeft size={18} color={t.textPrimary} /></IconButton>}
    <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: t.textPrimary, fontSize: TYPOGRAPHY.heading + 2, lineHeight: 30, fontWeight: '700' }}>{title}</Text>{subtitle && <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 18 }}>{subtitle}</Text>}</View>
    {right}
  </View>;
}
export function Tile({ title, subtitle, icon, onPress, active = false }: { title: string; subtitle?: string; icon: (color: string) => React.ReactNode; onPress: () => void; active?: boolean }) {
  const { tokens: t, heroGradient } = useTheme();
  const foreground = active ? t.onLime : t.textPrimary;
  const content = <><View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? t.onLime : t.limeTint }}>{icon(active ? t.lime : t.limeText)}</View><View><Text style={{ color: foreground, fontSize: 14, lineHeight: 19, fontWeight: '700' }}>{title}</Text>{subtitle && <Text style={{ color: active ? t.onLime : t.textSecondary, fontSize: TYPOGRAPHY.caption, lineHeight: 17, marginTop: 2 }}>{subtitle}</Text>}</View></>;
  const box: ViewStyle = { flexGrow: 1, gap: 12, padding: 14, borderRadius: 18, minHeight: 112 };
  return <TouchableOpacity activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={{ flexGrow: 1, flexBasis: active ? '100%' : 150 }}>{active ? <LinearGradient colors={heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={box}>{content}</LinearGradient> : <View style={[box, { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }]}>{content}</View>}</TouchableOpacity>;
}
/** A saved record the user can open; keeps the full title as its accessible name. */
export function ListAction({ title, onPress, disabled = false, selected = false }: { title: string; onPress: () => void; disabled?: boolean; selected?: boolean }) {
  return <Action title={title} onPress={onPress} disabled={disabled} selected={selected} variant="secondary" />;
}
export function useBuildings() {
  const [buildings, setBuildings] = useState<Array<{ id: string; name: string }>>([]);
  const [id, setId] = useState('');
  const [error, setError] = useState('');
  const [selectionKey, setSelectionKey] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([api.getBuildings(),api.getCurrentUser()]).then(async ([list,user]) => {
      const key=`@solvanta_selected_building_${user.id}`;
      const saved=await AsyncStorage.getItem(key);
      if(active){setBuildings(list);setSelectionKey(key);setId(list.some(b=>b.id===saved)?saved!:list[0]?.id||'');setError(list.length?'':'Create a building in Settings first.');}
    }).catch(e=>{if(active){setBuildings([]);setId('');setSelectionKey('');setError(e.message);}});
    return () => { active = false; };
  }, []));
  const select=(value:string)=>{if(buildings.some(b=>b.id===value)){setId(value);if(selectionKey)AsyncStorage.setItem(selectionKey,value).catch(()=>{});}};
  return { buildings, id, setId:select, error };
}
export function BuildingPicker({ state }: { state: ReturnType<typeof useBuildings> }) {
  const { tokens: t } = useTheme();
  return <Card><CardHeader title="Building digital twin" icon={<Building2 size={18} color={t.limeText} />} />{state.error ? <><Message tone="warning">{state.error}</Message><Action title="Open Settings / Sign In" onPress={() => router.push('/settings')} /></> : <ChipGroup>{state.buildings.map(b => <Chip key={b.id} label={b.name} a11yLabel={`${state.id === b.id ? '✓ ' : ''}${b.name}`} selected={state.id === b.id} onPress={() => state.setId(b.id)} />)}</ChipGroup>}</Card>;
}
