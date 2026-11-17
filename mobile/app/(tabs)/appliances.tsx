import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Plug, Plus, Trash2 } from 'lucide-react-native';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { Card, Label, Message, Field, FieldRow, Action, ActionRow, Chip, ChipGroup, Toggle, ScreenHeader, BuildingPicker, useBuildings } from '../../src/components/TwinControls';
import { ModalSheet } from '../../src/components/ModalSheet';
import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { api } from '../../src/api/client';
import { Appliance, ApplianceInput, ApplianceList, emptyAppliance, validateAppliance } from '../../src/api/appliances';
import { useTheme } from '../../src/theme/ThemeContext';
import { RADIUS, SPACING } from '../../src/theme/tokens';

const numberKeys = ['rated_power_w','required_runtime_min','earliest_min','latest_min','max_interruptions'] as const;
const labels = { rated_power_w:'Rated power (W)',required_runtime_min:'Required runtime (minutes)',earliest_min:'Earliest start (minute after midnight)',latest_min:'Latest finish (minute after midnight; 1440 = 24:00)',max_interruptions:'Maximum interruptions' };
type Filter = 'all' | 'critical' | 'flexible' | 'others';
// Visible names are title case as in the reference; the spoken names stay as they were.
const FILTERS: Array<{ id: Filter; label: string; spoken: string }> = [
  { id: 'all', label: 'All', spoken: 'ALL' }, { id: 'critical', label: 'Critical', spoken: 'CRITICAL' },
  { id: 'flexible', label: 'Flexible', spoken: 'FLEXIBLE' }, { id: 'others', label: 'Others', spoken: 'OTHERS' },
];
const matches = (a: Appliance, filter: Filter) => filter === 'all' || (filter === 'critical' ? a.critical : filter === 'flexible' ? a.flexible : !a.critical && !a.flexible);
const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
const kw = (value: number | undefined) => value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(2);

function AppliancesWorkspace({building:picker}:{building:ReturnType<typeof useBuildings>}) {
  const { tokens:t } = useTheme();
  const building={id:picker.id};
  const [list,setList]=useState<ApplianceList | null>(null);
  const [form,setForm]=useState<ApplianceInput>(emptyAppliance);
  const [raw,setRaw]=useState<Record<string,string>>({});
  const [editing,setEditing]=useState<Appliance | null>(null);
  const [showForm,setShowForm]=useState(false);
  const [formError,setFormError]=useState('');
  const [pendingDelete,setPendingDelete]=useState<Appliance | null>(null);
  const [filter,setFilter]=useState<Filter>('all');
  const [busy,setBusy]=useState(false);
  const [choosing,setChoosing]=useState(false);
  const [message,setMessage]=useState('Select a building.');
  async function reload(id=building.id) {
    if (!id) return;
    const result=await api.get<ApplianceList>(`/buildings/${id}/appliances`);
    setList(result);setMessage('Synced with building digital twin.');
  }
  useEffect(() => {
    let active=true;setList(null);setShowForm(false);
    if(building.id) api.get<ApplianceList>(`/buildings/${building.id}/appliances`).then(r=>{if(active){setList(r);setMessage('Synced with building digital twin.');}}).catch(e=>{if(active)setMessage(e.message);});
    return ()=>{active=false;};
  },[building.id]);
  const edit=(a:Appliance)=>{ const {id,building_id,selected,...data}=a;setForm(data);setRaw({});setEditing(a);setFormError('');setShowForm(true); };
  const create=()=>{setForm(emptyAppliance());setRaw({});setEditing(null);setFormError('');setShowForm(true);};
  async function save() {
    if (!building.id || busy) return;
    // The screen message sits behind the modal, so failures are repeated inside it.
    const invalid=validateAppliance(form);if(invalid){setMessage(invalid);setFormError(invalid);return;}
    setFormError('');setBusy(true);
    try {
      const endpoint=`/buildings/${building.id}/appliances`;
      if(editing) await api.request(`${endpoint}/${editing.id}`,{method:'PUT',body:JSON.stringify(form)});
      else await api.post(endpoint,form);
      await reload();setShowForm(false);setMessage(editing?'Appliance updated.':'Appliance created.');
    } catch(e:any){setMessage(e.message);setFormError(e.message);} finally{setBusy(false);}
  }
  async function toggle(a:Appliance) {
    if(!building.id || busy)return;setBusy(true);
    try { setList(await api.request<ApplianceList>(`/buildings/${building.id}/appliances/${a.id}/selection`,{method:'PUT',body:JSON.stringify({selected:!a.selected})}));setMessage('Scenario selection saved. No physical switching occurred.'); }
    catch(e:any){setMessage(e.message);} finally{setBusy(false);}
  }
  async function remove(a:Appliance) {
    if(!building.id || busy)return;setBusy(true);
    try {await api.delete(`/buildings/${building.id}/appliances/${a.id}`);await reload();setShowForm(false);setMessage('Appliance removed.');}
    catch(e:any){setMessage(e.message);} finally{setBusy(false);}
  }
  // Delete lives inside the edit popup. Closing that popup first keeps only one popup open at a time.
  const askDelete=(a:Appliance)=>{setShowForm(false);setPendingDelete(a);};
  const visible=(list?.items||[]).filter(a=>matches(a,filter));
  const selected=picker.buildings.find(b=>b.id===picker.id);
  const place=selected?.address?.split(',')[0].trim();
  const showPicker=choosing||!!picker.error||!picker.id;
  return <SolvantaScreen banner="SCENARIO ONLY • no real appliances are switched" footer={<Action title="Add Appliance" disabled={!building.id} icon={<Plus size={18} color={building.id?t.onLime:t.textSecondary}/>} onPress={create}/>}>
    <ScreenHeader title="Appliances" subtitle={selected?`${selected.name}${place?` · ${place}`:''}`:'Choose a building'} onTitlePress={()=>setChoosing(!choosing)} titlePressLabel={selected?`Change building: ${selected.name}`:'Choose a building'}/>
    {showPicker&&<BuildingPicker state={picker}/>}
    <View style={{marginBottom:SPACING.sm}}><Label tone="secondary" caption>Scenario only: nothing real is switched.</Label></View>
    <View style={{marginBottom:SPACING.md,gap:2}}><Label tone="secondary" caption>Scenario load {kw(list?.summary.requested_kw)} kW · Critical {kw(list?.summary.critical_kw)} kW · {list?`${list.summary.selected_count} selected`:'— selected'}</Label><Label tone="secondary" caption>{message}</Label></View>
    <View style={{marginBottom:SPACING.md}}><ChipGroup>{FILTERS.map(f=><Chip key={f.id} compact label={f.label} a11yLabel={f.spoken} selected={filter===f.id} onPress={()=>setFilter(f.id)}/>)}</ChipGroup></View>
    <View style={{gap:12}}>
      {visible.map(a=><View key={a.id} style={{flexDirection:'row',alignItems:'center',gap:SPACING.sm,minHeight:64,paddingLeft:12,paddingRight:14,borderRadius:RADIUS.card,borderWidth:1,borderColor:t.border,backgroundColor:t.surface}}>
        <TouchableOpacity activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Edit ${a.name}`} accessibilityHint="Opens this appliance to edit or delete it" onPress={()=>edit(a)} style={{flex:1,flexDirection:'row',alignItems:'center',gap:12,minHeight:64}}>
          <View style={{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:t.surfaceElevated}}><Plug size={20} color={t.textSecondary}/></View>
          <View style={{flex:1}}>
            <Text numberOfLines={1} style={{color:t.textPrimary,fontSize:15,lineHeight:20,fontWeight:'600'}}>{a.name}</Text>
            <Text style={{color:t.textSecondary,fontSize:13,lineHeight:18}}>{a.rated_power_w} W · {cap(a.priority)}{a.flexible?' · Flexible':''}</Text>
          </View>
        </TouchableOpacity>
        <Toggle a11yLabel={`${a.name} scenario selection`} value={a.selected} onValueChange={()=>toggle(a)} disabled={busy}/>
      </View>)}
    </View>
    {list && !list.items.length && <View style={{marginTop:SPACING.md}}><Message>No saved appliances. Add one to build this site's load twin.</Message></View>}
    {list && !!list.items.length && !visible.length && <View style={{marginTop:SPACING.md}}><Message>No appliances match this filter.</Message></View>}
    <ConfirmDialog visible={!!pendingDelete} title="Delete appliance?" confirmLabel="Delete" confirmDisabled={busy} onCancel={()=>setPendingDelete(null)} onConfirm={()=>{const a=pendingDelete;setPendingDelete(null);if(a)remove(a);}}>
      <Text style={{fontWeight:'700'}}>{pendingDelete?.name}</Text> will be removed from this building's saved loads. This cannot be undone.
    </ConfirmDialog>
    <ModalSheet visible={showForm} title={`${editing?'Edit':'New'} appliance`} onRequestClose={()=>setShowForm(false)} footer={<>{!!formError&&<Message tone="danger">{formError}</Message>}<ActionRow><Action title="Save Appliance" disabled={busy} onPress={save}/><Action title="Cancel" variant="secondary" onPress={()=>setShowForm(false)}/></ActionRow>{editing&&<Action title="Delete" label={`Delete ${editing.name}`} variant="danger" icon={<Trash2 size={15} color={t.redText}/>} onPress={()=>askDelete(editing)}/>}</>}>
      <Field label="Appliance name" value={form.name} onChange={v=>setForm({...form,name:v})}/>
      <FieldRow>{(numberKeys).map(k=><Field key={k} label={labels[k]} numeric value={raw[k]??String(form[k])} onChange={v=>{setRaw({...raw,[k]:v});setForm({...form,[k]:v.trim()?Number(v):NaN});}}/>)}</FieldRow>
      <Label tone="secondary" caption strong>Priority</Label><ChipGroup>{(['critical','medium','low'] as const).map(v=><Chip key={v} label={v.toUpperCase()} a11yLabel={`${form.priority===v?'Selected ':''}${v.toUpperCase()}`} selected={form.priority===v} onPress={()=>setForm({...form,priority:v,critical:v==='critical'?form.critical:false})}/>)}</ChipGroup>
      <Toggle label="Critical load" value={form.critical} onValueChange={v=>setForm({...form,critical:v,priority:v?'critical':form.priority})}/>
      <Toggle label="Flexible schedule" value={form.flexible} onValueChange={v=>setForm({...form,flexible:v,interruptible:v?form.interruptible:false,max_interruptions:v?form.max_interruptions:0})}/>
      <Toggle label="Interruptible" value={form.interruptible} onValueChange={v=>setForm({...form,interruptible:v,flexible:v?true:form.flexible,max_interruptions:v?form.max_interruptions:0})}/>
    </ModalSheet>
  </SolvantaScreen>;
}

export default function AppliancesScreen() {
 const building=useBuildings();
 return <AppliancesWorkspace key={building.id} building={building}/>;
}
