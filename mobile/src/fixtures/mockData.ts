// ==============================================================================
// Seeded Demo Fixtures for Solvanta Mobile UI Shells
// All data are explicitly marked PROVENANCE: "SIMULATED" or "DEMO"
// ==============================================================================

export interface ApplianceItem {
  id: string;
  name: string;
  ratedPowerW: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  flexible: boolean;
  scenarioOn: boolean;
  requiredRuntimeMin?: number;
  iconName: string;
}

export interface BuildingFixture {
  id: string;
  name: string;
  location: string;
  pvCapacityKwp: number;
  inverterCapacityKw: number;
  batteryNominalKwh: number;
  batteryUsableKwh: number;
  batterySocPct: number;
  batteryMinSocPct: number;
  backupEstimatedHours: number;
  currentPvKw: number;
  currentLoadKw: number;
  gridAvailable: boolean;
  provenance: 'SIMULATED';
}

export const DEMO_BUILDING: BuildingFixture = {
  id: 'bld_lahore_01',
  name: 'Demo Residential Hybrid Solar',
  location: 'Lahore, Pakistan',
  pvCapacityKwp: 10.0,
  inverterCapacityKw: 8.0,
  batteryNominalKwh: 10.0,
  batteryUsableKwh: 9.0,
  batterySocPct: 70,
  batteryMinSocPct: 20,
  backupEstimatedHours: 3.2,
  currentPvKw: 0.0, // Nighttime outage demonstration
  currentLoadKw: 2.45,
  gridAvailable: false,
  provenance: 'SIMULATED',
};

export const DEMO_APPLIANCES: ApplianceItem[] = [
  {
    id: 'app_01',
    name: 'Refrigerator',
    ratedPowerW: 250,
    priority: 'critical',
    flexible: false,
    scenarioOn: true,
    iconName: 'Refrigerator',
  },
  {
    id: 'app_02',
    name: 'Workstation / PC',
    ratedPowerW: 400,
    priority: 'high',
    flexible: false,
    scenarioOn: true,
    iconName: 'Laptop',
  },
  {
    id: 'app_03',
    name: 'Air Conditioner',
    ratedPowerW: 1500,
    priority: 'low',
    flexible: true,
    scenarioOn: true,
    iconName: 'Wind',
  },
  {
    id: 'app_04',
    name: 'Essential Lights',
    ratedPowerW: 300,
    priority: 'medium',
    flexible: false,
    scenarioOn: true,
    iconName: 'Lightbulb',
  },
  {
    id: 'app_05',
    name: 'Water Pump',
    ratedPowerW: 1000,
    priority: 'medium',
    flexible: true,
    scenarioOn: false,
    requiredRuntimeMin: 30,
    iconName: 'Droplets',
  },
];

export const DEMO_WEEKLY_USAGE = [
  { day: 'Mon', kwh: 18.2, active: false },
  { day: 'Tue', kwh: 14.5, active: false },
  { day: 'Wed', kwh: 16.8, active: false },
  { day: 'Thu', kwh: 24.1, active: false },
  { day: 'Fri', kwh: 21.0, active: false },
  { day: 'Sat', kwh: 9.4, active: false },
  { day: 'Sun', kwh: 17.5, active: true }, // Current day highlighted
];

export interface SimulationInterval {
  minute: number;
  timeLabel: string;
  baselineSoc: number;
  optimizedSoc: number;
  solarKw: number;
  baselineLoadKw: number;
  optimizedLoadKw: number;
}

// Illustrative 30-minute samples across 6 hours, not an energy-engine result.
export const DEMO_SIMULATION_TRACE: SimulationInterval[] = [
  { minute: 0, timeLabel: '18:00', baselineSoc: 70, optimizedSoc: 70, solarKw: 0.0, baselineLoadKw: 2.45, optimizedLoadKw: 0.95 },
  { minute: 30, timeLabel: '18:30', baselineSoc: 63, optimizedSoc: 67, solarKw: 0.0, baselineLoadKw: 2.45, optimizedLoadKw: 0.95 },
  { minute: 60, timeLabel: '19:00', baselineSoc: 56, optimizedSoc: 64, solarKw: 0.0, baselineLoadKw: 2.45, optimizedLoadKw: 0.95 },
  { minute: 90, timeLabel: '19:30', baselineSoc: 49, optimizedSoc: 61, solarKw: 0.0, baselineLoadKw: 2.45, optimizedLoadKw: 0.95 },
  { minute: 120, timeLabel: '20:00', baselineSoc: 42, optimizedSoc: 57, solarKw: 0.0, baselineLoadKw: 2.45, optimizedLoadKw: 0.95 },
  { minute: 150, timeLabel: '20:30', baselineSoc: 34, optimizedSoc: 54, solarKw: 0.0, baselineLoadKw: 2.45, optimizedLoadKw: 0.95 },
  { minute: 180, timeLabel: '21:00', baselineSoc: 26, optimizedSoc: 50, solarKw: 0.0, baselineLoadKw: 2.45, optimizedLoadKw: 0.95 },
  { minute: 210, timeLabel: '21:30', baselineSoc: 20, optimizedSoc: 47, solarKw: 0.0, baselineLoadKw: 1.20, optimizedLoadKw: 0.95 }, // Reserve hit in baseline!
  { minute: 240, timeLabel: '22:00', baselineSoc: 20, optimizedSoc: 44, solarKw: 0.0, baselineLoadKw: 0.00, optimizedLoadKw: 0.95 }, // Fridge drops in baseline!
  { minute: 270, timeLabel: '22:30', baselineSoc: 20, optimizedSoc: 40, solarKw: 0.0, baselineLoadKw: 0.00, optimizedLoadKw: 0.95 },
  { minute: 300, timeLabel: '23:00', baselineSoc: 20, optimizedSoc: 37, solarKw: 0.0, baselineLoadKw: 0.00, optimizedLoadKw: 0.95 },
  { minute: 330, timeLabel: '23:30', baselineSoc: 20, optimizedSoc: 34, solarKw: 0.0, baselineLoadKw: 0.00, optimizedLoadKw: 0.95 },
  { minute: 360, timeLabel: '24:00', baselineSoc: 20, optimizedSoc: 31, solarKw: 0.0, baselineLoadKw: 0.00, optimizedLoadKw: 0.95 },
];

export const DEMO_RECOMMENDATION = {
  id: 'rec_plan_001',
  title: 'Postpone AC & Water Pump to Solar Peak',
  summary: 'By deferring the 1.5 kW AC during evening blackout, battery reserve remains protected and fridge maintains 100% continuous runtime.',
  criticalCoveragePct: 100,
  unservedCriticalKwh: 0.0,
  batteryEndSocPct: 31,
  status: 'PENDING_APPROVAL',
  provenance: 'SIMULATED',
};
