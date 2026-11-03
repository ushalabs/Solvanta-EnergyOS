import {seekInterval,loadActivity,pressX} from '../src/api/replay';
test('press position works for native events and for web clicks without locationX',()=>{
 expect(pressX({nativeEvent:{locationX:42}})).toBe(42);
 expect(pressX({nativeEvent:{locationX:0,clientX:500}})).toBe(0);
 const element={getBoundingClientRect:()=>({left:18})};
 expect(pressX({nativeEvent:{clientX:168},currentTarget:element})).toBe(150);
 expect(seekInterval(pressX({nativeEvent:{clientX:168},currentTarget:element}),300,96)).toBe(48);
 expect(seekInterval(pressX({nativeEvent:{}}),300,96)).toBe(0);
});
test('seek stays inside the real trace and tolerates missing layout',()=>{
 expect(seekInterval(300,300,96)).toBe(95);expect(seekInterval(-1,300,96)).toBe(0);expect(seekInterval(150,300,96)).toBe(48);expect(seekInterval(1,0,96)).toBe(0);
});
test('replay activity comes from saved runtime, including partial intervals',()=>{
 const items=[{id:'a',name:'Pump',selected:true,earliest_min:7,required_runtime_min:20,critical:false}];
 expect(loadActivity(items,0)[0].active).toBe(true);expect(loadActivity(items,15)[0].active).toBe(true);expect(loadActivity(items,30)[0].active).toBe(false);
});
