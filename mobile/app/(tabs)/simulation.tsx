import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Play, CalendarClock, ChevronLeft, ChevronRight, History, Zap, Pencil } from 'lucide-react-native';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { SocGauge } from '../../src/components/SocGauge';
import { Card, CardHeader, Label, Message, Metric, MetricGrid, Field, Toggle, Action, ActionRow, ListAction, BuildingHeader, useBuildings } from '../../src/components/TwinControls';
import { PillSegmentedControl } from '../../src/components/PillSegmentedControl';
import { Collapsible } from '../../src/components/Collapsible';
import { LineChart } from '../../src/components/LineChart';
import { useTheme } from '../../src/theme/ThemeContext';
import { RADIUS, SPACING } from '../../src/theme/tokens';
import { api } from '../../src/api/client';
import { ForecastCard } from '../../src/components/ForecastCard';
import { ResilienceCard, ResilienceTraces } from '../../src/components/ResilienceCard';
import { PlanCard } from '../../src/components/PlanCard';
import { AutomationCard } from '../../src/components/AutomationCard';
import { TelemetryCard } from '../../src/components/TelemetryCard';
import { TwinReplay } from '../../src/components/TwinReplay';
import { EnergyRun, parseOutages } from '../../src/api/simulation';
import { loadActivity } from '../../src/api/replay';
import { socPoints, clock } from '../../src/api/lineChart';

type Scenario = 'normal' | 'outage' | 'custom';
/** The Outage preset is the screen's original example range, 08:00 to 10:00. */
const OUTAGE_PRESET = '480-600';
const DASH = '—';
const hours = (minutes: number) => { const h = minutes / 60; return Number.isInteger(h) ? String(h) : h.toFixed(1); };

function SimulationWorkspace({ picker }: { picker: ReturnType<typeof useBuildings> }) {
  const { tokens: t } = useTheme();
  const building = { id: picker.id };
  const [scenario, setScenario] = useState<Scenario>('outage');
  const [customText, setCustomText] = useState(OUTAGE_PRESET);
  const [generator, setGenerator] = useState(false);
  const [run, setRun] = useState<EnergyRun | null>(null);
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState<Array<{ id: string; created_at: string }>>([]);
  const [message, setMessage] = useState('Save a roof/PV design and select appliances before running.');
  const [busy, setBusy] = useState(false);
  const [comparison, setComparison] = useState<ResilienceTraces | null>(null);
  const [startSoc, setStartSoc] = useState<number | null>(null);
  // The text the existing run and cards use. Normal means no outage, Outage is the preset, Custom is the typed field.
  const outages = scenario === 'normal' ? '' : scenario === 'outage' ? OUTAGE_PRESET : customText;
  useEffect(() => { let active = true; setRun(null); setHistory([]); setStep(0); if (building.id) api.get<Array<{ id: string; created_at: string }>>(`/buildings/${building.id}/simulations`).then(r => { if (active) setHistory(r); }).catch(e => { if (active) setMessage(e.message); }); return () => { active = false; }; }, [building.id]);
  useEffect(() => { let active = true; setStartSoc(null); if (building.id) api.getBuildingEquipment(building.id).then(e => { if (active && Number.isFinite(e?.battery?.initial_soc_pct)) setStartSoc(e.battery.initial_soc_pct); }).catch(() => {}); return () => { active = false; }; }, [building.id]);
  // A comparison belongs to one scenario, as the card itself restarts when the scenario changes.
  useEffect(() => { setComparison(null); }, [building.id, outages, generator]);
  async function execute() { if (!building.id || busy) return; setBusy(true); try {
    const result = await api.post<EnergyRun>(`/buildings/${building.id}/simulations`, { outages: parseOutages(outages), use_generator: generator }); setRun(result); setStep(0); setHistory([{ id: result.id, created_at: result.created_at }, ...history].slice(0, 20)); setMessage('Simulation saved. No physical switching occurred.');
  } catch (e: any) { setMessage(e.message); } finally { setBusy(false); } }
  async function open(id: string) { setBusy(true); try { setRun(await api.get<EnergyRun>(`/buildings/${building.id}/simulations/${id}`)); setStep(0); setMessage('Loaded immutable saved run.'); } catch (e: any) { setMessage(e.message); } finally { setBusy(false); } }
  const p = run?.result.trace[step];

  let ranges: Array<{ start_min: number; end_min: number }> | null = [];
  try { ranges = parseOutages(outages); } catch { ranges = null; }
  const span = (r: { start_min: number; end_min: number }) => `${clock(r.start_min)} – ${clock(r.end_min)}`;
  const heading = scenario === 'normal' ? { title: 'Normal day', sub: 'Grid available all day · representative day' }
    : ranges === null ? { title: 'Custom outage', sub: 'Check the minute ranges below' }
    : !ranges.length ? { title: 'Custom scenario', sub: 'No outage ranges · representative day' }
    : ranges.length === 1 ? { title: `${hours(ranges[0].end_min - ranges[0].start_min)} Hour Outage`, sub: `${span(ranges[0])} · representative day` }
    : { title: `${ranges.length} outages`, sub: `${ranges.map(span).join(', ')} · representative day` };

  const current = comparison ? socPoints(comparison.baseline.trace) : socPoints(run?.result.trace);
  const optimized = comparison ? socPoints(comparison.optimized.trace) : [];
  const chartNote = comparison ? 'Both lines come from the saved resilience comparison for this scenario.' : run ? 'Current plan is the saved run. Open Resilience comparison below and compare to add the optimized plan.' : undefined;

  const activities = run && p ? loadActivity(run.snapshot.appliances || [], p.minute) : [];
  const haveActivity = !!run && activities.length > 0;
  const count = (n: number) => haveActivity ? String(n) : DASH;
  const statusTiles = [
    { label: 'Requested now', value: count(activities.filter(a => a.selected && a.active).length), tint: t.limeMark },
    { label: 'Outside window', value: count(activities.filter(a => a.selected && !a.active).length), tint: t.amberText },
    { label: 'Not selected', value: count(activities.filter(a => !a.selected).length), tint: t.textSecondary },
  ];
  const stats = [
    { label: 'Battery at start', value: startSoc === null ? DASH : startSoc.toFixed(0), unit: startSoc === null ? undefined : '%' },
    { label: 'PV Generation', value: run ? run.result.summary.pv_kwh.toFixed(1) : DASH, unit: run ? 'kWh' : undefined },
    { label: 'Total Load', value: run ? run.result.summary.load_kwh.toFixed(1) : DASH, unit: run ? 'kWh' : undefined },
  ];
  const footer = <Action title="Run Simulation" label="Run & Save Simulation" disabled={busy || !building.id} loading={busy} icon={<Play size={18} color={busy || !building.id ? t.textSecondary : t.onLime} />} onPress={execute} />;

  return <SolvantaScreen banner="SIMULATED • saved 15-minute energy balance" footer={footer}>
    <BuildingHeader title="Simulation" building={picker} />
    <PillSegmentedControl a11yLabel="Scenario" selectedId={scenario} onSelect={id => setScenario(id as Scenario)} options={[{ id: 'normal', label: 'Normal' }, { id: 'outage', label: 'Outage' }, { id: 'custom', label: 'Custom' }]} />
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: t.limeTint }}><Zap size={20} color={t.limeText} /></View>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ color: t.textPrimary, fontSize: 17, lineHeight: 22, fontWeight: '600' }}>{heading.title}</Text>
          <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 18 }}>{heading.sub}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit outage times" activeOpacity={0.8} onPress={() => setScenario('custom')} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surfaceElevated }}><Pencil size={16} color={t.textSecondary} /></TouchableOpacity>
      </View>
      <MetricGrid>{stats.map(s => <Metric key={s.label} compact label={s.label} value={s.value} unit={s.unit} />)}</MetricGrid>
      <Label tone="secondary" caption>SIMULATED values for a representative day. PV and load cover 24 hours, not only the outage.</Label>
      {scenario === 'custom' && <Field label="Outages: minute ranges (0–1440), separated by commas" value={customText} onChange={setCustomText} hint="Example: 480-600 means 08:00–10:00. Blank means grid available all day." />}
      <Toggle label="Use configured generator" value={generator} onValueChange={setGenerator} />
    </Card>
    <LineChart title="Battery Level (Simulated)" badge="SIMULATED" xDomain={[0, 1440]} yDomain={[0, 100]}
      xTicks={[0, 360, 720, 1080, 1440].map(m => ({ value: m, label: clock(m) }))} yTicks={[0, 50, 100].map(v => ({ value: v, label: `${v}%` }))}
      series={[{ id: 'current', label: 'Current Plan', tone: 'lime', area: true, points: current }, { id: 'optimized', label: 'Optimized Plan', tone: 'cyan', points: optimized }]}
      bands={(ranges ?? []).map(r => ({ from: r.start_min, to: r.end_min }))} bandLabel="Outage" note={chartNote} caption={chartNote}
      emptyText="Run a simulation to see the battery level." />
    <Text accessibilityRole="header" style={{ color: t.textPrimary, fontSize: 15, fontWeight: '500', marginTop: 4 }}>Appliances Status</Text>
    <View style={{ flexDirection: 'row', gap: SPACING.sm }}>{statusTiles.map(s => <View key={s.label} accessibilityLabel={`${s.label}: ${s.value}`} style={{ flex: 1, minHeight: 72, padding: 12, borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.tint }} /><Text style={{ color: s.tint, fontSize: 13, lineHeight: 18 }}>{s.label}</Text></View>
      <Text style={{ color: t.textPrimary, fontSize: 24, lineHeight: 30, fontWeight: '700' }}>{s.value}</Text>
    </View>)}</View>
    <Label tone="secondary" caption>{p ? `Shown for ${clock(p.minute)} of the saved run. ` : ''}Paused and deferred are not tracked by the simulation, so they are not shown.</Label>
    <Message>{message}</Message>

    {run && p && <Collapsible title="Run details" subtitle={`Run ${run.id.slice(0, 8)} · ${run.snapshot.pv.source}`}>
      <Card><CardHeader title="Simulation result" subtitle={`Run ${run.id.slice(0, 8)} · ${run.snapshot.pv.source}`} />
        <MetricGrid><Metric label="Requested" value={run.result.summary.load_kwh.toFixed(2)} unit="kWh" /><Metric label="Unmet" value={run.result.summary.unmet_kwh.toFixed(2)} unit="kWh" tone={run.result.summary.unmet_kwh > 0 ? 'warning' : 'primary'} /><Metric label="Critical unmet" value={run.result.summary.unserved_critical_kwh.toFixed(2)} unit="kWh" tone={run.result.summary.unserved_critical_kwh > 0 ? 'danger' : 'success'} /><Metric label="Grid import" value={run.result.summary.grid_import_kwh.toFixed(2)} unit="kWh" /><Metric label="Generator fuel" value={run.result.summary.generator_fuel_l.toFixed(2)} unit="L" /><Metric label="Curtailed" value={run.result.summary.curtailed_kwh.toFixed(2)} unit="kWh" /></MetricGrid>
        <SocGauge socPct={p.soc_pct} caption={`Battery · ${p.battery_end_kwh.toFixed(3)} kWh`} />
        <Label strong>Interval {step + 1}/96 · {Math.floor(p.minute / 60).toString().padStart(2, '0')}:{(p.minute % 60).toString().padStart(2, '0')} · Grid {p.grid_available ? 'available' : 'outage'}</Label>
        <ActionRow><Action title="Previous" label="Previous Interval" variant="secondary" icon={<ChevronLeft size={16} color={step === 0 ? t.textSecondary : t.textPrimary} />} disabled={step === 0} onPress={() => setStep(step - 1)} /><Action title="Next" label="Next Interval" variant="secondary" icon={<ChevronRight size={16} color={step === 95 ? t.textSecondary : t.textPrimary} />} disabled={step === 95} onPress={() => setStep(step + 1)} /></ActionRow>
        <MetricGrid><Metric label="PV" value={p.pv_kw.toFixed(3)} unit="kW" tone="accent" /><Metric label="Load" value={p.load_kw.toFixed(3)} unit="kW" /><Metric label="Grid" value={p.grid_import_kw.toFixed(3)} unit="kW" tone="info" /><Metric label="Generator" value={p.generator_kw.toFixed(3)} unit="kW" tone="warning" /><Metric label="Charge" value={p.charge_kw.toFixed(3)} unit="kW" /><Metric label="Discharge" value={p.discharge_kw.toFixed(3)} unit="kW" /><Metric label="Unmet" value={p.unmet_kw.toFixed(3)} unit="kW" tone={p.unmet_kw > 0 ? 'danger' : 'primary'} /></MetricGrid>
        {run.result.assumptions.map(a => <Label key={a} tone="secondary" caption>{a}</Label>)}
      </Card>
    </Collapsible>}
    {run && <Collapsible title="Digital twin replay" subtitle="Step through the saved run"><TwinReplay run={run} /></Collapsible>}
    <Collapsible title="Telemetry" subtitle="Compare the run with readings"><TelemetryCard key={run?.id || building.id} buildingId={building.id} runId={run?.id} /></Collapsible>
    <Collapsible title="Automation" subtitle="Rules and approvals"><AutomationCard buildingId={building.id} /></Collapsible>
    <Collapsible title="Plans" subtitle="Saved operating plans"><PlanCard buildingId={building.id} outages={outages} useGenerator={generator} /></Collapsible>
    <Collapsible title="Resilience comparison" subtitle="Current plan versus optimized plan"><ResilienceCard key={`resilience-${building.id}-${outages}-${generator}`} buildingId={building.id} outages={outages} useGenerator={generator} onTraces={setComparison} /></Collapsible>
    <Collapsible title="Forecast" subtitle="Forecast scenarios"><ForecastCard key={`forecast-${building.id}-${outages}-${generator}`} buildingId={building.id} outages={outages} useGenerator={generator} /></Collapsible>
    <Collapsible title="Saved runs" subtitle="Latest 20"><Card><CardHeader title="Saved runs" subtitle="Latest 20" icon={<History size={18} color={t.limeText} />} />{history.map(r => <ListAction key={r.id} disabled={busy} title={`${new Date(r.created_at).toLocaleString()} · ${r.id.slice(0, 8)}`} onPress={() => open(r.id)} />)}</Card></Collapsible>
    <Action title="Open Scheduling" variant="secondary" icon={<CalendarClock size={16} color={t.textPrimary} />} onPress={() => router.push('/scheduling')} />
  </SolvantaScreen>;
}

export default function SimulationScreen() {
  const building = useBuildings();
  return <SimulationWorkspace key={building.id} picker={building} />;
}
