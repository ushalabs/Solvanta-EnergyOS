export type PVParameters = {
  module_wattage_w: number; inverter_kw: number; inverter_efficiency_pct: number;
  tilt_deg: number; azimuth_deg: number; losses_pct: number; latitude_deg: number;
  cell_temperature_c: number; temperature_coefficient_per_c: number;
  poa_w_m2: number[] | null;
  string_specs: { modules_per_string: number; module_voc_v: number; module_vmp_v: number; inverter_max_dc_v: number; mppt_min_v: number; mppt_max_v: number } | null;
};
export type PVProfile = {
  schema_version: 'pv-profile-v1'; source: string; time_basis: string;
  panel_count: number; dc_capacity_kwp: number; inverter_kw: number; dc_ac_ratio: number; daily_energy_kwh: number;
  warnings: string[]; timeline: Array<{ hour: number; duration_hours: number; poa_w_m2: number; dc_kw: number; ac_kw: number; energy_kwh: number }>;
};
export type PVRecord = { parameters: PVParameters; saved: boolean; profile: PVProfile };
export function parseIrradiance(text: string): number[] | null {
  if (!text.trim()) return null;
  const entries = text.split(',');
  if (entries.length !== 24 || entries.some(v => !v.trim() || !Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > 1500)) throw new Error('Enter exactly 24 hourly irradiance values, 0–1500 W/m².');
  return entries.map(Number);
}
