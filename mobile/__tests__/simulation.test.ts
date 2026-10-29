import {parseOutages} from '../src/api/simulation';
test('parses ordered outages and rejects impossible windows',()=>{
 expect(parseOutages('480-600, 1080-1200')).toEqual([{start_min:480,end_min:600},{start_min:1080,end_min:1200}]);
 expect(parseOutages('')).toEqual([]);
 for(const s of ['10-30','600-480','0-60,30-90','-60','1440-1500']) expect(()=>parseOutages(s)).toThrow();
});
