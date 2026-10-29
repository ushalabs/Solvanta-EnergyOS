import {seekInterval,loadActivity} from '../src/api/replay';
test('seek stays inside the real trace and tolerates missing layout',()=>{
 expect(seekInterval(300,300,96)).toBe(95);expect(seekInterval(-1,300,96)).toBe(0);expect(seekInterval(150,300,96)).toBe(48);expect(seekInterval(1,0,96)).toBe(0);
});
test('replay activity comes from saved runtime, including partial intervals',()=>{
 const items=[{id:'a',name:'Pump',selected:true,earliest_min:7,required_runtime_min:20,critical:false}];
 expect(loadActivity(items,0)[0].active).toBe(true);expect(loadActivity(items,15)[0].active).toBe(true);expect(loadActivity(items,30)[0].active).toBe(false);
});
