import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle, Battery, Building2, CalendarClock, ClipboardCheck, LineChart, Layers, ShieldCheck, TrendingUp, Zap } from 'lucide-react-native';
import { api } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING } from '../theme/tokens';
import { Action, Chip, ChipGroup, Label, Message } from './TwinControls';
import { Collapsible } from './Collapsible';
import { SolvantaLogo } from './SolvantaLogo';
import { Disclosure, MCPToolResultCard } from './MCPToolResultCard';
import { TOOLS, PRIMARY_TOOLS, ToolInfo, ToolResultData, friendlyToolError, needsScenario, rawErrorText, runLabel, toolInfo } from '../api/toolResult';

type Result = ToolResultData;
export function resultSummary(result: Result): Record<string, unknown> {
  const d = result.data;
  if (d.result?.summary) return d.result.summary;
  if (d.optimized?.summary) return { critical_energy_saved_kwh: d.critical_energy_saved_kwh, optimized: d.optimized.summary };
  if (d.projection?.summary) return { shortage: d.shortage, projection: d.projection.summary };
  if (d.variants) return { state: d.state, revision: d.revision, run_id: d.run_id, variants: d.variants.map((v: any) => ({ name: v.name, summary: v.summary, tradeoff: v.tradeoff })) };
  if (d.entries) return { status: d.status, validated: d.validated, demand_kwh: d.demand_kwh, reasons: d.reasons, entries: d.entries };
  if (d.incidents) return { incidents: d.incidents.map((i: any) => ({ id: i.id, source: i.source, code: i.code, state: i.state, possible_cause: i.possible_cause })) };
  return d;
}

const ICONS: Record<ToolInfo['icon'], React.ComponentType<any>> = { zap: Zap, calendar: CalendarClock, battery: Battery, alert: AlertTriangle, building: Building2, forecast: TrendingUp, shield: ShieldCheck, scenario: Layers, plan: ClipboardCheck };
type Request = { name: string; phase: 'running' | 'done' | 'error'; message?: string; raw?: string };

/**
 * Guided shortcuts to the engine tools, laid out like a chat: a greeting, suggestion rows, an echo of the shortcut that was
 * tapped, and the real request state. There is no free-text input because no language model is connected.
 * `onFooter` receives a compact row of the primary shortcuts once there is a result, for the screen to pin above the dock,
 * and `onScrollTo` asks the screen to scroll so a new result starts at the top.
 */
export function OperationsTools({ buildingId, onFooter, onScrollTo }: { buildingId: string; onFooter?: (node: React.ReactNode | null) => void; onScrollTo?: (y: number) => void }) {
  const { tokens: t } = useTheme();
  const [tools, setTools] = useState<string[]>([]), [runs, setRuns] = useState<Array<{ id: string; created_at: string }>>([]);
  const [scenario, setScenario] = useState(''), [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [hadResult, setHadResult] = useState(false);
  const rootY = useRef(0);
  useEffect(() => {
    let active = true; setLoading(true); setLoadError('');
    Promise.all([api.get<{ tools: Array<{ name: string }> }>('/operations/tools'), api.get<typeof runs>(`/buildings/${buildingId}/simulations`)])
      .then(([t, r]) => { if (active) { setTools(t.tools.map(x => x.name)); setRuns(r); setScenario(r[0]?.id || ''); setLoading(false); } })
      .catch(e => { if (active) { setLoadError(friendlyToolError(e)); setLoading(false); } });
    return () => { active = false; };
  }, [buildingId]);
  const invoke = async (tool: string) => {
    setBusy(true); setResult(null); setRequest({ name: tool, phase: 'running' });
    try {
      const arguments_ = tool === 'get_building_profile' || tool === 'get_energy_anomalies' ? { building_id: buildingId } : { scenario_id: scenario, ...(tool === 'compare_energy_configurations' ? { variations: [0, 1, 2] } : {}) };
      const response = await api.post<Result>(`/operations/tools/${tool}`, arguments_, 30000);
      setResult(response); setHadResult(true); setRequest({ name: tool, phase: 'done' });
    } catch (e: any) { setRequest({ name: tool, phase: 'error', message: friendlyToolError(e), raw: rawErrorText(e) }); } finally { setBusy(false); }
  };
  const invokeRef = useRef(invoke); invokeRef.current = invoke;
  const primary = PRIMARY_TOOLS.filter(n => tools.includes(n));
  const more = tools.filter(n => !primary.includes(n as any));
  const blocked = (n: string) => busy || (needsScenario(n) && !scenario);
  const shortcut = (n: string) => { const info = toolInfo(n); const Icon = ICONS[info.icon]; return <Action key={n} title={info.chip} variant="secondary" disabled={blocked(n)} icon={<Icon size={18} color={blocked(n) ? t.textSecondary : t.limeText} />} onPress={() => invoke(n)} />; };
  const info = request ? toolInfo(request.name) : null;
  const current = runs.find(r => r.id === scenario);
  const runName = (r: { id: string; created_at: string }) => runLabel(r.created_at, runs[0]?.id === r.id);

  // Once there is a result, the primary shortcuts are offered again in a compact row pinned above the dock.
  const quickKey = `${hadResult}|${busy}|${scenario}|${primary.join(',')}`;
  useEffect(() => {
    if (!onFooter) return;
    onFooter(hadResult && primary.length ? <ScrollView testID="quick-chips" horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: SPACING.sm, paddingVertical: 2, paddingRight: SPACING.sm }}>
      {primary.map(n => <Chip key={n} compact label={toolInfo(n).chip} a11yLabel={`Quick shortcut: ${toolInfo(n).chip}`} disabled={blocked(n)} onPress={() => invokeRef.current(n)} />)}
    </ScrollView> : null);
    return () => onFooter(null);
  }, [quickKey]);
  const reveal = (e: any) => onScrollTo?.(Math.max(0, rootY.current + e.nativeEvent.layout.y - 8));

  return <View style={{ gap: SPACING.md }} onLayout={e => { rootY.current = e.nativeEvent.layout.y; }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm }}>
      <View testID="assistant-avatar"><SolvantaLogo ring size={40} /></View>
      <View testID="greeting-bubble" style={{ flex: 1, gap: 4, padding: 14, borderRadius: RADIUS.card, borderTopLeftRadius: 6, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}>
        <Text style={{ color: t.textPrimary, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>Hi, I can run these checks on your saved building.</Text>
        <Text style={{ color: t.textPrimary, fontSize: 14, lineHeight: 20 }}>These are guided shortcuts to your system's tools. Tap one to run it on your saved building data.</Text>
        <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 18 }}>I cannot answer free-form questions: no language model is connected.</Text>
      </View>
    </View>

    <Text accessibilityRole="header" style={{ color: t.textSecondary, fontSize: 13, lineHeight: 18, fontWeight: '600', marginLeft: 48 }}>Ask about your system</Text>
    <View style={{ gap: SPACING.sm, marginLeft: 48 }}>
      {loading && <Message>Loading shortcuts…</Message>}
      {!!loadError && <Message tone="warning">{loadError}</Message>}
      {!loading && !loadError && !primary.length && <Message tone="warning">No shortcuts are available right now.</Message>}
      {primary.map(shortcut)}
      {!loading && !runs.length && !loadError && <Message tone="warning">Save a simulation first to enable scenario shortcuts.</Message>}
      <Label tone="secondary" caption>Tool execution only. Results use configured or SIMULATED data; tools never approve plans or control physical equipment.</Label>
    </View>

    {request && info && <View testID="echo-bubble" style={{ alignSelf: 'flex-end', maxWidth: '82%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: RADIUS.card, borderBottomRightRadius: 6, backgroundColor: t.lime }}><Text style={{ color: t.onLime, fontSize: 15, lineHeight: 21, fontWeight: '600' }}>{info.chip}</Text></View>}
    {request && info && <View testID="request-block" onLayout={reveal} style={{ gap: SPACING.sm }}>
      {request.phase === 'running' && <View testID="request-running" accessibilityLiveRegion="polite" accessibilityState={{ busy: true }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: RADIUS.card, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}><ActivityIndicator size="small" color={t.limeText} /><Text style={{ flex: 1, color: t.textPrimary, fontSize: 15, lineHeight: 21, fontWeight: '600' }}>Running {info.label.toLowerCase()}…</Text></View>}
      {request.phase === 'error' && <View testID="request-error" style={{ gap: SPACING.sm, padding: 14, borderRadius: RADIUS.card, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}>
        <Message tone="danger">{request.message}</Message>
        <Action title="Retry" variant="secondary" disabled={busy} onPress={() => invoke(request.name)} />
        <Disclosure title="Technical details"><Text selectable testID="raw-error" style={{ color: t.textSecondary, fontSize: 12, lineHeight: 17 }}>{request.raw}</Text></Disclosure>
      </View>}
      {request.phase === 'done' && result && <View testID="request-done" accessibilityLiveRegion="polite"><MCPToolResultCard result={result} note={info.note} action={request.name === 'optimize_appliance_schedule' ? { label: 'Open in Scheduling', onPress: () => router.push('/scheduling') } : undefined} /></View>}
    </View>}

    <Collapsible title="Saved scenario" subtitle={current ? `Using ${runName(current)}` : 'None saved yet'} icon={<LineChart size={18} color={t.limeText} />}>
      <Label tone="secondary" caption strong>Saved scenario · immutable simulation run</Label>
      {!runs.length && <Message tone="warning">Save a simulation first to enable scenario tools.</Message>}
      <ChipGroup>{runs.map(r => <Chip key={r.id} label={runName(r)} a11yLabel={`${scenario === r.id ? '✓ ' : ''}${runName(r)}`} selected={scenario === r.id} disabled={busy} onPress={() => { setScenario(r.id); setResult(null); setRequest(null); }} />)}</ChipGroup>
    </Collapsible>
    {!!more.length && <Collapsible title="More shortcuts" subtitle="Profile, scenario, forecast, resilience and plan" icon={<Layers size={18} color={t.limeText} />}>
      <View style={{ gap: SPACING.sm }}>{more.map(shortcut)}</View>
    </Collapsible>}
    <Action title="Open Human Plan Review" variant="secondary" icon={<ClipboardCheck size={16} color={t.textPrimary} />} onPress={() => router.push('/simulation')} />
  </View>;
}
