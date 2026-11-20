// SQLite access for the on-device engine. The app uses expo-sqlite; tests plug in Node's built-in SQLite.
export type SqlValue = string | number | null;

export interface SqlDb {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  get<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
}

/** Each version is applied once, in order; PRAGMA user_version records the last one applied. */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE local_profile (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE buildings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 255),
    address TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
    pv_capacity_kwp REAL NOT NULL CHECK (pv_capacity_kwp >= 0),
    pv_panel_tilt_deg REAL NOT NULL CHECK (pv_panel_tilt_deg BETWEEN 0 AND 90),
    pv_panel_azimuth_deg REAL NOT NULL CHECK (pv_panel_azimuth_deg BETWEEN 0 AND 360),
    pv_system_losses_pct REAL NOT NULL CHECK (pv_system_losses_pct BETWEEN 0 AND 50),
    pv_module_count INTEGER NOT NULL CHECK (pv_module_count >= 0),
    pv_module_wattage_w REAL NOT NULL CHECK (pv_module_wattage_w >= 0),
    inverter_rating_kw REAL NOT NULL CHECK (inverter_rating_kw >= 0),
    inverter_efficiency_pct REAL NOT NULL CHECK (inverter_efficiency_pct > 50 AND inverter_efficiency_pct <= 100),
    inverter_type TEXT NOT NULL,
    battery_nominal_kwh REAL NOT NULL CHECK (battery_nominal_kwh >= 0),
    battery_usable_kwh REAL NOT NULL CHECK (battery_usable_kwh >= 0 AND battery_usable_kwh <= battery_nominal_kwh),
    battery_initial_soc_pct REAL NOT NULL CHECK (battery_initial_soc_pct BETWEEN 0 AND 100),
    battery_min_soc_pct REAL NOT NULL CHECK (battery_min_soc_pct BETWEEN 0 AND 100 AND battery_min_soc_pct <= battery_initial_soc_pct),
    battery_max_charge_kw REAL NOT NULL CHECK (battery_max_charge_kw >= 0),
    battery_max_discharge_kw REAL NOT NULL CHECK (battery_max_discharge_kw >= 0),
    battery_round_trip_efficiency REAL NOT NULL CHECK (battery_round_trip_efficiency > 0 AND battery_round_trip_efficiency <= 1),
    battery_chemistry TEXT NOT NULL,
    has_generator INTEGER NOT NULL CHECK (has_generator IN (0, 1)),
    generator_rating_kw REAL NOT NULL CHECK (generator_rating_kw >= 0),
    generator_fuel_type TEXT,
    generator_fuel_consumption_l_per_kwh REAL NOT NULL CHECK (generator_fuel_consumption_l_per_kwh >= 0),
    generator_min_runtime_min INTEGER NOT NULL CHECK (generator_min_runtime_min >= 0),
    grid_connection_type TEXT NOT NULL,
    grid_import_limit_kw REAL NOT NULL CHECK (grid_import_limit_kw >= 0),
    grid_export_limit_kw REAL NOT NULL CHECK (grid_export_limit_kw >= 0),
    has_net_metering INTEGER NOT NULL CHECK (has_net_metering IN (0, 1)),
    owner_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE appliances (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rated_power_w REAL NOT NULL CHECK (rated_power_w > 0),
    priority TEXT NOT NULL CHECK (priority IN ('critical', 'medium', 'low')),
    critical INTEGER NOT NULL,
    flexible INTEGER NOT NULL,
    required_runtime_min INTEGER NOT NULL CHECK (required_runtime_min > 0 AND required_runtime_min <= 1440),
    earliest_min INTEGER NOT NULL,
    latest_min INTEGER NOT NULL,
    interruptible INTEGER NOT NULL,
    max_interruptions INTEGER NOT NULL CHECK (max_interruptions >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (earliest_min >= 0 AND latest_min <= 1440 AND earliest_min < latest_min)
  );
  CREATE INDEX ix_appliances_building ON appliances(building_id);
  CREATE TABLE scenario_selections (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    appliance_id TEXT NOT NULL REFERENCES appliances(id) ON DELETE CASCADE,
    selected INTEGER NOT NULL,
    UNIQUE (building_id, appliance_id)
  );
  CREATE TABLE roofs (
    building_id TEXT PRIMARY KEY REFERENCES buildings(id) ON DELETE CASCADE,
    geometry TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE pv_designs (
    building_id TEXT PRIMARY KEY REFERENCES buildings(id) ON DELETE CASCADE,
    parameters TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE simulation_runs (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    snapshot TEXT NOT NULL,
    result TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX ix_simulation_runs_building ON simulation_runs(building_id, created_at);
  CREATE TABLE schedules (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    snapshot TEXT NOT NULL,
    result TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX ix_schedules_building ON schedules(building_id, created_at);
  CREATE TABLE resilience_runs (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    snapshot TEXT NOT NULL,
    result TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX ix_resilience_runs_building ON resilience_runs(building_id, created_at);
  CREATE TABLE energy_plans (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    snapshot TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX ix_energy_plans_building ON energy_plans(building_id, created_at);
  CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX ix_audit_target ON audit_logs(target_type, target_id);
  CREATE TABLE telemetry_runs (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    run_id TEXT NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE incidents (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    telemetry_id TEXT NOT NULL REFERENCES telemetry_runs(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX ix_incidents_building ON incidents(building_id, created_at);
  CREATE TABLE automation_events (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (actor_id, event_id)
  );
  `,
];

export async function migrate(db: SqlDb): Promise<void> {
  await db.exec('PRAGMA foreign_keys = ON;');
  const row = await db.get<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.exec('BEGIN');
    try {
      await db.exec(MIGRATIONS[version]);
      await db.exec(`PRAGMA user_version = ${version + 1}`);
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }
}
