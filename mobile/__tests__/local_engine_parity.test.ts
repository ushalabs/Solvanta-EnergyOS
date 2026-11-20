// Compares the on-device TypeScript engines with the reference outputs of the old Python backend.
// Regenerate the fixture with backend/scripts/export_engine_parity.py.
import { simulate, loadProfiles, quarterHourPv } from '../src/local/engines/simulation';
import { estimatePv } from '../src/local/engines/pv';
import { placePanels } from '../src/local/engines/geometry';
import { forecast } from '../src/local/engines/forecast';
import { compareResilience } from '../src/local/engines/resilience';
import { variants, executeSnapshot, verifyResult } from '../src/local/engines/plans';
import { PythonRandom, simulatedSamples, detect } from '../src/local/engines/telemetry';
import { solveSchedule, validateSchedule } from '../src/local/engines/scheduling';
import { readTable } from '../src/local/engines/billHistory';

const fixture = require('./fixtures/engine_parity.json');

/** Deep equality with a relative tolerance for floats (Python and JS round the last bit differently). */
function expectClose(actual: unknown, expected: unknown, where = 'value'): void {
  if (typeof expected === 'number' && typeof actual === 'number') {
    const tolerance = 1e-9 * Math.max(1, Math.abs(expected));
    if (Math.abs(actual - expected) > tolerance) throw new Error(`${where}: ${actual} != ${expected}`);
    return;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) throw new Error(`${where}: length ${(actual as unknown[])?.length} != ${expected.length}`);
    expected.forEach((e, i) => expectClose(actual[i], e, `${where}[${i}]`));
    return;
  }
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object') throw new Error(`${where}: expected object`);
    for (const key of Object.keys(expected)) expectClose((actual as any)[key], (expected as any)[key], `${where}.${key}`);
    return;
  }
  if (actual !== expected) throw new Error(`${where}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
}

const runSim = (s: any, protect = false) => {
  const [d, c] = loadProfiles(s.appliances);
  return simulate(s.plant, d, c, quarterHourPv(s.pv), s.options, protect);
};

describe('on-device engines match the Python backend', () => {
  it('reproduces Python random.Random sequences', () => {
    const rng = new PythonRandom(14);
    const values = Array.from({ length: 5 }, () => rng.uniform(-0.02, 0.02));
    expectClose([...values, new PythonRandom(0).random(), new PythonRandom(123456789).random()], fixture.python_random);
  });

  it('simulates the baseline, critical-reserve and generator scenarios', () => {
    expectClose(runSim(fixture.snapshot), fixture.simulate_baseline, 'baseline');
    expectClose(runSim(fixture.snapshot, true), fixture.simulate_protect, 'protect');
    expectClose(runSim(fixture.gen_snapshot), fixture.simulate_generator, 'generator');
  });

  it('estimates PV profiles', () => {
    for (const c of fixture.pv_cases) expectClose(estimatePv(c.count, c.input), c.output, 'pv');
  });

  it('places roof panels with the same setbacks and counts', () => {
    for (const c of fixture.roof_cases) {
      const out = placePanels(c.input);
      expect(out.panel_count).toBe(c.output.panel_count);
      expect(out.roof_area_m2).toBeCloseTo(c.output.roof_area_m2, 3);
      expect(out.usable_area_m2).toBeCloseTo(c.output.usable_area_m2, 2);
      out.panels.forEach((p: any, i: number) => {
        expect(p.x).toBeCloseTo(c.output.panels[i].x, 3);
        expect(p.y).toBeCloseTo(c.output.panels[i].y, 3);
      });
    }
  });

  it('forecasts, compares resilience and builds plan variants', () => {
    const s = fixture.snapshot;
    expectClose(forecast(s, s.options), fixture.forecast_configured, 'forecast');
    expectClose(forecast(s, s.options, fixture.simulate_baseline, 'run-1'), fixture.forecast_saved, 'forecast saved');
    expectClose(compareResilience(s), fixture.resilience, 'resilience');
    expectClose(variants(s).map(({ snapshot, ...rest }) => rest), fixture.variants, 'variants');
    expect(verifyResult(s, executeSnapshot(s))).toEqual(fixture.verify_ok);
    const tampered = executeSnapshot(s);
    tampered.trace[10].battery_end_kwh += 1;
    expect(verifyResult(s, tampered)).toContain('Battery energy recurrence violated');
  });

  it('generates the same synthetic telemetry and incidents', () => {
    for (const c of fixture.telemetry) {
      const samples = simulatedSamples(fixture.simulate_baseline, c.fixture, 14);
      expectClose(samples, c.samples, `samples ${c.fixture}`);
      expectClose(detect(fixture.simulate_baseline, samples), c.incidents, `incidents ${c.fixture}`);
    }
  });

  it('schedules appliances as well as OR-Tools on the reference cases', async () => {
    for (const c of fixture.schedules) {
      const result: any = await solveSchedule(c.items, c.budget, 4000);
      const solved = ['OPTIMAL', 'FEASIBLE'].includes(c.status);
      expect(result.validated).toBe(solved);
      if (!solved) continue;
      validateSchedule(c.items, c.budget, result.entries);
      expect(result.demand_kwh).toBeCloseTo(c.demand_kwh, 9);
      // Where CP-SAT proved optimality the search must match it; elsewhere it must be at least as good.
      if (c.status === 'OPTIMAL') expect(result.objective).toBe(c.objective);
      else expect(result.objective).toBeLessThanOrEqual(c.objective);
    }
  }, 60000);

  it('reads the bill history table', () => {
    expect(readTable(fixture.bill_words)).toEqual(fixture.bill_readings);
  });
});
