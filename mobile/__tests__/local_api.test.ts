// End-to-end checks of the on-device API on a real SQLite database (Node's built-in SQLite).
import { LocalApi } from '../src/local/localApi';
import { memoryDb } from './helpers/nodeSqlite';
import { SolvantaApiError } from '../src/api/errors';

const BUILDING = {
  name: 'Test home', address: 'Lahore, Pakistan', timezone: 'Asia/Karachi', pv_capacity_kwp: 7.7, inverter_rating_kw: 8,
  solar: { pv_capacity_kwp: 7.7, panel_tilt_deg: 25, panel_azimuth_deg: 180, system_losses_pct: 14, module_count: 14, module_wattage_w: 550 },
  inverter: { rating_kw: 8, efficiency_pct: 96, inverter_type: 'hybrid' },
  battery: { nominal_capacity_kwh: 10, usable_capacity_kwh: 9, initial_soc_pct: 70, minimum_soc_pct: 20, max_charge_kw: 4, max_discharge_kw: 4, round_trip_efficiency: 0.9, chemistry: 'LFP' },
  generator: { enabled: true, rating_kw: 3, fuel_type: 'diesel', fuel_consumption_l_per_kwh: 0.35, min_runtime_min: 30 },
  grid: { connection_type: 'single_phase', import_limit_kw: 5, export_limit_kw: 3, has_net_metering: true },
};
const ROOF = {
  boundary: [{ x: 100, y: 100 }, { x: 700, y: 100 }, { x: 700, y: 500 }, { x: 100, y: 500 }],
  obstacles: [[{ x: 300, y: 200 }, { x: 380, y: 200 }, { x: 380, y: 280 }, { x: 300, y: 280 }]],
  scale_points: [{ x: 100, y: 100 }, { x: 700, y: 100 }], scale_distance_m: 15,
};
const appliance = (name: string, extra: Record<string, unknown> = {}) => ({
  name, rated_power_w: 1000, priority: 'medium', critical: false, flexible: true, required_runtime_min: 60,
  earliest_min: 480, latest_min: 1080, interruptible: false, max_interruptions: 0, ...extra,
});

async function expectStatus(promise: Promise<unknown>, status: number, text?: string) {
  try { await promise; } catch (error) {
    expect(error).toBeInstanceOf(SolvantaApiError);
    expect((error as SolvantaApiError).status).toBe(status);
    if (text) expect((error as Error).message).toContain(text);
    return;
  }
  throw new Error(`expected HTTP ${status}`);
}

describe('LocalApi on SQLite', () => {
  let api: LocalApi;
  let id: string;
  const call = (method: string, path: string, body?: unknown) => api.handle(method, path, body) as Promise<any>;

  beforeEach(async () => {
    api = new LocalApi(memoryDb());
    id = (await call('POST', '/buildings', BUILDING)).id;
  });

  it('stores buildings with flat and structured equipment, and checks invariants', async () => {
    const list = await call('GET', '/buildings/');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: 'Test home', battery_usable_kwh: 9, has_generator: true, pv_module_count: 14, battery: { usable_capacity_kwh: 9 } });
    const me = await call('GET', '/auth/me');
    expect(list[0].owner_id).toBe(me.id);
    expect(await call('GET', `/buildings/${id}/equipment`)).toMatchObject({ building_name: 'Test home', is_valid: true, generator: { enabled: true, rating_kw: 3 } });
    const updated = await call('PATCH', `/buildings/${id}`, { battery: { usable_capacity_kwh: 8 } });
    expect(updated.battery_usable_kwh).toBe(8);
    await expectStatus(call('PATCH', `/buildings/${id}`, { battery_usable_kwh: 11 }), 422, 'cannot exceed nominal');
    await expectStatus(call('POST', '/buildings', { ...BUILDING, battery: undefined }), 422, 'Battery capacity');
    await expectStatus(call('POST', '/buildings', { ...BUILDING, battery_usable_kwh: 5 }), 422, 'Conflicting values');
    await expectStatus(call('GET', '/buildings/missing'), 404, 'Building not found');
  });

  it('manages appliances and scenario selection', async () => {
    const a = await call('POST', `/buildings/${id}/appliances`, appliance('Pump'));
    expect(a).toMatchObject({ name: 'Pump', selected: false, building_id: id });
    await expectStatus(call('POST', `/buildings/${id}/appliances`, appliance('Bad', { critical: true })), 422, 'Critical loads must have critical priority');
    await expectStatus(call('POST', `/buildings/${id}/appliances`, { ...appliance('Bad'), colour: 'red' }), 422, 'Extra inputs');
    const list = await call('PUT', `/buildings/${id}/appliances/${a.id}/selection`, { selected: true });
    expect(list.summary).toEqual({ requested_kw: 1, critical_kw: 0, selected_count: 1 });
    expect((await call('PUT', `/buildings/${id}/appliances/${a.id}`, appliance('Pump 2'))).selected).toBe(true);
    await call('DELETE', `/buildings/${id}/appliances/${a.id}`);
    expect((await call('GET', `/buildings/${id}/appliances`)).items).toEqual([]);
  });

  it('needs a saved roof before PV, then runs every energy engine', async () => {
    await expectStatus(call('GET', `/buildings/${id}/pv`), 404, 'No saved roof');
    const preview = await call('POST', `/buildings/${id}/roof/preview`, ROOF);
    const saved = await call('PUT', `/buildings/${id}/roof`, ROOF);
    expect(saved.layout.panel_count).toBe(preview.panel_count);
    expect(saved.geometry.setback_m).toBe(0.5);
    await expectStatus(call('PUT', `/buildings/${id}/roof`, { ...ROOF, boundary: [{ x: 100, y: 100 }, { x: 700, y: 500 }, { x: 700, y: 100 }, { x: 100, y: 500 }] }), 422, 'simple polygon');
    const pv = await call('GET', `/buildings/${id}/pv`);
    expect(pv.saved).toBe(false);
    expect(pv.profile.panel_count).toBe(saved.layout.panel_count);
    expect((await call('PUT', `/buildings/${id}/pv`, { tilt_deg: 20 })).saved).toBe(true);

    for (const [name, extra] of [['Fridge', { priority: 'critical', critical: true, flexible: false, earliest_min: 0, latest_min: 1440, required_runtime_min: 1440, rated_power_w: 150 }], ['AC', { rated_power_w: 1800, required_runtime_min: 120 }]] as const) {
      const a = await call('POST', `/buildings/${id}/appliances`, appliance(name, extra));
      await call('PUT', `/buildings/${id}/appliances/${a.id}/selection`, { selected: true });
    }
    const options = { outages: [{ start_min: 1080, end_min: 1320 }], use_generator: false };
    const run = await call('POST', `/buildings/${id}/simulations`, options);
    expect(run.result.trace).toHaveLength(96);
    expect((await call('GET', `/buildings/${id}/simulations`))[0]).toEqual({ id: run.id, created_at: run.created_at, summary: run.result.summary });
    expect((await call('GET', `/buildings/${id}/simulations/${run.id}`)).snapshot.options).toEqual(options);
    await expectStatus(call('POST', `/buildings/${id}/simulations`, { outages: [{ start_min: 10, end_min: 40 }] }), 422, '15-minute');

    const fc = await call('POST', `/buildings/${id}/forecast`, { ...options, basis: 'latest_run' });
    expect(fc.provenance.source_run_id).toBe(run.id);
    expect(fc.fallback_reason).toBeNull();

    // A night outage leaves the 24-hour fridge without PV or grid: no valid schedule exists.
    const blocked = await call('POST', `/buildings/${id}/schedules`, options);
    expect(blocked).toMatchObject({ id: null, result: { validated: false, status: 'INFEASIBLE' } });
    const schedule = await call('POST', `/buildings/${id}/schedules`, { outages: [{ start_min: 600, end_min: 660 }] });
    expect(schedule.result.validated).toBe(true);
    expect((await call('GET', `/buildings/${id}/schedules`))[0].id).toBe(schedule.id);
    await expectStatus(call('POST', `/buildings/${id}/schedules`, { ...options, use_generator: true }), 422, 'PV and grid only');

    const resilience = await call('POST', `/buildings/${id}/resilience`, options);
    expect(resilience.result.status).toMatch(/critical_/);
    expect(await call('GET', `/buildings/${id}/resilience`)).toHaveLength(1);
  });

  async function readyBuilding() {
    await call('PUT', `/buildings/${id}/roof`, ROOF);
    const a = await call('POST', `/buildings/${id}/appliances`, appliance('Lights', { priority: 'critical', critical: true, flexible: false, earliest_min: 1080, latest_min: 1440, required_runtime_min: 300, rated_power_w: 2500 }));
    await call('PUT', `/buildings/${id}/appliances/${a.id}/selection`, { selected: true });
    return { outages: [{ start_min: 1080, end_min: 1440 }], use_generator: false };
  }

  it('walks a plan through approval, simulation and verification with an audit trail', async () => {
    const options = await readyBuilding();
    let plan = await call('POST', `/buildings/${id}/plans`, { ...options, expiry_minutes: 30 });
    expect(plan).toMatchObject({ state: 'DRAFT', revision: 1 });
    expect(plan.variants.map((v: any) => v.name)).toEqual(['Current configuration', 'Battery capacity +50%', 'PV capacity +25%']);
    expect(plan.receipts).toBeUndefined();
    const act = async (action: string, key: string, extra = {}) => (plan = await call('POST', `/buildings/${id}/plans/${plan.id}/actions`, { action, expected_revision: plan.revision, idempotency_key: key, ...extra }));
    await act('submit', 'key-submit-1', { variant: 1 });
    expect(plan).toMatchObject({ state: 'PENDING_APPROVAL', selected_variant: 1, revision: 2 });
    const replay = await call('POST', `/buildings/${id}/plans/${plan.id}/actions`, { action: 'submit', expected_revision: 1, idempotency_key: 'key-submit-1', variant: 1 });
    expect(replay.replayed).toBe(true);
    await expectStatus(call('POST', `/buildings/${id}/plans/${plan.id}/actions`, { action: 'submit', expected_revision: 1, idempotency_key: 'key-submit-1', variant: 2 }), 409, 'Idempotency key');
    await expectStatus(call('POST', `/buildings/${id}/plans/${plan.id}/actions`, { action: 'simulate', expected_revision: 2, idempotency_key: 'key-early-sim' }), 409, 'Cannot simulate');
    await act('approve', 'key-approve');
    await act('simulate', 'key-simulate');
    expect(plan.run_id).toBeTruthy();
    await act('verify', 'key-verify');
    expect(plan).toMatchObject({ state: 'VERIFIED', verification_errors: [] });
    const audit = await call('GET', `/buildings/${id}/plans/${plan.id}/audit`);
    expect(audit.map((e: any) => e.action)).toEqual(['create', 'submit', 'approve', 'simulate', 'verify']);
    expect(await call('GET', `/buildings/${id}/plans`)).toHaveLength(1);
  });

  it('generates simulated telemetry, raises incidents and verifies them against a plan', async () => {
    const options = await readyBuilding();
    const run = await call('POST', `/buildings/${id}/simulations`, options);
    const telemetry = await call('POST', `/buildings/${id}/telemetry`, { run_id: run.id, fixture: 'load_spike', seed: 14 });
    expect(telemetry.samples).toHaveLength(96);
    expect(telemetry.incidents.map((i: any) => i.code)).toContain('load_mismatch');
    const incident = (await call('GET', `/buildings/${id}/incidents`))[0];
    expect(await call('GET', `/buildings/${id}/incidents/pending`)).toHaveLength(telemetry.incidents.length);

    let plan = await call('POST', `/buildings/${id}/plans`, options);
    for (const action of ['submit', 'approve', 'simulate', 'verify']) {
      plan = await call('POST', `/buildings/${id}/plans/${plan.id}/actions`, { action, expected_revision: plan.revision, idempotency_key: `key-${action}-x` });
    }
    const verification = await call('POST', `/buildings/${id}/incidents/${incident.id}/verify`, { plan_id: plan.id, verification_id: 'verify-0001', fixture: 'none' });
    expect(verification.state).toBe('MODEL_MATCH');
    expect(await call('POST', `/buildings/${id}/incidents/${incident.id}/verify`, { plan_id: plan.id, verification_id: 'verify-0001', fixture: 'none' })).toEqual(verification);
    expect((await call('GET', `/buildings/${id}/incidents`)).find((i: any) => i.id === incident.id).state).toBe('SIMULATED_MODEL_MATCH');

    const event = await call('POST', `/buildings/${id}/events`, { ...options, event_id: 'event-0001', correlation_id: 'corr-0001', kind: 'anomaly_incident', incident_id: telemetry.incidents[0].id });
    expect(event).toMatchObject({ state: 'PENDING_APPROVAL', waiting: true, terminal: false });
    expect(await call('POST', `/buildings/${id}/events`, { ...options, event_id: 'event-0001', correlation_id: 'corr-0001', kind: 'anomaly_incident', incident_id: telemetry.incidents[0].id })).toEqual(event);
    await expectStatus(call('POST', `/buildings/${id}/events`, { ...options, event_id: 'event-0001', correlation_id: 'corr-0002', kind: 'shortage' }), 409, 'reused');
    expect(await call('GET', `/buildings/${id}/events`)).toHaveLength(1);
  });

  it('runs every engine tool on a saved scenario', async () => {
    const options = await readyBuilding();
    const run = await call('POST', `/buildings/${id}/simulations`, options);
    const { tools } = await call('GET', '/operations/tools');
    expect(tools).toHaveLength(9);
    for (const { name } of tools) {
      const args = ['get_building_profile', 'get_energy_anomalies'].includes(name) ? { building_id: id } : { scenario_id: run.id };
      const result = await call('POST', `/operations/tools/${name}`, args);
      expect(result).toMatchObject({ tool: name, building_id: id });
    }
    await expectStatus(call('POST', '/operations/tools/get_energy_scenario', { scenario_id: 'not-a-uuid' }), 422, 'UUID');
    await expectStatus(call('POST', '/operations/tools/unknown_tool', {}), 404, 'Unknown tool');
  });

  it('rolls back a failed request and deletes building data with the building', async () => {
    await call('PUT', `/buildings/${id}/roof`, ROOF);
    await expectStatus(call('PATCH', `/buildings/${id}`, { name: '' }), 422);
    expect((await call('GET', `/buildings/${id}`)).name).toBe('Test home');
    await call('DELETE', `/buildings/${id}`);
    expect(await call('GET', '/buildings')).toEqual([]);
    await expectStatus(call('GET', `/buildings/${id}/roof`), 404, 'Building not found');
    await expectStatus(call('GET', '/nothing/here'), 404, 'Not available on this device');
  });
});
