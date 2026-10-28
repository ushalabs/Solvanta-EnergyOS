import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Plus, Info } from 'lucide-react-native';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { ApplianceRow } from '../../src/components/ApplianceRow';
import { PillSegmentedControl } from '../../src/components/PillSegmentedControl';
import { LimeCTA } from '../../src/components/LimeCTA';
import { useTheme } from '../../src/theme/ThemeContext';
import { DEMO_APPLIANCES, ApplianceItem } from '../../src/fixtures/mockData';
import { SPACING, RADIUS } from '../../src/theme/tokens';

export default function AppliancesScreen() {
  const { tokens } = useTheme();
  const [filter, setFilter] = useState('all');
  const [appliances, setAppliances] = useState<ApplianceItem[]>(DEMO_APPLIANCES);

  const handleToggle = (id: string, active: boolean) => {
    setAppliances((prev) =>
      prev.map((app) => (app.id === id ? { ...app, scenarioOn: active } : app))
    );
  };

  const filtered = appliances.filter((app) => {
    if (filter === 'critical') return app.priority === 'critical';
    if (filter === 'flexible') return app.flexible;
    return true;
  });

  const totalDemandW = appliances
    .filter((a) => a.scenarioOn)
    .reduce((sum, a) => sum + a.ratedPowerW, 0);

  const criticalDemandW = appliances
    .filter((a) => a.scenarioOn && a.priority === 'critical')
    .reduce((sum, a) => sum + a.ratedPowerW, 0);

  return (
    <SolvantaScreen>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: tokens.textPrimary }]}>
            APPLIANCES
          </Text>
          <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
            Building Load Digital Twin • Scenario Selection
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            Alert.alert(
              'Add Appliance',
              'Form opens in full edit mode to specify name, rated power, priority tier, and flexibility windows.'
            )
          }
          style={[styles.addBtn, { backgroundColor: tokens.lime }]}
          accessibilityLabel="Add appliance"
        >
          <Plus size={18} color={tokens.onLime} />
        </TouchableOpacity>
      </View>

      {/* Required Scenario Disclaimer Callout */}
      <View style={[styles.disclaimerBox, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <Info size={16} color={tokens.lime} style={{ marginRight: 8 }} />
        <Text style={[styles.disclaimerText, { color: tokens.textSecondary }]}>
          Switches configure your <Text style={{ color: tokens.lime, fontWeight: '700' }}>simulation scenario</Text>; they do not physically toggle electrical circuits.
        </Text>
      </View>

      {/* Filter Chips */}
      <PillSegmentedControl
        selectedId={filter}
        onSelect={setFilter}
        options={[
          { id: 'all', label: 'All', badge: appliances.length.toString() },
          { id: 'critical', label: 'Critical', badge: '1' },
          { id: 'flexible', label: 'Flexible', badge: '2' },
        ]}
      />

      {/* Demand Summary Well */}
      <View
        style={[
          styles.summaryWell,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
          },
        ]}
      >
        <View style={styles.wellCol}>
          <Text style={[styles.wellLabel, { color: tokens.textMuted }]}>
            REQUESTED SCENARIO LOAD
          </Text>
          <Text style={[styles.wellVal, { color: tokens.textPrimary }]}>
            {(totalDemandW / 1000).toFixed(2)} kW
          </Text>
        </View>
        <View style={styles.wellDivider} />
        <View style={styles.wellCol}>
          <Text style={[styles.wellLabel, { color: tokens.textMuted }]}>
            CRITICAL DEMAND
          </Text>
          <Text style={[styles.wellVal, { color: tokens.red }]}>
            {(criticalDemandW / 1000).toFixed(2)} kW
          </Text>
        </View>
      </View>

      {/* Appliance Rows */}
      <View style={styles.listContainer}>
        {filtered.map((item) => (
          <ApplianceRow
            key={item.id}
            id={item.id}
            name={item.name}
            ratedPowerW={item.ratedPowerW}
            priority={item.priority}
            flexible={item.flexible}
            scenarioOn={item.scenarioOn}
            onToggle={handleToggle}
          />
        ))}
      </View>

      <LimeCTA
        title="+ Add Building Appliance"
        variant="surface"
        onPress={() =>
          Alert.alert(
            'New Appliance Form',
            'Register appliance nameplate W, runtime constraints, and priority.'
          )
        }
        style={{ marginTop: SPACING.md, marginBottom: SPACING.xl }}
      />
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
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginVertical: SPACING.xs,
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  summaryWell: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.cardPadding,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    marginVertical: SPACING.xs,
  },
  wellCol: {
    alignItems: 'center',
  },
  wellLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  wellVal: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  wellDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  listContainer: {
    marginVertical: SPACING.xs,
  },
});
