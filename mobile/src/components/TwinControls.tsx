import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { api } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function Card({ children }: { children: React.ReactNode }) {
  const { tokens: t } = useTheme();
  return <View style={{ padding: 18, gap: 12, borderRadius: 24, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, marginVertical: 8 }}>{children}</View>;
}
export function Label({ children }: { children: React.ReactNode }) {
  const { tokens: t } = useTheme();
  return <Text style={{ color: t.textPrimary, fontSize: 14, lineHeight: 21 }}>{children}</Text>;
}
export function Field({ label, value, onChange, numeric = false }: { label: string; value: string; onChange: (v: string) => void; numeric?: boolean }) {
  const { tokens: t } = useTheme();
  return <View style={{ gap: 5 }}><Label>{label}</Label><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType={numeric ? 'decimal-pad' : 'default'} style={{ color: t.textPrimary, backgroundColor: t.surfaceElevated, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: t.border }} /></View>;
}
export function Action({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  const { tokens: t } = useTheme();
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={{ opacity: disabled ? 0.45 : 1, borderRadius: 24, padding: 13, backgroundColor: t.lime }}><Text style={{ color: t.onLime, fontWeight: '800', textAlign: 'center' }}>{title}</Text></TouchableOpacity>;
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
  return <Card><Label>BUILDING DIGITAL TWIN</Label>{state.error ? <><Label>{state.error}</Label><Action title="Open Settings / Sign In" onPress={() => router.push('/settings')} /></> : state.buildings.map(b => <Action key={b.id} title={`${state.id === b.id ? '✓ ' : ''}${b.name}`} onPress={() => state.setId(b.id)} />)}</Card>;
}
