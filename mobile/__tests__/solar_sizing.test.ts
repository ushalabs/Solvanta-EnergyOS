import { billingMonths, sizeSolar } from '../src/api/solarSizing';

test('keeps twelve calendar months when the bill crosses a year', () => {
  const months = billingMonths('2026-02');
  expect(months).toHaveLength(12);
  expect(months[0]).toBe('2025-03');
  expect(months[11]).toBe('2026-02');
  expect(billingMonths('2026-13')).toEqual([]);
});

test('sizes three arrays from annual usage and rounds each up to a tenth of a kWp', () => {
  expect(sizeSolar(Array(12).fill('500'), 1600)).toEqual({
    annualKwh: 6000,
    averageKwh: 500,
    options: [
      { offset: 50, targetKwh: 3000, arrayKwp: 1.9 },
      { offset: 75, targetKwh: 4500, arrayKwp: 2.9 },
      { offset: 100, targetKwh: 6000, arrayKwp: 3.8 },
    ],
  });
});

test('requires complete readings and distinguishes a blank month from zero units', () => {
  expect(sizeSolar([...Array(11).fill('500'), ''], 1600)).toBeNull();
  expect(sizeSolar([...Array(11).fill('500'), '0'], 1600)?.annualKwh).toBe(5500);
});
