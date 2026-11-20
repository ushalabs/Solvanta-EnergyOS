// Preliminary PV model; synthetic equinox irradiance, no weather claim. Port of backend/app/services/pv.py.
export type StringSpecs = {
  modules_per_string: number; module_voc_v: number; module_vmp_v: number;
  inverter_max_dc_v: number; mppt_min_v: number; mppt_max_v: number;
};
export type PVInput = {
  module_wattage_w: number; inverter_kw: number; inverter_efficiency_pct: number; tilt_deg: number;
  azimuth_deg: number; losses_pct: number; latitude_deg: number; cell_temperature_c: number;
  temperature_coefficient_per_c: number; poa_w_m2: number[] | null; string_specs: StringSpecs | null;
};
export type PVStep = { hour: number; duration_hours: number; poa_w_m2: number; dc_kw: number; ac_kw: number; energy_kwh: number };
export type PVProfile = {
  schema_version: 'pv-profile-v1'; source: string; time_basis: string; panel_count: number;
  dc_capacity_kwp: number; inverter_kw: number; dc_ac_ratio: number; daily_energy_kwh: number;
  warnings: string[]; timeline: PVStep[];
};

/** Python's round(x, n) for display values; ties are rare enough at these precisions not to matter. */
export const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
const radians = (deg: number) => deg * Math.PI / 180;

export function syntheticPoa(hour: number, data: PVInput): number {
  // Midpoint equinox sun vector in east/north/up coordinates, local SOLAR hours.
  const h = radians(15 * (hour + 0.5 - 12));
  const lat = radians(data.latitude_deg), tilt = radians(data.tilt_deg), azi = radians(data.azimuth_deg);
  const east = -Math.sin(h), north = -Math.sin(lat) * Math.cos(h), up = Math.cos(lat) * Math.cos(h);
  if (up <= 0) return 0;
  const incidence = east * Math.sin(tilt) * Math.sin(azi) + north * Math.sin(tilt) * Math.cos(azi) + up * Math.cos(tilt);
  // Assumed direct normal 800 W/m² and diffuse horizontal 100*sun altitude.
  return 800 * Math.max(0, incidence) + 100 * up * (1 + Math.cos(tilt)) / 2;
}

export function estimatePv(panelCount: number, data: PVInput): PVProfile {
  if (panelCount < 0) throw new Error('Panel count must be non-negative');
  const kwp = panelCount * data.module_wattage_w / 1000;
  const warnings = ['Preliminary only: no shading, weather, seasonal, wiring-current or structural assessment.'];
  const s = data.string_specs;
  if (s) {
    if (panelCount % s.modules_per_string) throw new Error('Placed panel count must divide into complete equal strings');
    if (s.modules_per_string * s.module_voc_v > s.inverter_max_dc_v) throw new Error('String open-circuit voltage exceeds inverter DC maximum');
    const vmp = s.modules_per_string * s.module_vmp_v;
    if (!(s.mppt_min_v <= vmp && vmp <= s.mppt_max_v)) throw new Error('String operating voltage is outside the MPPT range');
    warnings.push('String voltages checked at supplied reference values only; cold Voc, hot Vmp and current limits require engineering review.');
  } else {
    warnings.push('String constraints not checked: equipment voltage specifications were not supplied.');
  }
  if (kwp / data.inverter_kw > 1.5) warnings.push('DC/AC ratio exceeds 1.5; inverter clipping may be substantial.');
  const timeline: PVStep[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const poa = data.poa_w_m2 ? data.poa_w_m2[hour] : syntheticPoa(hour, data);
    const dc = Math.max(0, kwp * poa / 1000 * (1 + data.temperature_coefficient_per_c * (data.cell_temperature_c - 25)) * (1 - data.losses_pct / 100));
    const ac = Math.min(data.inverter_kw, dc * data.inverter_efficiency_pct / 100);
    timeline.push({ hour, duration_hours: 1, poa_w_m2: round(poa, 5), dc_kw: round(dc, 6), ac_kw: round(ac, 6), energy_kwh: round(ac, 6) });
  }
  return {
    schema_version: 'pv-profile-v1',
    source: data.poa_w_m2 ? 'user supplied hourly plane-of-array irradiance' : 'SIMULATED fixed equinox irradiance',
    time_basis: 'Representative equinox solar day; hourly means, no calendar forecast',
    panel_count: panelCount, dc_capacity_kwp: kwp, inverter_kw: data.inverter_kw, dc_ac_ratio: kwp / data.inverter_kw,
    daily_energy_kwh: round(timeline.reduce((t, p) => t + p.energy_kwh, 0), 6), warnings, timeline,
  };
}
