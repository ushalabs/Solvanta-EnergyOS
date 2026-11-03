import React,{useEffect,useState} from 'react';
import {router} from 'expo-router';
import {Settings,Activity,Sliders,Sun,CalendarClock,Bot} from 'lucide-react-native';
import {SolvantaScreen} from '../../src/components/SolvantaScreen';
import {NeonHeroCard} from '../../src/components/NeonHeroCard';
import {Card,CardHeader,Message,Metric,MetricGrid,ScreenHeader,IconButton,ChipGroup,Tile,BuildingPicker,useBuildings} from '../../src/components/TwinControls';
import {useTheme} from '../../src/theme/ThemeContext';
import {api,EquipmentSummary} from '../../src/api/client';
export default function Overview(){
 const {tokens:t}=useTheme();
 const building=useBuildings();const [equipment,setEquipment]=useState<EquipmentSummary|null>(null);const [summary,setSummary]=useState<Record<string,number>|null>(null);const [message,setMessage]=useState('Sign in and choose a building.');
 useEffect(()=>{let active=true;setEquipment(null);setSummary(null);if(building.id)Promise.all([api.getBuildingEquipment(building.id),api.get<Array<{summary:Record<string,number>}>>(`/buildings/${building.id}/simulations`)]).then(([e,r])=>{if(active){setEquipment(e);setSummary(r[0]?.summary||null);setMessage(r.length?'Showing latest saved simulation.':'No saved simulation yet. Run one to see numerical energy results.');}}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[building.id]);
 return <SolvantaScreen banner="LIVE CONFIGURATION • SIMULATED energy results">
  <ScreenHeader title="Solvanta" subtitle={equipment?equipment.building_name:'EnergyOS'} right={<IconButton label="Open Settings" onPress={()=>router.push('/settings')}><Settings size={20} color={t.textPrimary}/></IconButton>}/>
  <NeonHeroCard badgeText="Simulated" title={summary?'Latest saved simulation':equipment?'No saved simulation yet':'No building data'} subtitle={summary?`Critical unmet ${summary.unserved_critical_kwh.toFixed(2)} kWh · Final battery ${summary.final_soc_pct.toFixed(1)}%`:undefined}/>
  <BuildingPicker state={building}/>
  <Message>{message}</Message>
  {equipment&&<Card><CardHeader title="Configured system" subtitle="From saved building equipment"/><MetricGrid><Metric label="Installed PV" value={equipment.solar.pv_capacity_kwp} unit="kWp"/><Metric label="Inverter" value={equipment.inverter.rating_kw} unit="kW"/><Metric label="Battery" value={equipment.battery.nominal_capacity_kwh} unit="kWh"/><Metric label="Initial SoC" value={equipment.battery.initial_soc_pct} unit="%"/><Metric label="Grid import limit" value={equipment.grid.import_limit_kw} unit="kW"/></MetricGrid></Card>}
  {summary&&<Card><CardHeader title="Latest saved simulation" subtitle="Simulated energy over the run"/><MetricGrid><Metric label="Requested" value={summary.load_kwh.toFixed(2)} unit="kWh"/><Metric label="PV" value={summary.pv_kwh.toFixed(2)} unit="kWh" tone="accent"/><Metric label="Unmet" value={summary.unmet_kwh.toFixed(2)} unit="kWh" tone={summary.unmet_kwh>0?'warning':'primary'}/><Metric label="Critical unmet" value={summary.unserved_critical_kwh.toFixed(2)} unit="kWh" tone={summary.unserved_critical_kwh>0?'danger':'success'}/><Metric label="Final battery" value={summary.final_soc_pct.toFixed(1)} unit="%"/></MetricGrid></Card>}
  <ChipGroup>
   <Tile active title="Simulate, Compare & Approve" subtitle="Run an outage scenario and review plans" icon={c=><Activity size={20} color={c}/>} onPress={()=>router.push('/simulation')}/>
   <Tile title="Configure Appliances" icon={c=><Sliders size={20} color={c}/>} onPress={()=>router.push('/appliances')}/>
   <Tile title="Open Rooftop & PV Design" icon={c=><Sun size={20} color={c}/>} onPress={()=>router.push('/rooftop')}/>
   <Tile title="Schedule Appliances" icon={c=><CalendarClock size={20} color={c}/>} onPress={()=>router.push('/scheduling')}/>
   <Tile title="Open Operations" icon={c=><Bot size={20} color={c}/>} onPress={()=>router.push('/ai')}/>
  </ChipGroup>
 </SolvantaScreen>;
}
