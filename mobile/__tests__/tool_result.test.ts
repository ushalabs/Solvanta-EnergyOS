import { TOOLS, toolInfo, needsScenario, describeResult, friendlyToolError, firstName, ToolResultData, clock } from '../src/api/toolResult';

const result = (tool: string, data: any, extra: Partial<ToolResultData> = {}): ToolResultData => ({ tool, source: 'SIMULATED', building_id: 'b1', scenario_id: 's1', record_id: null, provenance: 'p', units: {}, data, ...extra });
const summary = { load_kwh: 43.215, pv_kwh: 28.64, unmet_kwh: 1.5, unserved_critical_kwh: 0, grid_import_kwh: 18, generator_fuel_l: 0, curtailed_kwh: 0.2, final_soc_pct: 40 };
const flat = (d: ReturnType<typeof describeResult>) => [d.title, d.summary, ...d.rows.flatMap(r => [r.label, r.value]), ...d.items.flatMap(i => [i.title, ...i.lines]), ...d.notes].join(' | ');

describe('the shortcut list', () => {
  test('there is one entry for each of the nine engine tools', () => {
    expect(Object.keys(TOOLS).sort()).toEqual(['compare_energy_configurations', 'forecast_energy', 'get_building_profile', 'get_energy_anomalies', 'get_energy_scenario', 'optimize_appliance_schedule', 'optimize_resilience', 'propose_energy_plan', 'run_outage_simulation']);
  });
  test('four primary shortcuts map to the reference chips, the rest are under more', () => {
    expect(Object.entries(TOOLS).filter(([, t]) => t.group === 'primary').map(([k]) => k)).toEqual(['run_outage_simulation', 'optimize_appliance_schedule', 'compare_energy_configurations', 'get_energy_anomalies']);
  });
  test('chip text names what the tool does and never promises an answer to a question', () => {
    for (const t of Object.values(TOOLS)) { expect(t.chip).not.toMatch(/\?|explain|do i need|should i|why|how much will i save/i); expect(t.chip.length).toBeLessThanOrEqual(34); }
  });
  test('only the building tools work without a saved scenario, as before', () => {
    expect(Object.entries(TOOLS).filter(([, t]) => !t.needsScenario).map(([k]) => k).sort()).toEqual(['get_building_profile', 'get_energy_anomalies']);
    expect(needsScenario('run_outage_simulation')).toBe(true);
    expect(needsScenario('get_building_profile')).toBe(false);
  });
  test('an unknown tool still gets a label from its name', () => {
    expect(toolInfo('new_tool_name')).toMatchObject({ chip: 'new tool name', group: 'more', needsScenario: true });
  });
  test('tools that save something say so', () => {
    expect(TOOLS.run_outage_simulation.note).toMatch(/Saves/);
    expect(TOOLS.propose_energy_plan.note).toMatch(/Nothing is approved or switched/);
  });
});

describe('describeResult', () => {
  test('outage simulation lists the run totals with units and says whether anything went unmet', () => {
    const d = describeResult(result('run_outage_simulation', { result: { summary, assumptions: ['Representative day'] } }));
    expect(d.title).toBe('Outage simulation');
    expect(d.summary).toBe('Unmet energy 1.50 kWh on this representative day.');
    expect(d.rows).toContainEqual({ label: 'Requested', value: '43.22 kWh' });
    expect(d.rows).toContainEqual({ label: 'Final battery', value: '40.0%' });
    expect(d.rows).toContainEqual({ label: 'Generator fuel', value: '0.00 L' });
    expect(d.notes).toEqual(['Representative day']);
    expect(describeResult(result('run_outage_simulation', { result: { summary: { ...summary, unmet_kwh: 0 } } })).summary).toBe('No unmet energy on this representative day.');
  });
  test('missing numbers are dashes, never zero or undefined', () => {
    const d = describeResult(result('run_outage_simulation', { result: { summary: { load_kwh: 5 } } }));
    expect(d.rows.find(r => r.label === 'PV')!.value).toBe('—');
    expect(flat(d)).not.toMatch(/undefined|NaN|null/);
  });
  test('a run without a summary says so', () => {
    expect(describeResult(result('get_energy_scenario', {})).empty).toBe('This result has no summary.');
  });
  test('building profile reads the configuration and keeps validation messages', () => {
    const d = describeResult(result('get_building_profile', { building_name: 'Demo House', solar: { pv_capacity_kwp: 4.4, module_count: 8 }, inverter: { rating_kw: 8 }, battery: { nominal_capacity_kwh: 10, usable_capacity_kwh: 9, initial_soc_pct: 60 }, generator: { enabled: false }, grid: { import_limit_kw: 10 }, validation_messages: ['Battery limit missing'] }, { source: 'CONFIGURATION' }));
    expect(d.summary).toBe('Demo House');
    expect(d.rows).toContainEqual({ label: 'PV capacity', value: '4.40 kWp' });
    expect(d.rows).toContainEqual({ label: 'Generator', value: 'Off' });
    expect(d.notes).toEqual(['Battery limit missing']);
  });
  test('building profile with little data is mostly dashes', () => {
    const d = describeResult(result('get_building_profile', {}));
    expect(d.rows.every(r => r.value === '—')).toBe(true);
  });
  test('forecast says whether a shortage is projected, with the first time', () => {
    const f = (level: string, first: number | null) => describeResult(result('forecast_energy', { method: 'deterministic daily persistence', horizon_hours: 24, shortage: { level, first_unmet_minute: first, unmet_kwh: 1.2, critical_unmet_kwh: 0.3, minimum_soc_pct: 12 }, projection: { summary } }));
    expect(f('none', null).summary).toBe('No shortage is projected over the next 24 hours.');
    expect(f('load', 1110).summary).toBe('Some load may go unmet, starting at 18:30.');
    expect(f('critical', 90).summary).toBe('Critical loads may go unmet, starting at 01:30.');
    expect(f('load', 1110).rows).toContainEqual({ label: 'Lowest battery', value: '12.0%' });
    expect(f('none', null).notes).toEqual(['deterministic daily persistence', 'Horizon 24 hours.']);
  });
  test('schedule lists each appliance with its times, and conflicts as warnings', () => {
    const entries = [{ name: 'Pump', priority: 'medium', rated_power_w: 750, segments: [{ start_min: 600, end_min: 660 }, { start_min: 780, end_min: 840 }] }];
    const ok = describeResult(result('optimize_appliance_schedule', { status: 'OPTIMAL', validated: true, demand_kwh: 1.5, reasons: [], entries, supply_policy: 'PV plus available grid only; battery and generator excluded' }));
    expect(ok.summary).toBe('Optimal schedule · 1 appliance · 1.50 kWh requested');
    expect(ok.items).toEqual([{ title: 'Pump', lines: ['10:00 – 11:00, 13:00 – 14:00', 'Medium priority · 0.75 kW'] }]);
    expect(ok.rows).toContainEqual({ label: 'Independently validated', value: 'Yes' });
    expect(ok.notes).toEqual(['PV plus available grid only; battery and generator excluded']);
    const bad = describeResult(result('optimize_appliance_schedule', { status: 'INFEASIBLE', validated: false, reasons: ['Fridge cannot finish'], entries: [] }));
    expect(bad.summary).toBe('No schedule was saved.');
    expect(bad.items).toEqual([{ title: 'Conflict', lines: ['Fridge cannot finish'], warning: true }]);
    expect(bad.empty).toBe('No appliances were scheduled.');
  });
  test('resilience shows before and after, with dashes when coverage is unknown', () => {
    const d = describeResult(result('optimize_resilience', { status: 'optimal', critical_coverage_pct: 100, baseline_critical_coverage_pct: 90, critical_energy_saved_kwh: 0.8, candidate_selected: true, method: 'Critical-reserve policy versus baseline', baseline: { summary: { unserved_critical_kwh: 0.8, unmet_kwh: 2 } }, optimized: { summary: { unserved_critical_kwh: 0, unmet_kwh: 1.5 } } }));
    expect(d.summary).toBe('0.80 kWh more critical energy served than the baseline.');
    expect(d.rows).toContainEqual({ label: 'Critical coverage', value: '90.0% → 100.0%' });
    expect(d.rows).toContainEqual({ label: 'Critical unmet', value: '0.80 → 0.00 kWh' });
    expect(d.notes).toContain('Critical-reserve policy selected.');
    expect(describeResult(result('optimize_resilience', { status: 'x', critical_coverage_pct: null, baseline_critical_coverage_pct: null })).rows).toContainEqual({ label: 'Critical coverage', value: '— → —' });
  });
  test('configuration comparison lists each configuration with its trade-offs and says they are hypothetical', () => {
    const d = describeResult(result('compare_energy_configurations', { variants: [{ name: 'Battery capacity +50%', summary, tradeoff: ['Larger hypothetical battery'] }, { name: 'Current configuration', summary, tradeoff: [] }] }));
    expect(d.summary).toBe('2 configurations compared. These are hypothetical changes, not installed equipment.');
    expect(d.items[0]).toEqual({ title: 'Battery capacity +50%', lines: ['Unmet 1.50 kWh · critical unmet 0.00 kWh · final battery 40.0%', 'Larger hypothetical battery'] });
  });
  test('anomalies list incidents, or say there are none, and keep the simulated-detector note', () => {
    const some = describeResult(result('get_energy_anomalies', { incidents: [{ code: 'PV_DROPOUT', state: 'OPEN', source: 'SIMULATED', possible_cause: 'Inverter offline' }], meaning: 'SIMULATED detector evidence; hypotheses are not physical diagnoses' }));
    expect(some.summary).toBe('1 incident found.');
    expect(some.items).toEqual([{ title: 'PV_DROPOUT · OPEN', lines: ['SIMULATED', 'Inverter offline'] }]);
    expect(some.notes).toEqual(['SIMULATED detector evidence; hypotheses are not physical diagnoses']);
    expect(describeResult(result('get_energy_anomalies', { incidents: [] })).empty).toBe('No incidents found.');
  });
  test('a plan proposal says it waits for human review', () => {
    const d = describeResult(result('propose_energy_plan', { state: 'PENDING_APPROVAL', revision: 2, variants: [{ name: 'Current configuration', summary, tradeoff: [] }] }));
    expect(d.summary).toBe('A plan was created for human review. Nothing is approved or switched.');
    expect(d.rows).toEqual([{ label: 'State', value: 'PENDING APPROVAL' }, { label: 'Revision', value: '2' }]);
  });
  test('an unknown tool gets an honest empty state instead of a data dump', () => {
    const d = describeResult(result('mystery', { secret: { a: 1 } }));
    expect(d.empty).toBe('No readable summary is available for this result.');
    expect(JSON.stringify(d)).not.toMatch(/secret/);
  });
  test('no result text is raw JSON or contains braces', () => {
    for (const t of Object.keys(TOOLS)) expect(flat(describeResult(result(t, { result: { summary }, variants: [{ name: 'a', summary, tradeoff: [] }], entries: [], incidents: [] })))).not.toMatch(/[{}]|\[object/);
  });
  test('clock formats minutes and dashes for non-numbers', () => { expect(clock(485)).toBe('08:05'); expect(clock(null)).toBe('—'); });
});

describe('friendlyToolError', () => {
  // The API client puts the HTTP status on the error and the server text in its message; a plain error has the same shape.
  const err = (status: number, detail: string) => Object.assign(new Error(detail), { status });
  test('network, timeout and cancel', () => {
    expect(friendlyToolError(err(0, 'Network failure connecting to http://x'))).toBe('I could not reach the server. Check your connection and try again.');
    expect(friendlyToolError(err(408, 'API request timed out after 30000ms'))).toBe('That took too long. Try again in a moment.');
    expect(friendlyToolError(err(499, 'Request cancelled'))).toBe('That request was cancelled.');
  });
  test('sign-in, missing scenario, generator and other validation', () => {
    expect(friendlyToolError(err(401, 'Not authenticated'))).toBe('You need to be signed in to use these tools.');
    expect(friendlyToolError(err(403, 'Forbidden'))).toBe('You need to be signed in to use these tools.');
    expect(friendlyToolError(err(404, 'Saved scenario not found'))).toBe('That saved scenario was not found. Pick another one, or save a simulation first.');
    expect(friendlyToolError(err(404, 'Unknown tool'))).toBe('That tool is not available right now.');
    expect(friendlyToolError(err(422, 'Scheduler budget excludes generator; select a scenario without generator dispatch'))).toBe('The schedule optimizer excludes the generator. Choose a saved scenario that does not use it.');
    expect(friendlyToolError(err(422, 'body.scenario_id: Value error, bad uuid'))).toBe('The tool could not run with this saved scenario. Try a different one.');
    expect(friendlyToolError(err(500, 'Traceback: boom'))).toBe('The server had a problem. Try again in a moment.');
  });
  test('the raw server wording never appears', () => {
    const cases: Array<[number, string]> = [[422, 'body.scenario_id: Value error, bad uuid'], [500, 'Traceback (most recent call last)'], [404, 'Saved scenario not found'], [0, 'Network failure connecting to http://192.168.0.5:8000'], [418, 'I am a teapot']];
    for (const [s, m] of cases) expect(friendlyToolError(err(s, m))).not.toMatch(/Value error|Traceback|uuid|192\.168|teapot|body\.|http/i);
  });
  test('anything else, including a plain Error or a non-error, gets the default', () => {
    expect(friendlyToolError(new Error('Something odd'))).toBe('That did not work. Try again, or pick another shortcut.');
    expect(friendlyToolError(undefined)).toBe('That did not work. Try again, or pick another shortcut.');
    expect(friendlyToolError('text')).toBe('That did not work. Try again, or pick another shortcut.');
  });
});

describe('firstName', () => {
  test('takes the first word of a usable name', () => {
    expect(firstName('Usman Khan')).toBe('Usman');
    expect(firstName('  Ayesha  ')).toBe('Ayesha');
    expect(firstName("O'Neil Smith")).toBe("O'Neil");
  });
  test('refuses anything that is not a name, so the greeting never shows junk', () => {
    for (const bad of ['', '   ', undefined, null, 42, 'guest@home.pk', '12345', '<script>', 'a'.repeat(40)]) expect(firstName(bad)).toBe('');
  });
});
