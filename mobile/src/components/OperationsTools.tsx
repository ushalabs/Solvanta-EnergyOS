import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle, Battery, Building2, CalendarClock, ClipboardCheck, Leaf, LineChart, Layers, ShieldCheck, TrendingUp, Zap } from 'lucide-react-native';
import { api } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING } from '../theme/tokens';
import { Action, Chip, ChipGroup, Label, Message } from './TwinControls';
import { Collapsible } from './Collapsible';
import { MCPToolResultCard } from './MCPToolResultCard';
import { TOOLS, ToolInfo, ToolResultData, firstName, friendlyToolError, needsScenario, toolInfo } from '../api/toolResult';

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
type Request = { name: string; phase: 'running' | 'done' | 'error'; message?: string };

/**
 * Guided shortcuts to the engine tools, laid out like a chat: a greeting, suggestion rows, an echo of the shortcut that was
 * tapped, and the real request state. There is no free-text input because no language model is connected.
 */
export function OperationsTools({ buildingId }: { buildingId: string }) {
  const { tokens: t } = useTheme();
  const [tools, setTools] = useState<string[]>([]), [runs, setRuns] = useState<Array<{ id: string; created_at: string }>>([]);
  const [scenario, setScenario] = useState(''), [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [name, setName] = useState('');
  useEffect(() => { let active = true; api.getCurrentUser().then(u => { if (active) setName(firstName(u.full_name)); }).catch(() => {}); return () => { active = false; }; }, []);
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
      setResult(response); setRequest({ name: tool, phase: 'done' });
    } catch (e: any) { setRequest({ name: tool, phase: 'error', message: friendlyToolError(e) }); } finally { setBusy(false); }
  };
  const primary = (Object.keys(TOOLS) as string[]).filter(n => TOOLS[n as keyof typeof TOOLS].group === 'primary' && tools.includes(n));
  const more = tools.filter(n => !primary.includes(n));
  const blocked = (n: string) => busy || (needsScenario(n) && !scenario);
  const shortcut = (n: string) => { const info = toolInfo(n); const Icon = ICONS[info.icon]; return <Action key={n} title={info.chip} variant="secondary" disabled={blocked(n)} icon={<Icon size={18} color={blocked(n) ? t.textSecondary : t.limeText} />} onPress={() => invoke(n)} />; };
  // A run without a usable date is shown by its id alone, never as Invalid Date.
  const scenarioLabel = (r: { id: string; created_at: string }) => { const when = new Date(r.created_at); return Number.isNaN(when.getTime()) ? r.id.slice(0, 8) : `${r.id.slice(0, 8)} · ${when.toLocaleString()}`; };
  const current = runs.find(r => r.id === scenario);
  const info = request ? toolInfo(request.name) : null;

  return <View style={{ gap: SPACING.md }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm }}>
      <View testID="assistant-avatar" style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}><Leaf size={18} color={t.limeText} /></View>
      <View testID="greeting-bubble" style={{ flex: 1, gap: 4, padding: 14, borderRadius: RADIUS.card, borderTopLeftRadius: 6, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}>
        <Text style={{ color: t.textPrimary, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>{name ? `Hello ${name}!` : 'Hello!'}</Text>
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
    {request?.phase === 'running' && info && <View testID="request-running" accessibilityLiveRegion="polite" accessibilityState={{ busy: true }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: RADIUS.card, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}><ActivityIndicator size="small" color={t.limeText} /><Text style={{ flex: 1, color: t.textPrimary, fontSize: 15, lineHeight: 21, fontWeight: '600' }}>Running {info.label.toLowerCase()}…</Text></View>}
    {request?.phase === 'error' && <View testID="request-error" style={{ gap: SPACING.sm }}><Message tone="danger">{request.message}</Message><Action title="Try again" variant="secondary" disabled={busy} onPress={() => invoke(request.name)} /></View>}
    {request?.phase === 'done' && result && <View testID="request-done" accessibilityLiveRegion="polite"><MCPToolResultCard result={result} />{info?.note ? <Label tone="secondary" caption>{info.note}</Label> : null}</View>}

    <Collapsible title="Saved scenario" subtitle={current ? `Using ${scenarioLabel(current)}` : 'None saved yet'} icon={<LineChart size={18} color={t.limeText} />}>
      <Label tone="secondary" caption strong>Saved scenario · immutable simulation run</Label>
      {!runs.length && <Message tone="warning">Save a simulation first to enable scenario tools.</Message>}
      <ChipGroup>{runs.map(r => <Chip key={r.id} label={scenarioLabel(r)} a11yLabel={`${scenario === r.id ? '✓ ' : ''}${scenarioLabel(r)}`} selected={scenario === r.id} disabled={busy} onPress={() => { setScenario(r.id); setResult(null); setRequest(null); }} />)}</ChipGroup>
    </Collapsible>
    {!!more.length && <Collapsible title="More shortcuts" subtitle="Profile, scenario, forecast, resilience and plan" icon={<Layers size={18} color={t.limeText} />}>
      <View style={{ gap: SPACING.sm }}>{more.map(shortcut)}</View>
    </Collapsible>}
    <Action title="Open Human Plan Review" variant="secondary" icon={<ClipboardCheck size={16} color={t.textPrimary} />} onPress={() => router.push('/simulation')} />
  </View>;
}
