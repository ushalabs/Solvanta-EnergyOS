export type EnergyStep = { minute:number; duration_hours:number; pv_kw:number; load_kw:number; critical_kw:number; grid_available:boolean; grid_import_kw:number; grid_export_kw:number; generator_kw:number; charge_kw:number; discharge_kw:number; curtailed_kw:number; unmet_kw:number; unserved_critical_kw:number; battery_start_kwh:number; battery_end_kwh:number; soc_pct:number; balance_error_kw:number };
export type EnergyResult = { schema_version:string; step_minutes:number; trace:EnergyStep[]; summary:Record<string,number>; assumptions:string[] };
export type EnergyRun = { id:string; created_at:string; result:EnergyResult; snapshot: { pv: {source:string}; appliances?: Array<{id:string;name:string;selected:boolean;earliest_min:number;required_runtime_min:number;critical:boolean}> } };
export function parseOutages(text:string) {
 if(!text.trim())return [];
 const outages=text.split(',').map(pair=>{
   const parts=pair.trim().split('-');
   if(parts.length!==2 || parts.some(p=>!p.trim()))throw new Error('Use start-end minutes, e.g. 480-600, 1080-1200.');
   const [start_min,end_min]=parts.map(Number);
   if(!Number.isInteger(start_min)||!Number.isInteger(end_min)||start_min<0||end_min>1440||end_min<=start_min||start_min%15||end_min%15)throw new Error('Outages need ordered 15-minute boundaries between 0 and 1440.');
   return {start_min,end_min};
 }).sort((a,b)=>a.start_min-b.start_min);
 if(outages.some((o,i)=>i>0&&outages[i-1].end_min>o.start_min))throw new Error('Outages cannot overlap.');
 return outages;
}
export type Scenario = 'normal' | 'outage' | 'custom';
/** The Outage preset is the screens original example range, 08:00 to 10:00. */
export const OUTAGE_PRESET = '480-600';
/** The outage text a scenario stands for: Normal is no outage, Outage is the preset, Custom is what the user typed. */
export const scenarioOutages = (scenario: Scenario, custom: string) => scenario === 'normal' ? '' : scenario === 'outage' ? OUTAGE_PRESET : custom;
