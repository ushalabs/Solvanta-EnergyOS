import { compassPoint, parseIrradiance } from '../src/api/pv';
test.each([[0, 'North'], [180, 'South'], [90, 'East'], [270, 'West'], [135, 'South-east'], [22, 'North'], [23, 'North-east'], [359, 'North'], [-90, 'West'], [450, 'East']])('azimuth %p is %p', (deg, word) => expect(compassPoint(deg)).toBe(word));
test('a missing azimuth is a dash, not a direction', () => { expect(compassPoint(undefined)).toBe('—'); expect(compassPoint(null)).toBe('—'); expect(compassPoint(NaN)).toBe('—'); });
test('irradiance distinguishes omitted profile from a valid zero-power day', () => {
  expect(parseIrradiance('')).toBeNull();
  expect(parseIrradiance(Array(24).fill('0').join(','))).toEqual(Array(24).fill(0));
  expect(() => parseIrradiance('100,200')).toThrow();
  expect(() => parseIrradiance(Array(24).fill('-1').join(','))).toThrow();
});
