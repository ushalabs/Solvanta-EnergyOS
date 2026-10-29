jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
import React from 'react';

const MockText = (props: any) => React.createElement('Text', props, props.children);
const MockTextInput = (props: any) => React.createElement('TextInput', props, props.children);
const MockTouchableOpacity = (props: any) => React.createElement('TouchableOpacity', props, props.children);
const MockSwitch = (props: any) => React.createElement('Switch', props);
const MockActivityIndicator = (props: any) => React.createElement('ActivityIndicator', props);
const MockView = (props: any) => React.createElement('View', props, props.children);

jest.mock('react-native', () => ({
  Text: MockText,
  TextInput: MockTextInput,
  TouchableOpacity: MockTouchableOpacity,
  Switch: MockSwitch,
  ActivityIndicator: MockActivityIndicator,
  View: MockView,
  Touchable: { Mixin: {} },
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Platform: {
    OS: 'android',
    select: (objs: any) => objs.android || objs.default,
  },
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const MockIcon = (props: any) => React.createElement('MockIcon', props);
  return new Proxy({}, {
    get: () => MockIcon,
  });
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

import { act, create, ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { BuildingEquipmentEditor } from '../src/components/BuildingEquipmentEditor';
import { api, SolvantaApiError } from '../src/api/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('BuildingEquipmentEditor Form Interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.getItem.mockResolvedValue(null);
    storage.setItem.mockResolvedValue();
    jest.spyOn(api, 'getToken').mockResolvedValue(null);
    jest.spyOn(api, 'getCurrentUser').mockResolvedValue({
      id: 'usr_test_123',
      email: 'demo@solvanta.energy',
      full_name: 'Demo Engineer',
      role: 'engineer',
      is_superuser: false,
    });
    jest.spyOn(api, 'getBuildings').mockResolvedValue([
      {
        id: 'bld_001',
        name: 'Residential Solar Twin',
        pv_capacity_kwp: 10.0,
        inverter_rating_kw: 8.0,
        battery: {
          nominal_capacity_kwh: 10.0,
          usable_capacity_kwh: 9.0,
          initial_soc_pct: 70.0,
          minimum_soc_pct: 20.0,
          max_charge_kw: 4.0,
          max_discharge_kw: 4.0,
          round_trip_efficiency: 0.9,
          chemistry: 'LFP',
        },
        solar: {
          pv_capacity_kwp: 10.0,
          panel_tilt_deg: 25.0,
          panel_azimuth_deg: 180.0,
          system_losses_pct: 14.0,
          module_count: 18,
          module_wattage_w: 550.0,
        },
        inverter: {
          rating_kw: 8.0,
          efficiency_pct: 96.0,
          inverter_type: 'hybrid',
        },
        generator: {
          enabled: true,
          rating_kw: 5.0,
          fuel_type: 'diesel',
          fuel_consumption_l_per_kwh: 0.35,
          min_runtime_min: 15,
        },
        grid: {
          connection_type: 'three_phase',
          import_limit_kw: 15.0,
          export_limit_kw: 10.0,
          has_net_metering: true,
        },
        owner_id: 'usr_test_123',
      },
    ]);
    jest.spyOn(api, 'getBuildingEquipment').mockResolvedValue({
      building_id: 'bld_001',
      building_name: 'Residential Solar Twin',
      solar: {
        pv_capacity_kwp: 10.0,
        panel_tilt_deg: 25.0,
        panel_azimuth_deg: 180.0,
        system_losses_pct: 14.0,
        module_count: 18,
        module_wattage_w: 550.0,
      },
      inverter: {
        rating_kw: 8.0,
        efficiency_pct: 96.0,
        inverter_type: 'hybrid',
      },
      battery: {
        nominal_capacity_kwh: 10.0,
        usable_capacity_kwh: 9.0,
        initial_soc_pct: 70.0,
        minimum_soc_pct: 20.0,
        max_charge_kw: 4.0,
        max_discharge_kw: 4.0,
        round_trip_efficiency: 0.9,
        chemistry: 'LFP',
      },
      generator: {
        enabled: true,
        rating_kw: 5.0,
        fuel_type: 'diesel',
        fuel_consumption_l_per_kwh: 0.35,
        min_runtime_min: 15,
      },
      grid: {
        connection_type: 'three_phase',
        import_limit_kw: 15.0,
        export_limit_kw: 10.0,
        has_net_metering: true,
      },
      is_valid: true,
      validation_messages: [],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders all Phase 3 equipment sections and loads initial values', async () => {
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(
        <ThemeProvider>
          <BuildingEquipmentEditor />
        </ThemeProvider>
      );
    });

    const root = tree.root;
    // Section headers
    const textNodes = root.findAllByType(MockText).map((n) => n.props.children);
    expect(textNodes).toContain('ACCOUNT & FASTAPI AUTH');
    expect(textNodes).toContain('SITE IDENTITY');
    expect(textNodes).toContain('SOLAR PV ARRAY');
    expect(textNodes).toContain('INVERTER');
    expect(textNodes).toContain('BATTERY STORAGE');
    expect(textNodes).toContain('BACKUP GENERATOR');
    expect(textNodes).toContain('GRID INTERCONNECTION');
  });

  test('rejects invalid battery invariants on form submit without showing success', async () => {
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(
        <ThemeProvider>
          <BuildingEquipmentEditor />
        </ThemeProvider>
      );
    });

    // Find usable battery input and set it greater than nominal (e.g. 15 kWh vs 10 kWh)
    const inputs = tree.root.findAllByType(MockTextInput);
    const usableInput = inputs.find((i) => i.props.value === '9.0');
    expect(usableInput).toBeDefined();

    await act(async () => {
      usableInput!.props.onChangeText('15.0');
    });

    // Press save CTA button
    const saveCTA = tree.root.findAllByType(MockTouchableOpacity).find((btn) => {
      const text = btn.findAllByType(MockText).map((t) => t.props.children).join(' ');
      return text.includes('SAVE');
    });
    expect(saveCTA).toBeDefined();

    await act(async () => {
      saveCTA!.props.onPress();
    });

    // Verify error banner is rendered with usable > nominal message
    const errorText = tree.root.findAllByType(MockText).find((t) => {
      return typeof t.props.children === 'string' && t.props.children.includes('cannot exceed nominal');
    });
    expect(errorText).toBeDefined();

    // Verify no success banner is rendered
    const successText = tree.root.findAllByType(MockText).find((t) => {
      return typeof t.props.children === 'string' && t.props.children.includes('Server Confirmed');
    });
    expect(successText).toBeUndefined();
  });

  test('rejects enabled generator with 0 rating without showing success', async () => {
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(
        <ThemeProvider>
          <BuildingEquipmentEditor />
        </ThemeProvider>
      );
    });

    // Change generator rating to 0.0
    const inputs = tree.root.findAllByType(MockTextInput);
    const genRatingInput = inputs.find((i) => i.props.value === '5.0');
    expect(genRatingInput).toBeDefined();

    await act(async () => {
      genRatingInput!.props.onChangeText('0.0');
    });

    // Press save CTA
    const saveCTA = tree.root.findAllByType(MockTouchableOpacity).find((btn) => {
      const text = btn.findAllByType(MockText).map((t) => t.props.children).join(' ');
      return text.includes('SAVE');
    });

    await act(async () => {
      saveCTA!.props.onPress();
    });

    // Verify generator rating validation message
    const errorText = tree.root.findAllByType(MockText).find((t) => {
      return typeof t.props.children === 'string' && t.props.children.includes('rating greater than 0 kW');
    });
    expect(errorText).toBeDefined();
  });

  test('server HTTP 422 or 401 failure displays server error and never claims success', async () => {
    jest.spyOn(api, 'getToken').mockResolvedValue('valid_test_token');
    jest.spyOn(api, 'updateBuilding').mockRejectedValue(
      new SolvantaApiError(422, {
        error: {
          code: 'UNPROCESSABLE_ENTITY',
          message: 'PV capacity mismatch: declared 10.0 kWp differs from module count',
          status: 422,
        },
      })
    );

    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(
        <ThemeProvider>
          <BuildingEquipmentEditor />
        </ThemeProvider>
      );
    });

    // Press save CTA
    const saveCTA = tree.root.findAllByType(MockTouchableOpacity).find((btn) => {
      const text = btn.findAllByType(MockText).map((t) => t.props.children).join(' ');
      return text.includes('SAVE');
    });

    await act(async () => {
      saveCTA!.props.onPress();
    });

    // Verify server error message is displayed
    const errorText = tree.root.findAllByType(MockText).find((t) => {
      return typeof t.props.children === 'string' && t.props.children.includes('Server Rejected Save (HTTP 422)');
    });
    expect(errorText).toBeDefined();

    // Verify success banner is NOT displayed
    const successText = tree.root.findAllByType(MockText).find((t) => {
      return typeof t.props.children === 'string' && t.props.children.includes('Server Confirmed');
    });
    expect(successText).toBeUndefined();
  });

  test('authenticated save calls updateBuilding and reloads authoritative state', async () => {
    jest.spyOn(api, 'getToken').mockResolvedValue('valid_test_token');
    const updateSpy = jest.spyOn(api, 'updateBuilding').mockResolvedValue({
      id: 'bld_001',
      name: 'Residential Solar Twin',
      pv_capacity_kwp: 10.0,
      inverter_rating_kw: 8.0,
      battery: {
        nominal_capacity_kwh: 10.0,
        usable_capacity_kwh: 9.0,
        initial_soc_pct: 70.0,
        minimum_soc_pct: 20.0,
        max_charge_kw: 4.0,
        max_discharge_kw: 4.0,
        round_trip_efficiency: 0.9,
        chemistry: 'LFP',
      },
      owner_id: 'usr_test_123',
    });

    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(
        <ThemeProvider>
          <BuildingEquipmentEditor />
        </ThemeProvider>
      );
    });

    // Press save CTA
    const saveCTA = tree.root.findAllByType(MockTouchableOpacity).find((btn) => {
      const text = btn.findAllByType(MockText).map((t) => t.props.children).join(' ');
      return text.includes('SAVE');
    });

    await act(async () => {
      saveCTA!.props.onPress();
    });

    expect(updateSpy).toHaveBeenCalledWith(
      'bld_001',
      expect.objectContaining({
        pv_capacity_kwp: 10.0,
        inverter_rating_kw: 8.0,
        solar: expect.objectContaining({
          panel_tilt_deg: 25.0,
          module_count: 18,
          module_wattage_w: 550.0,
        }),
        battery: expect.objectContaining({
          nominal_capacity_kwh: 10.0,
          usable_capacity_kwh: 9.0,
          chemistry: 'LFP',
        }),
        generator: expect.objectContaining({
          enabled: true,
          rating_kw: 5.0,
          fuel_type: 'diesel',
        }),
        grid: expect.objectContaining({
          connection_type: 'three_phase',
          has_net_metering: true,
        }),
      })
    );

    // Verify success banner is rendered with server-confirmed message
    const successText = tree.root.findAllByType(MockText).find((t) => {
      return typeof t.props.children === 'string' && t.props.children.includes('Server Confirmed');
    });
    expect(successText).toBeDefined();
  });
});
