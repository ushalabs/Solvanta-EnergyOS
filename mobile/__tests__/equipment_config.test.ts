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

describe('Phase 3 Equipment Configuration API & Validation', () => {
  beforeEach(() => {
    mockStorage = {};
    (globalThis as any).fetch = jest.fn();
  });

  test('calls GET /buildings/:id/equipment and parses equipment summary', async () => {
    const client = new SolvantaApiClient('http://test-server/api/v1');
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

    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSummary,
    });

    const result = await client.getBuildingEquipment('bld-uuid-123');
    expect(result.building_id).toBe('bld-uuid-123');
    expect(result.solar.pv_capacity_kwp).toBe(12.0);
    expect(result.inverter.inverter_type).toBe('hybrid');
    expect(result.battery.chemistry).toBe('LFP');
    expect(result.generator.enabled).toBe(true);

    const callArgs = (globalThis as any).fetch.mock.calls[0];
    expect(callArgs[0]).toBe('http://test-server/api/v1/buildings/bld-uuid-123/equipment');
  });

  test('calls PATCH /buildings/:id to update equipment parameters', async () => {
    const client = new SolvantaApiClient('http://test-server/api/v1');
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

    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'bld-uuid-123', ...updatePayload }),
    });

    await client.updateBuilding('bld-uuid-123', updatePayload);
    const callArgs = (globalThis as any).fetch.mock.calls[0];
    expect(callArgs[0]).toBe('http://test-server/api/v1/buildings/bld-uuid-123');
    expect(callArgs[1].method).toBe('PATCH');
    const sentBody = JSON.parse(callArgs[1].body);
    expect(sentBody.solar.pv_capacity_kwp).toBe(15.0);
    expect(sentBody.battery.nominal_capacity_kwh).toBe(20.0);
  });
});
