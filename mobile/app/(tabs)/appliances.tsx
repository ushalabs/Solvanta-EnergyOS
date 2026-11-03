import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Plus, Pencil, Trash2 } from 'lucide-react-native';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { Card, Label, Message, Metric, MetricGrid, Field, FieldRow, Action, ActionRow, Chip, ChipGroup, Toggle, ScreenHeader, BuildingPicker, useBuildings } from '../../src/components/TwinControls';
import { PriorityBadge, PriorityTier } from '../../src/components/PriorityBadge';
import { ModalSheet } from '../../src/components/ModalSheet';
import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { api } from '../../src/api/client';
import { Appliance, ApplianceInput, ApplianceList, emptyAppliance, validateAppliance } from '../../src/api/appliances';
import { useTheme } from '../../src/theme/ThemeContext';

const numberKeys = ['rated_power_w','required_runtime_min','earliest_min','latest_min','max_interruptions'] as const;
const labels = { rated_power_w:'Rated power (W)',required_runtime_min:'Required runtime (minutes)',earliest_min:'Earliest start (minute after midnight)',latest_min:'Latest finish (minute after midnight; 1440 = 24:00)',max_interruptions:'Maximum interruptions' };
const clock = (m:number) => `${Math.floor(m/60).toString().padStart(2,'0')}:${(m%60).toString().padStart(2,'0')}`;

function AppliancesWorkspace({buildingId}:{buildingId:string}) {
  const { tokens:t } = useTheme();
  const building={id:buildingId};
  const [list,setList]=useState<ApplianceList | null>(null);
  const [form,setForm]=useState<ApplianceInput>(emptyAppliance);
  const [raw,setRaw]=useState<Record<string,string>>({});
  const [editing,setEditing]=useState<string | null>(null);
  const [showForm,setShowForm]=useState(false);
  const [formError,setFormError]=useState('');
  const [pendingDelete,setPendingDelete]=useState<Appliance | null>(null);
  const [filter,setFilter]=useState<'all'|'critical'|'flexible'>('all');
  const [busy,setBusy]=useState(false);
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
  const edit=(a:Appliance)=>{ const {id,building_id,selected,...data}=a;setForm(data);setRaw({});setEditing(id);setFormError('');setShowForm(true); };
  const create=()=>{setForm(emptyAppliance());setRaw({});setEditing(null);setFormError('');setShowForm(true);};
  async function save() {
    if (!building.id || busy) return;
    // The screen message sits behind the modal, so failures are repeated inside it.
    const invalid=validateAppliance(form);if(invalid){setMessage(invalid);setFormError(invalid);return;}
    setFormError('');setBusy(true);
    try {
      const endpoint=`/buildings/${building.id}/appliances`;
      if(editing) await api.request(`${endpoint}/${editing}`,{method:'PUT',body:JSON.stringify(form)});
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
  const visible=(list?.items||[]).filter(a=>filter==='all'||(filter==='critical'?a.critical:a.flexible));
  return <>
    <Card><Message>Switches select loads for a simulation scenario only. They do not physically turn appliances or electrical circuits on or off.</Message>
      <MetricGrid><Metric label="Requested scenario load" value={(list?.summary.requested_kw||0).toFixed(2)} unit="kW" tone="accent"/><Metric label="Critical demand" value={(list?.summary.critical_kw||0).toFixed(2)} unit="kW"/><Metric label="Selected loads" value={list?.summary.selected_count||0}/></MetricGrid>
      <Label tone="secondary" caption>{message}</Label>
      <ChipGroup>{(['all','critical','flexible'] as const).map(v=><Chip key={v} label={v.toUpperCase()} selected={filter===v} onPress={()=>setFilter(v)}/>)}</ChipGroup>
      {visible.map(a=><Card nested key={a.id}>
        <View style={{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:10}}><View style={{flex:1}}><Label strong>{a.name}</Label><Label tone="secondary" caption>{(a.rated_power_w/1000).toFixed(2)} kW · Runtime {a.required_runtime_min} min · Window {clock(a.earliest_min)}–{clock(a.latest_min)}</Label></View></View>
        <PriorityBadge priority={a.priority as PriorityTier} flexible={a.flexible} critical={a.critical}/>
        <Label tone="secondary" caption>{a.interruptible?`May interrupt up to ${a.max_interruptions} times`:'Continuous runtime'}</Label>
        <Toggle label={`Scenario ${a.selected?'ON':'OFF'}`} a11yLabel={`${a.name} scenario selection`} value={a.selected} onValueChange={()=>toggle(a)} disabled={busy}/>
        <ActionRow><Action title="Edit" label={`Edit ${a.name}`} variant="secondary" icon={<Pencil size={15} color={t.textPrimary}/>} onPress={()=>edit(a)}/><Action title="Delete" label={`Delete ${a.name}`} variant="danger" icon={<Trash2 size={15} color={t.redText}/>} onPress={()=>setPendingDelete(a)}/></ActionRow>
      </Card>)}
      {list && !list.items.length && <Message>No saved appliances. Add one to build this site's load twin.</Message>}
      <Action title="Add Appliance" disabled={!building.id} icon={<Plus size={18} color={building.id?t.onLime:t.textSecondary}/>} onPress={create}/>
    </Card>
    <ConfirmDialog visible={!!pendingDelete} title="Delete appliance?" confirmLabel="Delete" confirmDisabled={busy} onCancel={()=>setPendingDelete(null)} onConfirm={()=>{const a=pendingDelete;setPendingDelete(null);if(a)remove(a);}}>
      <Text style={{fontWeight:'700'}}>{pendingDelete?.name}</Text> will be removed from this building's saved loads. This cannot be undone.
    </ConfirmDialog>
    <ModalSheet visible={showForm} title={`${editing?'Edit':'New'} appliance`} onRequestClose={()=>setShowForm(false)} footer={<>{!!formError&&<Message tone="danger">{formError}</Message>}<ActionRow><Action title="Save Appliance" disabled={busy} onPress={save}/><Action title="Cancel" variant="secondary" onPress={()=>setShowForm(false)}/></ActionRow></>}>
      <Field label="Appliance name" value={form.name} onChange={v=>setForm({...form,name:v})}/>
      <FieldRow>{(numberKeys).map(k=><Field key={k} label={labels[k]} numeric value={raw[k]??String(form[k])} onChange={v=>{setRaw({...raw,[k]:v});setForm({...form,[k]:v.trim()?Number(v):NaN});}}/>)}</FieldRow>
      <Label tone="secondary" caption strong>Priority</Label><ChipGroup>{(['critical','medium','low'] as const).map(v=><Chip key={v} label={v.toUpperCase()} a11yLabel={`${form.priority===v?'Selected ':''}${v.toUpperCase()}`} selected={form.priority===v} onPress={()=>setForm({...form,priority:v,critical:v==='critical'?form.critical:false})}/>)}</ChipGroup>
      <Toggle label="Critical load" value={form.critical} onValueChange={v=>setForm({...form,critical:v,priority:v?'critical':form.priority})}/>
      <Toggle label="Flexible schedule" value={form.flexible} onValueChange={v=>setForm({...form,flexible:v,interruptible:v?form.interruptible:false,max_interruptions:v?form.max_interruptions:0})}/>
      <Toggle label="Interruptible" value={form.interruptible} onValueChange={v=>setForm({...form,interruptible:v,flexible:v?true:form.flexible,max_interruptions:v?form.max_interruptions:0})}/>
    </ModalSheet>
  </>;
}

export default function AppliancesScreen() {
 const building=useBuildings();
 return <SolvantaScreen banner="APPLIANCES - Saved twin and scenario selection"><ScreenHeader title="Appliances" subtitle="Your saved loads and scenario state"/><BuildingPicker state={building}/><AppliancesWorkspace key={building.id} buildingId={building.id}/></SolvantaScreen>;
}
