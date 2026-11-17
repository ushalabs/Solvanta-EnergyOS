import { TOOLS, PRIMARY_TOOLS, toolInfo, needsScenario, describeResult, technicalDetails, friendlyToolError, rawErrorText, firstName, runLabel, ToolResultData, clock, COULD_NOT_RUN, SAME_CONFIGURATIONS } from '../src/api/toolResult';

const result = (tool: string, data: any, extra: Partial<ToolResultData> = {}): ToolResultData => ({ tool, source: 'SIMULATED', building_id: 'b1', scenario_id: 's1', record_id: null, provenance: 'p', units: {}, data, ...extra });
const summary = { load_kwh: 43.215, pv_kwh: 28.64, unmet_kwh: 1.5, unserved_critical_kwh: 0, grid_import_kwh: 18, generator_fuel_l: 0, curtailed_kwh: 0.2, final_soc_pct: 40 };
const flat = (d: ReturnType<typeof describeResult>) => [d.title, d.summary, d.checked ?? '', ...d.rows.flatMap(r => [r.label, r.value]), ...d.moreRows.flatMap(r => [r.label, r.value]), ...d.items.flatMap(i => [i.title, ...i.lines]), ...d.inlineNotes, ...d.notes, ...(d.table ? [...d.table.columns, ...d.table.rows.flatMap(r => [r.name, ...r.cells])] : [])].join(' | ');

describe('the shortcut list', () => {
  test('there is one entry for each of the nine engine tools', () => {
    expect(Object.keys(TOOLS).sort()).toEqual(['compare_energy_configurations', 'forecast_energy', 'get_building_profile', 'get_energy_anomalies', 'get_energy_scenario', 'optimize_appliance_schedule', 'optimize_resilience', 'propose_energy_plan', 'run_outage_simulation']);
  });
  test('four primary shortcuts, in order, and the rest under more', () => {
    expect(PRIMARY_TOOLS).toEqual(['run_outage_simulation', 'optimize_appliance_schedule', 'compare_energy_configurations', 'get_energy_anomalies']);
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
    expect(TOOLS.optimize_appliance_schedule.note).toBe('Saves the schedule when it validates. Nothing is switched.');
    expect(TOOLS.propose_energy_plan.note).toMatch(/Nothing is approved or switched/);
  });
});

describe('runLabel', () => {
  const now = new Date(2026, 10, 18, 14, 0);
  const at = (y: number, m: number, d: number, h: number, min: number) => new Date(y, m, d, h, min).toISOString();
  test('today and yesterday in 12-hour time', () => {
    expect(runLabel(at(2026, 10, 18, 1, 39), false, now)).toBe('Today 1:39 AM');
    expect(runLabel(at(2026, 10, 17, 19, 56), false, now)).toBe('Yesterday 7:56 PM');
    expect(runLabel(at(2026, 10, 18, 12, 5), false, now)).toBe('Today 12:05 PM');
    expect(runLabel(at(2026, 10, 18, 0, 7), false, now)).toBe('Today 12:07 AM');
  });
  test('older runs show the day and month, with the year only when it is not this year', () => {
    expect(runLabel(at(2026, 10, 3, 14, 55), false, now)).toBe('3 Nov 2:55 PM');
    expect(runLabel(at(2025, 11, 25, 9, 0), false, now)).toBe('25 Dec 2025 9:00 AM');
  });
  test('the latest run is labelled as such', () => {
    expect(runLabel(at(2026, 10, 18, 1, 39), true, now)).toBe('Latest run · Today 1:39 AM');
    expect(runLabel(at(2026, 10, 3, 14, 55), true, now)).toBe('Latest run · 3 Nov 2:55 PM');
  });
  test('a missing or invalid date never shows Invalid Date, and the id never appears', () => {
    expect(runLabel(undefined, false, now)).toBe('Saved run');
    expect(runLabel('not a date', true, now)).toBe('Latest run');
    expect(runLabel(null, false, now)).not.toMatch(/Invalid|[0-9a-f]{8}/);
  });
});

describe('describeResult: headline, key numbers and the rest', () => {
  test('outage simulation puts four numbers up front and the rest under more', () => {
    const d = describeResult(result('run_outage_simulation', { result: { summary, assumptions: ['Representative day; quarter-hour mean AC powers'] } }));
    expect(d.title).toBe('Outage simulation');
    expect(d.summary).toBe('Unmet energy 1.50 kWh on this representative day.');
    expect(d.rows).toEqual([{ label: 'Unmet', value: '1.50 kWh' }, { label: 'Critical unmet', value: '0.00 kWh' }, { label: 'Grid import', value: '18.00 kWh' }, { label: 'Final battery', value: '40.0%' }]);
    expect(d.moreRows.map(r => r.label)).toEqual(['Requested', 'PV', 'Generator fuel', 'Curtailed']);
    expect(d.moreRows[0].value).toBe('43.22 kWh');
    expect(d.notes).toEqual(['Representative day; quarter-hour mean AC powers']);
    expect(describeResult(result('run_outage_simulation', { result: { summary: { ...summary, unmet_kwh: 0 } } })).summary).toBe('No unmet energy on this representative day.');
  });
  test('missing numbers are dashes, never zero or undefined', () => {
    const d = describeResult(result('run_outage_simulation', { result: { summary: { load_kwh: 5 } } }));
    expect(d.rows.every(r => r.value === '—')).toBe(true);
    expect(d.moreRows.find(r => r.label === 'PV')!.value).toBe('—');
    expect(flat(d)).not.toMatch(/undefined|NaN|null/);
  });
  test('a run without a summary says so', () => {
    expect(describeResult(result('get_energy_scenario', {})).empty).toBe('This result has no summary.');
  });
  test('building profile shows four numbers, says what was checked, and keeps validation messages visible', () => {
    const d = describeResult(result('get_building_profile', { building_name: 'Demo House', solar: { pv_capacity_kwp: 4.4, module_count: 8 }, inverter: { rating_kw: 8 }, battery: { nominal_capacity_kwh: 10, usable_capacity_kwh: 9, initial_soc_pct: 60 }, generator: { enabled: false }, grid: { import_limit_kw: 10 }, validation_messages: ['Battery limit missing'] }, { source: 'CONFIGURATION', scenario_id: null }));
    expect(d.summary).toBe('Demo House');
    expect(d.rows).toEqual([{ label: 'PV capacity', value: '4.40 kWp' }, { label: 'Battery', value: '10.0 kWh' }, { label: 'Inverter', value: '8.0 kW' }, { label: 'Generator', value: 'Off' }]);
    expect(d.moreRows).toContainEqual({ label: 'Starting charge', value: '60.0%' });
    expect(d.checked).toBe('Authorized building records, Building configuration');
    expect(d.inlineNotes).toEqual(['Battery limit missing']);
  });
  test('building profile with little data is mostly dashes', () => {
    const d = describeResult(result('get_building_profile', {}));
    expect([...d.rows, ...d.moreRows].every(r => r.value === '—')).toBe(true);
  });
  test('forecast says whether a shortage is projected, with three numbers and the method as fine print', () => {
    const f = (level: string, first: number | null) => describeResult(result('forecast_energy', { method: 'deterministic daily persistence', horizon_hours: 24, shortage: { level, first_unmet_minute: first, unmet_kwh: 1.2, critical_unmet_kwh: 0.3, minimum_soc_pct: 12 }, projection: { summary } }));
    expect(f('none', null).summary).toBe('No shortage is projected over the next 24 hours.');
    expect(f('load', 1110).summary).toBe('Some load may go unmet, starting at 18:30.');
    expect(f('critical', 90).summary).toBe('Critical loads may go unmet, starting at 01:30.');
    expect(f('load', 1110).rows).toContainEqual({ label: 'Lowest battery', value: '12.0%' });
    expect(f('none', null).rows).toHaveLength(3);
    expect(f('none', null).notes).toEqual(['deterministic daily persistence', 'Horizon 24 hours.']);
  });
  test('schedule lists each appliance, shows status and validation up front, and keeps the policy as fine print', () => {
    const entries = [{ name: 'Pump', priority: 'medium', rated_power_w: 750, segments: [{ start_min: 600, end_min: 660 }, { start_min: 780, end_min: 840 }] }];
    const ok = describeResult(result('optimize_appliance_schedule', { status: 'OPTIMAL', validated: true, demand_kwh: 1.5, reasons: [], entries, supply_policy: 'PV plus available grid only; battery and generator excluded', objective_description: 'Minimize priority-weighted delay' }));
    expect(ok.summary).toBe('Optimal schedule · 1 appliance · 1.50 kWh requested');
    expect(ok.items).toEqual([{ title: 'Pump', lines: ['10:00 – 11:00, 13:00 – 14:00', 'Medium priority · 0.75 kW'] }]);
    expect(ok.rows).toContainEqual({ label: 'Independently validated', value: 'Yes' });
    expect(ok.notes).toEqual(['PV plus available grid only; battery and generator excluded', 'Minimize priority-weighted delay']);
    const bad = describeResult(result('optimize_appliance_schedule', { status: 'INFEASIBLE', validated: false, reasons: ['Fridge cannot finish'], entries: [] }));
    expect(bad.summary).toBe('No schedule was saved.');
    expect(bad.items).toEqual([{ title: 'Conflict', lines: ['Fridge cannot finish'], warning: true }]);
    expect(bad.empty).toBe('No appliances were scheduled.');
  });
  test('resilience shows three before-and-after numbers, with dashes when coverage is unknown', () => {
    const d = describeResult(result('optimize_resilience', { status: 'optimal', critical_coverage_pct: 100, baseline_critical_coverage_pct: 90, critical_energy_saved_kwh: 0.8, candidate_selected: true, method: 'Critical-reserve policy versus baseline', baseline: { summary: { unserved_critical_kwh: 0.8, unmet_kwh: 2 } }, optimized: { summary: { unserved_critical_kwh: 0, unmet_kwh: 1.5 } } }));
    expect(d.summary).toBe('0.80 kWh more critical energy served than the baseline.');
    expect(d.rows).toEqual([{ label: 'Critical coverage', value: '90.0% → 100.0%' }, { label: 'Critical unmet', value: '0.80 → 0.00 kWh' }, { label: 'Total unmet', value: '2.00 → 1.50 kWh' }]);
    expect(d.moreRows).toEqual([{ label: 'Status', value: 'optimal' }]);
    expect(d.notes).toContain('Critical-reserve policy selected.');
    expect(describeResult(result('optimize_resilience', { status: 'x', critical_coverage_pct: null, baseline_critical_coverage_pct: null })).rows[0]).toEqual({ label: 'Critical coverage', value: '— → —' });
  });
});

describe('describeResult: configuration comparison table', () => {
  const variant = (name: string, s: any, tradeoff: string[] = ['Existing equipment assumptions retained']) => ({ name, summary: s, tradeoff });
  test('three rows and the columns Unmet, Critical unmet and Final battery', () => {
    const d = describeResult(result('compare_energy_configurations', { variants: [variant('Current configuration', summary), variant('Battery capacity +50%', { ...summary, unmet_kwh: 0.9, final_soc_pct: 50 }), variant('PV capacity +25%', { ...summary, unmet_kwh: 0.6, final_soc_pct: 60 })] }));
    expect(d.table!.columns).toEqual(['Unmet', 'Critical unmet', 'Final battery']);
    expect(d.table!.rows).toEqual([
      { name: 'Current configuration', cells: ['1.50 kWh', '0.00 kWh', '40.0%'] },
      { name: 'Battery capacity +50%', cells: ['0.90 kWh', '0.00 kWh', '50.0%'] },
      { name: 'PV capacity +25%', cells: ['0.60 kWh', '0.00 kWh', '60.0%'] },
    ]);
    expect(d.table!.sameNote).toBeUndefined();
    expect(d.summary).toBe('3 configurations compared. These are hypothetical changes, not installed equipment.');
  });
  test('identical rows add the one explanatory line', () => {
    const d = describeResult(result('compare_energy_configurations', { variants: ['A', 'B', 'C'].map(n => variant(n, summary)) }));
    expect(d.table!.sameNote).toBe(SAME_CONFIGURATIONS);
    expect(SAME_CONFIGURATIONS).toBe('All three configurations cover your load on this day, so there is no difference to show.');
    expect(d.summary).toMatch(/hypothetical changes, not installed equipment/);
  });
  test('rows that differ in any cell are not called identical, and one row is never "the same"', () => {
    expect(describeResult(result('compare_energy_configurations', { variants: [variant('A', summary), variant('B', summary), variant('C', { ...summary, final_soc_pct: 41 })] })).table!.sameNote).toBeUndefined();
    expect(describeResult(result('compare_energy_configurations', { variants: [variant('A', summary)] })).table!.sameNote).toBeUndefined();
  });
  test('trade-offs move to the fine print and are listed once', () => {
    const d = describeResult(result('compare_energy_configurations', { variants: [variant('A', summary, ['Existing equipment assumptions retained']), variant('B', summary, ['Existing equipment assumptions retained', 'Larger hypothetical battery'])] }));
    expect(d.notes).toEqual(['Existing equipment assumptions retained', 'Larger hypothetical battery']);
  });
  test('no configurations is an empty state', () => {
    const d = describeResult(result('compare_energy_configurations', { variants: [] }));
    expect(d.empty).toBe('No configurations were returned.');
    expect(d.table).toBeUndefined();
  });
});

describe('describeResult: anomalies and plans', () => {
  test('no incidents is one plain line plus the simulated-detector note and what was checked', () => {
    const d = describeResult(result('get_energy_anomalies', { incidents: [], meaning: 'SIMULATED detector evidence; hypotheses are not physical diagnoses' }, { scenario_id: null, provenance: 'Authorized building records' }));
    expect(d.summary).toBe('No incidents found');
    expect(d.items).toEqual([]);
    expect(d.inlineNotes).toEqual(['SIMULATED detector, not a physical diagnosis']);
    expect(d.checked).toBe('Authorized building records, Building configuration');
    expect(d.empty).toBeUndefined();
  });
  test('incidents are listed under the same note', () => {
    const d = describeResult(result('get_energy_anomalies', { incidents: [{ code: 'PV_DROPOUT', state: 'OPEN', source: 'SIMULATED', possible_cause: 'Inverter offline' }] }));
    expect(d.summary).toBe('1 incident found.');
    expect(d.items).toEqual([{ title: 'PV_DROPOUT · OPEN', lines: ['SIMULATED', 'Inverter offline'] }]);
    expect(d.inlineNotes).toEqual(['SIMULATED detector, not a physical diagnosis']);
  });
  test('a plan proposal says it waits for human review and tabulates the variants', () => {
    const d = describeResult(result('propose_energy_plan', { state: 'PENDING_APPROVAL', revision: 2, variants: [{ name: 'Current configuration', summary, tradeoff: ['Existing equipment assumptions retained'] }] }));
    expect(d.summary).toBe('A plan was created for human review. Nothing is approved or switched.');
    expect(d.rows).toEqual([{ label: 'State', value: 'PENDING APPROVAL' }, { label: 'Revision', value: '2' }]);
    expect(d.table!.rows).toHaveLength(1);
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

describe('technicalDetails', () => {
  test('ids and provenance live here, with dashes and the configuration label when there is no scenario or record', () => {
    expect(technicalDetails(result('run_outage_simulation', {}, { scenario_id: 'run11111-aaaa', record_id: 'rec22222-bbbb', provenance: 'Immutable saved scenario; deterministic engines' }))).toEqual([
      { label: 'Tool', value: 'run_outage_simulation' }, { label: 'Source', value: 'SIMULATED' },
      { label: 'Saved scenario', value: 'run11111-aaaa' }, { label: 'Saved record', value: 'rec22222-bbbb' }, { label: 'Building', value: 'b1' }]);
    const none = technicalDetails(result('get_building_profile', {}, { scenario_id: null, record_id: null }));
    expect(none.find(r => r.label === 'Saved scenario')!.value).toBe('Building configuration');
    expect(none.find(r => r.label === 'Saved record')!.value).toBe('—');
  });
});

describe('friendlyToolError', () => {
  const err = (status: number, detail: string) => Object.assign(new Error(detail), { status });
  test('an unreachable backend, a timeout, a server error and anything unexpected share the one friendly sentence', () => {
    expect(COULD_NOT_RUN).toBe("Couldn't run this right now. Check that the backend is running and try again.");
    for (const e of [err(0, 'Network failure connecting to http://x'), err(408, 'API request timed out after 30000ms'), err(500, 'Traceback: boom'), err(502, 'Bad gateway'), new Error('Something odd'), undefined, 'text']) expect(friendlyToolError(e)).toBe(COULD_NOT_RUN);
  });
  test('cancel, sign-in, missing scenario, generator and other validation keep their own wording', () => {
    expect(friendlyToolError(err(499, 'Request cancelled'))).toBe('That request was cancelled.');
    expect(friendlyToolError(err(401, 'Not authenticated'))).toBe('You need to be signed in to use these tools.');
    expect(friendlyToolError(err(403, 'Forbidden'))).toBe('You need to be signed in to use these tools.');
    expect(friendlyToolError(err(404, 'Saved scenario not found'))).toBe('That saved scenario was not found. Pick another one, or save a simulation first.');
    expect(friendlyToolError(err(404, 'Unknown tool'))).toBe('That tool is not available right now.');
    expect(friendlyToolError(err(422, 'Scheduler budget excludes generator; select a scenario without generator dispatch'))).toBe('The schedule optimizer excludes the generator. Choose a saved scenario that does not use it.');
    expect(friendlyToolError(err(422, 'body.scenario_id: Value error, bad uuid'))).toBe('The tool could not run with this saved scenario. Try a different one.');
  });
  test('the raw server wording never appears in the friendly text', () => {
    const cases: Array<[number, string]> = [[422, 'body.scenario_id: Value error, bad uuid'], [500, 'Traceback (most recent call last)'], [404, 'Saved scenario not found'], [0, 'Network failure connecting to http://192.168.0.5:8000'], [418, 'I am a teapot']];
    for (const [s, m] of cases) expect(friendlyToolError(err(s, m))).not.toMatch(/Value error|Traceback|uuid|192\.168|teapot|body\.|http/i);
  });
});

describe('rawErrorText', () => {
  test('keeps the status and the original message for Technical details', () => {
    expect(rawErrorText(Object.assign(new Error('Network failure connecting to http://x'), { status: 0 }))).toBe('Status 0: Network failure connecting to http://x');
    expect(rawErrorText(new Error('kaboom'))).toBe('kaboom');
    expect(rawErrorText(undefined)).toBe('No message');
  });
  test('is cut at 600 characters', () => { expect(rawErrorText(new Error('x'.repeat(2000))).length).toBe(600); });
});

describe('firstName', () => {
  test('takes the first word of a usable name', () => {
    expect(firstName('Usman Khan')).toBe('Usman');
    expect(firstName("O'Neil Smith")).toBe("O'Neil");
  });
  test('refuses anything that is not a name', () => {
    for (const bad of ['', '   ', undefined, null, 42, 'guest@home.pk', '12345', '<script>', 'a'.repeat(40)]) expect(firstName(bad)).toBe('');
  });
});
