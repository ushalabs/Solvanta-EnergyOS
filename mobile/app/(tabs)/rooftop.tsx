import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Camera, Undo2, Redo2, Square, CircleDot, Magnet, Check, Eraser, Calculator, Save, ScanLine, PencilRuler } from 'lucide-react-native';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { Card, CardHeader, Label, Message, Metric, MetricGrid, Field, FieldRow, Action, ActionRow, Chip, ChipGroup, BuildingHeader, useBuildings } from '../../src/components/TwinControls';
import { api } from '../../src/api/client';
import { emptyRoof, RoofInput, RoofRecord, Layout, Point, parsePoints, formatPoints, selfIntersects, defaultRectangle, roofProblem, obstacleProblem, friendlyRoofError } from '../../src/api/roof';
import { compassPoint } from '../../src/api/pv';
import { useTheme } from '../../src/theme/ThemeContext';
import { SPACING } from '../../src/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RoofCanvas, CanvasEvent } from '../../src/components/RoofCanvas';
import { gridStep, metersPerUnit, polygonArea, snapPoint, SnapKind, insertCorner, removeCorner, ObstacleShape, rectangleRing, circleRing, ringCentre, dragShapeCorner, translateRing, History, emptyHistory, record, undo, redo } from '../../src/api/roofEdit';
import { PVDesigner, PVSummary, PVControl } from '../../src/components/PVDesigner';
import { ModalSheet } from '../../src/components/ModalSheet';
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
// Checks made in the app, whose wording is already plain, are marked so they are not rewritten like server errors.
const clientError = (message: string) => Object.assign(new Error(message), { client: true });
const MODULE_RATINGS = [400, 450, 500, 550, 600];
const COMPASS = [{ id: 'N', deg: 0 }, { id: 'NE', deg: 45 }, { id: 'E', deg: 90 }, { id: 'SE', deg: 135 }, { id: 'S', deg: 180 }, { id: 'SW', deg: 225 }, { id: 'W', deg: 270 }, { id: 'NW', deg: 315 }];
const TILT_MIN = 0, TILT_MAX = 45, TILT_START = 25;
type Selector = 'type' | 'tilt' | 'orientation';
// Short buttons that still give a 44px touch area.
const compact = { flex: 1, minHeight: 44, paddingVertical: 8, paddingHorizontal: 8 };

function RooftopWorkspace({picker}:{picker:ReturnType<typeof useBuildings>}) {
  const { tokens: t } = useTheme();
  const building = {id:picker.id};
  const [tab, setTab] = useState<Tab>('design');
  const [advanced, setAdvanced] = useState(false);
  const [pv, setPv] = useState<PVSummary>({ profile: null, wattageW: null, tiltDeg: null, azimuthDeg: null });
  const [pvOutdated, setPvOutdated] = useState(false);
  const [selector, setSelector] = useState<Selector | null>(null);
  const pvControl = useRef<PVControl>(null);
  const onSummary = (next: PVSummary) => { setPv(next); if (next.profile) setPvOutdated(false); };
  const choose = (key: 'module_wattage_w' | 'tilt_deg' | 'azimuth_deg', value: number) => { pvControl.current?.set(key, value); setPvOutdated(true); };
  const tiltNow = pv.tiltDeg ?? TILT_START;
  const stepTilt = (by: number) => choose('tilt_deg', Math.min(TILT_MAX, Math.max(TILT_MIN, Math.round(tiltNow + by))));
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
  // Obstacle names and shapes live alongside roof.obstacles. The API stores obstacles as plain polygons, so names stay on this device.
  const [names, setNames] = useState<string[]>([]);
  const [shapes, setShapes] = useState<ObstacleShape[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [snapOn, setSnapOn] = useState(true);
  const [snapNote, setSnapNote] = useState<SnapKind>(null);
  const [shapeNote, setShapeNote] = useState('');
  type EditState = { roof: RoofInput; draft: Point[]; names: string[]; shapes: ObstacleShape[] };
  const [history, setHistory] = useState<History<EditState>>(emptyHistory<EditState>());
  const moveBase = useRef<Point[] | null>(null);
  const [coords, setCoords] = useState('');
  const [distance, setDistance] = useState('');
  const [message, setMessage] = useState('Draw a roof, then mark two points with a known distance.');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const insets = useSafeAreaInsets();
  type Snapshot = { roof: RoofInput; coords: string; distance: string; layout: Layout | null; draft: Point[]; outdated: boolean; unsaved: boolean; message: string; mode: 'roof' | 'obstacle' | 'scale'; names: string[]; shapes: ObstacleShape[] };
  const snapshot = useRef<Snapshot | null>(null);
  const areaSized = useRef(false);
  const apply = (r: RoofRecord) => { setRoof(r.geometry); setDistance(String(r.geometry.scale_distance_m)); setCoords(formatPoints(r.geometry.boundary)); setLayout(r.layout); setSaved(r.layout); setOutdated(false); setUnsaved(false); setNames(prev => r.geometry.obstacles.map((_, i) => prev[i] ?? '')); setShapes(prev => r.geometry.obstacles.map((_, i) => prev[i] ?? 'polygon')); };
  useEffect(() => {
    let active = true;
    setRoof(emptyRoof()); setNames([]); setShapes([]); setLayout(null); setSaved(null); setOutdated(false); setUnsaved(false); setCoords(''); setDistance(''); setDraft([]);
    if (building.id) api.get<RoofRecord>(`/buildings/${building.id}/roof`).then(r => { if (active) { apply(r); setMessage('Loaded saved roof.'); } }).catch(e => { if (active) setMessage(e.status === 404 ? 'No saved roof. Draw a boundary to begin.' : e.message); });
    return () => { active = false; };
  }, [building.id]);
  const change = (next: RoofInput) => { setRoof(next); setLayout(null); setOutdated(true); setUnsaved(false); setMessage('Unsaved geometry changes. Press Calculate Placement first, then Save Roof.'); };
  const outdate = () => { setLayout(null); setOutdated(true); setUnsaved(false); };
  const current = (): EditState => ({ roof, draft, names, shapes });
  const setEdit = (next: EditState) => {
    if (next.roof !== roof) { change(next.roof); setCoords(formatPoints(next.roof.boundary)); }
    setDraft(next.draft); setNames(next.names); setShapes(next.shapes);
  };
  /** Every point, drag and shape change goes through here so it can be undone. */
  const commit = (next: EditState) => { setHistory(h => record(h, current())); setEdit(next); };
  const doUndo = () => { const u = undo(history, current()); if (u) { setHistory(u.history); setEdit(u.state); setSnapNote(null); } };
  const doRedo = () => { const r = redo(history, current()); if (r) { setHistory(r.history); setEdit(r.state); setSnapNote(null); } };
  const bounds = { width: roof.width, height: roof.height };
  const step = gridStep(roof.width);
  const snapped = (p: Point, prev?: Point, prevPrev?: Point, angle = true): Point => {
    if (!snapOn) { setSnapNote(null); return p; }
    const r = snapPoint(p, { step, tolerance: step * 0.25, prev: angle ? prev : undefined, prevPrev: angle ? prevPrev : undefined, bounds });
    setSnapNote(r.kind); return r.point;
  };
  const at = (ring: Point[], i: number) => ring[(i + ring.length) % ring.length];
  const withObstacle = (i: number, ring: Point[], shape: ObstacleShape = shapes[i] ?? 'polygon'): EditState => ({ ...current(), roof: { ...roof, obstacles: roof.obstacles.map((r, j) => j === i ? ring : r) }, shapes: shapes.map((sh, j) => j === i ? shape : sh) });
  const onCanvas = (e: CanvasEvent) => {
    if (e.type === 'tap') {
      if (mode === 'roof') {
        if (e.corner) return;
        if (e.edge && e.edge.ring === 'roof') { commit({ ...current(), roof: { ...roof, boundary: insertCorner(roof.boundary, e.edge.index, e.edge.point) } }); setSnapNote(null); return; }
        const n = roof.boundary.length;
        const p = snapped(e.point, roof.boundary[n - 1], roof.boundary[n - 2]);
        commit({ ...current(), roof: { ...roof, boundary: [...roof.boundary, p] } });
      } else if (mode === 'obstacle') {
        if (!draft.length) {
          if (e.corner && typeof e.corner.ring === 'number') { setSelected(e.corner.ring); return; }
          if (e.edge && typeof e.edge.ring === 'number') { const i = e.edge.ring; commit(withObstacle(i, insertCorner(roof.obstacles[i], e.edge.index, e.edge.point), 'polygon')); setSelected(i); return; }
          if (e.obstacle !== null) { setSelected(e.obstacle); return; }
        }
        setSelected(null);
        commit({ ...current(), draft: [...draft, snapped(e.point, draft[draft.length - 1], draft[draft.length - 2])] });
      } else {
        setSnapNote(null);
        commit({ ...current(), roof: { ...roof, scale_points: roof.scale_points.length === 2 ? [e.point] : [...roof.scale_points, e.point] } });
      }
    } else if (e.type === 'dragStart') {
      setHistory(h => record(h, current()));
      if (typeof e.target.ring === 'number') setSelected(e.target.ring);
    } else if (e.type === 'drag') {
      const { ring, index } = e.target;
      if (ring === 'roof') {
        const b = roof.boundary;
        const p = snapped(e.point, b.length > 2 ? at(b, index - 1) : undefined, b.length > 3 ? at(b, index - 2) : undefined);
        setEdit({ ...current(), roof: { ...roof, boundary: b.map((q, j) => j === index ? p : q) } });
      } else {
        const shape = shapes[ring] ?? 'polygon', o = roof.obstacles[ring];
        const p = snapped(e.point, shape === 'polygon' ? at(o, index - 1) : undefined, shape === 'polygon' ? at(o, index - 2) : undefined, shape === 'polygon');
        setEdit(withObstacle(ring, dragShapeCorner(shape, o, index, p)));
      }
    } else if (e.type === 'moveStart') {
      setHistory(h => record(h, current())); moveBase.current = roof.obstacles[e.obstacle]; setSelected(e.obstacle);
    } else if (e.type === 'move') {
      if (moveBase.current) setEdit(withObstacle(e.obstacle, translateRing(moveBase.current, e.dx, e.dy, bounds)));
    } else if (e.type === 'moveEnd') {
      moveBase.current = null;
    } else if (e.type === 'longPress') {
      const { ring, index } = e.target;
      if (ring === 'roof') commit({ ...current(), roof: { ...roof, boundary: removeCorner(roof.boundary, index) } });
      else if (roof.obstacles[ring].length > 3) commit(withObstacle(ring, removeCorner(roof.obstacles[ring], index), 'polygon'));
      else setShapeNote('An obstacle needs at least 3 corners. Use Remove to delete the whole obstacle.');
    }
  };
  const addShape = (shape: 'rect' | 'circle') => {
    if (roof.boundary.length < 3) { setShapeNote('Draw the roof outline first. Obstacles must stay inside it.'); return; }
    const xs = roof.boundary.map(p => p.x), ys = roof.boundary.map(p => p.y);
    const size = Math.max(10, Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 0.08);
    const c = ringCentre(roof.boundary);
    const ring = shape === 'rect' ? rectangleRing(c, size * 1.25, size) : circleRing(c, size);
    setShapeNote(''); setDraft([]);
    commit({ ...current(), draft: [], roof: { ...roof, obstacles: [...roof.obstacles, ring] }, names: [...names, ''], shapes: [...shapes, shape] });
    setSelected(roof.obstacles.length);
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
      // Invalid geometry is never sent to the API.
      const outline = roofProblem(payload.boundary);
      if (outline) throw clientError(outline);
      const badOne = payload.obstacles.findIndex(ring => obstacleProblem(ring, payload.boundary));
      if (badOne >= 0) throw clientError(`Obstacle ${badOne + 1}: ${obstacleProblem(payload.obstacles[badOne], payload.boundary)}`);
      if (save) { apply(await api.request<RoofRecord>(`/buildings/${building.id}/roof`, { method: 'PUT', body: JSON.stringify(payload) })); setMessage('Saved geometry and photo to this building.'); }
      else { setLayout(await api.post<Layout>(`/buildings/${building.id}/roof/preview`, payload)); setRoof(payload); setOutdated(false); setUnsaved(true); setMessage('Calculated preview — not saved yet. Press Save Roof to keep it.'); }
    } catch (e: any) { setMessage(e.client ? e.message : friendlyRoofError(e.message)); } finally { setBusy(false); }
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
  const legend = [{ color: t.limeMark, name: 'Roof / panels' }, { color: t.textSecondary, name: 'Obstacle' }, { color: t.cyanText, name: 'Scale' }];
  const dailyKwh = pv.profile?.daily_energy_kwh;
  const configRows: Array<{ name: string; value: string; open: Selector }> = [
    { name: 'Panel Type', value: pv.wattageW === null ? DASH : `${pv.wattageW} W`, open: 'type' },
    { name: 'Tilt Angle', value: pv.tiltDeg === null ? DASH : `${pv.tiltDeg}°`, open: 'tilt' },
    { name: 'Orientation', value: pv.azimuthDeg === null ? DASH : compassPoint(pv.azimuthDeg), open: 'orientation' },
  ];
  const corners = roof.boundary.length;
  const outlineWarning = corners > 0 && corners < 3 ? 'The roof outline needs at least 3 corners. Tap more corners, or press Undo.' : corners >= 4 && selfIntersects(roof.boundary) ? 'The roof outline crosses itself, so the area may be wrong. Press Undo to remove the last corner, or fix the vertices in Advanced.' : null;
  const hint = { roof: 'Tap each corner of the roof in order', obstacle: 'Tap the corners of an obstacle, then Finish', scale: 'Tap two points on a length you measured, then enter the distance' }[mode];
  const gestureHint = mode === 'scale' ? 'Pinch to zoom, drag to pan.' : 'Drag a corner to move it, hold to delete it, tap an edge to add one. Pinch to zoom, drag to pan.';
  const count = mode === 'roof' ? `Corners: ${corners}` : mode === 'obstacle' ? `Obstacle corners: ${draft.length}` : `Scale points: ${roof.scale_points.length} of 2`;
  const draftProblem = draft.length >= 3 ? obstacleProblem(draft, roof.boundary) : null;
  const invalidObstacles = roof.obstacles.map((ring, i) => obstacleProblem(ring, roof.boundary) ? i : -1).filter(i => i >= 0);
  const finishReason = draftProblem ?? (draft.length >= 3 ? null : mode === 'obstacle' ? 'Finish needs at least 3 obstacle corners. Tap more corners first.' : 'Finish is for obstacles. Switch to Obstacle mode and tap at least 3 corners.');
  const finishObstacle = () => { if (draft.length < 3 || obstacleProblem(draft, roof.boundary)) return; commit({ roof: { ...roof, obstacles: [...roof.obstacles, draft] }, draft: [], names: [...names, ''], shapes: [...shapes, 'polygon'] }); setSelected(roof.obstacles.length); };
  const removeLast = () => { commit({ roof: { ...roof, obstacles: roof.obstacles.slice(0, -1) }, draft: [], names: names.slice(0, roof.obstacles.length - 1), shapes: shapes.slice(0, roof.obstacles.length - 1) }); setSelected(null); };
  const openEditor = () => { snapshot.current = { roof, coords, distance, layout, draft, outdated, unsaved, message, mode, names, shapes }; areaSized.current = false; setHistory(emptyHistory<EditState>()); setSelected(null); setSnapNote(null); setShapeNote(''); setEditing(true); };
  const cancelEditor = () => { const s0 = snapshot.current; if (s0) { setRoof(s0.roof); setCoords(s0.coords); setDistance(s0.distance); setLayout(s0.layout); setDraft(s0.draft); setOutdated(s0.outdated); setUnsaved(s0.unsaved); setMessage(s0.message); setMode(s0.mode); setNames(s0.names); setShapes(s0.shapes); } setSelected(null); setEditing(false); };
  // A new, empty roof gets a canvas shaped like the editor area, so the drawing can use the whole screen.
  const sizeToArea = (w: number, h?: number) => {
    if (areaSized.current || !h || !w || roof.boundary.length || roof.image_data || roof.obstacles.length || roof.scale_points.length) return;
    areaSized.current = true;
    const height = Math.min(1400, Math.max(700, Math.round(1000 * h / w)));
    if (height !== roof.height) setRoof(r => ({ ...r, height }));
  };
  const scaleInEditor = editing && mode === 'scale';
  const startRectangle = () => commit({ ...current(), roof: { ...roof, boundary: defaultRectangle(roof.width, roof.height) } });
  const mpu = metersPerUnit(roof, distance);
  const liveRoofArea = mpu && corners >= 3 && !roofProblem(roof.boundary) ? polygonArea(roof.boundary) * mpu * mpu : null;
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
      <Card><CardHeader title="Roof layout" subtitle="Preview of the roof. Open the editor to draw." icon={<PencilRuler size={18} color={t.limeText} />} />
        {!editing && <RoofCanvas roof={roof} layout={layout} draft={[]} mode={mode} metersPerUnit={mpu} obstacleNames={names} invalidObstacles={invalidObstacles} a11yLabel={`Roof preview: ${roof.boundary.length} roof vertices, ${roof.obstacles.length} obstacles, ${layout?.panel_count ?? 0} panels.`} />}
        <Message>{message}</Message>
        <Action title="Edit roof layout" icon={<PencilRuler size={16} color={t.onLime} />} onPress={openEditor} />
      </Card>
      <MetricGrid>
        <Metric compact label="Usable Area" value={layout ? layout.usable_area_m2.toFixed(1) : DASH} unit={layout ? 'm²' : undefined} />
        <Metric compact label="Panels" value={layout ? layout.panel_count : DASH} unit={layout ? 'fit' : undefined} tone="accent" />
        <Metric compact label="Est. Daily (SIMULATED)" value={outdated || pvOutdated || dailyKwh === undefined || !Number.isFinite(dailyKwh) ? DASH : dailyKwh.toFixed(1)} unit={outdated || pvOutdated || dailyKwh === undefined ? undefined : 'kWh'} />
      </MetricGrid>
      {pvOutdated && !outdated && <Label tone="secondary" caption>Est. Daily is outdated: the panel settings changed. Open Advanced and press Calculate PV Estimate.</Label>}
      {outdated && <Label tone="secondary" caption>Outdated: the roof changed since the last calculation. Press Calculate Placement.</Label>}
      <Card><CardHeader title="Panel Configuration" subtitle={pv.profile ? 'From the PV record or the last calculation' : 'No PV record yet. Open Advanced to calculate.'} />
        <View>{configRows.map(r => <TouchableOpacity key={r.name} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`${r.name}: ${r.value}`} accessibilityHint="Opens the choices" hitSlop={{ top: 4, bottom: 4 }} onPress={() => setSelector(r.open)} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 36, gap: 8 }}>
          <Text style={{ flex: 1, color: t.textSecondary, fontSize: 14 }}>{r.name}</Text>
          <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '600' }}>{r.value}</Text>
        </TouchableOpacity>)}
        </View>
        <PillSegmentedControl a11yLabel="Panel orientation" selectedId={roof.panel_height_m >= roof.panel_width_m ? 'portrait' : 'landscape'} onSelect={id => { const portrait = roof.panel_height_m >= roof.panel_width_m; if ((id === 'portrait') !== portrait) change({ ...roof, panel_width_m: roof.panel_height_m, panel_height_m: roof.panel_width_m }); }} options={[{ id: 'portrait', label: 'Portrait' }, { id: 'landscape', label: 'Landscape' }]} />
        <Action title={advanced ? 'Hide advanced settings' : 'Advanced settings'} variant="secondary" onPress={() => setAdvanced(!advanced)} />
      </Card>
      <Card><CardHeader title="Roof actions" subtitle="Physical scale comes only from your measured distance" />
        {!unsaved && <Action title="Save Roof" icon={<Save size={15} color={calcOff ? t.textSecondary : t.onLime} />} disabled={calcOff} onPress={() => calculate(true)} />}
      </Card>
      <View style={shown(advanced)}>
        <Card><CardHeader title="Advanced" subtitle="Vertices, scale, setback and panel size" />
          <Metric label="Roof area" value={layout ? layout.roof_area_m2.toFixed(2) : DASH} unit={layout ? 'm²' : undefined} />
          {layout && <Label tone="secondary" caption>{layout.method}</Label>}
          <Label tone="secondary" caption strong>Roof settings</Label>
          <FieldRow>{!scaleInEditor && scaleField}<Field label={geometryLabels.setback_m} numeric value={String(roof.setback_m)} onChange={v => change({ ...roof, setback_m: v === '' ? 0 : Number(v) })} /></FieldRow>
          <Label tone="secondary" caption strong>Panel size</Label>
          <FieldRow>{(['panel_width_m', 'panel_height_m', 'gap_m'] as const).map(key => <Field key={key} label={geometryLabels[key]} numeric value={String(roof[key])} onChange={v => change({ ...roof, [key]: v === '' ? 0 : Number(v) })} />)}</FieldRow>
          <Action title={expert ? 'Hide expert settings' : 'Expert settings'} label={expert ? 'Hide roof expert settings' : 'Roof expert settings'} variant="secondary" onPress={() => setExpert(!expert)} />
          <View style={shown(expert)}>
            <Field label="Roof vertices (x,y; x,y) — edit to correct" value={coords} onChange={v => { setCoords(v); outdate(); try { setRoof({ ...roof, boundary: parsePoints(v) }); } catch {} }} />
          </View>
        </Card>
        <PVDesigner buildingId={building.id} onSummary={onSummary} controlRef={pvControl} />
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
    <Modal visible={editing} animationType="slide" onRequestClose={cancelEditor}>
      <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: t.background, paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingBottom: 8 }}>
          <View style={{ minWidth: 96 }}><Action title="Cancel" label="Cancel roof edit" variant="secondary" onPress={cancelEditor} /></View>
          <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, textAlign: 'center', color: t.textPrimary, fontSize: 16, fontWeight: '700' }}>Edit roof layout</Text>
          <View style={{ minWidth: 96 }}><Action title="Done" label="Done editing roof" onPress={() => setEditing(false)} /></View>
        </View>
        <View accessibilityLabel="Roof readout" style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, paddingBottom: 8 }}>
          {[['Roof area', liveRoofArea === null ? DASH : `${liveRoofArea.toFixed(1)} m²`], ['Usable area', layout ? `${layout.usable_area_m2.toFixed(1)} m²` : DASH], ['Panels', layout ? String(layout.panel_count) : DASH]].map(([k, v]) => <View key={k} style={{ flex: 1 }}><Text style={{ color: t.textSecondary, fontSize: 11, lineHeight: 14 }}>{k}</Text><Text style={{ color: t.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: '700' }}>{v}</Text></View>)}
          {outdated && <Text style={{ color: t.amberText, fontSize: 11, fontWeight: '700' }}>Outdated</Text>}
        </View>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 8 }} onLayout={e => sizeToArea(e.nativeEvent.layout.width - 16, e.nativeEvent.layout.height ? e.nativeEvent.layout.height - 16 : undefined)}>
          <RoofCanvas roof={roof} layout={layout} draft={draft} mode={mode} metersPerUnit={mpu} obstacleNames={names} selectedObstacle={selected} fineGrid={snapOn} invalidObstacles={invalidObstacles} draftInvalid={!!draftProblem} a11yLabel={`Roof canvas, ${mode} mode: ${roof.boundary.length} roof vertices, ${roof.obstacles.length} obstacles, ${layout?.panel_count ?? 0} panels. Roof vertices can also be typed in the Advanced section.`} onEvent={onCanvas} />
        </View>
        <View style={{ gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><View style={{ flex: 1 }}><Label tone="secondary" caption>{hint}</Label></View><Label tone="secondary" caption>{count}</Label></View>
          <Label tone="secondary" caption>{gestureHint}</Label>
          {!!shapeNote && <Message tone="warning">{shapeNote}</Message>}
          {outlineWarning && <Message tone="warning">{outlineWarning}</Message>}
          {draftProblem && <Message tone="danger">{draftProblem}</Message>}
          {!draftProblem && invalidObstacles.length > 0 && <Message tone="danger">{`Obstacle ${invalidObstacles[0] + 1} is outside the roof or crosses itself. Remove it or move the roof corners.`}</Message>}
          {corners === 0 && <Action title="Start with a rectangle" variant="secondary" onPress={startRectangle} />}
          {scaleInEditor && scaleField}
          <PillSegmentedControl a11yLabel="Drawing mode" selectedId={mode} onSelect={id => setMode(id as 'roof' | 'obstacle' | 'scale')} options={[{ id: 'roof', label: 'Roof' }, { id: 'obstacle', label: 'Obstacle' }, { id: 'scale', label: 'Scale' }]} />
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            <Action title="Undo" label="Undo Last Point" style={compact} variant="secondary" disabled={!history.past.length} icon={<Undo2 size={15} color={history.past.length ? t.textPrimary : t.textSecondary} />} onPress={doUndo} />
            <Action title="Redo" label="Redo" style={compact} variant="secondary" disabled={!history.future.length} icon={<Redo2 size={15} color={history.future.length ? t.textPrimary : t.textSecondary} />} onPress={doRedo} />
            <Action title="Finish" label="Finish Obstacle" style={compact} variant="secondary" icon={<Check size={15} color={finishReason ? t.textSecondary : t.textPrimary} />} disabled={!!finishReason} onPress={finishObstacle} />
            <Action title="Remove" label="Remove Last Obstacle" style={compact} variant="secondary" icon={<Eraser size={15} color={t.textPrimary} />} disabled={!roof.obstacles.length} onPress={removeLast} />
          </View>
          {mode === 'obstacle' && <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            <Action title="Rectangle" label="Add rectangle obstacle" style={compact} variant="secondary" icon={<Square size={15} color={t.textPrimary} />} onPress={() => addShape('rect')} />
            <Action title="Circle" label="Add circle obstacle" style={compact} variant="secondary" icon={<CircleDot size={15} color={t.textPrimary} />} onPress={() => addShape('circle')} />
          </View>}
          {mode === 'obstacle' && selected !== null && selected < roof.obstacles.length && <View style={{ gap: 4 }}>
            <Field label={`Obstacle ${selected + 1} name`} value={names[selected] ?? ''} onChange={v => setNames(names.map((n, i) => i === selected ? v.slice(0, 40) : n))} />
            <Label tone="secondary" caption>Names show on the drawing on this device. The server stores obstacles as shapes only, so names are not saved.</Label>
          </View>}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <Chip compact label={snapOn ? 'Snap on' : 'Snap off'} a11yLabel="Snap to grid and right angles" selected={snapOn} onPress={() => { setSnapOn(!snapOn); setSnapNote(null); }} />
            {snapOn && snapNote && <View accessibilityLabel={snapNote === 'grid' ? 'Snapped to grid' : 'Snapped to right angle'} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Magnet size={13} color={t.limeText} /><Text style={{ color: t.limeText, fontSize: 12 }}>{snapNote === 'grid' ? 'Snapped to grid' : 'Snapped to right angle'}</Text></View>}
          </View>
          {finishReason && !draftProblem && <Label tone="secondary" caption>{finishReason}</Label>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{legend.map(l => <View key={l.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: l.color }} /><Text style={{ color: t.textSecondary, fontSize: 12 }}>{l.name}</Text></View>)}</View>
        </View>
      </View>
    </Modal>
    <ModalSheet visible={selector !== null} title={selector === 'type' ? 'Panel Type' : selector === 'tilt' ? 'Tilt Angle' : 'Orientation'} dismissOnBackdrop onRequestClose={() => setSelector(null)} footer={<Action title="Done" onPress={() => setSelector(null)} />}>
      {selector === 'type' && <><Label tone="secondary" caption>Module rating. This sets the module rating field in Advanced.</Label><ChipGroup>{MODULE_RATINGS.map(w => <Chip key={w} label={`${w} W`} a11yLabel={`${w} W module`} selected={pv.wattageW === w} onPress={() => choose('module_wattage_w', w)} />)}</ChipGroup></>}
      {selector === 'tilt' && <><Label tone="secondary" caption>Tilt from horizontal, 0 to 45 degrees. This sets the tilt field in Advanced.</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
          <View style={{ flex: 1 }}><Action title="−" label="Decrease tilt" variant="secondary" disabled={tiltNow <= TILT_MIN} onPress={() => stepTilt(-1)} /></View>
          <Text accessibilityLabel={`Tilt ${tiltNow} degrees`} style={{ minWidth: 72, textAlign: 'center', color: t.textPrimary, fontSize: 22, fontWeight: '700' }}>{tiltNow}°</Text>
          <View style={{ flex: 1 }}><Action title="+" label="Increase tilt" variant="secondary" disabled={tiltNow >= TILT_MAX} onPress={() => stepTilt(1)} /></View>
        </View>
        <ChipGroup>{[10, 20, 30, 40].map(d => <Chip key={d} label={`${d}°`} a11yLabel={`Tilt ${d} degrees`} selected={pv.tiltDeg === d} onPress={() => choose('tilt_deg', d)} />)}</ChipGroup></>}
      {selector === 'orientation' && <><Label tone="secondary" caption>The direction the panels face. 180 degrees is South. This sets the azimuth field in Advanced.</Label><ChipGroup>{COMPASS.map(c => <Chip key={c.id} label={c.id} a11yLabel={`Face ${compassPoint(c.deg)}`} selected={pv.azimuthDeg === c.deg} onPress={() => choose('azimuth_deg', c.deg)} />)}</ChipGroup></>}
    </ModalSheet>
  </SolvantaScreen>;
}

export default function RooftopScreen() {
 const building=useBuildings();
 return <RooftopWorkspace key={building.id} picker={building}/>;
}
