import React, {useEffect, useState} from 'react';
import {router} from 'expo-router';
import {api} from '../api/client';
import {Action, Card, Label} from './TwinControls';

type Result = {tool:string;source:string;building_id:string;scenario_id:string|null;record_id:string|null;provenance:string;units:Record<string,string>;data:Record<string,any>};
export function resultSummary(result:Result): Record<string,unknown> {
 const d=result.data;
 if(d.result?.summary)return d.result.summary;
 if(d.optimized?.summary)return {critical_energy_saved_kwh:d.critical_energy_saved_kwh,optimized:d.optimized.summary};
 if(d.projection?.summary)return {shortage:d.shortage,projection:d.projection.summary};
 if(d.variants)return {state:d.state,revision:d.revision,run_id:d.run_id,variants:d.variants.map((v:any)=>({name:v.name,summary:v.summary,tradeoff:v.tradeoff}))};
 if(d.entries)return {status:d.status,validated:d.validated,demand_kwh:d.demand_kwh,reasons:d.reasons,entries:d.entries};
 if(d.incidents)return {incidents:d.incidents.map((i:any)=>({id:i.id,source:i.source,code:i.code,state:i.state,possible_cause:i.possible_cause}))};
 return d;
}
export function OperationsTools({buildingId}:{buildingId:string}) {
 const [tools,setTools]=useState<string[]>([]),[runs,setRuns]=useState<Array<{id:string;created_at:string}>>([]);
 const [scenario,setScenario]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('Loading tools and saved scenarios…');
 const [result,setResult]=useState<Result|null>(null);
 useEffect(()=>{let active=true;Promise.all([api.get<{tools:Array<{name:string}>}>('/operations/tools'),api.get<typeof runs>(`/buildings/${buildingId}/simulations`)])
  .then(([t,r])=>{if(active){setTools(t.tools.map(x=>x.name));setRuns(r);setScenario(r[0]?.id||'');setStatus('Authenticated gateway ready. Select a saved scenario and invoke a tool.');}})
  .catch(e=>{if(active)setStatus(e.message);});return()=>{active=false;};},[buildingId]);
 const invoke=async(name:string)=>{setBusy(true);setResult(null);setStatus(`Running ${name}…`);try{
  const arguments_=name==='get_building_profile'||name==='get_energy_anomalies'?{building_id:buildingId}:{scenario_id:scenario,...(name==='compare_energy_configurations'?{variations:[0,1,2]}:{})};
  const response=await api.post<Result>(`/operations/tools/${name}`,arguments_,30000);
  setResult(response);setStatus(`${name} completed. ${response.record_id?'Saved record '+response.record_id:'Read/calculation result returned.'}`);
 }catch(e:any){setStatus(e.message);}finally{setBusy(false);}};
 return <Card><Label>ENGINE TOOLS · MCP service gateway</Label><Label>Tool execution only. No language model is connected. Results use configured or SIMULATED data; tools never approve plans or control physical equipment.</Label><Label>{status}</Label>
  <Label>SAVED SCENARIO · immutable simulation run</Label>{!runs.length&&<Label>Save a simulation first to enable scenario tools.</Label>}
  {runs.map(r=><Action key={r.id} title={`${scenario===r.id?'✓ ':''}${r.id.slice(0,8)} · ${new Date(r.created_at).toLocaleString()}`} disabled={busy} onPress={()=>{setScenario(r.id);setResult(null);}}/>)}
  {tools.map(name=><Action key={name} title={name.replaceAll('_',' ')} disabled={busy||(!scenario&&name!=='get_building_profile'&&name!=='get_energy_anomalies')} onPress={()=>invoke(name)}/>)}
  {result&&<Card><Label>{result.source} · {result.tool}</Label><Label>Building: {result.building_id}</Label><Label>Scenario: {result.scenario_id||'Building configuration'}</Label><Label>{result.provenance}</Label><Label>Units: {Object.entries(result.units).map(([k,v])=>`${k} ${v}`).join(' · ')}</Label><Label>{JSON.stringify(resultSummary(result),null,2)}</Label></Card>}
  <Action title="Open Human Plan Review" onPress={()=>router.push('/simulation')}/>
 </Card>;
}
