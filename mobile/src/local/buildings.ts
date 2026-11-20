// Building digital twin records. Port of backend/app/schemas/building.py and endpoints/buildings.py.
import { httpError } from '../api/errors';
import { object } from './validation';

type Body = Record<string, any>;
type Kind = 'float' | 'int' | 'bool' | 'str' | 'nstr';
type Spec = { key: string; kind: Kind; min?: number; max?: number; gtMin?: boolean; fallback?: unknown; maxLength?: number };

/** Flat columns with their ranges and create-time defaults (undefined = required or derived). */
const FIELDS: Spec[] = [
  { key: 'name', kind: 'str', maxLength: 255 },
  { key: 'address', kind: 'nstr', fallback: null },
  { key: 'timezone', kind: 'str', fallback: 'Asia/Karachi' },
  { key: 'pv_capacity_kwp', kind: 'float', min: 0, max: 500 },
  { key: 'pv_panel_tilt_deg', kind: 'float', min: 0, max: 90, fallback: 25 },
  { key: 'pv_panel_azimuth_deg', kind: 'float', min: 0, max: 360, fallback: 180 },
  { key: 'pv_system_losses_pct', kind: 'float', min: 0, max: 50, fallback: 14 },
  { key: 'pv_module_count', kind: 'int', min: 0, max: 2000 },
  { key: 'pv_module_wattage_w', kind: 'float', min: 0, max: 1000 },
  { key: 'inverter_rating_kw', kind: 'float', min: 0, max: 500 },
  { key: 'inverter_efficiency_pct', kind: 'float', min: 50, gtMin: true, max: 100, fallback: 96 },
  { key: 'inverter_type', kind: 'str', maxLength: 32, fallback: 'hybrid' },
  { key: 'battery_nominal_kwh', kind: 'float', min: 0, max: 1000 },
  { key: 'battery_usable_kwh', kind: 'float', min: 0, max: 1000 },
  { key: 'battery_initial_soc_pct', kind: 'float', min: 0, max: 100, fallback: 70 },
  { key: 'battery_min_soc_pct', kind: 'float', min: 0, max: 100, fallback: 20 },
  { key: 'battery_max_charge_kw', kind: 'float', min: 0, max: 100, fallback: 4 },
  { key: 'battery_max_discharge_kw', kind: 'float', min: 0, max: 100, fallback: 4 },
  { key: 'battery_round_trip_efficiency', kind: 'float', min: 0, gtMin: true, max: 1, fallback: 0.9 },
  { key: 'battery_chemistry', kind: 'str', maxLength: 32, fallback: 'LFP' },
  { key: 'has_generator', kind: 'bool', fallback: false },
  { key: 'generator_rating_kw', kind: 'float', min: 0, max: 500, fallback: 0 },
  { key: 'generator_fuel_type', kind: 'nstr', maxLength: 32, fallback: null },
  { key: 'generator_fuel_consumption_l_per_kwh', kind: 'float', min: 0, max: 5, fallback: 0.35 },
  { key: 'generator_min_runtime_min', kind: 'int', min: 0, max: 1440, fallback: 15 },
  { key: 'grid_connection_type', kind: 'str', maxLength: 32, fallback: 'single_phase' },
  { key: 'grid_import_limit_kw', kind: 'float', min: 0, max: 1000, fallback: 15 },
  { key: 'grid_export_limit_kw', kind: 'float', min: 0, max: 1000, fallback: 10 },
  { key: 'has_net_metering', kind: 'bool', fallback: true },
];
export const BUILDING_COLUMNS = FIELDS.map(f => f.key);
const BOOLEAN_COLUMNS = ['has_generator', 'has_net_metering'];

/** Nested sub-schema keys and the flat columns they set (aliases first wins, as in the backend). */
const NESTED: Record<string, Array<[string[], string]>> = {
  battery: [[['nominal_capacity_kwh', 'nominal_kwh'], 'battery_nominal_kwh'], [['usable_capacity_kwh', 'usable_kwh'], 'battery_usable_kwh'],
    [['initial_soc_pct'], 'battery_initial_soc_pct'], [['minimum_soc_pct', 'min_soc_pct'], 'battery_min_soc_pct'],
    [['max_charge_kw'], 'battery_max_charge_kw'], [['max_discharge_kw'], 'battery_max_discharge_kw'],
    [['round_trip_efficiency'], 'battery_round_trip_efficiency'], [['chemistry'], 'battery_chemistry']],
  solar: [[['pv_capacity_kwp'], 'pv_capacity_kwp'], [['panel_tilt_deg'], 'pv_panel_tilt_deg'], [['panel_azimuth_deg'], 'pv_panel_azimuth_deg'],
    [['system_losses_pct'], 'pv_system_losses_pct'], [['module_count'], 'pv_module_count'], [['module_wattage_w'], 'pv_module_wattage_w']],
  inverter: [[['rating_kw'], 'inverter_rating_kw'], [['efficiency_pct'], 'inverter_efficiency_pct'], [['inverter_type'], 'inverter_type']],
  generator: [[['enabled', 'has_generator'], 'has_generator'], [['rating_kw', 'generator_rating_kw'], 'generator_rating_kw'],
    [['fuel_type', 'generator_fuel_type'], 'generator_fuel_type'], [['fuel_consumption_l_per_kwh'], 'generator_fuel_consumption_l_per_kwh'],
    [['min_runtime_min'], 'generator_min_runtime_min']],
  grid: [[['connection_type'], 'grid_connection_type'], [['import_limit_kw'], 'grid_import_limit_kw'],
    [['export_limit_kw'], 'grid_export_limit_kw'], [['has_net_metering'], 'has_net_metering']],
};

const invalid = (message: string): never => { throw httpError(422, message); };

function checkConflict(flat: unknown, nested: unknown, field: string) {
  if (flat === undefined || flat === null || nested === undefined || nested === null) return;
  if (typeof flat === 'number' && typeof nested === 'number') {
    if (Math.abs(flat - nested) > 1e-4) invalid(`Conflicting values provided for '${field}': flat field has ${flat} but nested field has ${nested}`);
  } else if (flat !== nested) {
    invalid(`Conflicting values provided for '${field}': flat field has '${flat}' but nested field has '${nested}'`);
  }
}

function flatten(raw: unknown): Body {
  const data: Body = { ...object(raw) };
  for (const [group, mapping] of Object.entries(NESTED)) {
    const nested = data[group];
    delete data[group];
    if (!nested || typeof nested !== 'object') continue;
    for (const [aliases, column] of mapping) {
      const key = aliases.find(a => nested[a] !== undefined && nested[a] !== null);
      if (key === undefined) continue;
      checkConflict(data[column], nested[key], column);
      data[column] = nested[key];
    }
  }
  return data;
}

function checkField(spec: Spec, value: unknown): unknown {
  const { key, kind } = spec;
  if (kind === 'bool') { if (typeof value !== 'boolean') invalid(`${key}: Input should be a valid boolean`); return value; }
  if (kind === 'str' || kind === 'nstr') {
    if (value === null && kind === 'nstr') return null;
    if (typeof value !== 'string') invalid(`${key}: Input should be a valid string`);
    const text = value as string;
    if (key === 'name' && text.length < 1) invalid('name: String should have at least 1 character');
    if (spec.maxLength && text.length > spec.maxLength) invalid(`${key}: String should have at most ${spec.maxLength} characters`);
    return text;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) invalid(`${key}: Input should be a finite number`);
  const n = value as number;
  if (kind === 'int' && !Number.isInteger(n)) invalid(`${key}: Input should be a valid integer`);
  if (spec.min !== undefined && (spec.gtMin ? n <= spec.min : n < spec.min)) invalid(`${key}: Input should be greater than ${spec.gtMin ? '' : 'or equal to '}${spec.min}`);
  if (spec.max !== undefined && n > spec.max) invalid(`${key}: Input should be less than or equal to ${spec.max}`);
  return n;
}

function pvCapacityCheck(kwp: number, count: number, watt: number) {
  if (count > 0 && watt > 0) {
    const calc = Math.round(count * watt) / 1000;
    const tolerance = Math.max(0.5, 0.05 * kwp);
    if (Math.abs(kwp - calc) > tolerance) {
      invalid(`PV capacity mismatch: declared pv_capacity_kwp (${kwp} kWp) is inconsistent with module count ${count} × ${watt}W = ${calc} kWp (exceeds allowable tolerance of ±5% or ±0.5 kWp)`);
    }
  }
}

const round1 = (v: number) => Math.round(v * 10) / 10;

function checkInvariants(b: Body) {
  if (b.battery_usable_kwh > b.battery_nominal_kwh) invalid(`Battery usable capacity (${b.battery_usable_kwh} kWh) cannot exceed nominal capacity (${b.battery_nominal_kwh} kWh)`);
  if (b.battery_initial_soc_pct < b.battery_min_soc_pct) invalid(`Battery initial SoC (${b.battery_initial_soc_pct}%) cannot be lower than minimum SoC limit (${b.battery_min_soc_pct}%)`);
  if (b.has_generator && b.generator_rating_kw <= 0) invalid(`Enabled backup generator must have a rating greater than 0 kW (got ${b.generator_rating_kw} kW)`);
  pvCapacityCheck(b.pv_capacity_kwp, b.pv_module_count, b.pv_module_wattage_w);
}

/** BuildingCreate: returns every column. */
export function buildingCreate(raw: unknown): Body {
  const data = flatten(raw);
  const known = new Set([...BUILDING_COLUMNS]);
  for (const key of Object.keys(data)) if (!known.has(key)) delete data[key]; // Pydantic ignores unknown keys here
  // Derived-capacity rule: module count / wattage follow pv_capacity_kwp when not given.
  const kwp = data.pv_capacity_kwp;
  const hasCount = data.pv_module_count !== undefined && data.pv_module_count !== null;
  const hasWatt = data.pv_module_wattage_w !== undefined && data.pv_module_wattage_w !== null;
  if (typeof kwp === 'number' && kwp > 0) {
    if (!hasCount && !hasWatt) {
      const count = Math.max(1, Math.round(kwp * 1000 / 550));
      data.pv_module_count = count; data.pv_module_wattage_w = round1(kwp * 1000 / count);
    } else if (hasCount && !hasWatt && data.pv_module_count > 0) {
      data.pv_module_wattage_w = round1(kwp * 1000 / data.pv_module_count);
    } else if (!hasCount && hasWatt && data.pv_module_wattage_w > 0) {
      data.pv_module_count = Math.max(1, Math.round(kwp * 1000 / data.pv_module_wattage_w));
    }
  } else if (kwp === 0) {
    data.pv_module_count ??= 0; data.pv_module_wattage_w ??= 0;
  }
  const out: Body = {};
  for (const spec of FIELDS) {
    let value = data[spec.key];
    if (value === undefined || (value === null && spec.kind !== 'nstr')) {
      if (spec.key === 'battery_nominal_kwh' || spec.key === 'battery_usable_kwh') invalid('Battery capacity parameters (nominal and usable) must be provided');
      if (spec.key === 'pv_module_count' || spec.key === 'pv_module_wattage_w') value = spec.key === 'pv_module_count' ? 18 : 550;
      else if (spec.fallback === undefined) invalid(`${spec.key}: Field required`);
      else value = spec.fallback;
    }
    out[spec.key] = checkField(spec, value);
  }
  checkInvariants(out);
  return out;
}

/** BuildingUpdate: returns only the columns that were sent, checked against the stored row. */
export function buildingUpdate(raw: unknown, current: Body): Body {
  const data = flatten(raw);
  const out: Body = {};
  for (const spec of FIELDS) {
    if (!(spec.key in data)) continue;
    const value = data[spec.key];
    if (value === null && spec.kind !== 'nstr') continue;
    out[spec.key] = checkField(spec, value);
  }
  checkInvariants({ ...current, ...out });
  return out;
}

export function toRow(columns: Body): Body {
  const row: Body = { ...columns };
  for (const key of BOOLEAN_COLUMNS) if (key in row) row[key] = row[key] ? 1 : 0;
  return row;
}

export function fromRow(row: Body): Body {
  const b: Body = { ...row };
  for (const key of BOOLEAN_COLUMNS) b[key] = !!b[key];
  return b;
}

/** BuildingRead: flat columns plus the structured equipment sub-objects. */
export function buildingRead(row: Body) {
  const b = fromRow(row);
  return {
    id: b.id, name: b.name, address: b.address ?? null, timezone: b.timezone,
    ...Object.fromEntries(BUILDING_COLUMNS.filter(k => !['name', 'address', 'timezone'].includes(k)).map(k => [k, b[k]])),
    ...equipment(b),
    owner_id: b.owner_id, organization_id: null, created_at: b.created_at, updated_at: b.updated_at,
  };
}

function equipment(b: Body) {
  return {
    solar: { pv_capacity_kwp: b.pv_capacity_kwp, panel_tilt_deg: b.pv_panel_tilt_deg, panel_azimuth_deg: b.pv_panel_azimuth_deg, system_losses_pct: b.pv_system_losses_pct, module_count: b.pv_module_count, module_wattage_w: b.pv_module_wattage_w },
    inverter: { rating_kw: b.inverter_rating_kw, efficiency_pct: b.inverter_efficiency_pct, inverter_type: b.inverter_type },
    battery: { nominal_capacity_kwh: b.battery_nominal_kwh, usable_capacity_kwh: b.battery_usable_kwh, initial_soc_pct: b.battery_initial_soc_pct, minimum_soc_pct: b.battery_min_soc_pct, max_charge_kw: b.battery_max_charge_kw, max_discharge_kw: b.battery_max_discharge_kw, round_trip_efficiency: b.battery_round_trip_efficiency, chemistry: b.battery_chemistry },
    generator: { enabled: b.has_generator, rating_kw: b.generator_rating_kw, fuel_type: b.generator_fuel_type ?? null, fuel_consumption_l_per_kwh: b.generator_fuel_consumption_l_per_kwh, min_runtime_min: b.generator_min_runtime_min },
    grid: { connection_type: b.grid_connection_type, import_limit_kw: b.grid_import_limit_kw, export_limit_kw: b.grid_export_limit_kw, has_net_metering: b.has_net_metering },
  };
}

export function equipmentSummary(row: Body) {
  const b = fromRow(row);
  const messages: string[] = [];
  if (b.battery_usable_kwh > b.battery_nominal_kwh) messages.push('Battery usable capacity exceeds nominal rating.');
  if (b.battery_initial_soc_pct < b.battery_min_soc_pct) messages.push('Initial battery state of charge is below minimum threshold.');
  if (b.has_generator && b.generator_rating_kw <= 0) messages.push('Generator is enabled but rated output is 0 kW.');
  return { building_id: b.id, building_name: b.name, ...equipment(b), is_valid: messages.length === 0, validation_messages: messages };
}

/** Battery, grid and generator limits as the energy engines use them. */
export function plantFor(row: Body) {
  const b = fromRow(row);
  return {
    nominal_kwh: b.battery_nominal_kwh, usable_kwh: b.battery_usable_kwh, initial_soc: b.battery_initial_soc_pct,
    reserve_soc: b.battery_min_soc_pct, charge_kw: b.battery_max_charge_kw, discharge_kw: b.battery_max_discharge_kw,
    round_trip_efficiency: b.battery_round_trip_efficiency, grid_import_kw: b.grid_import_limit_kw,
    grid_export_kw: b.has_net_metering ? b.grid_export_limit_kw : 0, generator_kw: b.has_generator ? b.generator_rating_kw : 0,
    generator_min_minutes: b.generator_min_runtime_min, fuel_l_kwh: b.generator_fuel_consumption_l_per_kwh,
  };
}
