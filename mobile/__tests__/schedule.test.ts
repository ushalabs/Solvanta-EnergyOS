import { mergeSegments, complement, solarSegments, spanText, totalMinutes, windowText, sortEntries, scheduleHeadline, clock } from '../src/api/schedule';
import { scenarioOutages, OUTAGE_PRESET } from '../src/api/simulation';

const seg = (a: number, b: number) => ({ start_min: a, end_min: b });
describe('segments', () => {
  test('merge joins touching and overlapping spans and drops empty ones', () => {
    expect(mergeSegments([seg(600, 720), seg(0, 60), seg(60, 120), seg(700, 800), seg(900, 900), seg(950, 940)])).toEqual([seg(0, 120), seg(600, 800)]);
    expect(mergeSegments([])).toEqual([]);
  });
  test('merge does not change its input', () => { const input = [seg(60, 120), seg(0, 60)]; mergeSegments(input); expect(input).toEqual([seg(60, 120), seg(0, 60)]); });
  test('complement is the day outside the outages', () => {
    expect(complement([seg(480, 600)])).toEqual([seg(0, 480), seg(600, 1440)]);
    expect(complement([])).toEqual([seg(0, 1440)]);
    expect(complement([seg(0, 60), seg(1380, 1440)])).toEqual([seg(60, 1380)]);
    expect(complement([seg(0, 1440)])).toEqual([]);
    expect(complement([seg(100, 200), seg(150, 300)])).toEqual([seg(0, 100), seg(300, 1440)]);
  });
  test('solar segments are the hours with output, merged', () => {
    const tl = Array.from({ length: 24 }, (_, h) => ({ hour: h, ac_kw: h >= 6 && h < 18 ? 2 : 0 }));
    expect(solarSegments(tl)).toEqual([seg(360, 1080)]);
    expect(solarSegments([{ hour: 6, ac_kw: 1 }, { hour: 9, ac_kw: 1 }, { hour: 10, ac_kw: NaN }])).toEqual([seg(360, 420), seg(540, 600)]);
    expect(solarSegments(null)).toEqual([]);
  });
  test('text and totals', () => {
    expect(spanText([seg(360, 480), seg(600, 660)])).toBe('06:00 – 08:00, 10:00 – 11:00');
    expect(spanText([])).toBe('—');
    expect(totalMinutes([seg(360, 480), seg(600, 660)])).toBe(180);
    expect(clock(1440)).toBe('24:00');
  });
});

describe('appliance helpers', () => {
  test('window text needs both ends from the appliance list', () => {
    expect(windowText({ earliest_min: 360, latest_min: 1320 })).toBe('06:00 – 22:00');
    expect(windowText({ earliest_min: 360 })).toBe('—');
    expect(windowText(null)).toBe('—');
  });
  test('entries are sorted by first start, and unscheduled ones go last', () => {
    const e = (name: string, segments: any[]) => ({ appliance_id: name, name, priority: 'low', rated_power_w: 1, segments });
    expect(sortEntries([e('c', []), e('b', [seg(600, 660)]), e('a', [seg(60, 120)]), e('a2', [seg(60, 90)])]).map(x => x.name)).toEqual(['a', 'a2', 'b', 'c']);
  });
});

describe('headline', () => {
  const base = { validated: true, demand_kwh: 4.256, entries: [{ appliance_id: '1', name: 'x', priority: 'low', rated_power_w: 1, segments: [] }] };
  test('optimal and feasible are ready, with only real figures', () => {
    expect(scheduleHeadline({ ...base, status: 'OPTIMAL' })).toEqual({ title: 'Optimized schedule ready', subtitle: '1 appliance · 4.26 kWh requested · independently validated', ready: true });
    expect(scheduleHeadline({ ...base, status: 'FEASIBLE', validated: false }).subtitle).toBe('1 appliance · 4.26 kWh requested');
    expect(scheduleHeadline({ ...base, status: 'FEASIBLE' }).title).toBe('Feasible schedule ready');
  });
  test('other statuses say no schedule was saved', () => {
    expect(scheduleHeadline({ ...base, status: 'INFEASIBLE' })).toMatchObject({ title: 'No schedule saved', ready: false });
  });
  test('without a result there is nothing to claim', () => { expect(scheduleHeadline(null)).toMatchObject({ title: 'No schedule yet', ready: false }); });
  test('a missing energy figure is left out, not shown as zero', () => {
    expect(scheduleHeadline({ ...base, status: 'OPTIMAL', demand_kwh: undefined, validated: false }).subtitle).toBe('1 appliance');
  });
});

describe('scenario outages', () => {
  test('Normal is none, Outage is the preset, Custom is the typed text', () => {
    expect(scenarioOutages('normal', '600-720')).toBe('');
    expect(scenarioOutages('outage', '600-720')).toBe(OUTAGE_PRESET);
    expect(scenarioOutages('custom', '600-720')).toBe('600-720');
  });
});
