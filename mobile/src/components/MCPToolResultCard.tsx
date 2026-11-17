import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';
import { Badge, Card, Label, Metric, MetricGrid } from './TwinControls';
import { Described, ToolResultData, describeResult, technicalDetails } from '../api/toolResult';

/** A text row that opens and closes a section. The content stays mounted while closed (only hidden). */
export function Disclosure({ title, children, startOpen = false }: { title: string; children: React.ReactNode; startOpen?: boolean }) {
  const { tokens: t } = useTheme();
  const [open, setOpen] = useState(startOpen);
  const Icon = open ? ChevronUp : ChevronDown;
  return (
    <View>
      <TouchableOpacity activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`${open ? 'Hide' : 'Show'} ${title}`} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
        <Text style={{ color: t.limeText, fontSize: 14, lineHeight: 19, fontWeight: '600' }}>{title}</Text>
        <Icon size={16} color={t.limeText} />
      </TouchableOpacity>
      <View style={open ? { gap: SPACING.sm, paddingBottom: SPACING.sm } : { display: 'none' }}>{children}</View>
    </View>
  );
}

/**
 * A tool result as plain cards: the source badge, a headline, the few numbers that matter, then folded sections for the
 * rest. It shows only what the result returned, with a dash for a missing value, and never the raw data.
 */
export function MCPToolResultCard({ result, described, note, action }: { result: ToolResultData; described?: Described; note?: string; action?: { label: string; onPress: () => void } }) {
  const { tokens: t } = useTheme();
  const d = described ?? describeResult(result);
  const simulated = result.source === 'SIMULATED';
  const small = { color: t.textSecondary, fontSize: 12, lineHeight: 17 };
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm }}>
        <Text accessibilityRole="header" style={{ flex: 1, color: t.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '700' }}>{d.title}</Text>
        <Badge label={result.source} tone={simulated ? 'warning' : 'info'} />
      </View>
      {d.summary ? <Text style={{ color: t.textPrimary, fontSize: 14, lineHeight: 20 }}>{d.summary}</Text> : null}
      {d.rows.length ? <MetricGrid>{d.rows.map(r => <Metric key={r.label} label={r.label} value={r.value} />)}</MetricGrid> : null}
      {d.table ? (
        <View testID="result-table" style={{ borderRadius: RADIUS.md, backgroundColor: t.surfaceElevated, padding: 12, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View style={{ flex: 1.3 }} />
            {d.table.columns.map(c => <Text key={c} style={{ flex: 1, color: t.textSecondary, fontSize: 11, lineHeight: 15, fontWeight: '600', textAlign: 'right' }}>{c}</Text>)}
          </View>
          {d.table.rows.map(r => (
            <View key={r.name} testID="result-table-row" accessibilityLabel={`${r.name}: ${d.table!.columns.map((c, i) => `${c} ${r.cells[i]}`).join(', ')}`} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
              <Text style={{ flex: 1.3, color: t.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: '600' }}>{r.name}</Text>
              {r.cells.map((c, i) => <Text key={i} style={{ flex: 1, color: t.textPrimary, fontSize: 12, lineHeight: 18, textAlign: 'right' }}>{c}</Text>)}
            </View>
          ))}
        </View>
      ) : null}
      {d.table?.sameNote ? <Text style={{ color: t.textPrimary, fontSize: 13, lineHeight: 19 }}>{d.table.sameNote}</Text> : null}
      {d.items.map((item, i) => (
        <View key={`${item.title}-${i}`} testID="result-item" style={{ gap: 2, padding: 12, borderRadius: RADIUS.md, backgroundColor: item.warning ? t.amberTint : t.surfaceElevated }}>
          <Text style={{ color: item.warning ? t.amberText : t.textPrimary, fontSize: 14, lineHeight: 19, fontWeight: '600' }}>{item.title}</Text>
          {item.lines.map((line, j) => <Text key={j} style={{ color: t.textSecondary, fontSize: 13, lineHeight: 18 }}>{line}</Text>)}
        </View>
      ))}
      {d.empty ? <Text style={{ color: t.textSecondary, fontSize: 13, lineHeight: 19 }}>{d.empty}</Text> : null}
      {d.inlineNotes.map((n, i) => <Text key={i} style={small}>{n}</Text>)}
      {d.checked ? <Text style={small}>Checked: {d.checked}</Text> : null}
      {note ? <Text style={small}>{note}</Text> : null}
      {action ? <TouchableOpacity accessibilityRole="link" accessibilityLabel={action.label} activeOpacity={0.8} onPress={action.onPress} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}><Text style={{ color: t.limeText, fontSize: 14, lineHeight: 19, fontWeight: '600', textDecorationLine: 'underline' }}>{action.label}</Text></TouchableOpacity> : null}
      {d.moreRows.length ? <Disclosure title="Show all details"><MetricGrid>{d.moreRows.map(r => <Metric key={r.label} label={r.label} value={r.value} />)}</MetricGrid></Disclosure> : null}
      <Disclosure title="How this was calculated">
        {d.notes.map((n, i) => <Label key={i} tone="secondary" caption>{n}</Label>)}
        <Label tone="secondary" caption>{result.provenance}</Label>
        <Text style={{ color: t.textPrimary, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 4 }}>Technical details</Text>
        {technicalDetails(result).map(r => <View key={r.label} testID="technical-row" style={{ flexDirection: 'row', gap: 8 }}><Text style={{ width: 96, ...small }}>{r.label}</Text><Text selectable style={{ flex: 1, ...small, color: t.textPrimary }}>{r.value}</Text></View>)}
      </Disclosure>
    </Card>
  );
}
