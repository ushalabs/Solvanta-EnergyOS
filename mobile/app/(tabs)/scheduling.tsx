import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { CalendarClock, History, Plug } from 'lucide-react-native';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { Card, CardHeader, Label, Message, Field, Action, ListAction, BuildingHeader, useBuildings } from '../../src/components/TwinControls';
import { PillSegmentedControl } from '../../src/components/PillSegmentedControl';
import { PriorityBadge, PriorityTier } from '../../src/components/PriorityBadge';
import { ScheduleTimeline, TimelineLane } from '../../src/components/ScheduleTimeline';
import { NeonHeroCard } from '../../src/components/NeonHeroCard';
import { Collapsible } from '../../src/components/Collapsible';
import { OutageRows } from '../../src/components/OutageRows';
import { rowsToText, textToRows, hasOverlap } from '../../src/api/outageRows';
import { api } from '../../src/api/client';
import { Appliance, ApplianceList } from '../../src/api/appliances';
import { PVRecord } from '../../src/api/pv';
import { parseOutages, Scenario, scenarioOutages } from '../../src/api/simulation';
import { ScheduleResult, clock, complement, solarSegments, sortEntries, spanText, totalMinutes, windowText, scheduleHeadline } from '../../src/api/schedule';
import { useTheme } from '../../src/theme/ThemeContext';
import { RADIUS, SPACING } from '../../src/theme/tokens';

type Schedule = { id: string | null; created_at?: string; result: ScheduleResult };
const DASH = '—';

function SchedulingWorkspace({ picker }: { picker: ReturnType<typeof useBuildings> }) {
  const { tokens: t } = useTheme();
  const building = { id: picker.id };
  const [scenario, setScenario] = useState<Scenario>('outage');
  const [customText, setCustomText] = useState('480-600');
  const [expert, setExpert] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Schedule | null>(null);
  const [history, setHistory] = useState<Schedule[]>([]);
  // Read-only context for the timeline and the rows. Undefined while loading, null when unavailable.
  const [pv, setPv] = useState<Array<{ hour: number; ac_kw: number }> | null | undefined>(undefined);
  const [appliances, setAppliances] = useState<Record<string, Appliance> | null | undefined>(undefined);
  const [message, setMessage] = useState('Select appliances in the Appliances tab, then schedule all selected loads.');
  const outages = scenarioOutages(scenario, customText);
  // The rows and the expert field are two views of the same text, so they stay in step.
  const customRows = textToRows(customText);
  useEffect(() => { let active = true; setResult(null); setHistory([]); if (building.id) api.get<Schedule[]>(`/buildings/${building.id}/schedules`).then(r => { if (active) setHistory(r); }).catch(e => { if (active) setMessage(e.message); }); return () => { active = false; }; }, [building.id]);
  useEffect(() => { let active = true; setPv(undefined); if (building.id) api.get<PVRecord>(`/buildings/${building.id}/pv`).then(r => { if (active) setPv(r.profile.timeline); }).catch(() => { if (active) setPv(null); }); else setPv(null); return () => { active = false; }; }, [building.id]);
  useEffect(() => { let active = true; setAppliances(undefined); if (building.id) api.get<ApplianceList>(`/buildings/${building.id}/appliances`).then(r => { if (active) setAppliances(Object.fromEntries(r.items.map(a => [a.id, a]))); }).catch(() => { if (active) setAppliances(null); }); else setAppliances(null); return () => { active = false; }; }, [building.id]);
  async function run() { setBusy(true); try { const r = await api.post<Schedule>(`/buildings/${building.id}/schedules`, { outages: parseOutages(outages), use_generator: false }, 30000); setResult(r); if (r.id) setHistory([r, ...history].slice(0, 20)); setMessage(r.id ? 'Validated schedule saved. No physical switching.' : 'No schedule saved; see conflict details below.'); } catch (e: any) { setMessage(e.message); } finally { setBusy(false); } }

  let ranges: Array<{ start_min: number; end_min: number }> | null = [];
  try { ranges = parseOutages(outages); } catch { ranges = null; }
  const outageText = scenario === 'normal' ? 'No outage: the grid is available all day.' : ranges === null ? 'Check the minute ranges.' : ranges.length ? `Outage ${ranges.map(r => `${clock(r.start_min)} – ${clock(r.end_min)}`).join(', ')}.` : 'No outage ranges.';

  const schedule = result?.result;
  const entries = schedule ? sortEntries(schedule.entries) : [];
  const headline = scheduleHeadline(schedule);
  const solar = solarSegments(pv ?? []);
  const lanes: TimelineLane[] = [
    { id: 'solar', label: 'Solar', tone: 'solar', segments: solar, emptyNote: pv === undefined ? 'Loading…' : pv === null ? 'No PV estimate' : 'No output', a11yLabel: `Solar, estimated from the PV design: ${solar.length ? spanText(solar) : 'no estimate'}` },
    { id: 'grid', label: 'Grid', tone: 'grid', segments: ranges ? complement(ranges) : [], emptyNote: ranges ? 'Unavailable all day' : 'Check ranges', a11yLabel: `Grid available outside the outage: ${ranges ? spanText(complement(ranges)) : 'unknown'}` },
    ...entries.map(e => ({ id: `app-${e.appliance_id}`, label: e.name, tone: 'appliance' as const, segments: e.segments, emptyNote: 'Not scheduled', a11yLabel: `${e.name} scheduled ${e.segments.map(s => `${clock(s.start_min)} to ${clock(s.end_min)}`).join(', ')}` })),
  ];
  const footer = <Action title="Solve Schedule" label="Solve & Save Schedule" disabled={busy || !building.id} loading={busy} icon={<CalendarClock size={18} color={busy || !building.id ? t.textSecondary : t.onLime} />} onPress={run} />;

  return <SolvantaScreen banner="SIMULATED • Constraint-aware appliance scheduling" footer={footer}>
    <BuildingHeader title="Scheduling" building={picker} onBack={() => router.replace('/simulation')} backLabel="Back to Simulation" />
    <PillSegmentedControl a11yLabel="Scenario" selectedId={scenario} onSelect={id => setScenario(id as Scenario)} options={[{ id: 'normal', label: 'Normal' }, { id: 'outage', label: 'Outage' }, { id: 'custom', label: 'Custom' }]} />
    {scenario === 'custom' && <>
      {customRows
        ? <OutageRows rows={customRows} onChange={r => setCustomText(rowsToText(r))} problem={hasOverlap(customRows) ? 'These outages overlap. Move one so they do not share a minute.' : null} />
        : <Message tone="warning">These minute ranges cannot be shown as rows. Fix them in Expert settings.</Message>}
      <Action title={expert ? 'Hide expert settings' : 'Expert settings'} variant="secondary" onPress={() => setExpert(!expert)} />
      <View style={expert ? { gap: SPACING.sm } : { display: 'none' }}><Field label="Outages (minute ranges, e.g. 480-600)" value={customText} onChange={setCustomText} /></View>
    </>}
    <Label tone="secondary" caption>{outageText} Uses PV plus available grid. Battery and generator support are reserved for resilience optimization. All selected appliances must finish; fixed loads remain at their earliest start.</Label>

    <ScheduleTimeline title="24-HOUR SCHEDULE TIMELINE" sourceTag="SIMULATED" lanes={lanes} bands={(ranges ?? []).map(r => ({ from: r.start_min, to: r.end_min }))}
      legend={[{ tone: 'solar', label: 'Solar (estimated)' }, { tone: 'grid', label: 'Grid' }, { tone: 'appliance', label: 'Appliance' }, ...(ranges && ranges.length ? [{ tone: 'outage' as const, label: 'Outage' }] : [])]} />

    {headline.ready
      ? <NeonHeroCard badgeText="SIMULATED" title={headline.title} subtitle={headline.subtitle}>
          {schedule!.supply_policy ? <Text style={{ color: t.onLime, fontSize: 12, lineHeight: 17, marginTop: 8 }}>{schedule!.supply_policy}</Text> : null}
          {schedule!.objective_description ? <Text style={{ color: t.onLime, fontSize: 12, lineHeight: 17, marginTop: 4 }}>{schedule!.objective_description}</Text> : null}
          {result!.id ? <Text style={{ color: t.onLime, fontSize: 12, lineHeight: 17, marginTop: 4 }}>Saved run {result!.id.slice(0, 8)}</Text> : null}
        </NeonHeroCard>
      : <Card><CardHeader title={headline.title} subtitle={headline.subtitle} icon={<CalendarClock size={18} color={t.limeText} />} />{schedule?.supply_policy ? <Label tone="secondary" caption>{schedule.supply_policy}</Label> : null}</Card>}
    {schedule?.reasons.map(r => <Message key={r} tone="warning">{r}</Message>)}

    {entries.map(e => {
      const app = appliances ? appliances[e.appliance_id] : undefined;
      const known = !!app;
      return <View key={e.appliance_id} testID="schedule-row" accessibilityLabel={`${e.name}, ${spanText(e.segments)}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surfaceElevated }}><Plug size={20} color={t.textSecondary} /></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text numberOfLines={1} style={{ color: t.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: '600' }}>{e.name}</Text>
          <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 18 }}>{spanText(e.segments)}{e.segments.length ? ` · ${totalMinutes(e.segments)} min` : ''} · {(e.rated_power_w / 1000).toFixed(2)} kW</Text>
          <Text style={{ color: t.textSecondary, fontSize: 12, lineHeight: 16 }}>Allowed {known ? windowText(app) : DASH}</Text>
          <PriorityBadge priority={e.priority as PriorityTier} flexible={known && app!.flexible} fixed={known && !app!.flexible} critical={known && app!.critical} tags={e.segments.length > 1 ? [`Split into ${e.segments.length}`] : []} />
        </View>
      </View>;
    })}
    <Message>{message}</Message>
    <Collapsible title="Saved schedules" subtitle="Latest 20" icon={<History size={18} color={t.limeText} />}>
      <View style={{ gap: SPACING.sm }}>{history.length ? history.map(r => <ListAction key={r.id ?? r.created_at} title={`${new Date(r.created_at!).toLocaleString()} · ${r.id?.slice(0, 8)}`} onPress={() => setResult(r)} />) : <Label tone="secondary" caption>No saved schedules yet.</Label>}</View>
    </Collapsible>
  </SolvantaScreen>;
}

export default function Scheduling() {
  const building = useBuildings();
  return <SchedulingWorkspace key={building.id} picker={building} />;
}
