import React,{useEffect,useState} from 'react';
import {Workflow} from 'lucide-react-native';
import {Card,CardHeader,Label,Message,Badge,Action} from './TwinControls';
import {useTheme} from '../theme/ThemeContext';
import {api} from '../api/client';
type Event={id:string;kind:string;state:string;notice:string;plan_id:string;correlation_id:string;run_id:string|null};
export function AutomationCard({buildingId}:{buildingId:string}){
 const {tokens:t}=useTheme();
 const [events,setEvents]=useState<Event[]>([]);const [message,setMessage]=useState('Workflow notices appear here. Review approvals in the plan card below.');const [busy,setBusy]=useState(false);
 useEffect(()=>{setEvents([]);},[buildingId]);
 async function refresh(){setBusy(true);try{setEvents(await api.get<Event[]>(`/buildings/${buildingId}/events`));setMessage('Loaded backend workflow states.');}catch(e:any){setMessage(e.message);}finally{setBusy(false);}}
 return <Card><CardHeader title="Automation notices" icon={<Workflow size={18} color={t.limeText}/>}/><Action title="Refresh Workflow Notices" variant="secondary" disabled={!buildingId||busy} onPress={refresh}/><Message>{message}</Message>{events.map(e=><Card nested key={e.id}><Badge label={e.state} tone="info"/><Label strong>{e.kind}</Label><Label tone="secondary" caption>{e.notice}</Label><Label tone="secondary" caption>Plan {e.plan_id.slice(0,8)} · Correlation {e.correlation_id}</Label>{e.run_id&&<Label tone="secondary" caption>Simulation {e.run_id.slice(0,8)}</Label>}</Card>)}</Card>;
}
