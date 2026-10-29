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
  Network,
  User as UserIcon,
  LogIn,
  LogOut,
  Building as BuildingIcon,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';
import { api, BuildingPayload, SolvantaApiError } from '../api/client';
import { LimeCTA } from './LimeCTA';

export const EQUIPMENT_STORAGE_PREFIX = '@solvanta_equipment_';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id?: string;
}

interface BuildingOption {
  id: string;
  name: string;
}

interface BuildingEquipmentEditorProps {
  onSaved?: (building: BuildingPayload) => void;
}

export const BuildingEquipmentEditor: React.FC<BuildingEquipmentEditorProps> = ({
  onSaved,
}) => {
  const { tokens } = useTheme();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loginEmail, setLoginEmail] = useState('demo@solvanta.energy');
  const [loginPassword, setLoginPassword] = useState('Solvanta2026!');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Buildings list & active selection
  const [availableBuildings, setAvailableBuildings] = useState<BuildingOption[]>([]);
  const [buildingId, setBuildingId] = useState<string | null>(null);

  // Site Metadata
  const [name, setName] = useState('Demo Residential Hybrid Solar');
  const [address, setAddress] = useState('Lahore, Pakistan');
  const [timezone, setTimezone] = useState('Asia/Karachi');

  // Solar PV
  const [pvCapacityKwp, setPvCapacityKwp] = useState('10.0');
  const [moduleCount, setModuleCount] = useState('18');
  const [moduleWattageW, setModuleWattageW] = useState('550.0');
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
  const [batteryRoundTripPct, setBatteryRoundTripPct] = useState('90.0');
  const [batteryChemistry, setBatteryChemistry] = useState('LFP');

  // Generator
  const [hasGenerator, setHasGenerator] = useState(true);
  const [generatorRatingKw, setGeneratorRatingKw] = useState('5.0');
  const [generatorFuelType, setGeneratorFuelType] = useState('diesel');
  const [generatorFuelConsumption, setGeneratorFuelConsumption] = useState('0.35');
  const [generatorMinRuntime, setGeneratorMinRuntime] = useState('15');

  // Grid
  const [gridConnectionType, setGridConnectionType] = useState('three_phase');
  const [gridImportLimitKw, setGridImportLimitKw] = useState('15.0');
  const [gridExportLimitKw, setGridExportLimitKw] = useState('10.0');
  const [hasNetMetering, setHasNetMetering] = useState(true);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local_draft' | 'error' | 'initial'>('initial');

  function getStorageKey(uId: string | null, bId: string | null): string {
    return `${EQUIPMENT_STORAGE_PREFIX}${uId || 'guest'}_${bId || 'draft'}`;
  }

  // Check auth and load initial configuration
  useEffect(() => {
    let isMounted = true;

    async function init() {
      setLoading(true);
      try {
        // 1. Check existing token
        const token = await api.getToken();
        if (token) {
          try {
            const me = await api.getCurrentUser();
            if (isMounted && me) {
              setCurrentUser(me);
              await loadUserBuildings(me.id);
            }
          } catch {
            // Token expired or invalid
            await api.clearToken();
            if (isMounted) setCurrentUser(null);
          }
        } else {
          // Unauthenticated: load default local draft
          const draft = await AsyncStorage.getItem(getStorageKey(null, null));
          if (draft && isMounted) {
            applyLoadedValues(JSON.parse(draft));
            setSyncStatus('local_draft');
          }
        }
      } catch {
        // Continue with defaults
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  async function loadUserBuildings(userId: string) {
    try {
      const buildings = await api.getBuildings();
      if (buildings && buildings.length > 0) {
        const options: BuildingOption[] = buildings.map((b) => ({ id: b.id, name: b.name }));
        setAvailableBuildings(options);
        
        // Select first authorized building
        const activeBld = buildings[0];
        setBuildingId(activeBld.id);
        
        // Load authoritative equipment profile
        try {
          const equip = await api.getBuildingEquipment(activeBld.id);
          applyLoadedValues(equip, activeBld);
          setSyncStatus('synced');
          await AsyncStorage.setItem(getStorageKey(userId, activeBld.id), JSON.stringify(equip));
        } catch {
          applyLoadedValues(activeBld);
          setSyncStatus('synced');
        }
      } else {
        setAvailableBuildings([]);
        setBuildingId(null);
      }
    } catch (err: any) {
      // Backend error loading buildings
      setSyncStatus('error');
      setErrorMsg(`Failed to load buildings: ${err.message || 'Network error'}`);
    }
  }

  async function selectBuilding(id: string) {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setBuildingId(id);
      const equip = await api.getBuildingEquipment(id);
      const bld = await api.getBuilding(id);
      applyLoadedValues(equip, bld);
      setSyncStatus('synced');
      if (currentUser) {
        await AsyncStorage.setItem(getStorageKey(currentUser.id, id), JSON.stringify(equip));
      }
    } catch (err: any) {
      setErrorMsg(`Failed to load building ${id}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setAuthError('Email and password required');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      await api.login(loginEmail.trim(), loginPassword.trim());
      const me = await api.getCurrentUser();
      setCurrentUser(me);
      await loadUserBuildings(me.id);
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Check server connection and credentials.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await api.clearToken();
    setCurrentUser(null);
    setAvailableBuildings([]);
    setBuildingId(null);
    setSyncStatus('local_draft');
    setSuccessMsg(null);
    setErrorMsg(null);
  }

  function handleDemoFill() {
    setLoginEmail('demo@solvanta.energy');
    setLoginPassword('Solvanta2026!');
  }

  function applyLoadedValues(data: any, rootMeta?: any) {
    if (rootMeta) {
      if (rootMeta.id) setBuildingId(rootMeta.id);
      if (rootMeta.name) setName(rootMeta.name);
      if (rootMeta.address) setAddress(rootMeta.address);
      if (rootMeta.timezone) setTimezone(rootMeta.timezone);
    } else {
      if (data.id || data.building_id) setBuildingId(data.id || data.building_id);
      if (data.name || data.building_name) setName(data.name || data.building_name);
      if (data.address) setAddress(data.address);
      if (data.timezone) setTimezone(data.timezone);
    }

    // Solar
    const sol = data.solar || data;
    if (sol.pv_capacity_kwp !== undefined) setPvCapacityKwp(String(sol.pv_capacity_kwp));
    if (sol.panel_tilt_deg !== undefined || sol.pv_panel_tilt_deg !== undefined) {
      setPanelTiltDeg(String(sol.panel_tilt_deg ?? sol.pv_panel_tilt_deg));
    }
    if (sol.panel_azimuth_deg !== undefined || sol.pv_panel_azimuth_deg !== undefined) {
      setPanelAzimuthDeg(String(sol.panel_azimuth_deg ?? sol.pv_panel_azimuth_deg));
    }
    if (sol.system_losses_pct !== undefined || sol.pv_system_losses_pct !== undefined) {
      setSystemLossesPct(String(sol.system_losses_pct ?? sol.pv_system_losses_pct));
    }
    if (sol.module_count !== undefined || sol.pv_module_count !== undefined) {
      setModuleCount(String(sol.module_count ?? sol.pv_module_count));
    }
    if (sol.module_wattage_w !== undefined || sol.pv_module_wattage_w !== undefined) {
      setModuleWattageW(String(sol.module_wattage_w ?? sol.pv_module_wattage_w));
    }

    // Inverter
    const inv = data.inverter || data;
    if (inv.rating_kw !== undefined || inv.inverter_rating_kw !== undefined) {
      setInverterRatingKw(String(inv.rating_kw ?? inv.inverter_rating_kw));
    }
    if (inv.efficiency_pct !== undefined || inv.inverter_efficiency_pct !== undefined) {
      setInverterEffPct(String(inv.efficiency_pct ?? inv.inverter_efficiency_pct));
    }
    if (inv.inverter_type !== undefined) setInverterType(inv.inverter_type);

    // Battery
    const bat = data.battery || data;
    if (bat.nominal_capacity_kwh !== undefined || bat.battery_nominal_kwh !== undefined) {
      setBatteryNominalKwh(String(bat.nominal_capacity_kwh ?? bat.battery_nominal_kwh));
    }
    if (bat.usable_capacity_kwh !== undefined || bat.battery_usable_kwh !== undefined) {
      setBatteryUsableKwh(String(bat.usable_capacity_kwh ?? bat.battery_usable_kwh));
    }
    if (bat.initial_soc_pct !== undefined || bat.battery_initial_soc_pct !== undefined) {
      setBatteryInitialSocPct(String(bat.initial_soc_pct ?? bat.battery_initial_soc_pct));
    }
    if (bat.minimum_soc_pct !== undefined || bat.battery_min_soc_pct !== undefined) {
      setBatteryMinSocPct(String(bat.minimum_soc_pct ?? bat.battery_min_soc_pct));
    }
    if (bat.max_charge_kw !== undefined || bat.battery_max_charge_kw !== undefined) {
      setBatteryMaxChargeKw(String(bat.max_charge_kw ?? bat.battery_max_charge_kw));
    }
    if (bat.max_discharge_kw !== undefined || bat.battery_max_discharge_kw !== undefined) {
      setBatteryMaxDischargeKw(String(bat.max_discharge_kw ?? bat.battery_max_discharge_kw));
    }
    if (bat.round_trip_efficiency !== undefined || bat.battery_round_trip_efficiency !== undefined) {
      const rte = bat.round_trip_efficiency ?? bat.battery_round_trip_efficiency;
      setBatteryRoundTripPct(String(rte > 1.0 ? rte : rte * 100));
    }
    if (bat.chemistry !== undefined || bat.battery_chemistry !== undefined) {
      setBatteryChemistry(bat.chemistry ?? bat.battery_chemistry);
    }

    // Generator
    const gen = data.generator || data;
    if (gen.enabled !== undefined || gen.has_generator !== undefined) {
      setHasGenerator(Boolean(gen.enabled ?? gen.has_generator));
    }
    if (gen.rating_kw !== undefined || gen.generator_rating_kw !== undefined) {
      setGeneratorRatingKw(String(gen.rating_kw ?? gen.generator_rating_kw));
    }
    if (gen.fuel_type !== undefined || gen.generator_fuel_type !== undefined) {
      setGeneratorFuelType(gen.fuel_type ?? gen.generator_fuel_type ?? 'diesel');
    }
    if (gen.fuel_consumption_l_per_kwh !== undefined || gen.generator_fuel_consumption_l_per_kwh !== undefined) {
      setGeneratorFuelConsumption(String(gen.fuel_consumption_l_per_kwh ?? gen.generator_fuel_consumption_l_per_kwh));
    }
    if (gen.min_runtime_min !== undefined || gen.generator_min_runtime_min !== undefined) {
      setGeneratorMinRuntime(String(gen.min_runtime_min ?? gen.generator_min_runtime_min));
    }

    // Grid
    const grd = data.grid || data;
    if (grd.connection_type !== undefined || grd.grid_connection_type !== undefined) {
      setGridConnectionType(grd.connection_type ?? grd.grid_connection_type);
    }
    if (grd.import_limit_kw !== undefined || grd.grid_import_limit_kw !== undefined) {
      setGridImportLimitKw(String(grd.import_limit_kw ?? grd.grid_import_limit_kw));
    }
    if (grd.export_limit_kw !== undefined || grd.grid_export_limit_kw !== undefined) {
      setGridExportLimitKw(String(grd.export_limit_kw ?? grd.grid_export_limit_kw));
    }
    if (grd.has_net_metering !== undefined) {
      setHasNetMetering(Boolean(grd.has_net_metering));
    }
  }

  // Comprehensive client-side physical validation
  function validateForm(): string | null {
    if (!name.trim()) return 'Building name is required';

    const pv = parseFloat(pvCapacityKwp);
    if (isNaN(pv) || pv < 0) return 'Solar PV capacity must be non-negative';

    const cnt = parseInt(moduleCount, 10);
    const watt = parseFloat(moduleWattageW);
    if (!isNaN(cnt) && !isNaN(watt) && cnt > 0 && watt > 0) {
      const calcKwp = (cnt * watt) / 1000.0;
      const tolerance = Math.max(0.5, 0.05 * pv);
      if (Math.abs(pv - calcKwp) > tolerance) {
        return `PV capacity mismatch: declared ${pv} kWp differs from ${cnt} modules × ${watt}W = ${calcKwp.toFixed(2)} kWp (allowable tolerance ±5% or ±0.5 kWp)`;
      }
    }

    const tilt = parseFloat(panelTiltDeg);
    if (isNaN(tilt) || tilt < 0 || tilt > 90) return 'Panel tilt must be between 0° and 90°';

    const az = parseFloat(panelAzimuthDeg);
    if (isNaN(az) || az < 0 || az > 360) return 'Panel azimuth must be between 0° and 360°';

    const loss = parseFloat(systemLossesPct);
    if (isNaN(loss) || loss < 0 || loss > 50) return 'System losses must be between 0% and 50%';

    const inv = parseFloat(inverterRatingKw);
    if (isNaN(inv) || inv < 0) return 'Inverter rating must be non-negative';

    const invEff = parseFloat(inverterEffPct);
    if (isNaN(invEff) || invEff <= 50 || invEff > 100) return 'Inverter efficiency must be between 50% and 100%';

    const nom = parseFloat(batteryNominalKwh);
    const usa = parseFloat(batteryUsableKwh);
    if (isNaN(nom) || nom < 0 || isNaN(usa) || usa < 0) return 'Battery capacity values must be valid non-negative numbers';
    if (usa > nom) return `Battery usable capacity (${usa} kWh) cannot exceed nominal (${nom} kWh)`;

    const initSoc = parseFloat(batteryInitialSocPct);
    const minSoc = parseFloat(batteryMinSocPct);
    if (isNaN(initSoc) || isNaN(minSoc)) return 'Battery SoC percentages must be valid numbers';
    if (initSoc < 0 || initSoc > 100 || minSoc < 0 || minSoc > 100) return 'SoC values must be between 0% and 100%';
    if (initSoc < minSoc) return `Initial SoC (${initSoc}%) cannot be lower than reserve limit (${minSoc}%)`;

    const rte = parseFloat(batteryRoundTripPct);
    if (isNaN(rte) || rte <= 0 || rte > 100) return 'Battery round-trip efficiency must be between 1% and 100%';

    if (hasGenerator) {
      const genKw = parseFloat(generatorRatingKw);
      if (isNaN(genKw) || genKw <= 0) return 'Enabled backup generator must have a rating greater than 0 kW';
      const fuelCons = parseFloat(generatorFuelConsumption);
      if (isNaN(fuelCons) || fuelCons < 0) return 'Fuel consumption must be non-negative';
      const minRun = parseInt(generatorMinRuntime, 10);
      if (isNaN(minRun) || minRun < 0) return 'Minimum runtime must be non-negative';
    }

    const imp = parseFloat(gridImportLimitKw);
    const exp = parseFloat(gridExportLimitKw);
    if (isNaN(imp) || imp < 0 || isNaN(exp) || exp < 0) return 'Grid import and export limits must be non-negative';

    return null;
  }

  async function handleSave() {
    setErrorMsg(null);
    setSuccessMsg(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      setSyncStatus('error');
      return;
    }

    setSaving(true);
    const payload: BuildingPayload = {
      name: name.trim(),
      address: address.trim(),
      timezone: timezone.trim(),
      pv_capacity_kwp: parseFloat(pvCapacityKwp),
      inverter_rating_kw: parseFloat(inverterRatingKw),
      solar: {
        pv_capacity_kwp: parseFloat(pvCapacityKwp),
        panel_tilt_deg: parseFloat(panelTiltDeg),
        panel_azimuth_deg: parseFloat(panelAzimuthDeg),
        system_losses_pct: parseFloat(systemLossesPct),
        module_count: parseInt(moduleCount, 10) || 18,
        module_wattage_w: parseFloat(moduleWattageW) || 550.0,
      },
      inverter: {
        rating_kw: parseFloat(inverterRatingKw),
        efficiency_pct: parseFloat(inverterEffPct),
        inverter_type: inverterType,
      },
      battery: {
        nominal_capacity_kwh: parseFloat(batteryNominalKwh),
        usable_capacity_kwh: parseFloat(batteryUsableKwh),
        initial_soc_pct: parseFloat(batteryInitialSocPct),
        minimum_soc_pct: parseFloat(batteryMinSocPct),
        max_charge_kw: parseFloat(batteryMaxChargeKw),
        max_discharge_kw: parseFloat(batteryMaxDischargeKw),
        round_trip_efficiency: parseFloat(batteryRoundTripPct) / 100.0,
        chemistry: batteryChemistry,
      },
      generator: {
        enabled: hasGenerator,
        rating_kw: hasGenerator ? parseFloat(generatorRatingKw) : 0.0,
        fuel_type: hasGenerator ? generatorFuelType : null,
        fuel_consumption_l_per_kwh: hasGenerator ? parseFloat(generatorFuelConsumption) : 0.35,
        min_runtime_min: hasGenerator ? parseInt(generatorMinRuntime, 10) : 15,
      },
      grid: {
        connection_type: gridConnectionType,
        import_limit_kw: parseFloat(gridImportLimitKw),
        export_limit_kw: parseFloat(gridExportLimitKw),
        has_net_metering: hasNetMetering,
      },
    };

    // If user is unauthenticated: save to local storage only as draft
    if (!currentUser) {
      const guestKey = getStorageKey(null, null);
      await AsyncStorage.setItem(guestKey, JSON.stringify(payload));
      setSyncStatus('local_draft');
      setSuccessMsg('Saved to local device storage as draft. Sign in with FastAPI credentials to persist to PostgreSQL.');
      setSaving(false);
      if (onSaved) onSaved(payload);
      return;
    }

    try {
      let authoritativeResult: any;
      if (buildingId) {
        authoritativeResult = await api.updateBuilding(buildingId, payload);
      } else {
        authoritativeResult = await api.createBuilding(payload);
        if (authoritativeResult?.id) setBuildingId(authoritativeResult.id);
      }

      // Re-read authoritative profile from PostgreSQL
      const confirmedEquip = await api.getBuildingEquipment(authoritativeResult.id || buildingId!);
      applyLoadedValues(confirmedEquip, authoritativeResult);

      // Cache server-confirmed data
      const scopedKey = getStorageKey(currentUser.id, authoritativeResult.id || buildingId);
      await AsyncStorage.setItem(scopedKey, JSON.stringify(confirmedEquip));

      setSyncStatus('synced');
      setSuccessMsg(`Server Confirmed: Equipment twin persisted to PostgreSQL (Building: ${authoritativeResult.name})`);
      if (onSaved) onSaved(payload);
    } catch (err: any) {
      setSyncStatus('error');
      if (err instanceof SolvantaApiError) {
        const detailMsg = err.data?.error?.message || err.data?.detail || err.message;
        setErrorMsg(`Server Rejected Save (HTTP ${err.status}): ${detailMsg}`);
      } else {
        setErrorMsg(`Save Failed: ${err.message || 'Unknown network error'}`);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingBox, { backgroundColor: tokens.surface }]}>
        <ActivityIndicator color={tokens.lime} size="small" />
        <Text style={[styles.loadingText, { color: tokens.textMuted }]}>
          Loading equipment digital twin from PostgreSQL...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Feedback & Status Banners */}
      {syncStatus === 'synced' && (
        <View style={[styles.feedbackBanner, { backgroundColor: 'rgba(198, 244, 61, 0.12)', borderColor: tokens.lime }]}>
          <CheckCircle size={16} color={tokens.lime} style={{ marginRight: 8 }} />
          <Text style={[styles.feedbackText, { color: tokens.lime }]}>
            {successMsg || 'Server Confirmed • Authoritative configuration synchronized with PostgreSQL'}
          </Text>
        </View>
      )}

      {syncStatus === 'local_draft' && (
        <View style={[styles.feedbackBanner, { backgroundColor: 'rgba(255, 179, 0, 0.12)', borderColor: tokens.amber }]}>
          <AlertTriangle size={16} color={tokens.amber} style={{ marginRight: 8 }} />
          <Text style={[styles.feedbackText, { color: tokens.amber }]}>
            {successMsg || 'Local Device Draft • Unsynchronized. Sign in below to persist changes to PostgreSQL.'}
          </Text>
        </View>
      )}

      {errorMsg && (
        <View style={[styles.feedbackBanner, { backgroundColor: 'rgba(255, 68, 68, 0.15)', borderColor: '#FF4444' }]}>
          <AlertTriangle size={16} color="#FF4444" style={{ marginRight: 8 }} />
          <Text style={[styles.feedbackText, { color: '#FF7777' }]}>{errorMsg}</Text>
        </View>
      )}

      {/* 0. Authentication & Scoped Identity Card */}
      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <UserIcon size={16} color={currentUser ? tokens.lime : tokens.textMuted} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>ACCOUNT & FASTAPI AUTH</Text>
          </View>
          <Text
            style={[
              styles.unitBadge,
              {
                backgroundColor: tokens.surfaceElevated,
                color: currentUser ? tokens.lime : tokens.amber,
              },
            ]}
          >
            {currentUser ? 'AUTHENTICATED' : 'GUEST / OFFLINE'}
          </Text>
        </View>

        {currentUser ? (
          <View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>User</Text>
              <Text style={[styles.infoVal, { color: tokens.textPrimary }]}>{currentUser.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Role</Text>
              <Text style={[styles.infoVal, { color: tokens.lime }]}>{currentUser.role.toUpperCase()}</Text>
            </View>

            {/* Building Selection */}
            {availableBuildings.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Target Building Twin</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {availableBuildings.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      activeOpacity={0.8}
                      onPress={() => selectBuilding(b.id)}
                      style={[
                        styles.chipBtn,
                        {
                          backgroundColor: buildingId === b.id ? tokens.lime : tokens.surfaceElevated,
                          borderColor: buildingId === b.id ? tokens.lime : tokens.border,
                        },
                      ]}
                    >
                      <BuildingIcon size={12} color={buildingId === b.id ? tokens.onLime : tokens.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.chipText, { color: buildingId === b.id ? tokens.onLime : tokens.textPrimary }]}>
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogout}
              style={[styles.smallBtn, { borderColor: tokens.border, backgroundColor: tokens.surfaceElevated, marginTop: 12 }]}
            >
              <LogOut size={14} color={tokens.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.smallBtnText, { color: tokens.textMuted }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {authError && (
              <Text style={{ color: '#FF7777', fontSize: 11, marginBottom: 8 }}>{authError}</Text>
            )}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
                value={loginEmail}
                onChangeText={setLoginEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="demo@solvanta.energy"
                placeholderTextColor={tokens.textMuted}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={tokens.textMuted}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleLogin}
                disabled={authLoading}
                style={[styles.smallBtn, { flex: 1, backgroundColor: tokens.lime, borderColor: tokens.lime }]}
              >
                {authLoading ? (
                  <ActivityIndicator size="small" color={tokens.onLime} />
                ) : (
                  <>
                    <LogIn size={14} color={tokens.onLime} style={{ marginRight: 6 }} />
                    <Text style={[styles.smallBtnText, { color: tokens.onLime, fontWeight: '700' }]}>Sign In</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleDemoFill}
                style={[styles.smallBtn, { backgroundColor: tokens.surfaceElevated, borderColor: tokens.border }]}
              >
                <Text style={[styles.smallBtnText, { color: tokens.textSecondary }]}>Demo Credentials</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 1. Building Site Metadata */}
      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border, marginTop: SPACING.md }]}>
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

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Location / Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={address}
              onChangeText={setAddress}
              placeholder="Lahore, Pakistan"
              placeholderTextColor={tokens.textMuted}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Timezone</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={timezone}
              onChangeText={setTimezone}
            />
          </View>
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
            kWp / Units / Degrees
          </Text>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Declared Capacity (kWp)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={pvCapacityKwp}
              onChangeText={setPvCapacityKwp}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Module Count (Units)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={moduleCount}
              onChangeText={setModuleCount}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Module Wattage (W)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={moduleWattageW}
              onChangeText={setModuleWattageW}
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

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Inverter Topology</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            {['hybrid', 'string', 'microinverter', 'central'].map((type) => (
              <TouchableOpacity
                key={type}
                activeOpacity={0.8}
                onPress={() => setInverterType(type)}
                style={[
                  styles.chipBtn,
                  {
                    backgroundColor: inverterType === type ? tokens.lime : tokens.surfaceElevated,
                    borderColor: inverterType === type ? tokens.lime : tokens.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: inverterType === type ? tokens.onLime : tokens.textPrimary }]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
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
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Max Discharge (kW)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={batteryMaxDischargeKw}
              onChangeText={setBatteryMaxDischargeKw}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Round-Trip Eff (%)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={batteryRoundTripPct}
              onChangeText={setBatteryRoundTripPct}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Chemistry</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              {['LFP', 'NMC', 'lead_acid'].map((chem) => (
                <TouchableOpacity
                  key={chem}
                  activeOpacity={0.8}
                  onPress={() => setBatteryChemistry(chem)}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: batteryChemistry === chem ? tokens.lime : tokens.surfaceElevated,
                      borderColor: batteryChemistry === chem ? tokens.lime : tokens.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: batteryChemistry === chem ? tokens.onLime : tokens.textPrimary }]}>
                    {chem}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
          <View>
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
                <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Fuel Consumption (L/kWh)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
                  value={generatorFuelConsumption}
                  onChangeText={setGeneratorFuelConsumption}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Min Runtime (Minutes)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
                  value={generatorMinRuntime}
                  onChangeText={setGeneratorMinRuntime}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Fuel Type</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  {['diesel', 'natural_gas', 'propane'].map((f) => (
                    <TouchableOpacity
                      key={f}
                      activeOpacity={0.8}
                      onPress={() => setGeneratorFuelType(f)}
                      style={[
                        styles.chipBtn,
                        {
                          backgroundColor: generatorFuelType === f ? tokens.lime : tokens.surfaceElevated,
                          borderColor: generatorFuelType === f ? tokens.lime : tokens.border,
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: generatorFuelType === f ? tokens.onLime : tokens.textPrimary }]}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* 6. Grid Interconnection */}
      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border, marginTop: SPACING.md }]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Network size={18} color={tokens.lime} style={{ marginRight: 8 }} />
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>GRID INTERCONNECTION</Text>
          </View>
          <Text style={[styles.unitBadge, { backgroundColor: tokens.surfaceElevated, color: tokens.lime }]}>
            kW / Limits
          </Text>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Sanctioned Import (kW)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={gridImportLimitKw}
              onChangeText={setGridImportLimitKw}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Export Limit (kW)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: tokens.surfaceElevated, color: tokens.textPrimary, borderColor: tokens.border }]}
              value={gridExportLimitKw}
              onChangeText={setGridExportLimitKw}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.inputLabel, { color: tokens.textSecondary }]}>Phase Type</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              {['three_phase', 'single_phase'].map((pt) => (
                <TouchableOpacity
                  key={pt}
                  activeOpacity={0.8}
                  onPress={() => setGridConnectionType(pt)}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: gridConnectionType === pt ? tokens.lime : tokens.surfaceElevated,
                      borderColor: gridConnectionType === pt ? tokens.lime : tokens.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: gridConnectionType === pt ? tokens.onLime : tokens.textPrimary }]}>
                    {pt === 'three_phase' ? '3-Phase' : '1-Phase'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8, justifyContent: 'center' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Text style={[styles.inputLabel, { color: tokens.textSecondary, marginBottom: 0 }]}>Net Metering</Text>
              <Switch
                value={hasNetMetering}
                onValueChange={setHasNetMetering}
                trackColor={{ false: tokens.surfaceElevated, true: tokens.lime }}
                thumbColor={hasNetMetering ? tokens.onLime : tokens.textMuted}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Save Button */}
      <View style={{ marginTop: SPACING.lg }}>
        <LimeCTA
          title={saving ? 'PERSISTING TO POSTGRESQL...' : (currentUser ? 'SAVE TO POSTGRESQL' : 'SAVE LOCAL DRAFT')}
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});