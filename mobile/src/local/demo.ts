// A ready-made demo building, stored on this device through the normal routes: the Lahore hybrid home the old
// backend seeded, plus typical appliances, a measured roof and one saved outage simulation, so every screen has data.
import type { SolvantaApiClient } from '../api/client';

export const DEMO_BUILDING_NAME = 'Demo Residential Hybrid Solar';

const BUILDING = {
  name: DEMO_BUILDING_NAME, address: 'Lahore, Pakistan', timezone: 'Asia/Karachi', pv_capacity_kwp: 9.9, inverter_rating_kw: 8,
  solar: { pv_capacity_kwp: 9.9, panel_tilt_deg: 25, panel_azimuth_deg: 180, system_losses_pct: 14, module_count: 18, module_wattage_w: 550 },
  inverter: { rating_kw: 8, efficiency_pct: 96, inverter_type: 'hybrid' },
  battery: { nominal_capacity_kwh: 10, usable_capacity_kwh: 9, initial_soc_pct: 70, minimum_soc_pct: 20, max_charge_kw: 4, max_discharge_kw: 4, round_trip_efficiency: 0.9, chemistry: 'LFP' },
  generator: { enabled: true, rating_kw: 5, fuel_type: 'diesel', fuel_consumption_l_per_kwh: 0.35, min_runtime_min: 15 },
  grid: { connection_type: 'three_phase', import_limit_kw: 15, export_limit_kw: 10, has_net_metering: true },
};

const h = (hours: number) => hours * 60;
const APPLIANCES = [
  { name: 'Refrigerator', rated_power_w: 150, priority: 'critical', critical: true, flexible: false, required_runtime_min: h(24), earliest_min: 0, latest_min: h(24), interruptible: false, max_interruptions: 0 },
  { name: 'Lights & fans', rated_power_w: 400, priority: 'critical', critical: true, flexible: false, required_runtime_min: h(6), earliest_min: h(18), latest_min: h(24), interruptible: false, max_interruptions: 0 },
  { name: 'Wi-Fi router', rated_power_w: 20, priority: 'critical', critical: true, flexible: false, required_runtime_min: h(24), earliest_min: 0, latest_min: h(24), interruptible: false, max_interruptions: 0 },
  { name: 'Water pump', rated_power_w: 1100, priority: 'medium', critical: false, flexible: true, required_runtime_min: 90, earliest_min: h(6), latest_min: h(18), interruptible: true, max_interruptions: 2 },
  { name: 'Air conditioner', rated_power_w: 1800, priority: 'medium', critical: false, flexible: true, required_runtime_min: h(4), earliest_min: h(11), latest_min: h(19), interruptible: true, max_interruptions: 3 },
  { name: 'Washing machine', rated_power_w: 900, priority: 'low', critical: false, flexible: true, required_runtime_min: 60, earliest_min: h(9), latest_min: h(17), interruptible: false, max_interruptions: 0 },
  { name: 'Iron', rated_power_w: 1200, priority: 'low', critical: false, flexible: true, required_runtime_min: 30, earliest_min: h(8), latest_min: h(20), interruptible: false, max_interruptions: 0 },
];

// A 14 m × 9 m flat roof drawn on a 1000 × 700 canvas, with a water tank and a stair room.
const ROOF = {
  width: 1000, height: 700,
  boundary: [{ x: 100, y: 100 }, { x: 900, y: 100 }, { x: 900, y: 614 }, { x: 100, y: 614 }],
  obstacles: [
    [{ x: 700, y: 140 }, { x: 790, y: 140 }, { x: 790, y: 230 }, { x: 700, y: 230 }],
    [{ x: 120, y: 470 }, { x: 300, y: 470 }, { x: 300, y: 600 }, { x: 120, y: 600 }],
  ],
  scale_points: [{ x: 100, y: 100 }, { x: 900, y: 100 }], scale_distance_m: 14,
  setback_m: 0.6, panel_width_m: 1.13, panel_height_m: 2.28, gap_m: 0.05,
};

/** Evening load-shedding, 18:00–21:00. */
export const DEMO_OUTAGES = [{ start_min: h(18), end_min: h(21) }];

export async function addDemoBuilding(client: SolvantaApiClient): Promise<string> {
  const building = await client.createBuilding(BUILDING);
  const id = building.id;
  for (const appliance of APPLIANCES) {
    const created = await client.post<{ id: string }>(`/buildings/${id}/appliances`, appliance);
    await client.request(`/buildings/${id}/appliances/${created.id}/selection`, { method: 'PUT', body: JSON.stringify({ selected: true }) });
  }
  await client.request(`/buildings/${id}/roof`, { method: 'PUT', body: JSON.stringify(ROOF) });
  await client.post(`/buildings/${id}/simulations`, { outages: DEMO_OUTAGES, use_generator: false });
  return id;
}
