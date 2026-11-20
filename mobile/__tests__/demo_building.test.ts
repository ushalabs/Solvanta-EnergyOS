// The demo building goes through the normal on-device routes and fills every screen with data.
import { SolvantaApiClient } from '../src/api/client';
import { LocalApi } from '../src/local/localApi';
import { addDemoBuilding, DEMO_BUILDING_NAME } from '../src/local/demo';
import { memoryDb } from './helpers/nodeSqlite';

test('adds a building with appliances, a roof, a PV estimate and a saved simulation', async () => {
  const local = new LocalApi(memoryDb());
  const client = new SolvantaApiClient(() => local);
  const id = await addDemoBuilding(client);
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
