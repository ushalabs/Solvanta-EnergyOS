import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { router } from 'expo-router';
import { Activity, Bell, Bot, CalendarClock, Leaf, Settings, Sliders, Sun } from 'lucide-react-native';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { WeatherCard } from '../../src/components/WeatherCard';
import { EnergyFlowSvg } from '../../src/components/EnergyFlowSvg';
import { EnergyBarChart } from '../../src/components/EnergyBarChart';
import { Badge, Card, CardHeader, Label, Metric, MetricGrid, ScreenHeader, IconButton, ChipGroup, Tile, BuildingPicker, useBuildings } from '../../src/components/TwinControls';
import { useTheme } from '../../src/theme/ThemeContext';
import { api, EquipmentSummary } from '../../src/api/client';
import { EnergyRun } from '../../src/api/simulation';
import { PVProfile, PVRecord } from '../../src/api/pv';
import { clockLabel, formatKw, overviewNodes, stepAt } from '../../src/api/overview';

const HOUSE = require('../../assets/images/home-house.png');
// Measured from the image (1024 x 986). The top pull tucks the roof up beside the weather card;
// the base is the plot's front corner, where the flow line starts.
const HOUSE_ASPECT = 986 / 1024;
const HOUSE_TOP_SPACE = 0.2;
const HOUSE_BASE = { x: 0.472, y: 0.857 };
const LINE_ABOVE_NODES = 28;
const NO_FLOW_KW = 0.005;

export default function Overview() {
  const { tokens: t } = useTheme();
  const building = useBuildings();
  const [equipment, setEquipment] = useState<EquipmentSummary | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [run, setRun] = useState<EnergyRun | null>(null);
  const [pv, setPv] = useState<PVProfile | null>(null);
  const [pvNote, setPvNote] = useState('');
  const [openIncidents, setOpenIncidents] = useState(0);
  const [message, setMessage] = useState('Sign in and choose a building.');
  const [choosing, setChoosing] = useState(false);
  const [houseWidth, setHouseWidth] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let active = true;
    setEquipment(null); setSummary(null); setRun(null);
    if (building.id) Promise.all([
      api.getBuildingEquipment(building.id),
      api.get<Array<{ id: string; summary: Record<string, number> }>>(`/buildings/${building.id}/simulations`),
    ]).then(([e, r]) => {
      if (!active) return;
      setEquipment(e); setSummary(r[0]?.summary || null);
      setMessage(r.length ? 'Showing latest saved simulation.' : 'No saved simulation yet. Run one to see numerical energy results.');
      // The list holds totals only; the node cards need the run's intervals.
      if (r[0]) api.get<EnergyRun>(`/buildings/${building.id}/simulations/${r[0].id}`).then(full => { if (active) setRun(full); }).catch(() => {});
    }).catch(e => { if (active) setMessage(e.message); });
    return () => { active = false; };
  }, [building.id]);

  useEffect(() => {
    let active = true;
    setPv(null); setPvNote(''); setOpenIncidents(0);
    if (!building.id) return;
    api.get<PVRecord>(`/buildings/${building.id}/pv`).then(r => { if (active) setPv(r.profile); })
      .catch(e => { if (active) setPvNote(e.status === 404 ? 'Save a measured roof to see the PV estimate.' : e.message); });
    api.get<Array<{ state: string }>>(`/buildings/${building.id}/incidents`).then(list => { if (active) setOpenIncidents(list.filter(i => i.state === 'OPEN').length); })
      .catch(() => {});
    return () => { active = false; };
  }, [building.id]);

  // The node cards follow the time of day, so move to the next interval as the clock does.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const selected = building.buildings.find(b => b.id === building.id);
  const place = selected?.address?.split(',')[0].trim();
  const nodes = overviewNodes(stepAt(run?.result, now));
  const origin = nodes ? `simulated at ${clockLabel(nodes.minute)}` : 'no reading';
  const houseHeight = houseWidth * HOUSE_ASPECT;

  return <SolvantaScreen banner={null}>
    <ScreenHeader
      title="Solvanta"
      subtitle={selected ? `${selected.name}${place ? ` · ${place}` : ''}` : 'Choose a building'}
      left={<Leaf size={28} color={t.limeText} fill={t.limeText} />}
      onTitlePress={() => setChoosing(!choosing)}
      titlePressLabel={selected ? `Change building: ${selected.name}` : 'Choose a building'}
      right={<View>
        <IconButton label={openIncidents ? `Operations: ${openIncidents} open incident${openIncidents === 1 ? '' : 's'}` : 'Operations: no open incidents'} onPress={() => router.push('/ai')}><Bell size={20} color={t.textPrimary} /></IconButton>
        {openIncidents > 0 && <View testID="incident-dot" pointerEvents="none" style={{ position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: t.red, borderWidth: 1.5, borderColor: t.surface }} />}
      </View>}
    />
    {(choosing || !!building.error || !building.id) && <BuildingPicker state={building} />}

    <View style={{ zIndex: 1 }}><WeatherCard key={building.id || 'weather'} buildingId={building.id || undefined} compact /></View>

    <EnergyFlowSvg
      originInset={LINE_ABOVE_NODES}
      solar={{ value: formatKw(nodes?.solarKw), unit: 'kW', flow: nodes?.flows.solar, a11yLabel: `Solar: ${formatKw(nodes?.solarKw)} kW, ${origin}` }}
      grid={{
        value: formatKw(nodes?.gridKw), unit: 'kW', flow: nodes?.flows.grid,
        subtext: !nodes ? undefined : !nodes.gridAvailable ? 'Outage' : nodes.gridKw < -NO_FLOW_KW ? 'Exporting' : undefined,
        a11yLabel: `Grid: ${formatKw(nodes?.gridKw)} kW${!nodes ? '' : !nodes.gridAvailable ? ', outage' : nodes.gridKw < -NO_FLOW_KW ? ', exporting' : ''}, ${origin}`,
      }}
      battery={{
        value: formatKw(nodes?.batteryKw), unit: 'kW', flow: nodes?.flows.battery, socPct: nodes?.socPct,
        subtext: !nodes ? undefined : nodes.flows.battery === 'in' ? 'Discharging' : nodes.flows.battery === 'out' ? 'Charging' : 'Idle',
        a11yLabel: nodes ? `Battery: ${formatKw(nodes.batteryKw)} kW, ${nodes.flows.battery === 'in' ? 'discharging' : nodes.flows.battery === 'out' ? 'charging' : 'idle'}, ${Math.round(nodes.socPct)}% charged, ${origin}` : 'Battery: no reading',
      }}
      home={{
        value: formatKw(nodes?.homeKw), unit: 'kW', flow: nodes?.flows.home,
        subtext: nodes && nodes.unmetKw > NO_FLOW_KW ? `Unmet ${nodes.unmetKw.toFixed(2)} kW` : undefined,
        a11yLabel: `Home: ${formatKw(nodes?.homeKw)} kW served${nodes && nodes.unmetKw > NO_FLOW_KW ? `, ${nodes.unmetKw.toFixed(2)} kW unmet` : ''}, ${origin}`,
      }}
    >
      <View onLayout={e => setHouseWidth(e.nativeEvent.layout.width)} style={{ marginTop: -houseHeight * HOUSE_TOP_SPACE, marginBottom: -houseHeight * (1 - HOUSE_BASE.y) + LINE_ABOVE_NODES }}>
        {/* Shifted so the plot's front corner sits on the centre line, where the flow line starts. Never animated. */}
        <Image source={HOUSE} resizeMode="contain" accessibilityRole="image" accessibilityLabel="Illustration of a house with rooftop solar panels" style={{ width: houseWidth, height: houseHeight, transform: [{ translateX: houseWidth * (0.5 - HOUSE_BASE.x) }] }} />
      </View>
    </EnergyFlowSvg>

    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 4 }}>
      <Badge label="SIMULATED" tone="warning" />
      <View style={{ flex: 1 }}><Label tone="secondary" caption>{nodes && run ? `Saved run ${run.id.slice(0, 8)} at ${clockLabel(nodes.minute)} on a representative day. Not live readings.` : message}</Label></View>
    </View>

    <EnergyBarChart
      title="Estimated generation"
      subtitle="Hourly PV estimate, representative day"
      badge="SIMULATED"
      headline={pv ? pv.daily_energy_kwh.toFixed(1) : '—'}
      headlineUnit="kWh per day"
      data={pv ? pv.timeline.map(p => ({ day: String(p.hour), kwh: p.energy_kwh })) : []}
      axisLabels={['00:00', '06:00', '12:00', '18:00', '24:00']}
      emptyText={pvNote || (building.id ? 'Loading the PV estimate…' : 'Choose a building to see the PV estimate.')}
      caption={pv ? `Not today's measured output. ${pv.source}` : undefined}
      a11yLabel={pv ? `Estimated generation by hour for a representative day, ${pv.daily_energy_kwh.toFixed(1)} kWh in total. Simulated, not measured.` : undefined}
    />

    <ChipGroup>
      <Tile active title="Simulate, Compare & Approve" subtitle="Run an outage scenario and review plans" icon={c => <Activity size={20} color={c} />} onPress={() => router.push('/simulation')} />
      <Tile title="Configure Appliances" icon={c => <Sliders size={20} color={c} />} onPress={() => router.push('/appliances')} />
      <Tile title="Open Rooftop & PV Design" icon={c => <Sun size={20} color={c} />} onPress={() => router.push('/rooftop')} />
      <Tile title="Size Solar from Bill" subtitle="Compare 50%, 75%, and 100% usage offsets" icon={c => <Sun size={20} color={c} />} onPress={() => router.push('/solar-sizing')} />
      <Tile title="Schedule Appliances" icon={c => <CalendarClock size={20} color={c} />} onPress={() => router.push('/scheduling')} />
      <Tile title="Open Operations" icon={c => <Bot size={20} color={c} />} onPress={() => router.push('/ai')} />
      <Tile title="Open Settings" icon={c => <Settings size={20} color={c} />} onPress={() => router.push('/settings')} />
    </ChipGroup>

    {equipment && <Card><CardHeader title="Configured system" subtitle="From saved building equipment" /><MetricGrid><Metric label="Installed PV" value={equipment.solar.pv_capacity_kwp} unit="kWp" /><Metric label="Inverter" value={equipment.inverter.rating_kw} unit="kW" /><Metric label="Battery" value={equipment.battery.nominal_capacity_kwh} unit="kWh" /><Metric label="Initial SoC" value={equipment.battery.initial_soc_pct} unit="%" /><Metric label="Grid import limit" value={equipment.grid.import_limit_kw} unit="kW" /></MetricGrid></Card>}
    {summary && <Card><CardHeader title="Latest saved simulation" subtitle="Simulated energy over the run" badge="SIMULATED" /><MetricGrid><Metric label="Requested" value={summary.load_kwh.toFixed(2)} unit="kWh" /><Metric label="PV" value={summary.pv_kwh.toFixed(2)} unit="kWh" tone="accent" /><Metric label="Unmet" value={summary.unmet_kwh.toFixed(2)} unit="kWh" tone={summary.unmet_kwh > 0 ? 'warning' : 'primary'} /><Metric label="Critical unmet" value={summary.unserved_critical_kwh.toFixed(2)} unit="kWh" tone={summary.unserved_critical_kwh > 0 ? 'danger' : 'success'} /><Metric label="Final battery" value={summary.final_soc_pct.toFixed(1)} unit="%" /></MetricGrid></Card>}
  </SolvantaScreen>;
}
