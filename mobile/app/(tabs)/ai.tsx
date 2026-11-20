import React, { useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { Card, Label, Message, Badge, Action, BuildingHeader, useBuildings } from '../../src/components/TwinControls';
import { Collapsible } from '../../src/components/Collapsible';
import { useTheme } from '../../src/theme/ThemeContext';
import { api } from '../../src/api/client';
import { friendlyToolError } from '../../src/api/toolResult';
import { OperationsTools } from '../../src/components/OperationsTools';

export default function Operations() {
  const { tokens: t } = useTheme();
  const building = useBuildings();
  const [incidents, setIncidents] = useState<Array<{ id: string; source: string; code: string; state: string; possible_cause: string }>>([]);
  const [status, setStatus] = useState('Select a building to load incidents.');
  // The shortcuts row pinned above the dock, once there is a result, and the scroll view a new result is brought into.
  const [quickRow, setQuickRow] = useState<React.ReactNode | null>(null);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    let active = true; setIncidents([]);
    if (building.id) Promise.all([api.getReady(), api.get<typeof incidents>(`/buildings/${building.id}/incidents`)]).then(([r, i]) => { if (active) { setStatus(r.ready ? (i.length ? '' : 'No incidents found.') : 'The on-device engine is not ready yet.'); setIncidents(i); } }).catch(e => { if (active) setStatus(friendlyToolError(e)); });
    return () => { active = false; };
  }, [building.id]);
  return <SolvantaScreen banner="GUIDED SHORTCUTS • no language model is connected" footer={quickRow} scrollRef={scroll}>
    <BuildingHeader title="Solvanta AI" building={building} />
    {building.id && <OperationsTools key={building.id} buildingId={building.id} onFooter={setQuickRow} onScrollTo={y => scroll.current?.scrollTo?.({ y, animated: true })} />}
    <Collapsible title="Incidents" subtitle="SIMULATED source until real data exists" icon={<AlertTriangle size={18} color={t.limeText} />}>
      {!!status && <Message>{status}</Message>}
      {incidents.map(i => <Card nested key={i.id}><Badge label={i.source} tone="warning" /><Label strong>{i.code} · {i.state}</Label><Label tone="secondary" caption>{i.possible_cause}</Label></Card>)}
      <Action title="Open Simulation & Plan Review" variant="secondary" onPress={() => router.push('/simulation')} />
    </Collapsible>
  </SolvantaScreen>;
}
