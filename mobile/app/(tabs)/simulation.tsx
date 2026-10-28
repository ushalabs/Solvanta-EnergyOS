import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Sparkles } from 'lucide-react-native';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { BatterySocRing } from '../../src/components/BatterySocRing';
import { PillSegmentedControl } from '../../src/components/PillSegmentedControl';
import { EnergyMetricCard } from '../../src/components/EnergyMetricCard';
import { LimeCTA } from '../../src/components/LimeCTA';
import { useTheme } from '../../src/theme/ThemeContext';
import { DEMO_BUILDING, DEMO_SIMULATION_TRACE } from '../../src/fixtures/mockData';
import { SPACING, RADIUS } from '../../src/theme/tokens';

export default function SimulationScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const [simMode, setSimMode] = useState('outage');
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(true);

  const handleRunSimulation = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
      Alert.alert(
        'Demo Trace Loaded',
        'This is a prewritten visual fixture with 30-minute samples. No energy simulation was executed. The deterministic engine is planned for Phase 7.'
      );
    }, 800);
  };

  return (
    <SolvantaScreen>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: tokens.textPrimary }]}>
            SIMULATION LAB
          </Text>
          <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
            DEMO trace • Engine not connected
          </Text>
        </View>
      </View>

      {/* Scenario Mode Selector */}
      <PillSegmentedControl
        selectedId={simMode}
        onSelect={setSimMode}
        options={[
          { id: 'baseline', label: 'Baseline' },
          { id: 'outage', label: '6h Outage ●' },
          { id: 'whatif', label: 'What-If' },
        ]}
      />

      {/* Signature Neon Battery SoC Ring Gauge */}
      <BatterySocRing
        socPct={DEMO_BUILDING.batterySocPct}
        backupHours={DEMO_BUILDING.backupEstimatedHours}
        outageDurationHours={6}
        unservedCriticalKwh={1.2}
      />

      {/* Supply & Demand Wells */}
      <View style={styles.metricsRow}>
        <EnergyMetricCard
          label="SOLAR PV GENERATION"
          value={DEMO_BUILDING.currentPvKw.toFixed(1)}
          unit="kW"
          subtext="0.0 kW at night"
        />
        <View style={{ width: SPACING.sm }} />
        <EnergyMetricCard
          label="SCENARIO DEMAND"
          value={DEMO_BUILDING.currentLoadKw.toFixed(2)}
          unit="kW"
          subtext="Unoptimized load"
        />
      </View>

      {/* 15-Minute Timeline Comparison Card */}
      <View
        style={[
          styles.timelineCard,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
          },
        ]}
      >
        <View style={styles.tHeader}>
          <Text style={[styles.tTitle, { color: tokens.textSecondary }]}>
            SOC TRAJECTORY (18:00 – 24:00)
          </Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: tokens.red }]} />
            <Text style={[styles.legendText, { color: tokens.textMuted }]}>
              Baseline
            </Text>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: tokens.lime, marginLeft: 10 },
              ]}
            />
            <Text style={[styles.legendText, { color: tokens.textMuted }]}>
              Optimized
            </Text>
          </View>
        </View>

        {/* Timeline intervals step trace */}
        <View style={styles.traceContainer}>
          {DEMO_SIMULATION_TRACE.map((step, idx) => (
            <View key={idx} style={styles.traceStep}>
              <View style={styles.stepBars}>
                {/* Baseline bar */}
                <View
                  style={[
                    styles.stepBar,
                    {
                      height: (step.baselineSoc / 100) * 50,
                      backgroundColor:
                        step.baselineSoc <= 20 ? tokens.red : 'rgba(255, 98, 106, 0.5)',
                    },
                  ]}
                />
                {/* Optimized bar */}
                <View
                  style={[
                    styles.stepBar,
                    {
                      height: (step.optimizedSoc / 100) * 50,
                      backgroundColor: tokens.lime,
                    },
                  ]}
                />
              </View>
              {idx % 3 === 0 && (
                <Text style={[styles.stepTime, { color: tokens.textMuted }]}>
                  {step.timeLabel}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Coverage Progress Bar */}
        <View style={styles.covBox}>
          <View style={styles.covLabelRow}>
            <Text style={[styles.covText, { color: tokens.textPrimary }]}>
              Critical Load Coverage:
            </Text>
            <Text style={[styles.covPct, { color: tokens.lime }]}>
              86% (Baseline) → 100% (Optimized)
            </Text>
          </View>
          <View style={[styles.covTrack, { backgroundColor: tokens.surfaceElevated }]}>
            <View
              style={[
                styles.covFill,
                { width: '86%', backgroundColor: tokens.lime },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Primary Simulation CTA */}
      <LimeCTA
        title="Preview Demo Outage Trace"
        loading={isRunning}
        onPress={handleRunSimulation}
        icon={<Play size={16} color={tokens.onLime} style={{ marginRight: 6 }} />}
      />

      <LimeCTA
        title="View Recommended Schedules & Plan"
        variant="surface"
        onPress={() => router.push('/scheduling')}
        icon={<Sparkles size={16} color={tokens.lime} style={{ marginRight: 6 }} />}
        style={{ marginBottom: SPACING.xl }}
      />
    </SolvantaScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: SPACING.xs,
  },
  timelineCard: {
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    marginVertical: SPACING.sm,
    borderWidth: 1,
  },
  tHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  traceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 75,
    marginVertical: SPACING.sm,
  },
  traceStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  stepBar: {
    width: 4,
    borderRadius: 2,
  },
  stepTime: {
    fontSize: 9,
    marginTop: 4,
  },
  covBox: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  covLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  covText: {
    fontSize: 12,
    fontWeight: '600',
  },
  covPct: {
    fontSize: 12,
    fontWeight: '800',
  },
  covTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  covFill: {
    height: '100%',
    borderRadius: 4,
  },
});
