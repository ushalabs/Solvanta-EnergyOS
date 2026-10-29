import { parsePoints, formatPoints } from '../src/api/roof';
test('roof vertex edits retain coordinate units and reject incomplete entries', () => {
  expect(parsePoints('20,30; 80,90')).toEqual([{x:20,y:30},{x:80,y:90}]);
  expect(formatPoints(parsePoints('20,30; 80,90'))).toBe('20,30; 80,90');
  expect(() => parsePoints('20,')).toThrow();
  expect(() => parsePoints('NaN,30')).toThrow();
});
