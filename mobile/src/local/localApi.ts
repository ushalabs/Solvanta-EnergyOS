// The on-device replacement for the FastAPI backend: the same routes and response shapes,
// served from SQLite on the phone. Each request runs in one transaction, one at a time.
import { httpError, SolvantaApiError } from '../api/errors';
import { migrate, type SqlDb, type SqlValue } from './db';
import { BUILDING_COLUMNS, buildingCreate, buildingRead, buildingUpdate, equipmentSummary, plantFor, toRow } from './buildings';
import {
  applianceInput, eventInput, forecastInput, object, planAction, planInput, pvInput, roofInput, simulationInput,
  stableStringify, telemetryInput, verificationInput, bool,
} from './validation';
import { estimatePv, type PVInput } from './engines/pv';
import { placePanels, type RoofInput } from './engines/geometry';
import { loadProfiles, quarterHourPv, simulate, validatePlant, type ApplianceItem, type SimulationOptions, type SimulationResult } from './engines/simulation';
import { forecast, type Snapshot } from './engines/forecast';
import { compareResilience } from './engines/resilience';
import { clone, executeSnapshot, variants, verifyResult } from './engines/plans';
import { detect, simulatedSamples, TELEMETRY_SOURCE } from './engines/telemetry';
import { solveSchedule } from './engines/scheduling';

type Body = Record<string, any>;
type Handler = (params: string[], body: unknown) => Promise<unknown>;

export function newId(): string {
  const random = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (random) return random();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const nowIso = () => new Date().toISOString();
const parse = (text: string) => JSON.parse(text);
const json = (value: unknown) => JSON.stringify(value);

/** What a 5xx used to mean; a bug in a handler should still reach the screen as a readable error. */
function asApiError(error: unknown): SolvantaApiError {
  if (error instanceof SolvantaApiError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (/CHECK constraint|FOREIGN KEY|UNIQUE constraint|NOT NULL constraint/i.test(message)) return httpError(422, `Rejected by the on-device database: ${message}`);
  return httpError(500, message);
}

/** Engine ValueErrors were 422s in the backend. */
function engine<T>(run: () => T): T {
  try { return run(); } catch (error) {
    if (error instanceof SolvantaApiError) throw error;
    throw httpError(422, error instanceof Error ? error.message : String(error));
  }
}

export class LocalApi {
  private ready: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private routes: Array<[string, RegExp, Handler]> = [];

  constructor(private db: SqlDb, private now: () => string = nowIso) {
    this.register();
  }

  /** Runs one request: migrations first, then the handler inside a transaction, strictly one after another. */
  handle(method: string, path: string, body?: unknown): Promise<unknown> {
    const run = async () => {
      if (!this.ready) this.ready = migrate(this.db);
      await this.ready;
      const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
      const route = this.routes.find(([m, pattern]) => m === method.toUpperCase() && pattern.test(clean));
      if (!route) throw httpError(404, `Not available on this device: ${method.toUpperCase()} ${clean}`);
      const params = (route[1].exec(clean) as RegExpExecArray).slice(1).map(decodeURIComponent);
      await this.db.exec('BEGIN');
      try {
        const result = await route[2](params, body);
        await this.db.exec('COMMIT');
        return result;
      } catch (error) {
        await this.db.exec('ROLLBACK');
        throw asApiError(error);
      }
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private on(method: string, path: string, handler: Handler) {
    const pattern = new RegExp(`^${path.replace(/:[a-z]+/g, '([^/]+)')}$`);
    this.routes.push([method, pattern, handler]);
  }

  // ---- data access ----

  private one<T = Body>(sql: string, params: SqlValue[] = []) { return this.db.get<T>(sql, params); }
  private many<T = Body>(sql: string, params: SqlValue[] = []) { return this.db.all<T>(sql, params); }
  private run(sql: string, params: SqlValue[] = []) { return this.db.run(sql, params); }

  async profile() {
    let row = await this.one<{ id: string; full_name: string }>('SELECT id, full_name FROM local_profile LIMIT 1');
    if (!row) {
      row = { id: newId(), full_name: 'This device' };
      await this.run('INSERT INTO local_profile (id, full_name, created_at) VALUES (?, ?, ?)', [row.id, row.full_name, this.now()]);
    }
    return { id: row.id, email: '', full_name: row.full_name, role: 'owner', is_superuser: false, organization_id: null };
  }

  private async building(id: string): Promise<Body> {
    const row = await this.one('SELECT * FROM buildings WHERE id = ?', [id]);
    if (!row) throw httpError(404, 'Building not found');
    return row;
  }

  private async appliances(buildingId: string) {
    await this.building(buildingId);
    const rows = await this.many(
      `SELECT a.*, COALESCE(s.selected, 0) AS selected FROM appliances a
       LEFT JOIN scenario_selections s ON s.building_id = a.building_id AND s.appliance_id = a.id
       WHERE a.building_id = ? ORDER BY a.created_at, a.id`, [buildingId]);
    const items = rows.map(applianceRow);
    const chosen = items.filter(a => a.selected);
    const kw = (list: typeof items) => Math.round(list.reduce((t, a) => t + a.rated_power_w, 0) / 1000 * 1e6) / 1e6;
    return {
      items, summary: { requested_kw: kw(chosen), critical_kw: kw(chosen.filter(a => a.critical)), selected_count: chosen.length },
      disclaimer: 'Scenario selection only; no physical device switching',
    };
  }

  private async ownedAppliance(buildingId: string, applianceId: string) {
    await this.building(buildingId);
    const row = await this.one('SELECT * FROM appliances WHERE id = ? AND building_id = ?', [applianceId, buildingId]);
    if (!row) throw httpError(404, 'Appliance not found in this building');
    return row;
  }

  private async roof(buildingId: string) {
    await this.building(buildingId);
    const row = await this.one<{ geometry: string }>('SELECT geometry FROM roofs WHERE building_id = ?', [buildingId]);
    if (!row) throw httpError(404, 'No saved roof for this building');
    const geometry = parse(row.geometry) as RoofInput;
    return { geometry, layout: engine(() => placePanels(geometry)) };
  }

  private async pvPreview(buildingId: string, data: PVInput) {
    const roof = await this.roof(buildingId);
    return engine(() => estimatePv(roof.layout.panel_count, data));
  }

  private async pv(buildingId: string) {
    const b = await this.building(buildingId);
    const design = await this.one<{ parameters: string }>('SELECT parameters FROM pv_designs WHERE building_id = ?', [buildingId]);
    const data = design ? pvInput(parse(design.parameters)) : pvInput({
      module_wattage_w: b.pv_module_wattage_w || 550, inverter_kw: b.inverter_rating_kw || 8,
      tilt_deg: b.pv_panel_tilt_deg, azimuth_deg: b.pv_panel_azimuth_deg,
      losses_pct: b.pv_system_losses_pct, inverter_efficiency_pct: b.inverter_efficiency_pct,
    });
    return { parameters: data, saved: !!design, profile: await this.pvPreview(buildingId, data) };
  }

  /** Inputs of every energy run, frozen into the saved record: plant, appliances, PV profile, options. */
  private async calculate(buildingId: string, options: SimulationOptions): Promise<[Snapshot, SimulationResult]> {
    const b = await this.building(buildingId);
    const loads = await this.appliances(buildingId);
    const pv = await this.pv(buildingId);
    return engine(() => {
      const plant = validatePlant(plantFor(b));
      if (options.use_generator && plant.generator_kw <= 0) throw new Error('Configure an enabled generator with positive rating first');
      const [demand, critical] = loadProfiles(loads.items);
      const result = simulate(plant, demand, critical, quarterHourPv(pv.profile), options);
      const snapshot: Snapshot = { plant, appliances: loads.items, pv: clone(pv.profile), options: { outages: options.outages, use_generator: options.use_generator } };
      return [snapshot, result];
    });
  }

  private async insertRun(table: 'simulation_runs' | 'schedules' | 'resilience_runs', buildingId: string, snapshot: unknown, result: unknown) {
    const id = newId(), created_at = this.now();
    await this.run(`INSERT INTO ${table} (id, building_id, snapshot, result, created_at) VALUES (?, ?, ?, ?, ?)`, [id, buildingId, json(snapshot), json(result), created_at]);
    return { id, created_at };
  }

  private async plan(id: string, buildingId?: string) {
    const row = await this.one('SELECT * FROM energy_plans WHERE id = ?', [id]);
    if (!row || (buildingId && row.building_id !== buildingId)) return null;
    return { id: row.id as string, building_id: row.building_id as string, created_at: row.created_at as string, snapshot: parse(row.snapshot) };
  }

  private async savePlan(id: string, snapshot: unknown) {
    await this.run('UPDATE energy_plans SET snapshot = ? WHERE id = ?', [json(snapshot), id]);
  }

  private async audit(userId: string, planId: string, action: string, details: unknown) {
    await this.run('INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [newId(), userId, action, 'energy_plan', planId, json(details), this.now()]);
  }

  private async buildPlan(buildingId: string, data: { outages: SimulationOptions['outages']; use_generator: boolean; expiry_minutes: number }, userId: string, extra: Body = {}, state = 'DRAFT', revision = 1) {
    const [snapshot] = await this.calculate(buildingId, { outages: data.outages, use_generator: data.use_generator });
    const plan = {
      id: newId(), building_id: buildingId, created_at: this.now(),
      snapshot: {
        state, revision, selected_variant: 0, expires_at: new Date(Date.now() + data.expiry_minutes * 60000).toISOString(),
        variants: engine(() => variants(snapshot)), run_id: null as string | null, receipts: {}, verification_errors: [] as string[], ...extra,
      },
    };
    await this.run('INSERT INTO energy_plans (id, building_id, snapshot, created_at) VALUES (?, ?, ?, ?)', [plan.id, buildingId, json(plan.snapshot), plan.created_at]);
    return plan;
  }

  private async incidentViews(buildingId: string) {
    const rows = await this.many('SELECT * FROM incidents WHERE building_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 20', [buildingId]);
    return rows.map(incidentView);
  }

  private async eventView(event: Body) {
    const d = parse(event.data);
    const plan = await this.plan(d.plan_id);
    const p = plan!.snapshot;
    const expired = Date.now() >= Date.parse(p.expires_at);
    let state: string = p.state;
    const terminal = ['VERIFIED', 'FAILED', 'REJECTED'].includes(state) || expired;
    if (expired && !['VERIFIED', 'FAILED', 'REJECTED'].includes(state)) state = 'EXPIRED';
    return {
      id: event.id, event_id: event.event_id, correlation_id: d.correlation_id, building_id: event.building_id, kind: d.kind,
      plan_id: plan!.id, plan_revision: p.revision, state, waiting: !terminal && !['APPROVED', 'SIMULATED'].includes(state),
      terminal, notice: d.notice, run_id: p.run_id,
    };
  }

  private scheduleBudget(snapshot: Snapshot, options: SimulationOptions) {
    return Array.from({ length: 1440 }, (_, minute) => {
      const grid = options.outages.some(o => o.start_min <= minute && minute < o.end_min) ? 0 : snapshot.plant.grid_import_kw;
      return (grid + snapshot.pv.timeline[Math.floor(minute / 60)].ac_kw) * 1000;
    });
  }

  private async solve(snapshot: Snapshot, budget: number[]) {
    try { return await solveSchedule(snapshot.appliances, budget); } catch (error) {
      throw httpError(422, error instanceof Error ? error.message : String(error));
    }
  }

  // ---- routes ----

  private register() {
    const user = () => this.profile();

    this.on('GET', '/system/health', async () => ({ status: 'ok', version: 'local', environment: 'on-device', timestamp: this.now() }));
    this.on('GET', '/system/ready', async () => ({ ready: true, database: 'on-device SQLite', engines: 'PV estimate available; energy and outage simulation available', timestamp: this.now() }));
    this.on('GET', '/auth/me', async () => user());

    // Buildings
    this.on('GET', '/buildings', async () => (await this.many('SELECT * FROM buildings ORDER BY created_at, rowid')).map(buildingRead));
    this.on('POST', '/buildings', async (_, body) => {
      const columns = toRow(buildingCreate(body));
      const id = newId(), at = this.now(), owner = (await user()).id;
      const keys = [...BUILDING_COLUMNS, 'id', 'owner_id', 'created_at', 'updated_at'];
      const values = [...BUILDING_COLUMNS.map(k => columns[k]), id, owner, at, at];
      await this.run(`INSERT INTO buildings (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, values);
      return buildingRead(await this.building(id));
    });
    this.on('GET', '/buildings/:id', async ([id]) => buildingRead(await this.building(id)));
    this.on('GET', '/buildings/:id/equipment', async ([id]) => equipmentSummary(await this.building(id)));
    const update: Handler = async ([id], body) => {
      const current = await this.building(id);
      const changes = toRow(buildingUpdate(body, { ...current, has_generator: !!current.has_generator }));
      const keys = Object.keys(changes);
      if (keys.length) await this.run(`UPDATE buildings SET ${keys.map(k => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, [...keys.map(k => changes[k]), this.now(), id]);
      return buildingRead(await this.building(id));
    };
    this.on('PATCH', '/buildings/:id', update);
    this.on('PUT', '/buildings/:id', update);
    this.on('DELETE', '/buildings/:id', async ([id]) => { await this.building(id); await this.run('DELETE FROM buildings WHERE id = ?', [id]); return {}; });

    // Appliances
    this.on('GET', '/buildings/:id/appliances', async ([id]) => this.appliances(id));
    this.on('POST', '/buildings/:id/appliances', async ([id], body) => {
      await this.building(id);
      const data = applianceInput(body), applianceId = newId(), at = this.now();
      await this.run(`INSERT INTO appliances (id, building_id, name, rated_power_w, priority, critical, flexible, required_runtime_min, earliest_min, latest_min, interruptible, max_interruptions, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [applianceId, id, data.name, data.rated_power_w, data.priority, +data.critical, +data.flexible,
        data.required_runtime_min, data.earliest_min, data.latest_min, +data.interruptible, data.max_interruptions, at, at]);
      return applianceRow({ ...(await this.ownedAppliance(id, applianceId)), selected: 0 });
    });
    this.on('PUT', '/buildings/:id/appliances/:aid', async ([id, aid], body) => {
      await this.ownedAppliance(id, aid);
      const data = applianceInput(body);
      await this.run(`UPDATE appliances SET name = ?, rated_power_w = ?, priority = ?, critical = ?, flexible = ?, required_runtime_min = ?, earliest_min = ?, latest_min = ?, interruptible = ?, max_interruptions = ?, updated_at = ? WHERE id = ?`,
        [data.name, data.rated_power_w, data.priority, +data.critical, +data.flexible, data.required_runtime_min, data.earliest_min, data.latest_min, +data.interruptible, data.max_interruptions, this.now(), aid]);
      const s = await this.one<{ selected: number }>('SELECT selected FROM scenario_selections WHERE building_id = ? AND appliance_id = ?', [id, aid]);
      return applianceRow({ ...(await this.ownedAppliance(id, aid)), selected: s?.selected ?? 0 });
    });
    this.on('DELETE', '/buildings/:id/appliances/:aid', async ([id, aid]) => { await this.ownedAppliance(id, aid); await this.run('DELETE FROM appliances WHERE id = ?', [aid]); return {}; });
    this.on('PUT', '/buildings/:id/appliances/:aid/selection', async ([id, aid], body) => {
      await this.ownedAppliance(id, aid);
      const selected = bool(object(body), 'selected');
      await this.run(`INSERT INTO scenario_selections (id, building_id, appliance_id, selected) VALUES (?, ?, ?, ?)
        ON CONFLICT (building_id, appliance_id) DO UPDATE SET selected = excluded.selected`, [newId(), id, aid, +selected]);
      return this.appliances(id);
    });

    // Roof and PV
    this.on('GET', '/buildings/:id/roof', async ([id]) => this.roof(id));
    this.on('POST', '/buildings/:id/roof/preview', async ([id], body) => { await this.building(id); const data = roofInput(body); return engine(() => placePanels(data)); });
    this.on('PUT', '/buildings/:id/roof', async ([id], body) => {
      await this.building(id);
      const data = roofInput(body);
      const layout = engine(() => placePanels(data));
      await this.run(`INSERT INTO roofs (building_id, geometry, updated_at) VALUES (?, ?, ?)
        ON CONFLICT (building_id) DO UPDATE SET geometry = excluded.geometry, updated_at = excluded.updated_at`, [id, json(data), this.now()]);
      return { geometry: data, layout };
    });
    this.on('GET', '/buildings/:id/pv', async ([id]) => this.pv(id));
    this.on('POST', '/buildings/:id/pv/preview', async ([id], body) => { await this.building(id); return this.pvPreview(id, pvInput(body)); });
    this.on('PUT', '/buildings/:id/pv', async ([id], body) => {
      await this.building(id);
      const data = pvInput(body);
      const profile = await this.pvPreview(id, data);
      await this.run(`INSERT INTO pv_designs (building_id, parameters, updated_at) VALUES (?, ?, ?)
        ON CONFLICT (building_id) DO UPDATE SET parameters = excluded.parameters, updated_at = excluded.updated_at`, [id, json(data), this.now()]);
      return { parameters: data, saved: true, profile };
    });

    // Simulation, forecast, scheduling, resilience
    this.on('POST', '/buildings/:id/simulations', async ([id], body) => {
      const options = simulationInput(body);
      const [snapshot, result] = await this.calculate(id, options);
      const run = await this.insertRun('simulation_runs', id, snapshot, result);
      return { ...run, snapshot, result };
    });
    this.on('GET', '/buildings/:id/simulations', async ([id]) => {
      await this.building(id);
      const rows = await this.many('SELECT id, created_at, result FROM simulation_runs WHERE building_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 20', [id]);
      return rows.map(r => ({ id: r.id, created_at: r.created_at, summary: parse(r.result).summary }));
    });
    this.on('GET', '/buildings/:id/simulations/:rid', async ([id, rid]) => {
      await this.building(id);
      const r = await this.one('SELECT * FROM simulation_runs WHERE id = ? AND building_id = ?', [rid, id]);
      if (!r) throw httpError(404, 'Simulation not found in this building');
      return { id: r.id, created_at: r.created_at, snapshot: parse(r.snapshot), result: parse(r.result) };
    });
    this.on('POST', '/buildings/:id/forecast', async ([id], body) => {
      await this.building(id);
      const data = forecastInput(body);
      const options = { outages: data.outages, use_generator: data.use_generator };
      const saved = data.basis === 'latest_run'
        ? await this.one('SELECT * FROM simulation_runs WHERE building_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1', [id]) : null;
      const snapshot = saved ? parse(saved.snapshot) : (await this.calculate(id, options))[0];
      const result = engine(() => forecast(snapshot, options, saved ? parse(saved.result) : null, saved ? saved.id : null));
      return { ...result, generated_at: this.now(), fallback_reason: data.basis === 'latest_run' && !saved ? 'No saved simulation exists; using configured profiles.' : null };
    });
    this.on('POST', '/buildings/:id/schedules', async ([id], body) => {
      const options = simulationInput(body);
      if (options.use_generator) throw httpError(422, 'Phase 9 budget uses PV and grid only; generator dispatch belongs to resilience optimization');
      const [snapshot] = await this.calculate(id, options);
      const budget = this.scheduleBudget(snapshot, options);
      const result: Body = await this.solve(snapshot, budget);
      result.supply_policy = 'PV plus available grid only. Battery and generator are excluded from this conservative scheduling budget.';
      if (!result.validated) return { id: null, result };
      const run = await this.insertRun('schedules', id, { ...snapshot, budget_w: budget }, result);
      return { ...run, result };
    });
    this.on('GET', '/buildings/:id/schedules', async ([id]) => {
      await this.building(id);
      const rows = await this.many('SELECT id, created_at, result FROM schedules WHERE building_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 20', [id]);
      return rows.map(r => ({ id: r.id, created_at: r.created_at, result: parse(r.result) }));
    });
    this.on('POST', '/buildings/:id/resilience', async ([id], body) => {
      const options = simulationInput(body);
      const [snapshot] = await this.calculate(id, options);
      const result = engine(() => compareResilience(snapshot));
      const run = await this.insertRun('resilience_runs', id, snapshot, result);
      return { ...run, result };
    });
    this.on('GET', '/buildings/:id/resilience', async ([id]) => {
      await this.building(id);
      const rows = await this.many('SELECT id, created_at, result FROM resilience_runs WHERE building_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 10', [id]);
      return rows.map(r => ({ id: r.id, created_at: r.created_at, result: parse(r.result) }));
    });

    // Plans: draft → approval → simulate → verify, with an audit trail
    this.on('POST', '/buildings/:id/plans', async ([id], body) => {
      const data = planInput(body);
      const u = await user();
      const plan = await this.buildPlan(id, data, u.id);
      await this.audit(u.id, plan.id, 'create', { revision: 1 });
      return serializePlan(plan);
    });
    this.on('GET', '/buildings/:id/plans', async ([id]) => {
      await this.building(id);
      const rows = await this.many('SELECT * FROM energy_plans WHERE building_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 10', [id]);
      return rows.map(r => serializePlan({ id: r.id, created_at: r.created_at, snapshot: parse(r.snapshot) }));
    });
    this.on('POST', '/buildings/:id/plans/:pid/actions', async ([id, pid], body) => {
      await this.building(id);
      const data = planAction(body);
      const u = await user();
      const plan = await this.plan(pid, id);
      if (!plan) throw httpError(404, 'Plan not found');
      const d = clone(plan.snapshot);
      const digest = stableStringify({ actor: u.id, request: data });
      const receipt = d.receipts[data.idempotency_key];
      if (receipt) {
        if (receipt.digest !== digest) throw httpError(409, 'Idempotency key already used for different request or actor');
        return { ...serializePlan(plan), replayed: true };
      }
      if (d.revision !== data.expected_revision) throw httpError(409, 'Plan revision changed; reload before acting');
      if (Date.now() >= Date.parse(d.expires_at)) throw httpError(409, 'Plan expired; create a fresh plan');
      const allowed: Record<string, [string, string]> = {
        submit: ['DRAFT', 'PENDING_APPROVAL'], approve: ['PENDING_APPROVAL', 'APPROVED'], reject: ['PENDING_APPROVAL', 'REJECTED'],
        request_modification: ['PENDING_APPROVAL', 'MODIFICATION_REQUESTED'], revise: ['MODIFICATION_REQUESTED', 'DRAFT'],
        simulate: ['APPROVED', 'SIMULATED'], verify: ['SIMULATED', 'VERIFIED'],
      };
      const [source] = allowed[data.action];
      let [, target] = allowed[data.action];
      if (d.state !== source) throw httpError(409, `Cannot ${data.action} a ${d.state} plan`);
      if (data.action === 'submit' || data.action === 'revise') d.selected_variant = data.variant;
      const snapshot = d.variants[d.selected_variant].snapshot;
      if (data.action === 'simulate') {
        const result = engine(() => executeSnapshot(snapshot));
        d.run_id = (await this.insertRun('simulation_runs', id, snapshot, result)).id;
      }
      if (data.action === 'verify') {
        const run = d.run_id ? await this.one<{ result: string }>('SELECT result FROM simulation_runs WHERE id = ?', [d.run_id]) : null;
        d.verification_errors = run ? engine(() => verifyResult(snapshot, parse(run.result))) : ['Linked simulation missing'];
        target = d.verification_errors.length ? 'FAILED' : 'VERIFIED';
      }
      d.state = target; d.revision += 1; d.receipts[data.idempotency_key] = { digest };
      await this.savePlan(pid, d);
      await this.audit(u.id, pid, data.action, { from: source, to: target, revision: d.revision, comment: data.comment, run_id: d.run_id });
      return serializePlan({ ...plan, snapshot: d });
    });
    this.on('GET', '/buildings/:id/plans/:pid/audit', async ([id, pid]) => {
      await this.building(id);
      if (!(await this.plan(pid, id))) throw httpError(404, 'Plan not found');
      const rows = await this.many("SELECT * FROM audit_logs WHERE target_id = ? AND target_type = 'energy_plan' ORDER BY created_at, rowid", [pid]);
      return rows.map(r => ({ actor_id: r.user_id, action: r.action, created_at: r.created_at, details: parse(r.details) }));
    });

    // Simulated telemetry and incidents
    this.on('POST', '/buildings/:id/telemetry', async ([id], body) => {
      await this.building(id);
      const data = telemetryInput(body);
      const run = await this.one('SELECT * FROM simulation_runs WHERE id = ? AND building_id = ?', [data.run_id, id]);
      if (!run) throw httpError(404, 'Source simulation not found');
      const result = parse(run.result);
      const [samples, detected] = engine(() => { const s = simulatedSamples(result, data.fixture, data.seed); return [s, detect(result, s)] as const; });
      const record = { source: TELEMETRY_SOURCE, fixture: data.fixture, seed: data.seed, samples };
      const telemetryId = newId(), at = this.now();
      await this.run('INSERT INTO telemetry_runs (id, building_id, run_id, data, created_at) VALUES (?, ?, ?, ?, ?)', [telemetryId, id, run.id, json(record), at]);
      const incidents = [];
      for (const d of detected) {
        const row = { id: newId(), building_id: id, telemetry_id: telemetryId, created_at: this.now(), data: json(d) };
        await this.run('INSERT INTO incidents (id, building_id, telemetry_id, data, created_at) VALUES (?, ?, ?, ?, ?)', [row.id, id, telemetryId, row.data, row.created_at]);
        incidents.push(incidentView(row));
      }
      return { id: telemetryId, run_id: run.id, ...record, incidents };
    });
    this.on('GET', '/buildings/:id/telemetry', async ([id]) => {
      await this.building(id);
      const rows = await this.many('SELECT * FROM telemetry_runs WHERE building_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 10', [id]);
      return rows.map(r => ({ id: r.id, run_id: r.run_id, created_at: r.created_at, ...parse(r.data) }));
    });
    this.on('GET', '/buildings/:id/incidents', async ([id]) => { await this.building(id); return this.incidentViews(id); });
    this.on('GET', '/buildings/:id/incidents/pending', async ([id]) => {
      await this.building(id);
      const rows = (await this.many('SELECT * FROM incidents WHERE building_id = ? ORDER BY created_at, rowid', [id])).map(incidentView);
      return rows.filter(i => i.state === 'OPEN' && !i.automation_event_id).slice(0, 20)
        .map(i => ({ building_id: id, incident_id: i.id, event_id: `incident-${i.id}`, correlation_id: i.id }));
    });
    this.on('POST', '/buildings/:id/incidents/:iid/verify', async ([id, iid], body) => {
      await this.building(id);
      const data = verificationInput(body);
      const incident = await this.one('SELECT * FROM incidents WHERE id = ? AND building_id = ?', [iid, id]);
      if (!incident) throw httpError(404, 'Incident not found');
      const state = parse(incident.data);
      const digest = stableStringify(data);
      for (const v of state.verifications) {
        if (v.verification_id === data.verification_id) {
          if (v.digest !== digest) throw httpError(409, 'Verification id conflicts');
          return v;
        }
      }
      const plan = await this.plan(data.plan_id, id);
      if (!plan) throw httpError(404, 'Plan not found');
      if (plan.snapshot.state !== 'VERIFIED') throw httpError(409, 'A verified approved plan simulation is required');
      const run = await this.one('SELECT * FROM simulation_runs WHERE id = ?', [plan.snapshot.run_id]);
      if (!run) throw httpError(404, 'Linked simulation missing');
      const runResult = parse(run.result);
      const [observed, remaining] = engine(() => { const s = simulatedSamples(runResult, data.fixture); return [s, detect(runResult, s)] as const; });
      const result = {
        verification_id: data.verification_id, digest, plan_id: plan.id, run_id: run.id, source: TELEMETRY_SOURCE,
        state: remaining.length ? 'FAILED' : 'MODEL_MATCH', remaining_codes: remaining.map(i => i.code), sample_count: observed.length,
        created_at: this.now(), meaning: 'Synthetic post-plan model consistency only; no physical incident resolution claimed',
      };
      state.verifications.push(result);
      state.state = remaining.length ? 'SIMULATED_MISMATCH' : 'SIMULATED_MODEL_MATCH';
      await this.run('UPDATE incidents SET data = ? WHERE id = ?', [json(state), iid]);
      return result;
    });

    // Review events (formerly started by n8n): each opens a plan already submitted for approval
    this.on('POST', '/buildings/:id/events', async ([id], body) => {
      await this.building(id);
      const data = eventInput(body);
      const u = await user();
      let incident: Body | null = null;
      if (data.incident_id) {
        incident = await this.one('SELECT * FROM incidents WHERE id = ? AND building_id = ?', [data.incident_id, id]);
        if (!incident) throw httpError(404, 'Incident not found');
        if (data.kind !== 'anomaly_incident') throw httpError(422, 'Incident links require anomaly event kind');
      }
      const digest = stableStringify(data);
      const old = await this.one('SELECT * FROM automation_events WHERE actor_id = ? AND event_id = ?', [u.id, data.event_id]);
      if (old) {
        if (old.building_id !== id || parse(old.data).digest !== digest) throw httpError(409, 'Event id reused with different input');
        return this.eventView(old);
      }
      const incidentState = incident ? parse(incident.data) : null;
      if (incidentState?.automation_event_id) throw httpError(409, 'Incident already linked to an automation event');
      const plan = await this.buildPlan(id, data, u.id, {}, 'PENDING_APPROVAL', 2);
      await this.audit(u.id, plan.id, 'create', { revision: 1 });
      await this.audit(u.id, plan.id, 'automation_submit', { correlation_id: data.correlation_id, event_id: data.event_id, revision: 2 });
      const event = {
        id: newId(), building_id: id, actor_id: u.id, event_id: data.event_id, created_at: this.now(),
        data: json({ digest, correlation_id: data.correlation_id, kind: data.kind, plan_id: plan.id, notice: `${data.kind}: review plan ${plan.id.slice(0, 8)}. Simulation requires explicit approval.` }),
      };
      await this.run('INSERT INTO automation_events (id, building_id, actor_id, event_id, data, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [event.id, id, u.id, event.event_id, event.data, event.created_at]);
      if (incident && incidentState) {
        incidentState.automation_event_id = event.id; incidentState.state = 'REVIEW_REQUESTED';
        await this.run('UPDATE incidents SET data = ? WHERE id = ?', [json(incidentState), incident.id]);
      }
      return this.eventView(event);
    });
    this.on('GET', '/buildings/:id/events/:eid', async ([id, eid]) => {
      await this.building(id);
      const event = await this.one('SELECT * FROM automation_events WHERE id = ? AND building_id = ?', [eid, id]);
      if (!event) throw httpError(404, 'Event not found');
      return this.eventView(event);
    });
    this.on('GET', '/buildings/:id/events', async ([id]) => {
      await this.building(id);
      const rows = await this.many('SELECT * FROM automation_events WHERE building_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 20', [id]);
      const views = [];
      for (const row of rows) views.push(await this.eventView(row));
      return views;
    });

    // Engine tools (formerly the HTTP/MCP gateway); same names and result envelope
    this.on('GET', '/operations/tools', async () => ({
      transport: 'On-device engine tools',
      tools: TOOL_NAMES.map(name => ({ name, input_schema: toolSchema(name) })),
    }));
    this.on('POST', '/operations/tools/:name', async ([name], body) => this.dispatchTool(name, body));
  }

  private async dispatchTool(name: string, body: unknown) {
    if (!(TOOL_NAMES as readonly string[]).includes(name)) throw httpError(404, 'Unknown tool');
    const args: Record<string, any> = object(body);
    const allowed = BUILDING_TOOLS.includes(name) ? ['building_id'] : name === 'compare_energy_configurations' ? ['scenario_id', 'variations'] : ['scenario_id'];
    for (const key of Object.keys(args)) if (!allowed.includes(key)) throw httpError(422, `${key}: Extra inputs are not permitted`);
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const idKey = allowed[0];
    if (typeof args[idKey] !== 'string' || !uuid.test(args[idKey])) throw httpError(422, `${idKey}: Input should be a valid UUID`);
    let variations = [0, 1, 2];
    if (name === 'compare_energy_configurations' && args.variations !== undefined) {
      if (!Array.isArray(args.variations) || !args.variations.length || args.variations.length > 3 || args.variations.some((v: unknown) => ![0, 1, 2].includes(v as number))) {
        throw httpError(422, 'variations: Input should be a list of 1–3 values from 0, 1, 2');
      }
      variations = args.variations;
    }
    const u = await this.profile();
    let run: Body | null = null, buildingId: string;
    if (BUILDING_TOOLS.includes(name)) {
      buildingId = args.building_id;
    } else {
      run = await this.one('SELECT * FROM simulation_runs WHERE id = ?', [args.scenario_id]);
      if (!run) throw httpError(404, 'Saved scenario not found');
      buildingId = run.building_id;
    }
    await this.building(buildingId);
    let recordId: string | null = null;
    let data: Body;
    if (name === 'get_building_profile') {
      data = equipmentSummary(await this.building(buildingId));
    } else if (name === 'get_energy_anomalies') {
      data = { incidents: await this.incidentViews(buildingId), meaning: 'SIMULATED detector evidence; hypotheses are not physical diagnoses' };
    } else {
      const snapshot: Snapshot = parse(run!.snapshot);
      const options = snapshot.options;
      if (name === 'get_energy_scenario') {
        data = { snapshot, result: parse(run!.result) };
      } else if (name === 'run_outage_simulation') {
        const result = engine(() => { const [d, c] = loadProfiles(snapshot.appliances); return simulate(validatePlant({ ...snapshot.plant }), d, c, quarterHourPv(snapshot.pv), options); });
        recordId = (await this.insertRun('simulation_runs', buildingId, snapshot, result)).id;
        data = { result };
      } else if (name === 'forecast_energy') {
        data = engine(() => forecast(snapshot, options, parse(run!.result), run!.id));
      } else if (name === 'optimize_appliance_schedule') {
        if (options.use_generator) throw httpError(422, 'Scheduler budget excludes generator; select a scenario without generator dispatch');
        const budget = this.scheduleBudget(snapshot, options);
        data = await this.solve(snapshot, budget);
        data.supply_policy = 'PV plus available grid only; battery and generator excluded';
        if (data.validated) recordId = (await this.insertRun('schedules', buildingId, { ...snapshot, budget_w: budget }, data)).id;
      } else if (name === 'optimize_resilience') {
        data = engine(() => compareResilience(snapshot));
        recordId = (await this.insertRun('resilience_runs', buildingId, snapshot, data)).id;
      } else if (name === 'compare_energy_configurations') {
        data = { variants: engine(() => variants(snapshot)).filter(v => variations.includes(v.index)).map(({ snapshot: _s, ...rest }) => rest) };
      } else {
        const plan = {
          id: newId(), building_id: buildingId, created_at: this.now(),
          snapshot: {
            state: 'PENDING_APPROVAL', revision: 2, selected_variant: 0, expires_at: new Date(Date.now() + 60 * 60000).toISOString(),
            variants: engine(() => variants(snapshot)), run_id: null, receipts: {}, verification_errors: [], source_scenario_id: run!.id,
          },
        };
        await this.run('INSERT INTO energy_plans (id, building_id, snapshot, created_at) VALUES (?, ?, ?, ?)', [plan.id, buildingId, json(plan.snapshot), plan.created_at]);
        recordId = plan.id;
        await this.audit(u.id, plan.id, 'create', { source: 'On-device engine tool', scenario_id: run!.id });
        await this.audit(u.id, plan.id, 'submit', { to: 'PENDING_APPROVAL', revision: 2 });
        data = serializePlan(plan);
      }
    }
    return {
      tool: name, source: name === 'get_building_profile' ? 'CONFIGURATION' : 'SIMULATED', building_id: buildingId,
      scenario_id: run ? run.id : null, record_id: recordId,
      units: { power: 'kW', energy: 'kWh', soc: '%', time: 'minutes from midnight', appliance_power: 'W' },
      provenance: run ? 'Immutable saved scenario; deterministic engines, no observed telemetry or physical actuation' : 'Building records on this device',
      data,
    };
  }
}

export const TOOL_NAMES = ['get_building_profile', 'get_energy_scenario', 'run_outage_simulation', 'forecast_energy', 'optimize_appliance_schedule',
  'optimize_resilience', 'compare_energy_configurations', 'get_energy_anomalies', 'propose_energy_plan'] as const;
const BUILDING_TOOLS: string[] = ['get_building_profile', 'get_energy_anomalies'];

function toolSchema(name: string) {
  const id = (key: string) => ({ [key]: { type: 'string', format: 'uuid' } });
  if (BUILDING_TOOLS.includes(name)) return { type: 'object', properties: id('building_id'), required: ['building_id'], additionalProperties: false };
  const properties: Body = id('scenario_id');
  if (name === 'compare_energy_configurations') properties.variations = { type: 'array', items: { enum: [0, 1, 2] }, minItems: 1, maxItems: 3 };
  return { type: 'object', properties, required: ['scenario_id'], additionalProperties: false };
}

function applianceRow(r: Body): ApplianceItem & { building_id: string } {
  return {
    id: r.id, building_id: r.building_id, name: r.name, rated_power_w: r.rated_power_w, priority: r.priority,
    critical: !!r.critical, flexible: !!r.flexible, required_runtime_min: r.required_runtime_min,
    earliest_min: r.earliest_min, latest_min: r.latest_min, interruptible: !!r.interruptible,
    max_interruptions: r.max_interruptions, selected: !!r.selected,
  };
}

function incidentView(r: Body) {
  return { id: r.id, building_id: r.building_id, telemetry_id: r.telemetry_id, created_at: r.created_at, ...(typeof r.data === 'string' ? JSON.parse(r.data) : r.data) };
}

function serializePlan(plan: { id: string; created_at: string; snapshot: Body }) {
  const d = clone(plan.snapshot);
  delete d.receipts;
  const selected = d.variants[d.selected_variant].snapshot;
  d.scenario = {
    options: selected.options, pv_source: selected.pv.source, plant: selected.plant,
    selected_loads: selected.appliances.filter((a: Body) => a.selected).map((a: Body) => ({ name: a.name, rated_power_w: a.rated_power_w, critical: a.critical })),
  };
  for (const v of d.variants) delete v.snapshot;
  return { id: plan.id, created_at: plan.created_at, ...d };
}
