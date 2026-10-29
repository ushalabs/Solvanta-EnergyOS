import React,{useEffect,useState} from 'react';
import {View,Switch} from 'react-native';
import {Card,Label,Action} from './TwinControls';
import {api} from '../api/client';
import {EnergyResult,parseOutages} from '../api/simulation';
import {useTheme} from '../theme/ThemeContext';
type Forecast={generated_at:string;method:string;time_basis:string;fallback_reason:string|null;provenance:{source:string;source_run_id:string|null;pv_source:string;observed_samples:number};evaluation:{reason:string};shortage:{level:string;first_unmet_minute:number|null;unmet_kwh:number;critical_unmet_kwh:number;minimum_soc_pct:number};projection:EnergyResult};
export function ForecastCard({buildingId,outages,useGenerator}:{buildingId:string;outages:string;useGenerator:boolean}){
 const {tokens:t}=useTheme();const [history,setHistory]=useState(false);const [result,setResult]=useState<Forecast|null>(null);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('Project the next representative day using the outage settings above.');
 useEffect(()=>{setResult(null);},[buildingId,outages,useGenerator,history]);
 async function run(){setBusy(true);try{setResult(await api.post<Forecast>(`/buildings/${buildingId}/forecast`,{basis:history?'latest_run':'configured',outages:parseOutages(outages),use_generator:useGenerator}));setMessage('Projection calculated from the stated source.');}catch(e:any){setResult(null);setMessage(e.message);}finally{setBusy(false);}}
 const peak=result?Math.max(1,...result.projection.trace.map(p=>Math.max(p.load_kw,p.pv_kw))):1;
 return <Card><Label>24-HOUR BASELINE FORECAST</Label><Label>Use latest saved simulation as the profile source</Label><Switch accessibilityLabel="Forecast from latest simulation" value={history} onValueChange={setHistory} trackColor={{true:t.lime}}/><Action title="Project Energy Shortage" disabled={!buildingId||busy} onPress={run}/><Label>{message}</Label>
 {result&&<><Label>{result.provenance.source}</Label><Label>{result.provenance.pv_source}</Label><Label>{result.time_basis}</Label>{result.fallback_reason&&<Label>{result.fallback_reason}</Label>}
 <Label>Shortage: {result.shortage.level.toUpperCase()} · {result.shortage.unmet_kwh.toFixed(2)} kWh unmet</Label><Label>Critical unmet {result.shortage.critical_unmet_kwh.toFixed(2)} kWh · Minimum battery {result.shortage.minimum_soc_pct.toFixed(1)}%</Label><Label>{result.shortage.first_unmet_minute===null?'No shortage under these assumptions.':`First unmet interval starts ${Math.floor(result.shortage.first_unmet_minute/60).toString().padStart(2,'0')}:${(result.shortage.first_unmet_minute%60).toString().padStart(2,'0')}`}</Label>
 <Label>PV (lime) and load (cyan), 00:00–24:00</Label><View accessibilityLabel="Forecast PV and load chart" style={{height:90,flexDirection:'row',alignItems:'flex-end',gap:1}}>{result.projection.trace.map(p=><View key={p.minute} style={{flex:1,height:90,flexDirection:'row',alignItems:'flex-end'}}><View style={{flex:1,height:Math.max(1,p.pv_kw/peak*90),backgroundColor:t.lime}}/><View style={{flex:1,height:Math.max(1,p.load_kw/peak*90),backgroundColor:t.cyan}}/></View>)}</View>
 <Label>{result.evaluation.reason}</Label><Label>Generated {new Date(result.generated_at).toLocaleString()}{result.provenance.source_run_id?` · Source run ${result.provenance.source_run_id.slice(0,8)}`:''}</Label></>}
 </Card>;
}
