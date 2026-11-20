// The demo building goes through the normal on-device routes and fills every screen with data.
import { SolvantaApiClient } from '../src/api/client';
import { LocalApi } from '../src/local/localApi';
import { addDemoBuilding, withDemoBuilding, DEMO_BUILDING_NAME } from '../src/local/demo';
import { memoryDb } from './helpers/nodeSqlite';

test('adds a building with appliances, a roof, a PV estimate and a saved simulation', async () => {
  const local = new LocalApi(memoryDb());
  const client = new SolvantaApiClient(() => local);
  const id = await addDemoBuilding(local);
  expect((await client.getBuilding(id)).name).toBe(DEMO_BUILDING_NAME);
  const appliances: any = await client.get(`/buildings/${id}/appliances`);
  expect(appliances.summary.selected_count).toBe(7);
  const roof: any = await client.get(`/buildings/${id}/roof`);
  expect(roof.layout.panel_count).toBeGreaterThan(10);
  const pv: any = await client.get(`/buildings/${id}/pv`);
  expect(pv.profile.daily_energy_kwh).toBeGreaterThan(0);
  expect(await client.get<any[]>(`/buildings/${id}/simulations`)).toHaveLength(1);
  const schedule: any = await client.post(`/buildings/${id}/schedules`, { outages: [], use_generator: false });
  expect(schedule.result.validated).toBe(true);
});

test('a device with no building gets the demo building once, before the first answer', async () => {
  const local = new LocalApi(memoryDb());
  const api = withDemoBuilding(local);
  const list = await api.handle('GET', '/buildings') as any[];
  expect(list.map(b => b.name)).toEqual([DEMO_BUILDING_NAME]);
  await api.handle('GET', '/buildings');
  expect(await local.handle('GET', '/buildings')).toHaveLength(1);
});

test('a device that already has a building is left alone', async () => {
  const local = new LocalApi(memoryDb());
  const client = new SolvantaApiClient(() => local);
  const id = await addDemoBuilding(local);
  await client.patch(`/buildings/${id}`, { name: 'My home' });
  const list = await withDemoBuilding(local).handle('GET', '/buildings') as any[];
  expect(list.map(b => b.name)).toEqual(['My home']);
});

test('bill history: the demo has twelve months ending last month, and edits are saved and validated', async () => {
  const local = new LocalApi(memoryDb());
  const client = new SolvantaApiClient(() => local);
  const id = await addDemoBuilding(local);
  const demo: any = await client.get(`/buildings/${id}/bills`);
  const months = Object.keys(demo.readings);
  expect(months).toHaveLength(12);
  expect(demo).toMatchObject({ ending_month: months[11], city: 'Lahore', source: 'demo' });
  const now = new Date();
  expect(demo.ending_month).toBe(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7));

  const saved: any = await client.request(`/buildings/${id}/bills`, { method: 'PUT', body: JSON.stringify({ ending_month: '2026-10', readings: { '2026-10': 512.5 }, city: null, custom_yield: 1700, source: 'bill' }) });
  expect(saved).toMatchObject({ ending_month: '2026-10', readings: { '2026-10': 512.5 }, custom_yield: 1700, source: 'bill' });
  expect(await client.get(`/buildings/${id}/bills`)).toMatchObject({ readings: { '2026-10': 512.5 } });
  await expect(client.request(`/buildings/${id}/bills`, { method: 'PUT', body: JSON.stringify({ ending_month: '2026-13', readings: {} }) })).rejects.toMatchObject({ status: 422 });
  await expect(client.request(`/buildings/${id}/bills`, { method: 'PUT', body: JSON.stringify({ ending_month: '2026-10', readings: { '2026-10': -1 } }) })).rejects.toMatchObject({ status: 422 });
});

test('a building without saved bills answers 404, so the screen starts blank', async () => {
  const local = new LocalApi(memoryDb());
  const client = new SolvantaApiClient(() => local);
  const b = await client.createBuilding({ name: 'Plain', pv_capacity_kwp: 5, inverter_rating_kw: 5, battery: { nominal_capacity_kwh: 5, usable_capacity_kwh: 4, initial_soc_pct: 70, minimum_soc_pct: 20, max_charge_kw: 2, max_discharge_kw: 2, round_trip_efficiency: 0.9 } });
  await expect(client.get(`/buildings/${b.id}/bills`)).rejects.toMatchObject({ status: 404 });
});
