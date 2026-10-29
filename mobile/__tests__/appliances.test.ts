import { emptyAppliance, validateAppliance } from '../src/api/appliances';
test('appliance form validates power, runtime and scenario constraints', () => {
  const a={...emptyAppliance(),name:'Pump'};
  expect(validateAppliance(a)).toBeNull();
  expect(validateAppliance({...a,rated_power_w:0})).toMatch(/power/);
  expect(validateAppliance({...a,required_runtime_min:1500})).toMatch(/runtime/);
  expect(validateAppliance({...a,critical:true})).toMatch(/priority/);
  expect(validateAppliance({...a,interruptible:true})).toMatch(/flexible/);
  expect(validateAppliance({...a,rated_power_w:NaN})).toMatch(/numbers/);
  expect(validateAppliance({...a,earliest_min:10.5})).toMatch(/whole/);
});
