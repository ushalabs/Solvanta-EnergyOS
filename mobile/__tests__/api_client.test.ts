// The data client has no server: routes go to the on-device engine, /weather to the weather service.
import { SolvantaApiClient, SolvantaApiError } from '../src/api/client';

const handlers = () => {
  const local = jest.fn(async (method: string, path: string, body?: unknown) => ({ via: 'local', method, path, body }));
  const weather = jest.fn(async (method: string, path: string) => ({ via: 'weather', method, path }));
  return { local, weather, client: new SolvantaApiClient(() => ({ handle: local }), () => ({ handle: weather })) };
};

describe('Solvanta data client', () => {
  test('sends building and engine routes to the on-device engine with parsed JSON bodies', async () => {
    const { client, local, weather } = handlers();
    expect(await client.post('/buildings/b1/simulations', { use_generator: false })).toEqual({ via: 'local', method: 'POST', path: '/buildings/b1/simulations', body: { use_generator: false } });
    expect(await client.get('/buildings')).toEqual({ via: 'local', method: 'GET', path: '/buildings', body: undefined });
    expect(await client.request('/buildings/b1/roof', { method: 'PUT', body: JSON.stringify({ a: 1 }) })).toMatchObject({ method: 'PUT', body: { a: 1 } });
    await client.patch('/buildings/b1', { name: 'x' });
    await client.delete('/buildings/b1');
    expect(local.mock.calls.map(c => c[0])).toEqual(['POST', 'GET', 'PUT', 'PATCH', 'DELETE']);
    expect(weather).not.toHaveBeenCalled();
  });

  test('sends only /weather routes to the weather service', async () => {
    const { client, local } = handlers();
    expect(await client.get('/weather/forecast?city=Lahore')).toMatchObject({ via: 'weather' });
    expect(await client.get('/weather/solar/b1?city=Lahore')).toMatchObject({ via: 'weather' });
    expect(await client.get('/weatherstation')).toMatchObject({ via: 'local' });
    expect(local).toHaveBeenCalledTimes(1);
  });

  test('domain shortcuts use the same routes as before', async () => {
    const { client, local } = handlers();
    await client.getBuildings(); await client.getCurrentUser(); await client.getBuildingEquipment('b1');
    expect(local.mock.calls.map(c => c[1])).toEqual(['/buildings', '/auth/me', '/buildings/b1/equipment']);
  });

  test('engine errors reach screens unchanged', async () => {
    const client = new SolvantaApiClient(() => ({ handle: async () => { throw new SolvantaApiError(404, { detail: 'Building not found' }); } }));
    await expect(client.get('/buildings/x')).rejects.toMatchObject({ status: 404, message: 'Building not found' });
  });
});

test('renders structured validation errors as readable field messages', () => {
  const error = new SolvantaApiError(422, { detail: [{ loc: ['body', 'rated_power_w'], msg: 'Input should be greater than 0' }] });
  expect(error.message).toContain('rated_power_w'); expect(error.message).toContain('greater than 0');
});
