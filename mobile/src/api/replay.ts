export function seekInterval(x:number,width:number,count:number):number {
 if(!Number.isFinite(x)||!Number.isFinite(width)||width<=0||count<=0)return 0;
 return Math.min(count-1,Math.max(0,Math.floor(x/width*count)));
}
/** Native press events carry locationX; react-native-web sends a plain click, so measure from the pressed element. */
export function pressX(e:{nativeEvent:{locationX?:number;clientX?:number};currentTarget?:any}):number {
 const {locationX,clientX}=e.nativeEvent;
 if(Number.isFinite(locationX))return locationX as number;
 const left=e.currentTarget?.getBoundingClientRect?.().left;
 return Number.isFinite(clientX)&&Number.isFinite(left)?(clientX as number)-left:NaN;
}
export function loadActivity(appliances:Array<{id:string;name:string;selected:boolean;earliest_min:number;required_runtime_min:number;critical:boolean}>,minute:number){
 return appliances.map(a=>({...a,active:a.selected&&a.earliest_min<minute+15&&a.earliest_min+a.required_runtime_min>minute}));
}
