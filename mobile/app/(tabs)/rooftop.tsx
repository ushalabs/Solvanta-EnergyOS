import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import Svg, { Polygon, Rect, Circle, Image as SvgImage, Line } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Camera, Undo2, Check, Eraser, Calculator, Save, ScanLine, PencilRuler } from 'lucide-react-native';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { Card, CardHeader, Label, Message, Metric, MetricGrid, Field, FieldRow, Action, ActionRow, BuildingHeader, useBuildings } from '../../src/components/TwinControls';
import { api } from '../../src/api/client';
import { emptyRoof, RoofInput, RoofRecord, Layout, Point, parsePoints, formatPoints, tapToRoofPoint, screenPx, selfIntersects, defaultRectangle } from '../../src/api/roof';
import { compassPoint } from '../../src/api/pv';
import { useTheme } from '../../src/theme/ThemeContext';
import { RADIUS, SPACING } from '../../src/theme/tokens';
import { PVDesigner, PVSummary } from '../../src/components/PVDesigner';
import { PillSegmentedControl } from '../../src/components/PillSegmentedControl';
import { ARCapabilityFallback } from '../../src/components/ARCapabilityFallback';
import { AR_UNAVAILABLE_COPY } from '../../src/ar/arCapability';
import type { ARCapability } from '../../src/ar/arCapability';
import { detectARCapability } from '../../src/ar/detectAR';

const geometryLabels = { setback_m: 'Setback (m)', panel_width_m: 'Panel width (m)', panel_height_m: 'Panel height (m)', gap_m: 'Panel gap (m)' };
type Tab = 'photo' | 'design' | 'ar';
// Inactive sections stay mounted (so nothing is lost when switching tabs) and are only hidden.
const shown = (on: boolean) => on ? undefined : { display: 'none' as const };
const DASH = '—';
const GRID = [0.25, 0.5, 0.75];
// Short buttons that still give a 44px touch area.
const compact = { flex: 1, minHeight: 44, paddingVertical: 8, paddingHorizontal: 8 };

function RooftopWorkspace({picker}:{picker:ReturnType<typeof useBuildings>}) {
  const { tokens: t } = useTheme();
  const building = {id:picker.id};
  const [tab, setTab] = useState<Tab>('design');
  const [advanced, setAdvanced] = useState(false);
  const [pv, setPv] = useState<PVSummary>({ profile: null, wattageW: null, tiltDeg: null, azimuthDeg: null });
  const [arCap, setArCap] = useState<ARCapability | null>(null);
  const [saved, setSaved] = useState<Layout | null>(null);
  const [outdated, setOutdated] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [expert, setExpert] = useState(false);
  const [checkingAR, setCheckingAR] = useState(false);
  const [roof, setRoof] = useState<RoofInput>(emptyRoof);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [mode, setMode] = useState<'roof' | 'obstacle' | 'scale'>('roof');
  const [draft, setDraft] = useState<Point[]>([]);
  const [coords, setCoords] = useState('');
  const [distance, setDistance] = useState('');
  const [message, setMessage] = useState('Draw a roof, then mark two points with a known distance.');
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState(300);
  const apply = (r: RoofRecord) => { setRoof(r.geometry); setDistance(String(r.geometry.scale_distance_m)); setCoords(formatPoints(r.geometry.boundary)); setLayout(r.layout); setSaved(r.layout); setOutdated(false); setUnsaved(false); };
  useEffect(() => {
    let active = true;
    setRoof(emptyRoof()); setLayout(null); setSaved(null); setOutdated(false); setUnsaved(false); setCoords(''); setDistance(''); setDraft([]);
    if (building.id) api.get<RoofRecord>(`/buildings/${building.id}/roof`).then(r => { if (active) { apply(r); setMessage('Loaded saved roof.'); } }).catch(e => { if (active) setMessage(e.status === 404 ? 'No saved roof. Draw a boundary to begin.' : e.message); });
    return () => { active = false; };
  }, [building.id]);
  const change = (next: RoofInput) => { setRoof(next); setLayout(null); setOutdated(true); setUnsaved(false); setMessage('Unsaved geometry changes. Press Calculate Placement first, then Save Roof.'); };
  const outdate = () => { setLayout(null); setOutdated(true); setUnsaved(false); };
  const tap = (x: number, y: number) => {
    const point = tapToRoofPoint(x, y, width, roof.width, roof.height);
    if (mode === 'roof') { const boundary = [...roof.boundary, point]; change({ ...roof, boundary }); setCoords(formatPoints(boundary)); }
    else if (mode === 'obstacle') setDraft([...draft, point]);
    else change({ ...roof, scale_points: roof.scale_points.length === 2 ? [point] : [...roof.scale_points, point] });
  };
  const importImage = async (camera: boolean) => {
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) throw new Error('Camera permission is required to take a roof photo.');
      const options = { mediaTypes: ['images'] as ImagePicker.MediaType[], base64: true, quality: 0.5, allowsEditing: false };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const a = result.assets[0];
      if (!a.base64 || a.base64.length > 2999900) throw new Error('Choose an image smaller than 2 MB.');
      const ratio = a.height / a.width;
      if (ratio < 0.5 || ratio > 2) throw new Error('Use a photo with aspect ratio between 1:2 and 2:1.');
      change({ ...emptyRoof(), height: 1000 * ratio, image_data: `data:image/jpeg;base64,${a.base64}` });
      setCoords(''); setDistance(''); setDraft([]); setTab('design');
    } catch (e: any) { setMessage(e.message); }
  };
  const calculate = async (save: boolean) => {
    if (!building.id || busy) return;
    setBusy(true);
    try {
      const payload = { ...roof, boundary: parsePoints(coords), scale_distance_m: Number(distance) };
      if (draft.length) throw new Error('Finish or discard the obstacle before calculating.');
      if (!distance.trim() || payload.scale_distance_m <= 0 || payload.scale_points.length !== 2) throw new Error('Mark two scale points and enter their measured distance in metres.');
      if (save) { apply(await api.request<RoofRecord>(`/buildings/${building.id}/roof`, { method: 'PUT', body: JSON.stringify(payload) })); setMessage('Saved geometry and photo to this building.'); }
      else { setLayout(await api.post<Layout>(`/buildings/${building.id}/roof/preview`, payload)); setRoof(payload); setOutdated(false); setUnsaved(true); setMessage('Calculated preview — not saved yet. Press Save Roof to keep it.'); }
    } catch (e: any) { setMessage(e.message); } finally { setBusy(false); }
  };
  const checkAR = async () => {
    setCheckingAR(true);
    const capability = await detectARCapability();
    setCheckingAR(false);
    setArCap(capability);
    return capability;
  };
  // The device check runs when the AR tab is opened, so the card can say why AR is or is not available.
  useEffect(() => { if (tab === 'ar' && arCap === null) checkAR(); }, [tab, arCap]);
  const openAR = async () => {
    const capability = await checkAR();
    if (capability !== 'ready') { setTab('ar'); return; }
    router.push({ pathname: '/rooftop-ar', params: { buildingId: building.id } });
  };
  const legend = [{ color: t.limeMark, name: 'Roof / panels' }, { color: t.redText, name: 'Obstacle' }, { color: t.cyanText, name: 'Scale' }];
  const dailyKwh = pv.profile?.daily_energy_kwh;
  const configRows = [
    { name: 'Panel Type', value: pv.wattageW === null ? DASH : `${pv.wattageW} W` },
    { name: 'Tilt Angle', value: pv.tiltDeg === null ? DASH : `${pv.tiltDeg}°` },
    { name: 'Orientation', value: pv.azimuthDeg === null ? DASH : compassPoint(pv.azimuthDeg) },
  ];
  const corners = roof.boundary.length;
  const outlineWarning = corners > 0 && corners < 3 ? 'The roof outline needs at least 3 corners. Tap more corners, or press Undo.' : corners >= 4 && selfIntersects(roof.boundary) ? 'The roof outline crosses itself, so the area may be wrong. Press Undo to remove the last corner, or fix the vertices in Advanced.' : null;
  const instruction = { roof: 'Tap each corner of the roof in order (at least 3).', obstacle: 'Tap the corners of something on the roof, then tap Finish.', scale: 'Tap two points on a length you measured, then enter that distance in metres.' }[mode];
  const count = mode === 'roof' ? `Corners: ${corners}` : mode === 'obstacle' ? `Obstacle corners: ${draft.length}` : `Scale points: ${roof.scale_points.length} of 2`;
  const steps = [{ id: 'roof', text: '1 Roof outline' }, { id: 'obstacle', text: '2 Obstacles (optional)' }, { id: 'scale', text: '3 Scale' }, { id: 'calculate', text: '4 Calculate' }];
  const currentStep = unsaved ? 'calculate' : mode;
  const finishHint = draft.length >= 3 ? null : mode === 'obstacle' ? 'Finish needs at least 3 obstacle corners. Tap more corners first.' : 'Finish is for obstacles. Switch to Obstacle mode and tap at least 3 corners.';
  const startRectangle = () => { const boundary = defaultRectangle(roof.width, roof.height); change({ ...roof, boundary }); setCoords(formatPoints(boundary)); };
  const scaleField = <Field label="Measured scale distance (m)" numeric value={distance} onChange={v => { setDistance(v); outdate(); }} />;
  const savedPanels = saved ? saved.panel_count : null;
  const arReason = checkingAR ? null : arCap === null ? 'Checking this device for AR…' : arCap !== 'ready' ? AR_UNAVAILABLE_COPY[arCap].title : !saved ? 'Save a roof layout first. AR shows the last saved layout.' : null;
  const arBlocked = checkingAR || arReason !== null;
  const calcOff = !building.id || busy;
  const footer = tab === 'photo'
    ? <Action title="Continue to Design" onPress={() => setTab('design')} />
    : tab === 'design' && unsaved
      ? <Action title="Save Roof" loading={busy} disabled={calcOff} icon={<Save size={18} color={calcOff ? t.textSecondary : t.onLime} />} onPress={() => calculate(true)} />
    : tab === 'design'
      ? <Action title="Calculate Placement" loading={busy} disabled={calcOff} icon={<Calculator size={18} color={calcOff ? t.textSecondary : t.onLime} />} onPress={() => calculate(false)} />
      : <Action title="View in AR" label="Preview in AR" loading={checkingAR} disabled={arBlocked} icon={<ScanLine size={18} color={arBlocked ? t.textSecondary : t.onLime} />} onPress={openAR} />;
  return <SolvantaScreen banner="PRELIMINARY • measured 2D layout, not engineering drawings" footer={footer}>
    <BuildingHeader title="Rooftop Analysis" building={picker} />
    <PillSegmentedControl a11yLabel="Rooftop view" selectedId={tab} onSelect={id => setTab(id as Tab)} options={[{ id: 'photo', label: 'Photo' }, { id: 'design', label: 'Design' }, { id: 'ar', label: 'AR' }]} />
    <View style={shown(tab === 'photo')}>
      <Card><CardHeader title="Roof photo" subtitle="Top-down, rectified image" icon={<ImagePlus size={18} color={t.limeText} />} /><Label tone="secondary" caption>Use a top-down, rectified roof image. Perspective photos cannot provide reliable dimensions from one scale line. No automatic CV detection is claimed.</Label>
        <ActionRow><Action title="Import Roof Photo" variant="secondary" icon={<ImagePlus size={16} color={t.textPrimary} />} onPress={() => importImage(false)} /><Action title="Take Roof Photo" variant="secondary" icon={<Camera size={16} color={t.textPrimary} />} onPress={() => importImage(true)} /></ActionRow>
      </Card>
    </View>
    <View style={shown(tab === 'design')}>
      <Card><CardHeader title="Roof layout" subtitle={instruction} icon={<PencilRuler size={18} color={t.limeText} />} />
        <View accessibilityLabel="Roof steps" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{steps.map(st => <Text key={st.id} accessibilityState={{ selected: st.id === currentStep }} style={{ color: st.id === currentStep ? t.limeText : t.textSecondary, fontSize: 12, fontWeight: st.id === currentStep ? '700' : '400' }}>{st.text}</Text>)}</View>
        <PillSegmentedControl a11yLabel="Drawing mode" selectedId={mode} onSelect={id => setMode(id as 'roof' | 'obstacle' | 'scale')} options={[{ id: 'roof', label: 'Roof' }, { id: 'obstacle', label: 'Obstacle' }, { id: 'scale', label: 'Scale' }]} />
        <View accessible accessibilityRole="image" accessibilityLabel={`Roof canvas, ${mode} mode: ${roof.boundary.length} roof vertices, ${roof.obstacles.length} obstacles, ${layout?.panel_count ?? 0} panels. Roof vertices can also be typed in the field below.`} onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height: width * roof.height / roof.width, backgroundColor: t.backgroundRaised, borderRadius: RADIUS.card - 4, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }} onStartShouldSetResponder={() => true} onResponderRelease={e => tap(e.nativeEvent.locationX, e.nativeEvent.locationY)}>
          {!roof.image_data && GRID.map(f => <React.Fragment key={f}><View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: `${f * 100}%`, height: 1, backgroundColor: t.border, opacity: 0.6 }} /><View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: `${f * 100}%`, width: 1, backgroundColor: t.border, opacity: 0.6 }} /></React.Fragment>)}
          <Svg pointerEvents="none" width="100%" height="100%" viewBox={`0 0 ${roof.width} ${roof.height}`}>
            {roof.image_data && <SvgImage href={{ uri: roof.image_data }} width={roof.width} height={roof.height} />}
            <Polygon points={roof.boundary.map(p => `${p.x},${p.y}`).join(' ')} fill={t.surfaceElevated} fillOpacity={roof.image_data ? 0.35 : 0.9} stroke={t.textSecondary} strokeWidth={screenPx(2.5, width, roof.width)} />
            {roof.boundary.map((p, i) => <Circle key={`v${i}`} cx={p.x} cy={p.y} r={screenPx(5, width, roof.width)} fill={t.limeMark} />)}
            {roof.obstacles.map((ring, i) => <Polygon key={i} points={ring.map(p => `${p.x},${p.y}`).join(' ')} fill={t.redTint} stroke={t.redText} strokeWidth={screenPx(2, width, roof.width)} />)}
            {draft.length > 0 && <Polygon points={draft.map(p => `${p.x},${p.y}`).join(' ')} fill={t.redTint} stroke={t.redText} strokeWidth={screenPx(2, width, roof.width)} />}
            {draft.map((p, i) => <Circle key={`d${i}`} cx={p.x} cy={p.y} r={screenPx(5, width, roof.width)} fill={t.redText} />)}
            {layout?.panels.map((p, i) => <Rect key={i} {...p} fill={t.panelFill} stroke={t.limeMark} strokeWidth={screenPx(1, width, roof.width)} />)}
            {roof.scale_points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={screenPx(7, width, roof.width)} fill={t.cyanText} />)}
            {roof.scale_points.length === 2 && <Line x1={roof.scale_points[0].x} y1={roof.scale_points[0].y} x2={roof.scale_points[1].x} y2={roof.scale_points[1].y} stroke={t.cyanText} strokeWidth={screenPx(2.5, width, roof.width)} />}
          </Svg>
        </View>
        <Label tone="secondary" caption>{count}</Label>
        {outlineWarning && <Message tone="warning">{outlineWarning}</Message>}
        {corners === 0 && <Action title="Start with a rectangle" variant="secondary" onPress={startRectangle} />}
        {mode === 'scale' && scaleField}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{legend.map(l => <View key={l.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: l.color }} /><Text style={{ color: t.textSecondary, fontSize: 12 }}>{l.name}</Text></View>)}</View>
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          <Action title="Undo" label="Undo Last Point" style={compact} variant="secondary" icon={<Undo2 size={15} color={t.textPrimary} />} onPress={() => { if (mode === 'obstacle') setDraft(draft.slice(0, -1)); else if (mode === 'scale') change({ ...roof, scale_points: roof.scale_points.slice(0, -1) }); else { const boundary = roof.boundary.slice(0, -1); change({ ...roof, boundary }); setCoords(formatPoints(boundary)); } }} />
          <Action title="Finish" label="Finish Obstacle" style={compact} variant="secondary" icon={<Check size={15} color={draft.length < 3 ? t.textSecondary : t.textPrimary} />} disabled={draft.length < 3} onPress={() => { change({ ...roof, obstacles: [...roof.obstacles, draft] }); setDraft([]); }} />
          <Action title="Remove" label="Remove Last Obstacle" style={compact} variant="secondary" icon={<Eraser size={15} color={t.textPrimary} />} onPress={() => { change({ ...roof, obstacles: roof.obstacles.slice(0, -1) }); setDraft([]); }} />
        </View>
        {finishHint && <Label tone="secondary" caption>{finishHint}</Label>}
      </Card>
      <MetricGrid>
        <Metric compact label="Usable Area" value={layout ? layout.usable_area_m2.toFixed(1) : DASH} unit={layout ? 'm²' : undefined} />
        <Metric compact label="Panels" value={layout ? layout.panel_count : DASH} tone="accent" />
        <Metric compact label="Est. Daily (SIMULATED)" value={outdated || dailyKwh === undefined || !Number.isFinite(dailyKwh) ? DASH : dailyKwh.toFixed(1)} unit={outdated || dailyKwh === undefined ? undefined : 'kWh'} />
      </MetricGrid>
      {outdated && <Label tone="secondary" caption>Outdated: the roof changed since the last calculation. Press Calculate Placement.</Label>}
      <Card><CardHeader title="Panel Configuration" subtitle={pv.profile ? 'From the PV record or the last calculation' : 'No PV record yet. Open Advanced to calculate.'} />
        <View>{configRows.map(r => <TouchableOpacity key={r.name} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`${r.name}: ${r.value}. Opens advanced settings`} hitSlop={{ top: 4, bottom: 4 }} onPress={() => setAdvanced(true)} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 36, gap: 8 }}>
          <Text style={{ flex: 1, color: t.textSecondary, fontSize: 14 }}>{r.name}</Text>
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600' }}>{r.value}</Text>
        </TouchableOpacity>)}</View>
        <Action title={advanced ? 'Hide advanced settings' : 'Advanced settings'} variant="secondary" onPress={() => setAdvanced(!advanced)} />
      </Card>
      <Card><CardHeader title="Roof actions" subtitle="Physical scale comes only from your measured distance" />
        {!unsaved && <Action title="Save Roof" icon={<Save size={15} color={calcOff ? t.textSecondary : t.onLime} />} disabled={calcOff} onPress={() => calculate(true)} />}
        <Message>{message}</Message>
      </Card>
      <View style={shown(advanced)}>
        <Card><CardHeader title="Advanced" subtitle="Vertices, scale, setback and panel size" />
          <Metric label="Roof area" value={layout ? layout.roof_area_m2.toFixed(2) : DASH} unit={layout ? 'm²' : undefined} />
          {layout && <Label tone="secondary" caption>{layout.method}</Label>}
          <Label tone="secondary" caption strong>Roof settings</Label>
          <FieldRow>{mode !== 'scale' && scaleField}<Field label={geometryLabels.setback_m} numeric value={String(roof.setback_m)} onChange={v => change({ ...roof, setback_m: v === '' ? 0 : Number(v) })} /></FieldRow>
          <Label tone="secondary" caption strong>Panel size</Label>
          <FieldRow>{(['panel_width_m', 'panel_height_m', 'gap_m'] as const).map(key => <Field key={key} label={geometryLabels[key]} numeric value={String(roof[key])} onChange={v => change({ ...roof, [key]: v === '' ? 0 : Number(v) })} />)}</FieldRow>
          <Action title={expert ? 'Hide expert settings' : 'Expert settings'} label={expert ? 'Hide roof expert settings' : 'Roof expert settings'} variant="secondary" onPress={() => setExpert(!expert)} />
          <View style={shown(expert)}>
            <Field label="Roof vertices (x,y; x,y) — edit to correct" value={coords} onChange={v => { setCoords(v); outdate(); try { setRoof({ ...roof, boundary: parsePoints(v) }); } catch {} }} />
          </View>
        </Card>
        <PVDesigner buildingId={building.id} onSummary={setPv} />
      </View>
    </View>
    <View style={shown(tab === 'ar')}>
      <Card><CardHeader title="AR status" subtitle="Optional visualization. The 2D layout stays available." icon={<ScanLine size={18} color={t.limeText} />} />
        <View style={{ gap: 4 }}>{[
          ['This device', arCap === null ? DASH : arCap === 'ready' ? 'AR supported' : 'AR not available'],
          ['Saved roof', saved ? 'Yes' : 'No'],
          ['Saved on', DASH],
          ['Panels (saved)', savedPanels === null ? DASH : String(savedPanels)],
          ['Tilt angle', pv.tiltDeg === null ? DASH : `${pv.tiltDeg}°`],
        ].map(([k, v]) => <View key={k} style={{ flexDirection: 'row', minHeight: 28, alignItems: 'center' }}><Text style={{ flex: 1, color: t.textSecondary, fontSize: 14 }}>{k}</Text><Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600' }}>{v}</Text></View>)}</View>
        <Label tone="secondary" caption>AR shows the last saved layout, not unsaved changes. It is a visualization, not a measurement.</Label>
        {arReason && !checkingAR && arCap === 'ready' && <Message>{arReason}</Message>}
        {arCap !== null && arCap !== 'ready' && <ARCapabilityFallback capability={arCap} onContinue2D={() => { setArCap(null); setTab('design'); }} onRetry={arCap === 'check-failed' ? () => { setArCap(null); } : undefined} />}
      </Card>
    </View>
  </SolvantaScreen>;
}

export default function RooftopScreen() {
 const building=useBuildings();
 return <RooftopWorkspace key={building.id} picker={building}/>;
}
