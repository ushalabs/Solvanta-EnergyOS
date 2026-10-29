import React,{useEffect,useState} from 'react';
import {router} from 'expo-router';
import {SolvantaScreen} from '../../src/components/SolvantaScreen';
import {Card,Label,Action,BuildingPicker,useBuildings} from '../../src/components/TwinControls';
import {api} from '../../src/api/client';
import {OperationsTools} from '../../src/components/OperationsTools';
export default function Operations(){
 const building=useBuildings();const [incidents,setIncidents]=useState<Array<{id:string;source:string;code:string;state:string;possible_cause:string}>>([]);const [status,setStatus]=useState('Select a building to load operations evidence.');
 useEffect(()=>{let active=true;setIncidents([]);if(building.id)Promise.all([api.getReady(),api.get<typeof incidents>(`/buildings/${building.id}/incidents`)]).then(([r,i])=>{if(active){setStatus(`API ready: ${r.ready}; database ${r.database}.`);setIncidents(i);}}).catch(e=>{if(active)setStatus(e.message);});return()=>{active=false;};},[building.id]);
 return <SolvantaScreen banner="OPERATIONS • Authenticated engine tools"><Label>SOLVANTA OPERATIONS</Label><BuildingPicker state={building}/>{building.id&&<OperationsTools key={building.id} buildingId={building.id}/>}<Card><Label>{status}</Label>{incidents.map(i=><Card key={i.id}><Label>{i.source} · {i.code} · {i.state}</Label><Label>{i.possible_cause}</Label></Card>)}<Action title="Open Simulation & Plan Review" onPress={()=>router.push('/simulation')}/></Card></SolvantaScreen>;
}
