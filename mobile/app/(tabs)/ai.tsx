import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Send, Sparkles, Terminal } from 'lucide-react-native';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { MCPToolResultCard } from '../../src/components/MCPToolResultCard';
import { IncidentCard } from '../../src/components/IncidentCard';
import { useTheme } from '../../src/theme/ThemeContext';
import { SPACING, RADIUS } from '../../src/theme/tokens';

export default function AIScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const [query, setQuery] = useState('');
  const [showToolResult, setShowToolResult] = useState(true);

  const handlePromptChip = (text: string) => {
    setQuery(text);
  };

  const handleSend = () => {
    if (!query.trim()) return;
    Alert.alert(
      'MCP Engine Invocation',
      `Invoking typed MCP tool optimize_resilience for scenario "scen_lahore_01". Calculations handled strictly by verified Python engine.`
    );
    setQuery('');
    setShowToolResult(true);
  };

  return (
    <SolvantaScreen>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: tokens.textPrimary }]}>
            SOLVANTA AI OPERATIONS
          </Text>
          <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
            MCP Engine Gateway • Physics-Bound Tool Execution
          </Text>
        </View>

        <View style={[styles.mcpBadge, { backgroundColor: tokens.surfaceElevated }]}>
          <Terminal size={14} color={tokens.lime} style={{ marginRight: 4 }} />
          <Text style={[styles.mcpBadgeText, { color: tokens.lime }]}>
            MCP ACTIVE
          </Text>
        </View>
      </View>

      {/* Suggested Action Chips */}
      <View style={styles.chipsContainer}>
        {[
          'Simulate 6h blackout',
          'Optimize appliance schedule',
          'Compare +5kWh battery upgrade',
        ].map((chip, idx) => (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.8}
            onPress={() => handlePromptChip(chip)}
            style={[
              styles.chip,
              { backgroundColor: tokens.surface, borderColor: tokens.border },
            ]}
          >
            <Sparkles size={12} color={tokens.lime} style={{ marginRight: 6 }} />
            <Text style={[styles.chipText, { color: tokens.textSecondary }]}>
              {chip}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Structured MCP Tool Result Card */}
      {showToolResult && (
        <MCPToolResultCard
          toolName="optimize_resilience"
          engineName="app.engines.resilience.ResilienceOptimizer"
          scenarioId="scen_lahore_01"
          resultSummary="Optimized load shedding policy formulated. Shedding 1.5 kW AC load at 18:00 avoids 1.2 kWh critical fridge outage and preserves 31% ending battery reserve."
          criticalCoveragePct={100}
          durationMs={42}
          onViewPlan={() => router.push('/scheduling')}
          onReviewEvidence={() =>
            Alert.alert(
              'Audit Evidence',
              'Energy balance conservation error: 0.0000 kWh. Battery minimum 20% reserve strictly respected.'
            )
          }
        />
      )}

      {/* Simulated Incident Diagnostic Card */}
      <IncidentCard
        id="INC-701"
        title="Battery Discharge Discrepancy Alert"
        severity="warning"
        suspectedCause="Simulated household telemetry reports 3.8 kW load vs expected 2.45 kW scenario sum."
        timestamp="10 mins ago"
        onViewTrace={(id) =>
          Alert.alert(
            'Incident Trace',
            `Anomaly ID: ${id}\nSource: SimulationProvider\nSuspected: High unaccounted inductive load.`
          )
        }
      />

      {/* Operations Query Input Bar */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
          },
        ]}
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Ask operations or execute MCP tool..."
          placeholderTextColor={tokens.textMuted}
          style={[styles.input, { color: tokens.textPrimary }]}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSend}
          style={[styles.sendBtn, { backgroundColor: tokens.lime }]}
          accessibilityLabel="Send query"
        >
          <Send size={16} color={tokens.onLime} />
        </TouchableOpacity>
      </View>
    </SolvantaScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  mcpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  mcpBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: SPACING.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 13,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
