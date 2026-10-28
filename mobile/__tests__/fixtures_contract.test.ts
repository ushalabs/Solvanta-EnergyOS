import {
  DEMO_BUILDING,
  DEMO_APPLIANCES,
  DEMO_SIMULATION_TRACE,
  DEMO_RECOMMENDATION,
} from '../src/fixtures/mockData';

describe('Solvanta Seeded Domain Fixtures Contract', () => {
  test('Demo building defines residential solar and battery specifications', () => {
    expect(DEMO_BUILDING.pvCapacityKwp).toBe(10.0);
    expect(DEMO_BUILDING.batteryNominalKwh).toBe(10.0);
    expect(DEMO_BUILDING.batteryUsableKwh).toBe(9.0);
    expect(DEMO_BUILDING.batterySocPct).toBe(70);
    expect(DEMO_BUILDING.batteryMinSocPct).toBe(20);
    expect(DEMO_BUILDING.provenance).toBe('SIMULATED');
  });

  test('Demo appliances cover essential, high, and flexible load categories', () => {
    expect(DEMO_APPLIANCES.length).toBeGreaterThanOrEqual(5);

    const fridge = DEMO_APPLIANCES.find((a) => a.name === 'Refrigerator');
    expect(fridge).toBeDefined();
    expect(fridge?.priority).toBe('critical');
    expect(fridge?.flexible).toBe(false);

    const ac = DEMO_APPLIANCES.find((a) => a.name === 'Air Conditioner');
    expect(ac).toBeDefined();
    expect(ac?.priority).toBe('low');
    expect(ac?.flexible).toBe(true);
  });

  test('Simulation trace represents 6-hour blackout intervals with SoC preservation', () => {
    expect(DEMO_SIMULATION_TRACE.length).toBe(13); // 0m to 360m in 30m steps
    const initial = DEMO_SIMULATION_TRACE[0];
    const finalStep = DEMO_SIMULATION_TRACE[DEMO_SIMULATION_TRACE.length - 1];

    expect(initial.baselineSoc).toBe(70);
    expect(initial.optimizedSoc).toBe(70);

    // In baseline, battery reserve hits 20% limit
    expect(finalStep.baselineSoc).toBe(20);
    // In optimized, battery preserves 31% ending reserve
    expect(finalStep.optimizedSoc).toBe(31);
    expect(finalStep.optimizedSoc).toBeGreaterThan(DEMO_BUILDING.batteryMinSocPct);
  });

  test('Recommendation specifies auditable human approval state', () => {
    expect(DEMO_RECOMMENDATION.status).toBe('PENDING_APPROVAL');
    expect(DEMO_RECOMMENDATION.criticalCoveragePct).toBe(100);
    expect(DEMO_RECOMMENDATION.unservedCriticalKwh).toBe(0.0);
  });
});
