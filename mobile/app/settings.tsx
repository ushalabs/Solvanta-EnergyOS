import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Moon, Sun, CheckCircle, Database, ShieldAlert, Cpu } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeContext';
import { SPACING, RADIUS } from '../src/theme/tokens';
import { BuildingEquipmentEditor } from '../src/components/BuildingEquipmentEditor';

export default function SettingsScreen() {
  const router = useRouter();
  const { tokens, mode, setTheme, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tokens.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          style={[styles.backBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
          accessibilityLabel="Back to app"
        >
          <ArrowLeft size={18} color={tokens.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: tokens.textPrimary }]}>SETTINGS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={{ color: tokens.lime, fontSize: 11, marginBottom: 12 }}>LIVE TWIN • Phase 3 Building & Equipment Configuration Active</Text>

        {/* Building & Equipment Profile Section */}
        <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
          BUILDING & EQUIPMENT TWIN CONFIGURATION
        </Text>
        <BuildingEquipmentEditor />
        {/* Appearance Section */}
        <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
          APPEARANCE (THEME PERSISTENCE)
        </Text>

        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          {/* Dark Mode Row */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setTheme('dark')}
            style={[styles.themeOption, isDark && { backgroundColor: tokens.surfaceElevated }]}
          >
            <View style={styles.themeLeft}>
              <Moon size={18} color={isDark ? tokens.lime : tokens.textMuted} style={{ marginRight: 10 }} />
              <View>
                <Text style={[styles.themeTitle, { color: tokens.textPrimary }]}>
                  Dark Neon-Lime
                </Text>
                <Text style={[styles.themeDesc, { color: tokens.textMuted }]}>
                  Default on first launch • Reference matched near-black
                </Text>
              </View>
            </View>
            {isDark && <CheckCircle size={18} color={tokens.lime} />}
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Light Mode Row */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setTheme('light')}
            style={[styles.themeOption, !isDark && { backgroundColor: tokens.surfaceElevated }]}
          >
            <View style={styles.themeLeft}>
              <Sun size={18} color={!isDark ? tokens.lime : tokens.textMuted} style={{ marginRight: 10 }} />
              <View>
                <Text style={[styles.themeTitle, { color: tokens.textPrimary }]}>
                  Light Solar
                </Text>
                <Text style={[styles.themeDesc, { color: tokens.textMuted }]}>
                  Clean daylight contrast • Persisted across app restarts
                </Text>
              </View>
            </View>
            {!isDark && <CheckCircle size={18} color={tokens.lime} />}
          </TouchableOpacity>
        </View>

        {/* Units Configuration */}
        <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
          ENGINEERING UNITS & CONVENTIONS
        </Text>

        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Power Measurement</Text>
            <Text style={[styles.infoVal, { color: tokens.lime }]}>Kilowatts (kW) / Watts (W)</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Energy Accumulation</Text>
            <Text style={[styles.infoVal, { color: tokens.lime }]}>Kilowatt-hours (kWh)</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Simulation Resolution</Text>
            <Text style={[styles.infoVal, { color: tokens.textPrimary }]}>15-Minute Parameterized Step</Text>
          </View>
        </View>

        {/* Data Provenance & Safety Boundaries */}
        <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
          PROVENANCE & HARDWARE BOUNDARIES
        </Text>

        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={styles.infoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Database size={16} color={tokens.amber} style={{ marginRight: 8 }} />
              <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Data Mode</Text>
            </View>
            <Text style={[styles.infoVal, { color: tokens.amber }]}>SIMULATED (FYP-I)</Text>
          </View>
          <Text style={[styles.noticeText, { color: tokens.textMuted }]}>
            Phase 1 displays prewritten fixtures. No telemetry provider, energy engine, database, or MCP service is connected. Physical inverter integration and mains breaker controls are reserved for FYP-II.
          </Text>
        </View>

        {/* Toolchain & SDK Versions */}
        <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
          TOOLCHAIN & ARCHITECTURE
        </Text>

        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={styles.infoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Cpu size={16} color={tokens.lime} style={{ marginRight: 8 }} />
              <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Expo SDK Version</Text>
            </View>
            <Text style={[styles.infoVal, { color: tokens.lime }]}>SDK 57 • AR unverified</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>React Native Engine</Text>
            <Text style={[styles.infoVal, { color: tokens.textPrimary }]}>0.86.3</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: tokens.textSecondary }]}>Decision Engine</Text>
            <Text style={[styles.infoVal, { color: tokens.textPrimary }]}>Google OR-Tools CP-SAT</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.horizontalPadding,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.horizontalPadding,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  card: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.cardPadding,
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  themeDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.cardPadding,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  noticeText: {
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: SPACING.cardPadding,
    paddingBottom: SPACING.cardPadding,
  },
});
