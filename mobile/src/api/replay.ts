export function seekInterval(x:number,width:number,count:number):number {
 if(!Number.isFinite(x)||!Number.isFinite(width)||width<=0||count<=0)return 0;
 return Math.min(count-1,Math.max(0,Math.floor(x/width*count)));
}
export function loadActivity(appliances:Array<{id:string;name:string;selected:boolean;earliest_min:number;required_runtime_min:number;critical:boolean}>,minute:number){
 return appliances.map(a=>({...a,active:a.selected&&a.earliest_min<minute+15&&a.earliest_min+a.required_runtime_min>minute}));
}
