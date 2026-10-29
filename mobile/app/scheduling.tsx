import React,{useState,useEffect} from 'react';
import {View} from 'react-native';
import {router} from 'expo-router';
import {SolvantaScreen} from '../src/components/SolvantaScreen';
import {Card,Label,Field,Action,BuildingPicker,useBuildings} from '../src/components/TwinControls';
import {api} from '../src/api/client';
import {parseOutages} from '../src/api/simulation';
import {useTheme} from '../src/theme/ThemeContext';
type Schedule={id:string|null;created_at?:string;result:{status:string;validated:boolean;reasons:string[];supply_policy:string;objective_description?:string;demand_kwh?:number;entries:Array<{appliance_id:string;name:string;priority:string;rated_power_w:number;segments:Array<{start_min:number;end_min:number}>}>}};
const clock=(m:number)=>`${Math.floor(m/60).toString().padStart(2,'0')}:${(m%60).toString().padStart(2,'0')}`;
export default function Scheduling(){
 const {tokens:t}=useTheme();const building=useBuildings();const [outages,setOutages]=useState('480-600');const [busy,setBusy]=useState(false);const [result,setResult]=useState<Schedule|null>(null);const [history,setHistory]=useState<Schedule[]>([]);const [message,setMessage]=useState('Select appliances in the Appliances tab, then schedule all selected loads.');
 useEffect(()=>{let active=true;setResult(null);setHistory([]);if(building.id)api.get<Schedule[]>(`/buildings/${building.id}/schedules`).then(r=>{if(active)setHistory(r);}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[building.id]);
 async function run(){setBusy(true);try{const r=await api.post<Schedule>(`/buildings/${building.id}/schedules`,{outages:parseOutages(outages),use_generator:false},30000);setResult(r);if(r.id)setHistory([r,...history].slice(0,20));setMessage(r.id?'Validated schedule saved. No physical switching.':'No schedule saved; see conflict details below.');}catch(e:any){setMessage(e.message);}finally{setBusy(false);}}
 return <SolvantaScreen banner="SIMULATED • Constraint-aware appliance scheduling"><Action title="Back to Simulation" onPress={()=>router.replace('/simulation')}/><Label>APPLIANCE SCHEDULER</Label><BuildingPicker state={building}/><Card><Field label="Outages (minute ranges, e.g. 480-600)" value={outages} onChange={setOutages}/><Label>Uses PV plus available grid. Battery and generator support are reserved for resilience optimization. All selected appliances must finish; fixed loads remain at their earliest start.</Label><Action title="Solve & Save Schedule" disabled={busy||!building.id} onPress={run}/><Label>{message}</Label></Card>
 {result&&<Card><Label>{result.result.status}{result.result.validated?' • independently validated':''}</Label><Label>{result.result.supply_policy}</Label>{result.result.reasons.map(r=><Label key={r}>{r}</Label>)}{result.result.objective_description&&<Label>{result.result.objective_description}</Label>}
 {result.result.entries.map(e=><View key={e.appliance_id} style={{padding:12,borderRadius:18,backgroundColor:t.surfaceElevated,gap:8}}><Label>{e.name} · {e.priority.toUpperCase()} · {(e.rated_power_w/1000).toFixed(2)} kW</Label><View style={{height:18,position:'relative',backgroundColor:t.border,borderRadius:9}}>{e.segments.map((s,i)=><View key={i} style={{position:'absolute',height:18,left:`${s.start_min/1440*100}%`,width:`${(s.end_min-s.start_min)/1440*100}%`,backgroundColor:t.lime,borderRadius:4}}/>)}</View>{e.segments.map((s,i)=><Label key={i}>{clock(s.start_min)}–{clock(s.end_min)} ({s.end_min-s.start_min} min)</Label>)}</View>)}
 {result.id&&<Label>Saved run {result.id.slice(0,8)} · {result.result.demand_kwh?.toFixed(2)} kWh requested</Label>}</Card>}
 <Card><Label>SAVED SCHEDULES</Label>{history.map(r=><Action key={r.id} title={`${new Date(r.created_at!).toLocaleString()} · ${r.id?.slice(0,8)}`} onPress={()=>setResult(r)}/>)}</Card></SolvantaScreen>;
}
