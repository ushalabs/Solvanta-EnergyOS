import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Settings, ShieldCheck, Play, Calendar } from 'lucide-react-native';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { NeonHeroCard } from '../../src/components/NeonHeroCard';
import { EnergyFlowSvg } from '../../src/components/EnergyFlowSvg';
import { EnergyMetricCard } from '../../src/components/EnergyMetricCard';
import { EnergyBarChart } from '../../src/components/EnergyBarChart';
import { LimeCTA } from '../../src/components/LimeCTA';
import { useTheme } from '../../src/theme/ThemeContext';
import { DEMO_BUILDING, DEMO_WEEKLY_USAGE } from '../../src/fixtures/mockData';
import { SPACING, RADIUS } from '../../src/theme/tokens';

export default function OverviewScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const [resilienceModeActive, setResilienceModeActive] = useState(true);

  return (
    <SolvantaScreen>
      {/* Top Navigation & Brand Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.brandTitle, { color: tokens.textPrimary }]}>
            SOLVANTA
          </Text>
          <View style={styles.provenanceRow}>
            <View style={[styles.provDot, { backgroundColor: tokens.amber }]} />
            <Text style={[styles.provText, { color: tokens.textMuted }]}>
              {DEMO_BUILDING.provenance} • Last scenario: 20:00
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/settings')}
          style={[
            styles.avatarBtn,
            { backgroundColor: tokens.surface, borderColor: tokens.border },
          ]}
          accessibilityLabel="Open settings"
        >
          <Settings size={20} color={tokens.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Signature Neon Hero Banner: Resilience Mode */}
      <NeonHeroCard
        badgeText="POLICY ACTIVE"
        title="RESILIENCE MODE"
        subtitle="Critical building loads prioritized during evening grid failure."
        rightElement={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setResilienceModeActive(!resilienceModeActive)}
            style={[
              styles.heroSwitch,
              {
                backgroundColor: resilienceModeActive
                  ? tokens.onLime
                  : 'rgba(0,0,0,0.3)',
              },
            ]}
          >
            <ShieldCheck
              size={20}
              color={resilienceModeActive ? tokens.limeBright : tokens.textMuted}
            />
          </TouchableOpacity>
        }
      />

      {/* Real SVG Energy Flow Diagram */}
      <EnergyFlowSvg
        solarKw={DEMO_BUILDING.currentPvKw}
        batterySocPct={DEMO_BUILDING.batterySocPct}
        batteryFlowKw={DEMO_BUILDING.currentLoadKw}
        loadKw={DEMO_BUILDING.currentLoadKw}
        gridAvailable={DEMO_BUILDING.gridAvailable}
      />

      {/* High-Density Metric Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.gridRow}>
          <EnergyMetricCard
            label="SOLAR PV"
            value={DEMO_BUILDING.currentPvKw.toFixed(1)}
            unit="kW"
            subtext="Night zero irradiance"
            accentColor={tokens.textPrimary}
          />
          <View style={{ width: SPACING.sm }} />
          <EnergyMetricCard
            label="ACTIVE LOAD"
            value={DEMO_BUILDING.currentLoadKw.toFixed(2)}
            unit="kW"
            subtext="5 appliances modeled"
            accentColor={tokens.textPrimary}
          />
        </View>

        <View style={styles.gridRow}>
          <EnergyMetricCard
            label="BATTERY SOC"
            value={DEMO_BUILDING.batterySocPct}
            unit="%"
            subtext="Usable: 9.0 kWh"
            accentColor={tokens.lime}
          />
          <View style={{ width: SPACING.sm }} />
          <EnergyMetricCard
            label="EST. BACKUP"
            value={DEMO_BUILDING.backupEstimatedHours.toFixed(1)}
            unit="h"
            subtext="To 20% min reserve"
            accentColor={tokens.cyan}
          />
        </View>
      </View>

      {/* Compact 7-Bar Usage Chart */}
      <EnergyBarChart
        data={DEMO_WEEKLY_USAGE}
        title="USAGE HISTORY"
        subtitle="Daily consumption • kWh"
      />

      {/* Action CTA Buttons */}
      <View style={styles.actionRow}>
        <LimeCTA
          title="Simulate Outage"
          onPress={() => router.push('/(tabs)/simulation')}
          icon={<Play size={16} color={tokens.onLime} style={{ marginRight: 6 }} />}
          style={styles.actionBtn}
        />
        <View style={{ width: SPACING.sm }} />
        <LimeCTA
          title="Review Schedule"
          variant="surface"
          onPress={() => router.push('/scheduling')}
          icon={<Calendar size={16} color={tokens.textPrimary} style={{ marginRight: 6 }} />}
          style={styles.actionBtn}
        />
      </View>
    </SolvantaScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  provenanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  provDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  provText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroSwitch: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsGrid: {
    marginVertical: SPACING.xs,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  actionBtn: {
    flex: 1,
  },
});
