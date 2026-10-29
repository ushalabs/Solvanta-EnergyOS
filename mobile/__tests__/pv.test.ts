import { parseIrradiance } from '../src/api/pv';
test('irradiance distinguishes omitted profile from a valid zero-power day', () => {
  expect(parseIrradiance('')).toBeNull();
  expect(parseIrradiance(Array(24).fill('0').join(','))).toEqual(Array(24).fill(0));
  expect(() => parseIrradiance('100,200')).toThrow();
  expect(() => parseIrradiance(Array(24).fill('-1').join(','))).toThrow();
});
