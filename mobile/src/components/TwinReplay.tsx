import React,{useEffect,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import Svg,{Rect,Line,Text as SvgText} from 'react-native-svg';
import {router} from 'expo-router';
import {Card,Label,Action} from './TwinControls';
import {EnergyRun} from '../api/simulation';
import {seekInterval,loadActivity} from '../api/replay';
import {useTheme} from '../theme/ThemeContext';
export function TwinReplay({run}:{run:EnergyRun}){
 const {tokens:t}=useTheme();const [index,setIndex]=useState(0);const [playing,setPlaying]=useState(false);const [width,setWidth]=useState(300);const [speed,setSpeed]=useState(1);const steps=run.result.trace;
 useEffect(()=>{setIndex(0);setPlaying(false);},[run.id]);
 useEffect(()=>{if(!playing)return;const timer=setInterval(()=>setIndex(old=>{if(old>=steps.length-1){setPlaying(false);return old;}return old+1;}),750/speed);return()=>clearInterval(timer);},[playing,speed,steps.length]);
 const p=steps[index];if(!p)return null;
 const activities=loadActivity(run.snapshot.appliances||[],p.minute);
 const reason=(p as typeof p&{dispatch_reason?:string}).dispatch_reason||'Baseline dispatch within configured source constraints';
 const sources=[{name:'PV',kw:p.pv_kw,x:10,y:10},{name:'GRID',kw:p.grid_import_kw,x:210,y:10},{name:'BATTERY',kw:p.discharge_kw-p.charge_kw,x:10,y:155},{name:'GENERATOR',kw:p.generator_kw,x:210,y:155}];
 return <Card><Label>DIGITAL TWIN REPLAY Â· SAVED RUN {run.id.slice(0,8)}</Label><Label>SIMULATED Â· Snapshot replay; source {run.snapshot.pv.source}</Label>
 <Svg width="100%" height={225} viewBox="0 0 320 225">{sources.map(s=><React.Fragment key={s.name}><Line x1={s.x+50} y1={s.y+25} x2={160} y2={110} stroke={Math.abs(s.kw)>1e-8?t.lime:t.border} strokeWidth={Math.abs(s.kw)>1e-8?3:1}/><Rect x={s.x} y={s.y} width={100} height={50} rx={12} fill={t.surfaceElevated} stroke={t.border}/><SvgText x={s.x+50} y={s.y+19} textAnchor="middle" fill={t.textPrimary} fontSize={10}>{s.name}</SvgText><SvgText x={s.x+50} y={s.y+36} textAnchor="middle" fill={t.lime} fontSize={12}>{s.kw.toFixed(3)} kW</SvgText></React.Fragment>)}<Rect x={105} y={85} width={110} height={50} rx={12} fill={t.surfaceElevated} stroke={t.lime}/><SvgText x={160} y={104} textAnchor="middle" fill={t.textPrimary} fontSize={10}>HOME SERVED</SvgText><SvgText x={160} y={122} textAnchor="middle" fill={t.lime} fontSize={12}>{(p.load_kw-p.unmet_kw).toFixed(3)} kW</SvgText></Svg>
 <Label>Battery signed power: positive discharge, negative charge. Export {p.grid_export_kw.toFixed(3)} kW Â· Curtailed {p.curtailed_kw.toFixed(3)} kW</Label><Label>{Math.floor(p.minute/60).toString().padStart(2,'0')}:{(p.minute%60).toString().padStart(2,'0')} Â· Interval {index+1}/{steps.length} Â· Battery {p.soc_pct.toFixed(1)}%</Label>
 <Pressable accessibilityRole="adjustable" accessibilityLabel="Replay interval" accessibilityValue={{min:1,max:steps.length,now:index+1}} accessibilityActions={[{name:'increment'},{name:'decrement'}]} onAccessibilityAction={e=>{setPlaying(false);setIndex(old=>Math.max(0,Math.min(steps.length-1,old+(e.nativeEvent.actionName==='increment'?1:-1))));}} onLayout={e=>setWidth(e.nativeEvent.layout.width)} onPress={e=>{setPlaying(false);setIndex(seekInterval(e.nativeEvent.locationX,width,steps.length));}} style={{height:44,justifyContent:'center'}}><View style={{height:12,borderRadius:6,backgroundColor:t.border}}><View style={{height:12,borderRadius:6,width:`${(index+1)/steps.length*100}%`,backgroundColor:t.lime}}/></View></Pressable>
 <Action title={playing?'Pause Replay':'Play Replay'} onPress={()=>{if(index===steps.length-1)setIndex(0);setPlaying(!playing);}}/><Action title={`Playback speed ${speed}x`} onPress={()=>setSpeed(speed === 2 ? 0.5 : speed*2)}/><Action title="Restart Replay" onPress={()=>{setPlaying(false);setIndex(0);}}/>
 <Label>Requested {p.load_kw.toFixed(3)} kW Â· Unmet {p.unmet_kw.toFixed(3)} kW Â· Critical unmet {p.unserved_critical_kw.toFixed(3)} kW</Label><Label>{reason}</Label>
 {activities.map(a=><Text key={a.id} style={{color:a.active?t.lime:t.textMuted}}>{a.name}: {a.active?'requested in this interval':a.selected?'outside runtime window':'not selected'}{a.critical?' Â· critical':''}</Text>)}<Label>Activity refers to requested runtime. Aggregate unmet energy cannot identify the exact individual device served.</Label>
 <Action title="Open Saved Rooftop Layout" onPress={()=>router.push('/rooftop')}/>
 </Card>;
}
