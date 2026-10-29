import React, { useEffect, useState } from 'react';
import { View, Switch, TouchableOpacity, Text } from 'react-native';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { Card, Label, Field, Action, BuildingPicker, useBuildings } from '../../src/components/TwinControls';
import { api } from '../../src/api/client';
import { Appliance, ApplianceInput, ApplianceList, emptyAppliance, validateAppliance } from '../../src/api/appliances';
import { useTheme } from '../../src/theme/ThemeContext';

const numberKeys = ['rated_power_w','required_runtime_min','earliest_min','latest_min','max_interruptions'] as const;
const labels = { rated_power_w:'Rated power (W)',required_runtime_min:'Required runtime (minutes)',earliest_min:'Earliest start (minute after midnight)',latest_min:'Latest finish (minute after midnight; 1440 = 24:00)',max_interruptions:'Maximum interruptions' };

function AppliancesWorkspace({buildingId}:{buildingId:string}) {
  const { tokens:t } = useTheme();
  const building={id:buildingId};
  const [list,setList]=useState<ApplianceList | null>(null);
  const [form,setForm]=useState<ApplianceInput>(emptyAppliance);
  const [raw,setRaw]=useState<Record<string,string>>({});
  const [editing,setEditing]=useState<string | null>(null);
  const [showForm,setShowForm]=useState(false);
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
  const edit=(a:Appliance)=>{ const {id,building_id,selected,...data}=a;setForm(data);setRaw({});setEditing(id);setShowForm(true); };
  const create=()=>{setForm(emptyAppliance());setRaw({});setEditing(null);setShowForm(true);};
  async function save() {
    if (!building.id || busy) return;
    const invalid=validateAppliance(form);if(invalid){setMessage(invalid);return;}
    setBusy(true);
    try {
      const endpoint=`/buildings/${building.id}/appliances`;
      if(editing) await api.request(`${endpoint}/${editing}`,{method:'PUT',body:JSON.stringify(form)});
      else await api.post(endpoint,form);
      await reload();setShowForm(false);setMessage(editing?'Appliance updated.':'Appliance created.');
    } catch(e:any){setMessage(e.message);} finally{setBusy(false);}
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
    <Card><Label>Switches select loads for a simulation scenario only. They do not physically turn appliances or electrical circuits on or off.</Label>
      <Label>{message}</Label><Label>REQUESTED SCENARIO LOAD: {(list?.summary.requested_kw||0).toFixed(2)} kW</Label>
      <Label>CRITICAL DEMAND: {(list?.summary.critical_kw||0).toFixed(2)} kW · {list?.summary.selected_count||0} selected</Label>
      <View style={{flexDirection:'row',gap:6}}>{(['all','critical','flexible'] as const).map(v=><TouchableOpacity key={v} onPress={()=>setFilter(v)} style={{padding:8,borderRadius:12,backgroundColor:filter===v?t.lime:t.surfaceElevated}}><Text style={{color:filter===v?t.onLime:t.textPrimary}}>{v.toUpperCase()}</Text></TouchableOpacity>)}</View>
      {visible.map(a=><View key={a.id} style={{backgroundColor:t.surfaceElevated,borderRadius:18,padding:14,gap:8,borderWidth:1,borderColor:t.border}}>
        <Label>{a.name} · {(a.rated_power_w/1000).toFixed(2)} kW</Label><Label>{a.priority.toUpperCase()}{a.critical?' • critical demand':''}{a.flexible?' • flexible':''}</Label>
        <Label>Runtime {a.required_runtime_min} min · Window {Math.floor(a.earliest_min/60).toString().padStart(2,'0')}:{(a.earliest_min%60).toString().padStart(2,'0')}–{Math.floor(a.latest_min/60).toString().padStart(2,'0')}:{(a.latest_min%60).toString().padStart(2,'0')}</Label>
        <Label>{a.interruptible?`May interrupt up to ${a.max_interruptions} times`:'Continuous runtime'}</Label>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Label>Scenario {a.selected?'ON':'OFF'}</Label><Switch accessibilityLabel={`${a.name} scenario selection`} value={a.selected} onValueChange={()=>toggle(a)} disabled={busy} trackColor={{true:t.lime}} /></View>
        <Action title={`Edit ${a.name}`} onPress={()=>edit(a)} /><Action title={`Delete ${a.name}`} onPress={()=>remove(a)} />
      </View>)}
      {list && !list.items.length && <Label>No saved appliances. Add one to build this site's load twin.</Label>}
      <Action title="Add Appliance" disabled={!building.id} onPress={create}/>
    </Card>
    {showForm && <Card><Label>{editing?'EDIT':'NEW'} APPLIANCE</Label><Field label="Appliance name" value={form.name} onChange={v=>setForm({...form,name:v})}/>
      {(numberKeys).map(k=><Field key={k} label={labels[k]} numeric value={raw[k]??String(form[k])} onChange={v=>{setRaw({...raw,[k]:v});setForm({...form,[k]:v.trim()?Number(v):NaN});}}/>)}
      <Label>Priority</Label>{(['critical','medium','low'] as const).map(v=><Action key={v} title={`${form.priority===v?'Selected ':''}${v.toUpperCase()}`} onPress={()=>setForm({...form,priority:v,critical:v==='critical'?form.critical:false})}/>)}
      <View style={{flexDirection:'row',justifyContent:'space-between'}}><Label>Critical load</Label><Switch accessibilityLabel="Critical load" value={form.critical} onValueChange={v=>setForm({...form,critical:v,priority:v?'critical':form.priority})} trackColor={{true:t.lime}}/></View>
      <View style={{flexDirection:'row',justifyContent:'space-between'}}><Label>Flexible schedule</Label><Switch accessibilityLabel="Flexible schedule" value={form.flexible} onValueChange={v=>setForm({...form,flexible:v,interruptible:v?form.interruptible:false,max_interruptions:v?form.max_interruptions:0})} trackColor={{true:t.lime}}/></View>
      <View style={{flexDirection:'row',justifyContent:'space-between'}}><Label>Interruptible</Label><Switch accessibilityLabel="Interruptible" value={form.interruptible} onValueChange={v=>setForm({...form,interruptible:v,flexible:v?true:form.flexible,max_interruptions:v?form.max_interruptions:0})} trackColor={{true:t.lime}}/></View>
      <Action title="Save Appliance" disabled={busy} onPress={save}/><Action title="Cancel Editor" onPress={()=>setShowForm(false)}/>
    </Card>}
  </>;
}

export default function AppliancesScreen() {
 const building=useBuildings();
 return <SolvantaScreen banner="APPLIANCES - Saved twin and scenario selection"><Label>APPLIANCE DIGITAL TWIN</Label><BuildingPicker state={building}/><AppliancesWorkspace key={building.id} buildingId={building.id}/></SolvantaScreen>;
}
