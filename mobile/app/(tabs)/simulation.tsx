import React,{useEffect,useState} from 'react';
import {View,Switch} from 'react-native';
import Svg,{Circle} from 'react-native-svg';
import {router} from 'expo-router';
import {SolvantaScreen} from '../../src/components/SolvantaScreen';
import {Card,Label,Field,Action,BuildingPicker,useBuildings} from '../../src/components/TwinControls';
import {useTheme} from '../../src/theme/ThemeContext';
import {api} from '../../src/api/client';
import {ForecastCard} from '../../src/components/ForecastCard';
import {ResilienceCard} from '../../src/components/ResilienceCard';
import {PlanCard} from '../../src/components/PlanCard';
import {AutomationCard} from '../../src/components/AutomationCard';
import {TelemetryCard} from '../../src/components/TelemetryCard';
import {TwinReplay} from '../../src/components/TwinReplay';
import {EnergyRun,parseOutages} from '../../src/api/simulation';
function SimulationWorkspace({buildingId}:{buildingId:string}){
 const {tokens:t}=useTheme();const building={id:buildingId};
 const [outages,setOutages]=useState('480-600');const [generator,setGenerator]=useState(false);
 const [run,setRun]=useState<EnergyRun|null>(null);const [step,setStep]=useState(0);
 const [history,setHistory]=useState<Array<{id:string;created_at:string}>>([]);
 const [message,setMessage]=useState('Save a roof/PV design and select appliances before running.');const [busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;setRun(null);setHistory([]);setStep(0);if(building.id)api.get<Array<{id:string;created_at:string}>>(`/buildings/${building.id}/simulations`).then(r=>{if(active)setHistory(r);}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[building.id]);
 async function execute(){if(!building.id||busy)return;setBusy(true);try{
 const result=await api.post<EnergyRun>(`/buildings/${building.id}/simulations`,{outages:parseOutages(outages),use_generator:generator});setRun(result);setStep(0);setHistory([{id:result.id,created_at:result.created_at},...history].slice(0,20));setMessage('Simulation saved. No physical switching occurred.');
 }catch(e:any){setMessage(e.message);}finally{setBusy(false);}}
 async function open(id:string){setBusy(true);try{setRun(await api.get<EnergyRun>(`/buildings/${building.id}/simulations/${id}`));setStep(0);setMessage('Loaded immutable saved run.');}catch(e:any){setMessage(e.message);}finally{setBusy(false);}}
 const p=run?.result.trace[step];
 return <>
 <Card><Field label="Outages: minute ranges (0–1440), separated by commas" value={outages} onChange={setOutages}/><Label>Example: 480-600 means 08:00–10:00. Blank means grid available all day.</Label>
 <View style={{flexDirection:'row',justifyContent:'space-between'}}><Label>Use configured generator</Label><Switch accessibilityLabel="Use configured generator" value={generator} onValueChange={setGenerator} trackColor={{true:t.lime}}/></View>
 <Action title="Run & Save Simulation" disabled={busy||!building.id} onPress={execute}/><Label>{message}</Label><Action title="Open Scheduling" onPress={()=>router.push('/scheduling')}/></Card>
 {run&&<TwinReplay run={run}/>}
 {run&&p&&<Card><Label>RUN {run.id.slice(0,8)} · {run.snapshot.pv.source}</Label>
 <Label>Requested {run.result.summary.load_kwh.toFixed(2)} kWh · Unmet {run.result.summary.unmet_kwh.toFixed(2)} kWh</Label>
 <Label>Critical unmet {run.result.summary.unserved_critical_kwh.toFixed(2)} kWh · Grid import {run.result.summary.grid_import_kwh.toFixed(2)} kWh</Label>
 <Label>Generator fuel {run.result.summary.generator_fuel_l.toFixed(2)} L · Curtailed {run.result.summary.curtailed_kwh.toFixed(2)} kWh</Label>
 <View style={{alignItems:'center'}}><Svg width={150} height={150}><Circle cx={75} cy={75} r={60} stroke={t.border} strokeWidth={12} fill="none"/><Circle cx={75} cy={75} r={60} stroke={t.lime} strokeWidth={12} fill="none" strokeDasharray={`${p.soc_pct/100*377} 377`} rotation={-90} origin="75,75"/></Svg><Label>Battery {p.soc_pct.toFixed(1)}% · {p.battery_end_kwh.toFixed(3)} kWh</Label></View>
 <View accessibilityLabel="Battery state of charge over 24 hours" style={{height:80,flexDirection:'row',alignItems:'flex-end',gap:1}}>{run.result.trace.map((v,i)=><View key={i} style={{flex:1,height:Math.max(1,v.soc_pct*.8),backgroundColor:i===step?t.cyan:t.lime}}/>)}</View>
 <Label>Interval {step+1}/96 · {Math.floor(p.minute/60).toString().padStart(2,'0')}:{(p.minute%60).toString().padStart(2,'0')} · Grid {p.grid_available?'available':'outage'}</Label>
 <Action title="Previous Interval" disabled={step===0} onPress={()=>setStep(step-1)}/><Action title="Next Interval" disabled={step===95} onPress={()=>setStep(step+1)}/>
 <Label>PV {p.pv_kw.toFixed(3)} kW · Load {p.load_kw.toFixed(3)} kW</Label><Label>Grid {p.grid_import_kw.toFixed(3)} kW · Generator {p.generator_kw.toFixed(3)} kW</Label>
 <Label>Charge {p.charge_kw.toFixed(3)} kW · Discharge {p.discharge_kw.toFixed(3)} kW · Unmet {p.unmet_kw.toFixed(3)} kW</Label>
 {run.result.assumptions.map(a=><Label key={a}>{a}</Label>)}
 </Card>}
 <TelemetryCard key={run?.id||building.id} buildingId={building.id} runId={run?.id}/><AutomationCard buildingId={building.id}/><PlanCard buildingId={building.id} outages={outages} useGenerator={generator}/><ResilienceCard key={`resilience-${building.id}-${outages}-${generator}`} buildingId={building.id} outages={outages} useGenerator={generator}/><ForecastCard key={`forecast-${building.id}-${outages}-${generator}`} buildingId={building.id} outages={outages} useGenerator={generator}/><Card><Label>SAVED RUNS (LATEST 20)</Label>{history.map(r=><Action key={r.id} disabled={busy} title={`${new Date(r.created_at).toLocaleString()} · ${r.id.slice(0,8)}`} onPress={()=>open(r.id)}/>)}</Card>
 </>;
}

export default function SimulationScreen() {
 const building=useBuildings();
 return <SolvantaScreen banner="SIMULATED - Saved 15-minute energy balance"><Label>ENERGY & OUTAGE SIMULATOR</Label><BuildingPicker state={building}/><SimulationWorkspace key={building.id} buildingId={building.id}/></SolvantaScreen>;
}
