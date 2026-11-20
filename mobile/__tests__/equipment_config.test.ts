jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
let mockStorage: Record<string, string> = {};

jest.mock('react-native', () => ({
  Platform: { OS: 'android', select: (objs: any) => objs.android },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage[key] || null),
    setItem: jest.fn(async (key: string, val: string) => { mockStorage[key] = val; }),
    removeItem: jest.fn(async (key: string) => { delete mockStorage[key]; }),
    clear: jest.fn(async () => { mockStorage = {}; }),
  },
}));

import {
  SolvantaApiClient,
  BuildingPayload,
  EquipmentSummary,
} from '../src/api/client';
import { LocalApi } from '../src/local/localApi';
import { memoryDb } from './helpers/nodeSqlite';

// Equipment is stored by the on-device engine; these run the real client against it on SQLite.
const deviceClient = () => { const local = new LocalApi(memoryDb()); return new SolvantaApiClient(undefined, () => local); };

describe('Phase 3 Equipment Configuration API & Validation', () => {
  beforeEach(() => {
    mockStorage = {};
    (globalThis as any).fetch = jest.fn();
  });

  test('calls GET /buildings/:id/equipment and parses equipment summary', async () => {
    const client = deviceClient();
    const mockSummary: EquipmentSummary = {
      building_id: 'bld-uuid-123',
      building_name: 'Test Solar Twin',
      solar: {
        pv_capacity_kwp: 12.0,
        panel_tilt_deg: 25.0,
        panel_azimuth_deg: 180.0,
        system_losses_pct: 14.0,
        module_count: 20,
        module_wattage_w: 600.0,
      },
      inverter: {
        rating_kw: 10.0,
        efficiency_pct: 97.0,
        inverter_type: 'hybrid',
      },
      battery: {
        nominal_capacity_kwh: 15.0,
        usable_capacity_kwh: 13.5,
        initial_soc_pct: 75.0,
        minimum_soc_pct: 15.0,
        max_charge_kw: 5.0,
        max_discharge_kw: 5.0,
        round_trip_efficiency: 0.92,
        chemistry: 'LFP',
      },
      generator: {
        enabled: true,
        rating_kw: 6.0,
        fuel_type: 'diesel',
        fuel_consumption_l_per_kwh: 0.35,
        min_runtime_min: 15,
      },
      grid: {
        connection_type: 'three_phase',
        import_limit_kw: 20.0,
        export_limit_kw: 15.0,
        has_net_metering: true,
      },
      is_valid: true,
      validation_messages: [],
    };

    const created = await client.createBuilding({
      name: mockSummary.building_name, pv_capacity_kwp: 12, inverter_rating_kw: 10,
      solar: mockSummary.solar, inverter: mockSummary.inverter, battery: mockSummary.battery,
      generator: mockSummary.generator, grid: mockSummary.grid,
    });

    const result = await client.getBuildingEquipment(created.id);
    expect(result).toEqual({ ...mockSummary, building_id: created.id });
    expect((globalThis as any).fetch).not.toHaveBeenCalled();
  });

  test('calls PATCH /buildings/:id to update equipment parameters', async () => {
    const client = deviceClient();
    const created = await client.createBuilding({
      name: 'Twin', pv_capacity_kwp: 11, inverter_rating_kw: 8,
      battery: { nominal_capacity_kwh: 10, usable_capacity_kwh: 9, initial_soc_pct: 70, minimum_soc_pct: 20, max_charge_kw: 4, max_discharge_kw: 4, round_trip_efficiency: 0.9 },
    });
    const updatePayload: Partial<BuildingPayload> = {
      solar: {
        pv_capacity_kwp: 15.0,
        panel_tilt_deg: 30.0,
      },
      battery: {
        nominal_capacity_kwh: 20.0,
        usable_capacity_kwh: 18.0,
        initial_soc_pct: 85.0,
        minimum_soc_pct: 20.0,
        max_charge_kw: 6.0,
        max_discharge_kw: 6.0,
        round_trip_efficiency: 0.90,
      },
    };

    const updated = await client.updateBuilding(created.id, { ...updatePayload, solar: { ...updatePayload.solar!, module_count: 27, module_wattage_w: 550 } });
    expect(updated.pv_capacity_kwp).toBe(15.0);
    expect(updated.battery.nominal_capacity_kwh).toBe(20.0);
    const equipment = await client.getBuildingEquipment(created.id);
    expect(equipment.solar.panel_tilt_deg).toBe(30.0);
    expect(equipment.battery.initial_soc_pct).toBe(85.0);
    await expect(client.updateBuilding(created.id, { battery: { ...updatePayload.battery!, usable_capacity_kwh: 25 } })).rejects.toMatchObject({ status: 422 });
  });
});
