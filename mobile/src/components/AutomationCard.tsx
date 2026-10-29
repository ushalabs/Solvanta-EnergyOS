import React,{useEffect,useState} from 'react';
import {Card,Label,Action} from './TwinControls';
import {api} from '../api/client';
type Event={id:string;kind:string;state:string;notice:string;plan_id:string;correlation_id:string;run_id:string|null};
export function AutomationCard({buildingId}:{buildingId:string}){
 const [events,setEvents]=useState<Event[]>([]);const [message,setMessage]=useState('Workflow notices appear here. Review approvals in the plan card below.');const [busy,setBusy]=useState(false);
 useEffect(()=>{setEvents([]);},[buildingId]);
 async function refresh(){setBusy(true);try{setEvents(await api.get<Event[]>(`/buildings/${buildingId}/events`));setMessage('Loaded backend workflow states.');}catch(e:any){setMessage(e.message);}finally{setBusy(false);}}
 return <Card><Label>AUTOMATION NOTICES</Label><Action title="Refresh Workflow Notices" disabled={!buildingId||busy} onPress={refresh}/><Label>{message}</Label>{events.map(e=><Card key={e.id}><Label>{e.kind} · {e.state}</Label><Label>{e.notice}</Label><Label>Plan {e.plan_id.slice(0,8)} · Correlation {e.correlation_id}</Label>{e.run_id&&<Label>Simulation {e.run_id.slice(0,8)}</Label>}</Card>)}</Card>;
}
