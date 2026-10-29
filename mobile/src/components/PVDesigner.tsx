import React, { useEffect, useState } from 'react';
import { View, Switch } from 'react-native';
import { Card, Label, Field, Action } from './TwinControls';
import { useTheme } from '../theme/ThemeContext';
import { api } from '../api/client';
import { PVParameters, PVRecord, PVProfile, parseIrradiance } from '../api/pv';

const defaults = { module_wattage_w: '550', inverter_kw: '8', inverter_efficiency_pct: '96', tilt_deg: '25', azimuth_deg: '180', losses_pct: '14', latitude_deg: '31.52', cell_temperature_c: '25', temperature_coefficient_per_c: '-0.004' };
const labels: Record<keyof typeof defaults, string> = { module_wattage_w: 'Module rating (W)', inverter_kw: 'Inverter AC rating (kW)', inverter_efficiency_pct: 'Inverter efficiency (%)', tilt_deg: 'Tilt (degrees)', azimuth_deg: 'Azimuth (degrees from north)', losses_pct: 'System losses (%)', latitude_deg: 'Latitude (degrees)', cell_temperature_c: 'Assumed cell temperature (°C)', temperature_coefficient_per_c: 'Power temperature coefficient (/°C)' };
const stringDefaults = { modules_per_string: '10', module_voc_v: '49', module_vmp_v: '41', inverter_max_dc_v: '600', mppt_min_v: '120', mppt_max_v: '550' };

export function PVDesigner({ buildingId }: { buildingId: string }) {
  const { tokens: t } = useTheme();
  const [fields, setFields] = useState(defaults);
  const [strings, setStrings] = useState(stringDefaults);
  const [checkStrings, setCheckStrings] = useState(false);
  const [irradiance, setIrradiance] = useState('');
  const [profile, setProfile] = useState<PVProfile | null>(null);
  const [message, setMessage] = useState('Save a calibrated roof first.');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  function load(record: PVRecord) {
    setFields(Object.fromEntries(Object.keys(defaults).map(k => [k, String(record.parameters[k as keyof typeof defaults])])) as typeof defaults);
    setCheckStrings(!!record.parameters.string_specs);
    setStrings(record.parameters.string_specs ? Object.fromEntries(Object.entries(record.parameters.string_specs).map(([k,v]) => [k,String(v)])) as typeof stringDefaults : stringDefaults);
    setIrradiance(record.parameters.poa_w_m2?.join(', ') || '');
    setProfile(record.profile); setMessage(record.saved ? 'Loaded saved PV assumptions. Profile recalculated from current roof.' : 'Preview from building equipment; assumptions not saved yet.');
  }
  useEffect(() => {
    let active = true; setProfile(null); setFields(defaults); setStrings(stringDefaults); setCheckStrings(false); setIrradiance('');
    if (buildingId) api.get<PVRecord>(`/buildings/${buildingId}/pv`).then(r => { if (active) load(r); }).catch(e => { if (active) setMessage(e.status === 404 ? 'Save a measured roof before estimating PV.' : e.message); });
    return () => { active = false; };
  }, [buildingId]);
  const dirty = () => { setProfile(null); setMessage('Changed assumptions — calculate or save to refresh.'); };
  async function calculate(save: boolean) {
    if (!buildingId || busy) return;
    setBusy(true);
    try {
      const values = Object.values(fields).concat(checkStrings ? Object.values(strings) : []);
      if (values.some(v => !v.trim() || !Number.isFinite(Number(v)))) throw new Error('Enter valid numbers for all enabled parameters.');
      const data = { ...Object.fromEntries(Object.entries(fields).map(([k,v]) => [k,Number(v)])), poa_w_m2: parseIrradiance(irradiance), string_specs: checkStrings ? Object.fromEntries(Object.entries(strings).map(([k,v]) => [k,Number(v)])) : null } as PVParameters;
      if (save) { load(await api.request<PVRecord>(`/buildings/${buildingId}/pv`, { method: 'PUT', body: JSON.stringify(data) })); setMessage('Saved PV assumptions to this building.'); }
      else { setProfile(await api.post<PVProfile>(`/buildings/${buildingId}/pv/preview`, data)); setMessage('Calculated preview — not saved yet.'); }
    } catch (e: any) { setProfile(null); setMessage(e.message); } finally { setBusy(false); }
  }
  return <Card><Label>PV DESIGN & GENERATION ESTIMATE</Label><Label>Panel count comes from the saved roof layout. Save roof edits before calculating. These design assumptions do not overwrite installed equipment in Settings.</Label>
    {(Object.keys(defaults) as Array<keyof typeof defaults>).map(k => <Field key={k} label={labels[k]} numeric value={fields[k]} onChange={v => { setFields({ ...fields, [k]: v }); dirty(); }} />)}
    <Label>Optional reference string voltage checks</Label><Switch accessibilityLabel="Check string voltages" value={checkStrings} onValueChange={v => { setCheckStrings(v); dirty(); }} trackColor={{ true: t.lime }} />
    {checkStrings && (Object.keys(stringDefaults) as Array<keyof typeof stringDefaults>).map(k => <Field key={k} label={k.replaceAll('_', ' ')} numeric value={strings[k]} onChange={v => { setStrings({ ...strings, [k]: v }); dirty(); }} />)}
    <Field label="Optional hourly plane-of-array irradiance (24 comma-separated W/m² values)" value={irradiance} onChange={v => { setIrradiance(v); dirty(); }} />
    <Label>Blank irradiance uses a synthetic equinox solar day. Supplied values are already on the panel plane, so tilt/azimuth are not applied again.</Label>
    <Action title="Calculate PV Estimate" disabled={!buildingId || busy} onPress={() => calculate(false)} />
    <Action title="Save PV Design" disabled={!buildingId || busy} onPress={() => calculate(true)} />
    <Label>{message}</Label>
    {profile && <><Label>{profile.panel_count} panels · {profile.dc_capacity_kwp.toFixed(2)} kWp · DC/AC {profile.dc_ac_ratio.toFixed(2)}</Label><Label>{profile.daily_energy_kwh.toFixed(2)} kWh / representative day</Label><Label>{profile.source}</Label><Label>{profile.time_basis}</Label>
      <View accessibilityLabel="Hourly estimated AC power" style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 2 }}>{profile.timeline.map(p => <View key={p.hour} style={{ flex: 1, height: Math.max(1, 95*p.ac_kw/profile.inverter_kw), backgroundColor: t.lime }} />)}</View>
      <Label>00:00                         12:00                         24:00</Label>
      {profile.warnings.map(w => <Label key={w}>{w}</Label>)}
      <Action title={expanded ? 'Hide Hourly Values' : 'Show Hourly Values'} onPress={() => setExpanded(!expanded)} />
      {expanded && profile.timeline.map(p => <Label key={p.hour}>{String(p.hour).padStart(2,'0')}:00 · {p.poa_w_m2.toFixed(0)} W/m² · {p.ac_kw.toFixed(3)} kW · {p.energy_kwh.toFixed(3)} kWh</Label>)}
    </>}
  </Card>;
}
