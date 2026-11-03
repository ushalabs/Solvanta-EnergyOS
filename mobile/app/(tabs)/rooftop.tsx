import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import Svg, { Polygon, Rect, Circle, Image as SvgImage, Line } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Camera, Undo2, Check, Eraser, Calculator, Save, ScanLine, PencilRuler } from 'lucide-react-native';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { Card, CardHeader, Label, Message, Metric, MetricGrid, Field, FieldRow, Action, ActionRow, ScreenHeader, BuildingPicker, useBuildings } from '../../src/components/TwinControls';
import { api } from '../../src/api/client';
import { emptyRoof, RoofInput, RoofRecord, Layout, Point, parsePoints, formatPoints, tapToRoofPoint, screenPx } from '../../src/api/roof';
import { useTheme } from '../../src/theme/ThemeContext';
import { PVDesigner } from '../../src/components/PVDesigner';
import { PillSegmentedControl } from '../../src/components/PillSegmentedControl';
import { ARCapabilityFallback } from '../../src/components/ARCapabilityFallback';
import type { ARUnavailable } from '../../src/ar/arCapability';
import { detectARCapability } from '../../src/ar/detectAR';

const geometryLabels = { setback_m: 'Setback (m)', panel_width_m: 'Panel width (m)', panel_height_m: 'Panel height (m)', gap_m: 'Panel gap (m)' };

function RooftopWorkspace({buildingId}:{buildingId:string}) {
  const { tokens: t } = useTheme();
  const building = {id:buildingId};
  const [arGate, setArGate] = useState<ARUnavailable | null>(null);
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
  const apply = (r: RoofRecord) => { setRoof(r.geometry); setDistance(String(r.geometry.scale_distance_m)); setCoords(formatPoints(r.geometry.boundary)); setLayout(r.layout); };
  useEffect(() => {
    let active = true;
    setRoof(emptyRoof()); setLayout(null); setCoords(''); setDistance(''); setDraft([]);
    if (building.id) api.get<RoofRecord>(`/buildings/${building.id}/roof`).then(r => { if (active) { apply(r); setMessage('Loaded saved roof.'); } }).catch(e => { if (active) setMessage(e.status === 404 ? 'No saved roof. Draw a boundary to begin.' : e.message); });
    return () => { active = false; };
  }, [building.id]);
  const change = (next: RoofInput) => { setRoof(next); setLayout(null); setMessage('Unsaved geometry changes. Recalculate and save.'); };
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
      setCoords(''); setDistance(''); setDraft([]);
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
      else { setLayout(await api.post<Layout>(`/buildings/${building.id}/roof/preview`, payload)); setRoof(payload); setMessage('Calculated preview — not saved yet.'); }
    } catch (e: any) { setMessage(e.message); } finally { setBusy(false); }
  };
  const openAR = async () => {
    setCheckingAR(true);
    const capability = await detectARCapability();
    setCheckingAR(false);
    if (capability !== 'ready') { setArGate(capability); return; }
    setArGate(null);
    router.push({ pathname: '/rooftop-ar', params: { buildingId: building.id } });
  };
  const legend = [{ color: t.limeMark, name: 'Roof / panels' }, { color: t.redText, name: 'Obstacle' }, { color: t.cyanText, name: 'Scale' }];
  return <>
    <Card><CardHeader title="Roof photo" subtitle="Top-down, rectified image" icon={<ImagePlus size={18} color={t.limeText} />} /><Label tone="secondary" caption>Use a top-down, rectified roof image. Perspective photos cannot provide reliable dimensions from one scale line. No automatic CV detection is claimed.</Label>
      <ActionRow><Action title="Import Roof Photo" variant="secondary" icon={<ImagePlus size={16} color={t.textPrimary} />} onPress={() => importImage(false)} /><Action title="Take Roof Photo" variant="secondary" icon={<Camera size={16} color={t.textPrimary} />} onPress={() => importImage(true)} /></ActionRow>
    </Card>
    <Card><CardHeader title="Roof layout" subtitle={`Tap to add vertices. Current mode: ${mode}`} icon={<PencilRuler size={18} color={t.limeText} />} />
      <PillSegmentedControl a11yLabel="Drawing mode" selectedId={mode} onSelect={id => setMode(id as 'roof' | 'obstacle' | 'scale')} options={[{ id: 'roof', label: 'Roof' }, { id: 'obstacle', label: 'Obstacle' }, { id: 'scale', label: 'Scale' }]} />
      <View accessible accessibilityRole="image" accessibilityLabel={`Roof canvas, ${mode} mode: ${roof.boundary.length} roof vertices, ${roof.obstacles.length} obstacles, ${layout?.panel_count ?? 0} panels. Roof vertices can also be typed in the field below.`} onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height: width * roof.height / roof.width, backgroundColor: t.surfaceElevated, borderRadius: 14, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }} onStartShouldSetResponder={() => true} onResponderRelease={e => tap(e.nativeEvent.locationX, e.nativeEvent.locationY)}>
        <Svg pointerEvents="none" width="100%" height="100%" viewBox={`0 0 ${roof.width} ${roof.height}`}>
          {roof.image_data && <SvgImage href={{ uri: roof.image_data }} width={roof.width} height={roof.height} />}
          <Polygon points={roof.boundary.map(p => `${p.x},${p.y}`).join(' ')} fill={t.limeTint} stroke={t.limeMark} strokeWidth={screenPx(2.5, width, roof.width)} />
          {roof.boundary.map((p, i) => <Circle key={`v${i}`} cx={p.x} cy={p.y} r={screenPx(5, width, roof.width)} fill={t.limeMark} />)}
          {roof.obstacles.map((ring, i) => <Polygon key={i} points={ring.map(p => `${p.x},${p.y}`).join(' ')} fill={t.redTint} stroke={t.redText} strokeWidth={screenPx(2, width, roof.width)} />)}
          {draft.length > 0 && <Polygon points={draft.map(p => `${p.x},${p.y}`).join(' ')} fill={t.redTint} stroke={t.redText} strokeWidth={screenPx(2, width, roof.width)} />}
          {draft.map((p, i) => <Circle key={`d${i}`} cx={p.x} cy={p.y} r={screenPx(5, width, roof.width)} fill={t.redText} />)}
          {layout?.panels.map((p, i) => <Rect key={i} {...p} fill={t.limeTint} stroke={t.limeMark} strokeWidth={screenPx(1, width, roof.width)} />)}
          {roof.scale_points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={screenPx(7, width, roof.width)} fill={t.cyanText} />)}
          {roof.scale_points.length === 2 && <Line x1={roof.scale_points[0].x} y1={roof.scale_points[0].y} x2={roof.scale_points[1].x} y2={roof.scale_points[1].y} stroke={t.cyanText} strokeWidth={screenPx(2.5, width, roof.width)} />}
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{legend.map(l => <View key={l.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: l.color }} /><Text style={{ color: t.textSecondary, fontSize: 12 }}>{l.name}</Text></View>)}</View>
      <ActionRow>
        <Action title="Undo Last Point" variant="secondary" icon={<Undo2 size={15} color={t.textPrimary} />} onPress={() => { if (mode === 'obstacle') setDraft(draft.slice(0, -1)); else if (mode === 'scale') change({ ...roof, scale_points: roof.scale_points.slice(0, -1) }); else { const boundary = roof.boundary.slice(0, -1); change({ ...roof, boundary }); setCoords(formatPoints(boundary)); } }} />
        <Action title="Finish Obstacle" variant="secondary" icon={<Check size={15} color={draft.length < 3 ? t.textSecondary : t.textPrimary} />} disabled={draft.length < 3} onPress={() => { change({ ...roof, obstacles: [...roof.obstacles, draft] }); setDraft([]); }} />
        <Action title="Remove Last Obstacle" variant="secondary" icon={<Eraser size={15} color={t.textPrimary} />} onPress={() => { change({ ...roof, obstacles: roof.obstacles.slice(0, -1) }); setDraft([]); }} />
      </ActionRow>
    </Card>
    <Card><CardHeader title="Measurements" subtitle="Physical scale comes only from your measured distance" />
      <Field label="Roof vertices (x,y; x,y) — edit to correct" value={coords} onChange={v => { setCoords(v); setLayout(null); try { setRoof({ ...roof, boundary: parsePoints(v) }); } catch {} }} />
      <Field label="Measured scale distance (m)" numeric value={distance} onChange={v => { setDistance(v); setLayout(null); }} />
      <FieldRow>{(['setback_m', 'panel_width_m', 'panel_height_m', 'gap_m'] as const).map(key => <Field key={key} label={geometryLabels[key]} numeric value={String(roof[key])} onChange={v => change({ ...roof, [key]: v === '' ? 0 : Number(v) })} />)}</FieldRow>
      <ActionRow><Action title="Calculate Placement" variant="secondary" icon={<Calculator size={15} color={!building.id || busy ? t.textSecondary : t.textPrimary} />} disabled={!building.id || busy} onPress={() => calculate(false)} /><Action title="Save Roof" icon={<Save size={15} color={!building.id || busy ? t.textSecondary : t.onLime} />} disabled={!building.id || busy} onPress={() => calculate(true)} /></ActionRow>
      <Message>{message}</Message>
      {layout && <><MetricGrid><Metric label="Roof area" value={layout.roof_area_m2.toFixed(2)} unit="m²" /><Metric label="Usable area" value={layout.usable_area_m2.toFixed(2)} unit="m²" /><Metric label="Panels" value={layout.panel_count} tone="accent" /></MetricGrid><Label tone="secondary" caption>{layout.method}</Label></>}
    </Card>
    <Card><CardHeader title="AR preview" subtitle="Optional visualization. The 2D layout above stays available." icon={<ScanLine size={18} color={t.limeText} />} />
      <Label tone="secondary" caption>AR shows the last saved layout, not unsaved changes. It is a visualization, not a measurement.</Label>
      <Action title="Preview in AR" loading={checkingAR} disabled={checkingAR} onPress={openAR} />{arGate && <ARCapabilityFallback capability={arGate} onContinue2D={() => setArGate(null)} onRetry={arGate === 'check-failed' ? openAR : undefined} />}
    </Card>
    <PVDesigner buildingId={building.id} />
  </>;
}

export default function RooftopScreen() {
 const building=useBuildings();
 return <SolvantaScreen banner="ROOFTOP - Measured geometry - Preliminary engineering"><ScreenHeader title="Rooftop studio" subtitle="Measured 2D layout and PV estimate"/><BuildingPicker state={building}/><RooftopWorkspace key={building.id} buildingId={building.id}/></SolvantaScreen>;
}
