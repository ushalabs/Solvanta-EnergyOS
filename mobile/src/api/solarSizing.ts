// PVGIS 5.3 / ERA5 annual AC output per 1 kWp, optimal fixed tilt and azimuth, 14% system loss.
// https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en
export const pakistanSolarYield = {
  Lahore: 1607.36,
  Karachi: 1718.68,
  'Islamabad / Rawalpindi': 1600.20,
  Faisalabad: 1642.99,
  Multan: 1688.94,
  Peshawar: 1582.75,
  Quetta: 1881.80,
  Hyderabad: 1731.58,
  Sukkur: 1746.42,
} as const;

export function billingMonths(ending: string): string[] {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(ending)) return [];
  const [year, month] = ending.split('-').map(Number);
  return Array.from({ length: 12 }, (_, index) =>
    new Date(Date.UTC(year, month - 12 + index, 1)).toISOString().slice(0, 7),
  );
}

export function sizeSolar(monthlyUnits: string[], annualYield: number) {
  if (monthlyUnits.length !== 12 || !Number.isFinite(annualYield) || annualYield <= 0) return null;
  const readings = monthlyUnits.map(value => {
    const cleaned = value.trim();
    return /^\d{1,7}(\.\d{1,2})?$/.test(cleaned) ? Number(cleaned) : NaN;
  });
  if (readings.some(value => !Number.isFinite(value))) return null;
  const annualKwh = readings.reduce((sum, value) => sum + value, 0);
  if (annualKwh <= 0) return null;
  const options = [50, 75, 100].map(offset => {
    const targetKwh = annualKwh * offset / 100;
    const arrayKwp = Math.ceil(targetKwh / annualYield * 10 - 1e-9) / 10;
    return { offset, targetKwh, arrayKwp };
  });
  return { annualKwh, averageKwh: annualKwh / 12, options };
}
