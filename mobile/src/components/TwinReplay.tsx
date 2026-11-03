import React,{useEffect,useState} from 'react';
import {View,Pressable} from 'react-native';
import Svg,{Rect,Line,Text as SvgText} from 'react-native-svg';
import {router} from 'expo-router';
import {Play,Pause,RotateCcw,Gauge,Sun} from 'lucide-react-native';
import {Card,CardHeader,Label,Metric,MetricGrid,Action,ActionRow} from './TwinControls';
import {EnergyRun} from '../api/simulation';
import {seekInterval,pressX,loadActivity} from '../api/replay';
import {useTheme} from '../theme/ThemeContext';
export function TwinReplay({run}:{run:EnergyRun}){
 const {tokens:t}=useTheme();const [index,setIndex]=useState(0);const [playing,setPlaying]=useState(false);const [width,setWidth]=useState(300);const [speed,setSpeed]=useState(1);const steps=run.result.trace;
 useEffect(()=>{setIndex(0);setPlaying(false);},[run.id]);
 useEffect(()=>{if(!playing)return;const timer=setInterval(()=>setIndex(old=>{if(old>=steps.length-1){setPlaying(false);return old;}return old+1;}),750/speed);return()=>clearInterval(timer);},[playing,speed,steps.length]);
 const p=steps[index];if(!p)return null;
 const activities=loadActivity(run.snapshot.appliances||[],p.minute);
 const reason=(p as typeof p&{dispatch_reason?:string}).dispatch_reason||'Baseline dispatch within configured source constraints';
 const sources=[{name:'PV',kw:p.pv_kw,x:10,y:10},{name:'GRID',kw:p.grid_import_kw,x:210,y:10},{name:'BATTERY',kw:p.discharge_kw-p.charge_kw,x:10,y:155},{name:'GENERATOR',kw:p.generator_kw,x:210,y:155}];
 return <Card><CardHeader title="Digital twin replay" subtitle={`Saved run ${run.id.slice(0,8)} · Snapshot replay; source ${run.snapshot.pv.source}`} badge="SIMULATED"/>
 <Svg width="100%" height={225} viewBox="0 0 320 225">{sources.map(s=><React.Fragment key={s.name}><Line x1={s.x+50} y1={s.y+25} x2={160} y2={110} stroke={Math.abs(s.kw)>1e-8?t.limeMark:t.border} strokeWidth={Math.abs(s.kw)>1e-8?3:1}/><Rect x={s.x} y={s.y} width={100} height={50} rx={14} fill={t.surfaceElevated} stroke={t.border}/><SvgText x={s.x+50} y={s.y+20} textAnchor="middle" fontFamily="sans-serif" fill={t.textSecondary} fontSize={11}>{s.name}</SvgText><SvgText x={s.x+50} y={s.y+37} textAnchor="middle" fontFamily="sans-serif" fill={t.limeText} fontSize={13} fontWeight="700">{s.kw.toFixed(3)} kW</SvgText></React.Fragment>)}<Rect x={105} y={85} width={110} height={50} rx={14} fill={t.surfaceElevated} stroke={t.limeMark} strokeWidth={1.5}/><SvgText x={160} y={105} textAnchor="middle" fontFamily="sans-serif" fill={t.textSecondary} fontSize={11}>HOME SERVED</SvgText><SvgText x={160} y={122} textAnchor="middle" fontFamily="sans-serif" fill={t.limeText} fontSize={13} fontWeight="700">{(p.load_kw-p.unmet_kw).toFixed(3)} kW</SvgText></Svg>
 <Label strong>{Math.floor(p.minute/60).toString().padStart(2,'0')}:{(p.minute%60).toString().padStart(2,'0')} · Interval {index+1}/{steps.length} · Battery {p.soc_pct.toFixed(1)}%</Label>
 <Pressable accessibilityRole="adjustable" accessibilityLabel="Replay interval" accessibilityValue={{min:1,max:steps.length,now:index+1}} aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index+1} aria-valuetext={`Interval ${index+1} of ${steps.length}`} accessibilityActions={[{name:'increment'},{name:'decrement'}]} onAccessibilityAction={e=>{setPlaying(false);setIndex(old=>Math.max(0,Math.min(steps.length-1,old+(e.nativeEvent.actionName==='increment'?1:-1))));}} onLayout={e=>setWidth(e.nativeEvent.layout.width)} onPress={e=>{setPlaying(false);setIndex(seekInterval(pressX(e),width,steps.length));}} style={{height:44,justifyContent:'center'}}><View style={{height:12,borderRadius:6,backgroundColor:t.surfaceElevated,borderWidth:1,borderColor:t.border}}><View style={{height:10,borderRadius:5,width:`${(index+1)/steps.length*100}%`,backgroundColor:t.limeMark}}/></View></Pressable>
 <Action title={playing?'Pause Replay':'Play Replay'} icon={playing?<Pause size={16} color={t.onLime}/>:<Play size={16} color={t.onLime}/>} onPress={()=>{if(index===steps.length-1)setIndex(0);setPlaying(!playing);}}/>
 <ActionRow><Action title={`Playback speed ${speed}x`} variant="secondary" icon={<Gauge size={15} color={t.textPrimary}/>} onPress={()=>setSpeed(speed === 2 ? 0.5 : speed*2)}/><Action title="Restart Replay" variant="secondary" icon={<RotateCcw size={15} color={t.textPrimary}/>} onPress={()=>{setPlaying(false);setIndex(0);}}/></ActionRow>
 <MetricGrid><Metric label="Requested" value={p.load_kw.toFixed(3)} unit="kW"/><Metric label="Unmet" value={p.unmet_kw.toFixed(3)} unit="kW" tone={p.unmet_kw>0?'warning':'primary'}/><Metric label="Critical unmet" value={p.unserved_critical_kw.toFixed(3)} unit="kW" tone={p.unserved_critical_kw>0?'danger':'primary'}/><Metric label="Export" value={p.grid_export_kw.toFixed(3)} unit="kW"/><Metric label="Curtailed" value={p.curtailed_kw.toFixed(3)} unit="kW"/></MetricGrid>
 <Label tone="secondary" caption>{reason}</Label><Label tone="secondary" caption>Battery signed power: positive discharge, negative charge.</Label>
 {activities.map(a=><View key={a.id} style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:a.active?t.limeMark:t.border}}/><View style={{flex:1}}><Label tone={a.active?'accent':'secondary'} caption>{a.name}: {a.active?'requested in this interval':a.selected?'outside runtime window':'not selected'}{a.critical?' · critical':''}</Label></View></View>)}<Label tone="secondary" caption>Activity refers to requested runtime. Aggregate unmet energy cannot identify the exact individual device served.</Label>
 <Action title="Open Saved Rooftop Layout" variant="secondary" icon={<Sun size={16} color={t.textPrimary}/>} onPress={()=>router.push('/rooftop')}/>
 </Card>;
}
