// The app's data client. There is no Solvanta server: building data and every engine run on the device
// (src/local/localApi.ts, SQLite), and weather comes straight from Open-Meteo (src/local/weather.ts).
export { SolvantaApiError, type ApiProblemDetails } from './errors';

export interface SolarConfig {
  pv_capacity_kwp: number;
  panel_tilt_deg?: number;
  panel_azimuth_deg?: number;
  system_losses_pct?: number;
  module_count?: number;
  module_wattage_w?: number;
}

export interface InverterConfig {
  rating_kw: number;
  efficiency_pct?: number;
  inverter_type?: string;
}

export interface BatteryConfig {
  nominal_capacity_kwh: number;
  usable_capacity_kwh: number;
  initial_soc_pct: number;
  minimum_soc_pct: number;
  max_charge_kw: number;
  max_discharge_kw: number;
  round_trip_efficiency: number;
  chemistry?: string;
}

export interface GeneratorConfig {
  enabled: boolean;
  rating_kw: number;
  fuel_type?: string | null;
  fuel_consumption_l_per_kwh?: number;
  min_runtime_min?: number;
}

export interface GridConfig {
  connection_type: string;
  import_limit_kw: number;
  export_limit_kw: number;
  has_net_metering: boolean;
}

export interface BuildingPayload {
  name: string;
  address?: string;
  timezone?: string;
  pv_capacity_kwp: number;
  inverter_rating_kw: number;
  battery: BatteryConfig;
  solar?: SolarConfig;
  inverter?: InverterConfig;
  generator?: GeneratorConfig;
  grid?: GridConfig;
}

export interface EquipmentSummary {
  building_id: string;
  building_name: string;
  solar: SolarConfig;
  inverter: InverterConfig;
  battery: BatteryConfig;
  generator: GeneratorConfig;
  grid: GridConfig;
  is_valid: boolean;
  validation_messages: string[];
}

export type LocalHandler = { handle(method: string, path: string, body?: unknown): Promise<unknown> };

const isWeather = (endpoint: string) => endpoint === '/weather' || endpoint.startsWith('/weather/') || endpoint.startsWith('/weather?');

export class SolvantaApiClient {
  constructor(private local?: () => LocalHandler, private weather?: () => LocalHandler) {}

  private handler(endpoint: string): LocalHandler {
    if (isWeather(endpoint)) return this.weather ? this.weather() : require('../local/device').deviceWeather();
    return this.local ? this.local() : require('../local/device').deviceApi();
  }

  /** Same call shape as the old HTTP client: `body` is a JSON string. `_timeoutMs` is kept for existing callers. */
  async request<T>(endpoint: string, options: { method?: string; body?: unknown } = {}, _timeoutMs?: number): Promise<T> {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body ?? undefined;
    return await this.handler(endpoint).handle(options.method || 'GET', endpoint, body) as T;
  }

  async get<T>(endpoint: string, timeoutMs?: number): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, timeoutMs);
  }

  async post<T>(endpoint: string, body?: unknown, timeoutMs?: number): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }, timeoutMs);
  }

  async patch<T>(endpoint: string, body?: unknown, timeoutMs?: number): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }, timeoutMs);
  }

  async delete<T>(endpoint: string, timeoutMs?: number): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, timeoutMs);
  }

  // Domain shortcuts
  async getHealth() {
    return this.get<{ status: string; version: string; environment: string; timestamp: string }>('/system/health');
  }

  async getReady() {
    return this.get<{ ready: boolean; database: string; engines: string; timestamp: string }>('/system/ready');
  }

  async getCurrentUser() {
    return this.get<{ id: string; email: string; full_name: string; role: string; is_superuser: boolean }>('/auth/me');
  }

  async getBuildings() {
    return this.get<Array<BuildingPayload & { id: string; owner_id: string; organization_id?: string }>>('/buildings');
  }

  async getBuilding(buildingId: string) {
    return this.get<BuildingPayload & { id: string; owner_id: string; organization_id?: string }>(`/buildings/${buildingId}`);
  }

  async createBuilding(payload: BuildingPayload) {
    return this.post<BuildingPayload & { id: string; owner_id: string; organization_id?: string }>('/buildings', payload);
  }

  async updateBuilding(buildingId: string, payload: Partial<BuildingPayload>) {
    return this.patch<BuildingPayload & { id: string; owner_id: string; organization_id?: string }>(`/buildings/${buildingId}`, payload);
  }

  async getBuildingEquipment(buildingId: string) {
    return this.get<EquipmentSummary>(`/buildings/${buildingId}/equipment`);
  }
}

export const api = new SolvantaApiClient();
