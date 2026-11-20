// Request validation formerly done by the backend's Pydantic schemas. Errors are 422s with the same messages.
import { httpError } from '../api/errors';
import { isSimplePolygon, polygonCovers, signedArea, type Point, type RoofInput } from './engines/geometry';
import type { PVInput, StringSpecs } from './engines/pv';
import type { Outage, SimulationOptions } from './engines/simulation';
import { FIXTURES, type Fixture } from './engines/telemetry';

type Body = Record<string, unknown>;
type NumberRule = { gt?: number; ge?: number; lt?: number; le?: number; int?: boolean };

const fail = (field: string, message: string): never => { throw httpError(422, `${field}: ${message}`); };

export function object(value: unknown, field = 'body'): Body {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(field, 'Input should be an object');
  return value as Body;
}

export function forbidExtra(body: Body, allowed: string[], field = 'body') {
  for (const key of Object.keys(body)) if (!allowed.includes(key)) fail(`${field}.${key}`, 'Extra inputs are not permitted');
}

export function num(body: Body, key: string, rule: NumberRule = {}, fallback?: number): number {
  const value = body[key] === undefined ? fallback : body[key];
  if (value === undefined) return fail(key, 'Field required');
  if (typeof value !== 'number' || !Number.isFinite(value)) return fail(key, 'Input should be a finite number');
  if (rule.int && !Number.isInteger(value)) fail(key, 'Input should be a valid integer');
  if (rule.gt !== undefined && !(value > rule.gt)) fail(key, `Input should be greater than ${rule.gt}`);
  if (rule.ge !== undefined && !(value >= rule.ge)) fail(key, `Input should be greater than or equal to ${rule.ge}`);
  if (rule.lt !== undefined && !(value < rule.lt)) fail(key, `Input should be less than ${rule.lt}`);
  if (rule.le !== undefined && !(value <= rule.le)) fail(key, `Input should be less than or equal to ${rule.le}`);
  return value;
}

export function optionalNum(body: Body, key: string, rule: NumberRule = {}): number | null {
  return body[key] === undefined || body[key] === null ? null : num(body, key, rule);
}

export function bool(body: Body, key: string, fallback?: boolean): boolean {
  const value = body[key] === undefined ? fallback : body[key];
  if (typeof value !== 'boolean') return fail(key, value === undefined ? 'Field required' : 'Input should be a valid boolean');
  return value;
}

export function str(body: Body, key: string, rule: { min?: number; max?: number; pattern?: RegExp } = {}, fallback?: string): string {
  const value = body[key] === undefined ? fallback : body[key];
  if (value === undefined) return fail(key, 'Field required');
  if (typeof value !== 'string') return fail(key, 'Input should be a valid string');
  if (rule.min !== undefined && value.length < rule.min) fail(key, `String should have at least ${rule.min} characters`);
  if (rule.max !== undefined && value.length > rule.max) fail(key, `String should have at most ${rule.max} characters`);
  if (rule.pattern && !rule.pattern.test(value)) fail(key, "String should match the expected pattern");
  return value;
}

export function oneOf<T extends string>(body: Body, key: string, options: readonly T[], fallback?: T): T {
  const value = body[key] === undefined ? fallback : body[key];
  if (!options.includes(value as T)) fail(key, `Input should be ${options.map(o => `'${o}'`).join(', ')}`);
  return value as T;
}

// ---- Scenario options ----

function outages(value: unknown): Outage[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return fail('outages', 'Input should be a valid list');
  if (value.length > 96) fail('outages', 'List should have at most 96 items');
  const list = value.map((item, i) => {
    const o = object(item, `outages.${i}`);
    const start_min = num(o, 'start_min', { int: true, ge: 0, lt: 1440 });
    const end_min = num(o, 'end_min', { int: true, gt: 0, le: 1440 });
    if (end_min <= start_min || start_min % 15 || end_min % 15) fail(`outages.${i}`, 'Outages must be ordered and aligned to 15-minute boundaries');
    return { start_min, end_min };
  });
  const spans = [...list].sort((a, b) => a.start_min - b.start_min);
  if (spans.some((a, i) => i > 0 && spans[i - 1].end_min > a.start_min)) fail('outages', 'Outages cannot overlap');
  return list;
}

export function simulationInput(raw: unknown, extra: string[] = []): SimulationOptions & Body {
  const body = object(raw);
  forbidExtra(body, ['outages', 'use_generator', ...extra]);
  return { ...body, outages: outages(body.outages), use_generator: bool(body, 'use_generator', false) };
}

export function forecastInput(raw: unknown) {
  const body = simulationInput(raw, ['basis']);
  return { outages: body.outages, use_generator: body.use_generator, basis: oneOf(body, 'basis', ['configured', 'latest_run'] as const, 'configured') };
}

export function planInput(raw: unknown, extra: string[] = []) {
  const body = simulationInput(raw, ['expiry_minutes', ...extra]);
  return { ...body, expiry_minutes: num(body, 'expiry_minutes', { int: true, ge: 1, le: 1440 }, 60) };
}

export function eventInput(raw: unknown) {
  const body = planInput(raw, ['event_id', 'correlation_id', 'kind', 'incident_id']) as Record<string, any> & ReturnType<typeof planInput>;
  const incident = body.incident_id === undefined || body.incident_id === null ? null : str(body, 'incident_id');
  return {
    outages: body.outages, use_generator: body.use_generator, expiry_minutes: body.expiry_minutes,
    event_id: str(body, 'event_id', { min: 8, max: 100 }), correlation_id: str(body, 'correlation_id', { min: 8, max: 100 }),
    kind: oneOf(body, 'kind', ['shortage', 'daily_planner', 'anomaly_incident'] as const), incident_id: incident,
  };
}

export const PLAN_ACTIONS = ['submit', 'approve', 'reject', 'request_modification', 'revise', 'simulate', 'verify'] as const;
export type PlanActionName = typeof PLAN_ACTIONS[number];

export function planAction(raw: unknown) {
  const body = object(raw);
  forbidExtra(body, ['action', 'expected_revision', 'idempotency_key', 'variant', 'comment']);
  return {
    action: oneOf(body, 'action', PLAN_ACTIONS), expected_revision: num(body, 'expected_revision', { int: true, ge: 1 }),
    idempotency_key: str(body, 'idempotency_key', { min: 8, max: 100 }), variant: num(body, 'variant', { int: true, ge: 0, le: 2 }, 0),
    comment: str(body, 'comment', { max: 1000 }, ''),
  };
}

export function telemetryInput(raw: unknown) {
  const body = object(raw);
  forbidExtra(body, ['run_id', 'fixture', 'seed']);
  return { run_id: str(body, 'run_id'), fixture: oneOf<Fixture>(body, 'fixture', FIXTURES, 'none'), seed: num(body, 'seed', { int: true, ge: 0, le: 1000000 }, 14) };
}

export function verificationInput(raw: unknown) {
  const body = object(raw);
  return { plan_id: str(body, 'plan_id'), verification_id: str(body, 'verification_id', { min: 8, max: 100 }), fixture: oneOf<Fixture>(body, 'fixture', FIXTURES, 'none') };
}

// ---- Appliances ----

export function applianceInput(raw: unknown) {
  const body = object(raw);
  forbidExtra(body, ['name', 'rated_power_w', 'priority', 'critical', 'flexible', 'required_runtime_min', 'earliest_min', 'latest_min', 'interruptible', 'max_interruptions']);
  const data = {
    name: str(body, 'name', { min: 1, max: 100 }).trim(),
    rated_power_w: num(body, 'rated_power_w', { gt: 0, le: 100000 }),
    priority: oneOf(body, 'priority', ['critical', 'medium', 'low'] as const),
    critical: bool(body, 'critical', false), flexible: bool(body, 'flexible', false),
    required_runtime_min: num(body, 'required_runtime_min', { int: true, ge: 1, le: 1440 }),
    earliest_min: num(body, 'earliest_min', { int: true, ge: 0, lt: 1440 }),
    latest_min: num(body, 'latest_min', { int: true, gt: 0, le: 1440 }),
    interruptible: bool(body, 'interruptible', false),
    max_interruptions: num(body, 'max_interruptions', { int: true, ge: 0, le: 50 }, 0),
  };
  const invalid = (message: string) => fail('body', message);
  if (!data.name) invalid('Name cannot be blank');
  if (data.latest_min <= data.earliest_min) invalid('Latest time must be after earliest time');
  if (data.required_runtime_min > data.latest_min - data.earliest_min) invalid('Required runtime exceeds available window');
  if (data.critical && data.priority !== 'critical') invalid('Critical loads must have critical priority');
  if (data.interruptible && !data.flexible) invalid('Interruptible load must be flexible');
  if (!data.interruptible && data.max_interruptions) invalid('Non-interruptible load cannot have interruptions');
  return data;
}

// ---- PV ----

function stringSpecs(value: unknown): StringSpecs | null {
  if (value === undefined || value === null) return null;
  const body = object(value, 'string_specs');
  forbidExtra(body, ['modules_per_string', 'module_voc_v', 'module_vmp_v', 'inverter_max_dc_v', 'mppt_min_v', 'mppt_max_v'], 'string_specs');
  const s = {
    modules_per_string: num(body, 'modules_per_string', { int: true, gt: 0, le: 100 }),
    module_voc_v: num(body, 'module_voc_v', { gt: 0, le: 100 }), module_vmp_v: num(body, 'module_vmp_v', { gt: 0, le: 100 }),
    inverter_max_dc_v: num(body, 'inverter_max_dc_v', { gt: 0, le: 2000 }),
    mppt_min_v: num(body, 'mppt_min_v', { gt: 0, le: 2000 }), mppt_max_v: num(body, 'mppt_max_v', { gt: 0, le: 2000 }),
  };
  if (s.module_vmp_v >= s.module_voc_v) fail('string_specs', 'Module Vmp must be below Voc');
  if (!(s.mppt_min_v < s.mppt_max_v && s.mppt_max_v <= s.inverter_max_dc_v)) fail('string_specs', 'MPPT limits must be ordered and within the DC voltage limit');
  return s;
}

export function pvInput(raw: unknown): PVInput {
  const body = object(raw);
  forbidExtra(body, ['module_wattage_w', 'inverter_kw', 'inverter_efficiency_pct', 'tilt_deg', 'azimuth_deg', 'losses_pct', 'latitude_deg', 'cell_temperature_c', 'temperature_coefficient_per_c', 'poa_w_m2', 'string_specs']);
  let poa: number[] | null = null;
  if (body.poa_w_m2 !== undefined && body.poa_w_m2 !== null) {
    if (!Array.isArray(body.poa_w_m2) || body.poa_w_m2.length !== 24) fail('poa_w_m2', 'Expected 24 hourly values');
    poa = (body.poa_w_m2 as unknown[]).map((v, i) => num({ v }, 'v', { ge: 0, le: 1500 }) ?? fail(`poa_w_m2.${i}`, 'Invalid value'));
  }
  return {
    module_wattage_w: num(body, 'module_wattage_w', { gt: 0, le: 1000 }, 550),
    inverter_kw: num(body, 'inverter_kw', { gt: 0, le: 1000 }, 8),
    inverter_efficiency_pct: num(body, 'inverter_efficiency_pct', { gt: 0, le: 100 }, 96),
    tilt_deg: num(body, 'tilt_deg', { ge: 0, le: 90 }, 25),
    azimuth_deg: num(body, 'azimuth_deg', { ge: 0, le: 360 }, 180),
    losses_pct: num(body, 'losses_pct', { ge: 0, le: 50 }, 14),
    latitude_deg: num(body, 'latitude_deg', { ge: -65, le: 65 }, 31.52),
    cell_temperature_c: num(body, 'cell_temperature_c', { ge: -40, le: 85 }, 25),
    temperature_coefficient_per_c: num(body, 'temperature_coefficient_per_c', { ge: -0.01, le: 0 }, -0.004),
    poa_w_m2: poa, string_specs: stringSpecs(body.string_specs),
  };
}

// ---- Roof ----

function point(value: unknown, field: string): Point {
  const body = object(value, field);
  forbidExtra(body, ['x', 'y'], field);
  return { x: num(body, 'x', { ge: 0, le: 10000 }), y: num(body, 'y', { ge: 0, le: 10000 }) };
}

function points(value: unknown, field: string, min: number, max: number): Point[] {
  if (!Array.isArray(value)) return fail(field, 'Input should be a valid list');
  if (value.length < min) fail(field, `List should have at least ${min} items`);
  if (value.length > max) fail(field, `List should have at most ${max} items`);
  return value.map((p, i) => point(p, `${field}.${i}`));
}

const IMAGE_DATA = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/;

export function roofInput(raw: unknown): RoofInput {
  const body = object(raw);
  forbidExtra(body, ['width', 'height', 'boundary', 'obstacles', 'scale_points', 'scale_distance_m', 'setback_m', 'panel_width_m', 'panel_height_m', 'gap_m', 'image_data']);
  const obstaclesRaw = body.obstacles ?? [];
  if (!Array.isArray(obstaclesRaw)) fail('obstacles', 'Input should be a valid list');
  if ((obstaclesRaw as unknown[]).length > 30) fail('obstacles', 'List should have at most 30 items');
  let image: string | null = null;
  if (body.image_data !== undefined && body.image_data !== null) image = str(body, 'image_data', { max: 3000000, pattern: IMAGE_DATA });
  const data: RoofInput = {
    width: num(body, 'width', { gt: 0, le: 10000 }, 1000), height: num(body, 'height', { gt: 0, le: 10000 }, 700),
    boundary: points(body.boundary, 'boundary', 3, 64),
    obstacles: (obstaclesRaw as unknown[]).map((ring, i) => {
      if (!Array.isArray(ring)) return fail(`obstacles.${i}`, 'Input should be a valid list');
      return ring.map((p, j) => point(p, `obstacles.${i}.${j}`));
    }),
    scale_points: points(body.scale_points, 'scale_points', 2, 2),
    scale_distance_m: num(body, 'scale_distance_m', { gt: 0, le: 200 }),
    setback_m: num(body, 'setback_m', { ge: 0, le: 10 }, 0.5),
    panel_width_m: num(body, 'panel_width_m', { ge: 0.5, le: 3 }, 1.1),
    panel_height_m: num(body, 'panel_height_m', { ge: 0.5, le: 4 }, 2),
    gap_m: num(body, 'gap_m', { ge: 0.02, le: 2 }, 0.1),
    image_data: image,
  };
  const invalid = (message: string) => fail('body', message);
  const all = [...data.boundary, ...data.scale_points, ...data.obstacles.flat()];
  if (all.some(p => p.x > data.width || p.y > data.height)) invalid('All points must lie inside the image canvas');
  if (!isSimplePolygon(data.boundary) || Math.abs(signedArea(data.boundary)) <= 0) invalid('Roof must be a simple polygon with positive area');
  for (const ring of data.obstacles) {
    if (ring.length < 3 || ring.length > 64) invalid('Obstacles need 3–64 vertices');
    if (!isSimplePolygon(ring) || Math.abs(signedArea(ring)) <= 0 || !polygonCovers(data.boundary, ring)) invalid('Obstacle must be a valid polygon inside the roof');
  }
  const [a, b] = data.scale_points;
  const distance = Math.hypot(a.x - b.x, a.y - b.y);
  if (distance < 1) invalid('Scale points must be at least one pixel apart');
  const scale = data.scale_distance_m / distance;
  if (data.width * scale > 200 || data.height * scale > 200) invalid('Calibrated canvas must be at most 200 m on each axis');
  return data;
}

/** Python's json.dumps(..., sort_keys=True): one canonical string per request, for idempotency checks. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().filter(k => (value as Body)[k] !== undefined).map(k => `${JSON.stringify(k)}:${stableStringify((value as Body)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
