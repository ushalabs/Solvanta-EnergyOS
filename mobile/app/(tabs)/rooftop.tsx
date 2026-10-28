import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Eye, Save } from 'lucide-react-native';
import { SolvantaScreen } from '../../src/components/SolvantaScreen';
import { PillSegmentedControl } from '../../src/components/PillSegmentedControl';
import { RoofPolygonEditor } from '../../src/components/RoofPolygonEditor';
import { ARCapabilityFallback } from '../../src/components/ARCapabilityFallback';
import { LimeCTA } from '../../src/components/LimeCTA';
import { useTheme } from '../../src/theme/ThemeContext';
import { SPACING, RADIUS } from '../../src/theme/tokens';

export default function RooftopScreen() {
  const { tokens } = useTheme();
  const [activeTab, setActiveTab] = useState('layout');
  const [showARFallback, setShowARFallback] = useState(false);

  const handleLaunchAR = () => {
    setShowARFallback(true);
  };

  return (
    <SolvantaScreen>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: tokens.textPrimary }]}>
            ROOFTOP STUDIO
          </Text>
          <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
            Site Intelligence • CV Boundary & Panel Placement
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => Alert.alert('Saved', 'Rooftop polygon geometry & 10.0 kWp configuration persisted.')}
          style={[styles.saveBtn, { backgroundColor: tokens.lime }]}
          accessibilityLabel="Save rooftop layout"
        >
          <Save size={16} color={tokens.onLime} style={{ marginRight: 4 }} />
          <Text style={[styles.saveBtnText, { color: tokens.onLime }]}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Mode Pills */}
      <PillSegmentedControl
        selectedId={activeTab}
        onSelect={setActiveTab}
        options={[
          { id: 'image', label: 'Aerial View' },
          { id: 'layout', label: 'Layout Grid ●' },
          { id: 'ar', label: 'AR Preview' },
        ]}
      />

      {/* Interactive 2D Rooftop Polygon & Panel Placement Canvas */}
      <RoofPolygonEditor
        usableAreaM2={64.5}
        panelCount={24}
        totalKwp={10.0}
        onAdjustCorners={() =>
          Alert.alert('Adjust Corners', 'Drag vertex handles to fit roof edge boundaries.')
        }
        onDefineScale={() =>
          Alert.alert('Scale Calibration', 'Enter confirmed physical reference distance (e.g. parapet length = 8.5m).')
        }
      />

      {/* AR Capability Gate & Fallback */}
      {showARFallback || activeTab === 'ar' ? (
        <ARCapabilityFallback
          onContinue2D={() => {
            setShowARFallback(false);
            setActiveTab('layout');
          }}
        />
      ) : (
        <LimeCTA
          title="Preview in Augmented Reality (AR)"
          variant="outline"
          onPress={handleLaunchAR}
          icon={<Eye size={16} color={tokens.lime} style={{ marginRight: 6 }} />}
          style={{ marginVertical: SPACING.sm }}
        />
      )}

      {/* Design Specifications Card */}
      <View
        style={[
          styles.specCard,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
          },
        ]}
      >
        <Text style={[styles.specTitle, { color: tokens.textSecondary }]}>
          SOLAR DESIGN SPECIFICATIONS
        </Text>
        <View style={styles.specRow}>
          <Text style={[styles.specKey, { color: tokens.textMuted }]}>Module Model</Text>
          <Text style={[styles.specVal, { color: tokens.textPrimary }]}>Tier-1 Mono PERC 415W</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={[styles.specKey, { color: tokens.textMuted }]}>Inverter Pairing</Text>
          <Text style={[styles.specVal, { color: tokens.textPrimary }]}>8.0 kW Hybrid (DC/AC: 1.25)</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={[styles.specKey, { color: tokens.textMuted }]}>Azimuth / Tilt</Text>
          <Text style={[styles.specVal, { color: tokens.textPrimary }]}>180° South / 30° Optimal</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={[styles.specKey, { color: tokens.textMuted }]}>System Losses</Text>
          <Text style={[styles.specVal, { color: tokens.textPrimary }]}>14% (Cabling, Soiling, Derate)</Text>
        </View>
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
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: RADIUS.md,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  specCard: {
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    marginBottom: SPACING.xl,
  },
  specTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  specKey: {
    fontSize: 12,
    fontWeight: '500',
  },
  specVal: {
    fontSize: 12,
    fontWeight: '700',
  },
});
