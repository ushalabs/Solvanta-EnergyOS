import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Sun,
  Battery,
  Zap,
  CheckCircle,
  AlertTriangle,
  Save,
  Fuel,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';
import { api, BuildingPayload } from '../api/client';
import { LimeCTA } from './LimeCTA';

export const EQUIPMENT_STORAGE_KEY = '@solvanta_building_config';

interface BuildingEquipmentEditorProps {
  onSaved?: (building: BuildingPayload) => void;
}

export const BuildingEquipmentEditor: React.FC<BuildingEquipmentEditorProps> = ({
  onSaved,
}) => {
  const { tokens } = useTheme();

  // Active Building State
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [name, setName] = useState('Demo Residential Hybrid Solar');
  const [address, setAddress] = useState('Lahore, Pakistan');
  const [timezone, setTimezone] = useState('Asia/Karachi');

  // Solar PV
  const [pvCapacityKwp, setPvCapacityKwp] = useState('10.0');
  const [panelTiltDeg, setPanelTiltDeg] = useState('25.0');
  const [panelAzimuthDeg, setPanelAzimuthDeg] = useState('180.0');
  const [systemLossesPct, setSystemLossesPct] = useState('14.0');

  // Inverter
  const [inverterRatingKw, setInverterRatingKw] = useState('8.0');
  const [inverterEffPct, setInverterEffPct] = useState('96.0');
  const [inverterType, setInverterType] = useState('hybrid');

  // Battery
  const [batteryNominalKwh, setBatteryNominalKwh] = useState('10.0');
  const [batteryUsableKwh, setBatteryUsableKwh] = useState('9.0');
  const [batteryInitialSocPct, setBatteryInitialSocPct] = useState('70.0');
  const [batteryMinSocPct, setBatteryMinSocPct] = useState('20.0');
  const [batteryMaxChargeKw, setBatteryMaxChargeKw] = useState('4.0');
  const [batteryMaxDischargeKw, setBatteryMaxDischargeKw] = useState('4.0');
  const [batteryChemistry, setBatteryChemistry] = useState('LFP');

  // Generator
  const [hasGenerator, setHasGenerator] = useState(true);
  const [generatorRatingKw, setGeneratorRatingKw] = useState('5.0');
  const [generatorFuelType, setGeneratorFuelType] = useState('diesel');

  // Grid
  const [gridConnectionType, setGridConnectionType] = useState('three_phase');
  const [hasNetMetering, setHasNetMetering] = useState(true);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load configuration on mount
  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      setLoading(true);
      try {
        // 1. Try local storage cache first
        const cached = await AsyncStorage.getItem(EQUIPMENT_STORAGE_KEY);
        if (cached && isMounted) {
          const parsed = JSON.parse(cached);
          applyLoadedValues(parsed);
        }

        // 2. Try fetching from live backend
        const buildings = await api.getBuildings();
        if (buildings && buildings.length > 0 && isMounted) {
          const bld = buildings[0];
          setBuildingId(bld.id);
          applyLoadedValues(bld);
          await AsyncStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(bld));
        }
      } catch {
        // Offline or backend unauthenticated: continue with default fixtures
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  function applyLoadedValues(bld: any) {
    if (bld.id) setBuildingId(bld.id);
    if (bld.name) setName(bld.name);
    if (bld.address) setAddress(bld.address);
    if (bld.timezone) setTimezone(bld.timezone);

    if (bld.pv_capacity_kwp !== undefined) setPvCapacityKwp(String(bld.pv_capacity_kwp));
    if (bld.solar?.panel_tilt_deg !== undefined) setPanelTiltDeg(String(bld.solar.panel_tilt_deg));
    if (bld.solar?.panel_azimuth_deg !== undefined) setPanelAzimuthDeg(String(bld.solar.panel_azimuth_deg));
    if (bld.solar?.system_losses_pct !== undefined) setSystemLossesPct(String(bld.solar.system_losses_pct));

    if (bld.inverter_rating_kw !== undefined) setInverterRatingKw(String(bld.inverter_rating_kw));
    if (bld.inverter?.efficiency_pct !== undefined) setInverterEffPct(String(bld.inverter.efficiency_pct));
    if (bld.inverter?.inverter_type !== undefined) setInverterType(bld.inverter.inverter_type);

    if (bld.battery) {
      if (bld.battery.nominal_capacity_kwh !== undefined) setBatteryNominalKwh(String(bld.battery.nominal_capacity_kwh));
      if (bld.battery.usable_capacity_kwh !== undefined) setBatteryUsableKwh(String(bld.battery.usable_capacity_kwh));
      if (bld.battery.initial_soc_pct !== undefined) setBatteryInitialSocPct(String(bld.battery.initial_soc_pct));
      if (bld.battery.minimum_soc_pct !== undefined) setBatteryMinSocPct(String(bld.battery.minimum_soc_pct));
      if (bld.battery.max_charge_kw !== undefined) setBatteryMaxChargeKw(String(bld.battery.max_charge_kw));
      if (bld.battery.max_discharge_kw !== undefined) setBatteryMaxDischargeKw(String(bld.battery.max_discharge_kw));
      if (bld.battery.chemistry !== undefined) setBatteryChemistry(bld.battery.chemistry);
    }

    if (bld.generator) {
      setHasGenerator(Boolean(bld.generator.enabled));
      if (bld.generator.rating_kw !== undefined) setGeneratorRatingKw(String(bld.generator.rating_kw));
      if (bld.generator.fuel_type) setGeneratorFuelType(bld.generator.fuel_type);
    } else if (bld.has_generator !== undefined) {
      setHasGenerator(Boolean(bld.has_generator));
      if (bld.generator_rating_kw !== undefined) setGeneratorRatingKw(String(bld.generator_rating_kw));
      if (bld.generator_fuel_type) setGeneratorFuelType(bld.generator_fuel_type);
    }

    if (bld.grid) {
      if (bld.grid.connection_type) setGridConnectionType(bld.grid.connection_type);
      if (bld.grid.has_net_metering !== undefined) setHasNetMetering(bld.grid.has_net_metering);
    }
  }

  // Client-side invariant validation
  function validateForm(): string | null {
    const pv = parseFloat(pvCapacityKwp);
    if (isNaN(pv) || pv < 0) return 'Solar PV capacity must be a positive number';

    const inv = parseFloat(inverterRatingKw);
    if (isNaN(inv) || inv < 0) return 'Inverter rating must be a positive number';

    const nom = parseFloat(batteryNominalKwh);
    const usa = parseFloat(batteryUsableKwh);
    if (isNaN(nom) || isNaN(usa)) return 'Battery capacities must be valid numbers';
    if (usa > nom) return `Battery usable capacity (${usa} kWh) cannot exceed nominal (${nom} kWh)`;

    const initSoc = parseFloat(batteryInitialSocPct);
    const minSoc = parseFloat(batteryMinSocPct);
    if (isNaN(initSoc) || isNaN(minSoc)) return 'SoC percentages must be valid numbers';
    if (initSoc < minSoc) return `Initial SoC (${initSoc}%) cannot be lower than reserve limit (${minSoc}%)`;
    if (initSoc < 0 || initSoc > 100 || minSoc < 0 || minSoc > 100) return 'SoC values must be between 0% and 100%';

    const tilt = parseFloat(panelTiltDeg);
    if (isNaN(tilt) || tilt < 0 || tilt > 90) return 'Tilt angle must be between 0° and 90°';

    const az = parseFloat(panelAzimuthDeg);
    if (isNaN(az) || az < 0 || az > 360) return 'Azimuth angle must be between 0° and 360°';

    if (hasGenerator) {
      const genKw = parseFloat(generatorRatingKw);
      if (isNaN(genKw) || genKw < 0) return 'Generator rating must be non-negative';
    }

    return null;
  }

  async function handleSave() {
    setErrorMsg(null);
    setSuccessMsg(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setSaving(true);
    const payload: BuildingPayload = {
      name,
      address,
      timezone,
      pv_capacity_kwp: parseFloat(pvCapacityKwp),
      inverter_rating_kw: parseFloat(inverterRatingKw),
      battery: {
        nominal_capacity_kwh: parseFloat(batteryNominalKwh),
        usable_capacity_kwh: parseFloat(batteryUsableKwh),
        initial_soc_pct: parseFloat(batteryInitialSocPct),
        minimum_soc_pct: parseFloat(batteryMinSocPct),
        max_charge_kw: parseFloat(batteryMaxChargeKw),
        max_discharge_kw: parseFloat(batteryMaxDischargeKw),
        round_trip_efficiency: 0.90,
        chemistry: batteryChemistry,
      },
      solar: {
        pv_capacity_kwp: parseFloat(pvCapacityKwp),
        panel_tilt_deg: parseFloat(panelTiltDeg),
        panel_azimuth_deg: parseFloat(panelAzimuthDeg),
        system_losses_pct: parseFloat(systemLossesPct),
      },
      inverter: {
        rating_kw: parseFloat(inverterRatingKw),
        efficiency_pct: parseFloat(inverterEffPct),
        inverter_type: inverterType,
      },
      generator: {
        enabled: hasGenerator,
        rating_kw: hasGenerator ? parseFloat(generatorRatingKw) : 0.0,
        fuel_type: hasGenerator ? generatorFuelType : null,
      },
      grid: {
        connection_type: gridConnectionType,
        import_limit_kw: 15.0,
        export_limit_kw: 10.0,
        has_net_metering: hasNetMetering,
      },
    };

    try {
      let savedResult: any;
      if (buildingId) {
        savedResult = await api.updateBuilding(buildingId, payload);
      } else {
        savedResult = await api.createBuilding(payload);
        if (savedResult?.id) setBuildingId(savedResult.id);
      }

      await AsyncStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(payload));
      setSuccessMsg('Equipment profile saved & synchronized with digital twin');
      if (onSaved) onSaved(payload);
    } catch (err: any) {
      // If network fails, persist locally
      await AsyncStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(payload));
      setSuccessMsg('Equipment saved locally • Will synchronize when connected to backend');
      if (onSaved) onSaved(payload);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingBox, { backgroundColor: tokens.surface }]}>
        <ActivityIndicator color={tokens.lime} size="small" />
        <Text style={[styles.loadingText, { color: tokens.textMuted }]}>
          Loading equipment digital twin...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Feedback Messages */}
      {errorMsg && (
        <View style={[styles.feedbackBanner, { backgroundColor: 'rgba(255, 68, 68, 0.15)', borderColor: '#FF4444' }]}>
          <AlertTriangle size={16} color="#FF4444" style={{ marginRight: 8 }} />
          <Text style={[styles.feedbackText, { color: '#FF7777' }]}>{errorMsg}</Text>
        </View>
      )}

      {successMsg && (
        <View style={[styles.feedbackBanner, { backgroundColor: 'rgba(198, 244, 61, 0.15)', borderColor: tokens.lime }]}>
          <CheckCircle size={16} color={tokens.lime} style={{ marginRight: 8 }} />
          <Text style={[styles.feedbackText, { color: tokens.lime }]}>{successMsg}</Text>
        </View>
      )}

      {/* 1. Building Site Metadata */}
      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>SITE IDENTITY</Text>
          <Text style={[styles.unitBadge, { backgroundColor: tokens.surfaceElevated, color: tokens.lime }]}>
            Phase 3 Model
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Building Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Residential Solar Twin"
            placeholderTextColor={tokens.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Location / Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
            value={address}
            onChangeText={setAddress}
            placeholder="Lahore, Pakistan"
            placeholderTextColor={tokens.textMuted}
          />
        </View>
      </View>

      {/* 2. Solar PV Configuration */}
      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border, marginTop: SPACING.md }]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Sun size={18} color={tokens.lime} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>SOLAR PV ARRAY</Text>
          </View>
          <Text style={[styles.unitBadge, { backgroundColor: tokens.surfaceElevated, color: tokens.lime }]}>
            kWp / Degrees
          </Text>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>DC Capacity (kWp)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={pvCapacityKwp}
              onChangeText={setPvCapacityKwp}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Tilt Angle (°)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={panelTiltDeg}
              onChangeText={setPanelTiltDeg}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Azimuth Angle (°)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={panelAzimuthDeg}
              onChangeText={setPanelAzimuthDeg}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>System Losses (%)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={systemLossesPct}
              onChangeText={setSystemLossesPct}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      {/* 3. Inverter Equipment */}
      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border, marginTop: SPACING.md }]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Zap size={18} color={tokens.lime} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>INVERTER</Text>
          </View>
          <Text style={[styles.unitBadge, { backgroundColor: tokens.surfaceElevated, color: tokens.lime }]}>
            kW / %
          </Text>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>AC Rating (kW)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={inverterRatingKw}
              onChangeText={setInverterRatingKw}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Efficiency (%)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={inverterEffPct}
              onChangeText={setInverterEffPct}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      {/* 4. Battery Storage */}
      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border, marginTop: SPACING.md }]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Battery size={18} color={tokens.lime} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>BATTERY STORAGE</Text>
          </View>
          <Text style={[styles.unitBadge, { backgroundColor: tokens.surfaceElevated, color: tokens.lime }]}>
            kWh / %
          </Text>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Nominal (kWh)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={batteryNominalKwh}
              onChangeText={setBatteryNominalKwh}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Usable (kWh)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={batteryUsableKwh}
              onChangeText={setBatteryUsableKwh}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Initial SoC (%)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={batteryInitialSocPct}
              onChangeText={setBatteryInitialSocPct}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Reserve Limit (%)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={batteryMinSocPct}
              onChangeText={setBatteryMinSocPct}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Max Charge (kW)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={batteryMaxChargeKw}
              onChangeText={setBatteryMaxChargeKw}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Chemistry</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={batteryChemistry}
              onChangeText={setBatteryChemistry}
            />
          </View>
        </View>
      </View>

      {/* 5. Backup Generator */}
      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border, marginTop: SPACING.md }]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Fuel size={18} color={tokens.amber} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>BACKUP GENERATOR</Text>
          </View>
          <Switch
            value={hasGenerator}
            onValueChange={setHasGenerator}
            trackColor={{ false: tokens.surfaceElevated, true: tokens.lime }}
            thumbColor={hasGenerator ? tokens.onLime : tokens.textMuted}
          />
        </View>

        {hasGenerator && (
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Rated Output (kW)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
                value={generatorRatingKw}
                onChangeText={setGeneratorRatingKw}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Fuel Type</Text>
              <TextInput
                style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
                value={generatorFuelType}
                onChangeText={setGeneratorFuelType}
              />
            </View>
          </View>
        )}
      </View>

      {/* Save Button */}
      <View style={{ marginTop: SPACING.lg }}>
        <LimeCTA
          title={saving ? 'SAVING...' : 'SAVE EQUIPMENT PROFILE'}
          onPress={handleSave}
          loading={saving}
          icon={<Save size={18} color={tokens.onLime} style={{ marginRight: 8 }} />}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.xs,
  },
  loadingBox: {
    padding: SPACING.lg,
    borderRadius: RADIUS.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    fontSize: 13,
    marginLeft: 10,
  },
  card: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: SPACING.cardPadding,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  unitBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  inputGroup: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    height: 42,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
