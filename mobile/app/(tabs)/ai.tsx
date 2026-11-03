import React,{useEffect,useState} from 'react';
import {router} from 'expo-router';
import {SolvantaScreen} from '../../src/components/SolvantaScreen';
import {Card,CardHeader,Label,Message,Badge,Action,ScreenHeader,BuildingPicker,useBuildings} from '../../src/components/TwinControls';
import {api} from '../../src/api/client';
import {OperationsTools} from '../../src/components/OperationsTools';
export default function Operations(){
 const building=useBuildings();const [incidents,setIncidents]=useState<Array<{id:string;source:string;code:string;state:string;possible_cause:string}>>([]);const [status,setStatus]=useState('Select a building to load operations evidence.');
 useEffect(()=>{let active=true;setIncidents([]);if(building.id)Promise.all([api.getReady(),api.get<typeof incidents>(`/buildings/${building.id}/incidents`)]).then(([r,i])=>{if(active){setStatus(`API ready: ${r.ready}; database ${r.database}.`);setIncidents(i);}}).catch(e=>{if(active)setStatus(e.message);});return()=>{active=false;};},[building.id]);
 return <SolvantaScreen banner="OPERATIONS • Authenticated engine tools"><ScreenHeader title="Operations" subtitle="Engine tools and incident evidence"/><BuildingPicker state={building}/>{building.id&&<OperationsTools key={building.id} buildingId={building.id}/>}<Card><CardHeader title="Incidents" subtitle="Simulated source until real data exists"/><Message>{status}</Message>{incidents.map(i=><Card nested key={i.id}><Badge label={i.source} tone="warning"/><Label strong>{i.code} · {i.state}</Label><Label tone="secondary" caption>{i.possible_cause}</Label></Card>)}<Action title="Open Simulation & Plan Review" variant="secondary" onPress={()=>router.push('/simulation')}/></Card></SolvantaScreen>;
}
