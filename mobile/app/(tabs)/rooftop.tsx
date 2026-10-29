import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Rect, Circle, Image as SvgImage, Line } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { Card, Label, Field, Action, BuildingPicker, useBuildings } from '../../src/components/TwinControls';
import { api } from '../../src/api/client';
import { emptyRoof, RoofInput, RoofRecord, Layout, Point, parsePoints, formatPoints } from '../../src/api/roof';
import { useTheme } from '../../src/theme/ThemeContext';

export default function RooftopScreen() {
  const { tokens: t } = useTheme();
  const building = useBuildings();
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
    const point = { x: Math.round(x / width * roof.width), y: Math.round(y / width * roof.width) };
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
  return <SolvantaScreen banner="ROOFTOP • Measured geometry • Preliminary engineering">
    <Label>ROOFTOP STUDIO</Label><BuildingPicker state={building} />
    <Card><Label>Use a top-down, rectified roof image. Perspective photos cannot provide reliable dimensions from one scale line. No automatic CV detection is claimed.</Label>
      <Action title="Import Roof Photo" onPress={() => importImage(false)} /><Action title="Take Roof Photo" onPress={() => importImage(true)} />
      <Label>Tap to add vertices. Current mode: {mode}</Label>
      {(['roof', 'obstacle', 'scale'] as const).map(v => <Action key={v} title={`Draw ${v}`} onPress={() => setMode(v)} />)}
      <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height: width * roof.height / roof.width, backgroundColor: t.surfaceElevated }} onStartShouldSetResponder={() => true} onResponderRelease={e => tap(e.nativeEvent.locationX, e.nativeEvent.locationY)}>
        <Svg pointerEvents="none" width="100%" height="100%" viewBox={`0 0 ${roof.width} ${roof.height}`}>
          {roof.image_data && <SvgImage href={{ uri: roof.image_data }} width={roof.width} height={roof.height} />}
          <Polygon points={roof.boundary.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(198,244,61,0.1)" stroke={t.lime} strokeWidth={5} />
          {roof.obstacles.map((ring, i) => <Polygon key={i} points={ring.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(255,98,106,0.4)" stroke={t.red} strokeWidth={4} />)}
          {draft.length > 0 && <Polygon points={draft.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(255,98,106,0.2)" stroke={t.red} strokeWidth={4} />}
          {layout?.panels.map((p, i) => <Rect key={i} {...p} fill="rgba(198,244,61,0.5)" stroke={t.lime} strokeWidth={2} />)}
          {roof.scale_points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={9} fill={t.cyan} />)}
          {roof.scale_points.length === 2 && <Line x1={roof.scale_points[0].x} y1={roof.scale_points[0].y} x2={roof.scale_points[1].x} y2={roof.scale_points[1].y} stroke={t.cyan} strokeWidth={4} />}
        </Svg>
      </View>
      <Action title="Undo Last Point" onPress={() => { if (mode === 'obstacle') setDraft(draft.slice(0, -1)); else if (mode === 'scale') change({ ...roof, scale_points: roof.scale_points.slice(0, -1) }); else { const boundary = roof.boundary.slice(0, -1); change({ ...roof, boundary }); setCoords(formatPoints(boundary)); } }} />
      <Action title="Finish Obstacle" disabled={draft.length < 3} onPress={() => { change({ ...roof, obstacles: [...roof.obstacles, draft] }); setDraft([]); }} />
      <Action title="Remove Last Obstacle" onPress={() => { change({ ...roof, obstacles: roof.obstacles.slice(0, -1) }); setDraft([]); }} />
      <Field label="Roof vertices (x,y; x,y) — edit to correct" value={coords} onChange={v => { setCoords(v); setLayout(null); try { setRoof({ ...roof, boundary: parsePoints(v) }); } catch {} }} />
      <Field label="Measured scale distance (m)" numeric value={distance} onChange={v => { setDistance(v); setLayout(null); }} />
      {(['setback_m', 'panel_width_m', 'panel_height_m', 'gap_m'] as const).map(key => <Field key={key} label={key.replaceAll('_', ' ')} numeric value={String(roof[key])} onChange={v => change({ ...roof, [key]: v === '' ? 0 : Number(v) })} />)}
      <Action title="Calculate Placement" disabled={!building.id || busy} onPress={() => calculate(false)} />
      <Action title="Save Roof" disabled={!building.id || busy} onPress={() => calculate(true)} />
      <Label>{message}</Label>
      {layout && <><Label>{layout.usable_area_m2.toFixed(2)} m² usable · {layout.panel_count} panels</Label><Label>{layout.method}</Label></>}
      <Label>2D geometry editor. Native AR is scheduled for Phase 12.</Label>
    </Card>
  </SolvantaScreen>;
}
