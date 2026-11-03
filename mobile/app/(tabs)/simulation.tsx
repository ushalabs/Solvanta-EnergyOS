import React,{useEffect,useState} from 'react';
import {View,Text} from 'react-native';
import {router} from 'expo-router';
import {Play,CalendarClock,ChevronLeft,ChevronRight,History} from 'lucide-react-native';
import {SolvantaScreen} from '../../src/components/SolvantaScreen';
import {SocGauge} from '../../src/components/SocGauge';
import {Card,CardHeader,Label,Message,Metric,MetricGrid,Field,Toggle,Action,ActionRow,ListAction,ScreenHeader,BuildingPicker,useBuildings} from '../../src/components/TwinControls';
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
 <Card><CardHeader title="Outage scenario" icon={<Play size={18} color={t.limeText}/>}/><Field label="Outages: minute ranges (0–1440), separated by commas" value={outages} onChange={setOutages} hint="Example: 480-600 means 08:00–10:00. Blank means grid available all day."/>
 <Toggle label="Use configured generator" value={generator} onValueChange={setGenerator}/>
 <Action title="Run & Save Simulation" disabled={busy||!building.id} loading={busy} onPress={execute}/><Message>{message}</Message><Action title="Open Scheduling" variant="secondary" icon={<CalendarClock size={16} color={t.textPrimary}/>} onPress={()=>router.push('/scheduling')}/></Card>
 {run&&<TwinReplay run={run}/>}
 {run&&p&&<Card><CardHeader title="Simulation result" subtitle={`Run ${run.id.slice(0,8)} · ${run.snapshot.pv.source}`}/>
 <MetricGrid><Metric label="Requested" value={run.result.summary.load_kwh.toFixed(2)} unit="kWh"/><Metric label="Unmet" value={run.result.summary.unmet_kwh.toFixed(2)} unit="kWh" tone={run.result.summary.unmet_kwh>0?'warning':'primary'}/><Metric label="Critical unmet" value={run.result.summary.unserved_critical_kwh.toFixed(2)} unit="kWh" tone={run.result.summary.unserved_critical_kwh>0?'danger':'success'}/><Metric label="Grid import" value={run.result.summary.grid_import_kwh.toFixed(2)} unit="kWh"/><Metric label="Generator fuel" value={run.result.summary.generator_fuel_l.toFixed(2)} unit="L"/><Metric label="Curtailed" value={run.result.summary.curtailed_kwh.toFixed(2)} unit="kWh"/></MetricGrid>
 <SocGauge socPct={p.soc_pct} caption={`Battery · ${p.battery_end_kwh.toFixed(3)} kWh`}/>
 <View accessibilityLabel="Battery state of charge over 24 hours" style={{height:80,flexDirection:'row',alignItems:'flex-end',gap:1}}>{run.result.trace.map((v,i)=><View key={i} style={{flex:1,height:Math.max(1,v.soc_pct*.8),borderTopLeftRadius:2,borderTopRightRadius:2,backgroundColor:i===step?t.cyanText:t.limeMark}}/>)}</View>
 <View style={{flexDirection:'row',justifyContent:'space-between'}}>{['00:00','12:00','24:00'].map(h=><Text key={h} style={{color:t.textSecondary,fontSize:12}}>{h}</Text>)}</View>
 <Label strong>Interval {step+1}/96 · {Math.floor(p.minute/60).toString().padStart(2,'0')}:{(p.minute%60).toString().padStart(2,'0')} · Grid {p.grid_available?'available':'outage'}</Label>
 <ActionRow><Action title="Previous" label="Previous Interval" variant="secondary" icon={<ChevronLeft size={16} color={step===0?t.textSecondary:t.textPrimary}/>} disabled={step===0} onPress={()=>setStep(step-1)}/><Action title="Next" label="Next Interval" variant="secondary" icon={<ChevronRight size={16} color={step===95?t.textSecondary:t.textPrimary}/>} disabled={step===95} onPress={()=>setStep(step+1)}/></ActionRow>
 <MetricGrid><Metric label="PV" value={p.pv_kw.toFixed(3)} unit="kW" tone="accent"/><Metric label="Load" value={p.load_kw.toFixed(3)} unit="kW"/><Metric label="Grid" value={p.grid_import_kw.toFixed(3)} unit="kW" tone="info"/><Metric label="Generator" value={p.generator_kw.toFixed(3)} unit="kW" tone="warning"/><Metric label="Charge" value={p.charge_kw.toFixed(3)} unit="kW"/><Metric label="Discharge" value={p.discharge_kw.toFixed(3)} unit="kW"/><Metric label="Unmet" value={p.unmet_kw.toFixed(3)} unit="kW" tone={p.unmet_kw>0?'danger':'primary'}/></MetricGrid>
 {run.result.assumptions.map(a=><Label key={a} tone="secondary" caption>{a}</Label>)}
 </Card>}
 <TelemetryCard key={run?.id||building.id} buildingId={building.id} runId={run?.id}/><AutomationCard buildingId={building.id}/><PlanCard buildingId={building.id} outages={outages} useGenerator={generator}/><ResilienceCard key={`resilience-${building.id}-${outages}-${generator}`} buildingId={building.id} outages={outages} useGenerator={generator}/><ForecastCard key={`forecast-${building.id}-${outages}-${generator}`} buildingId={building.id} outages={outages} useGenerator={generator}/><Card><CardHeader title="Saved runs" subtitle="Latest 20" icon={<History size={18} color={t.limeText}/>}/>{history.map(r=><ListAction key={r.id} disabled={busy} title={`${new Date(r.created_at).toLocaleString()} · ${r.id.slice(0,8)}`} onPress={()=>open(r.id)}/>)}</Card>
 </>;
}

export default function SimulationScreen() {
 const building=useBuildings();
 return <SolvantaScreen banner="SIMULATED - Saved 15-minute energy balance"><ScreenHeader title="Simulation lab" subtitle="Energy and outage simulator"/><BuildingPicker state={building}/><SimulationWorkspace key={building.id} buildingId={building.id}/></SolvantaScreen>;
}
