import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';
import { Badge, Card, Label, Metric, MetricGrid } from './TwinControls';
import { Described, ToolResultData, describeResult } from '../api/toolResult';

/**
 * A tool result as plain cards: the source badge, a title and one sentence, the figures, any list of items, and notes.
 * It shows only what the result returned, with a dash for a missing value, and never the raw data.
 */
export function MCPToolResultCard({ result, described }: { result: ToolResultData; described?: Described }) {
  const { tokens: t } = useTheme();
  const d = described ?? describeResult(result);
  const simulated = result.source === 'SIMULATED';
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm }}>
        <Text accessibilityRole="header" style={{ flex: 1, color: t.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '700' }}>{d.title}</Text>
        <Badge label={result.source} tone={simulated ? 'warning' : 'info'} />
      </View>
      {d.summary ? <Text style={{ color: t.textPrimary, fontSize: 14, lineHeight: 20 }}>{d.summary}</Text> : null}
      {d.rows.length ? <MetricGrid>{d.rows.map(r => <Metric key={r.label} label={r.label} value={r.value} />)}</MetricGrid> : null}
      {d.items.map((item, i) => (
        <View key={`${item.title}-${i}`} testID="result-item" style={{ gap: 2, padding: 12, borderRadius: RADIUS.md, backgroundColor: item.warning ? t.amberTint : t.surfaceElevated }}>
          <Text style={{ color: item.warning ? t.amberText : t.textPrimary, fontSize: 14, lineHeight: 19, fontWeight: '600' }}>{item.title}</Text>
          {item.lines.map((line, j) => <Text key={j} style={{ color: t.textSecondary, fontSize: 13, lineHeight: 18 }}>{line}</Text>)}
        </View>
      ))}
      {d.empty ? <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 19 }}>{d.empty}</Text> : null}
      {d.notes.map((n, i) => <Label key={i} tone="secondary" caption>{n}</Label>)}
      <Label tone="secondary" caption>{result.provenance}</Label>
      <Label tone="secondary" caption>{result.scenario_id ? `Saved scenario ${result.scenario_id.slice(0, 8)}` : 'Building configuration'}{result.record_id ? ` · saved record ${result.record_id.slice(0, 8)}` : ''}</Label>
    </Card>
  );
}
