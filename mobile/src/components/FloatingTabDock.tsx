import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  House,
  LayoutGrid,
  ChartNoAxesColumn,
  MapPin,
  MessageCircle,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { DOCK, RADIUS } from '../theme/tokens';

export type TabName = 'index' | 'appliances' | 'simulation' | 'rooftop' | 'ai';

interface FloatingTabDockProps {
  currentTab: TabName;
  onSelectTab: (tab: TabName) => void;
}

// The label is the accessible name only; the dock shows icons, as in docs/design-reference.
const TABS: { id: TabName; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'index', label: 'Home', icon: House },
  { id: 'appliances', label: 'Loads', icon: LayoutGrid },
  { id: 'simulation', label: 'Sim', icon: ChartNoAxesColumn },
  { id: 'rooftop', label: 'Roof', icon: MapPin },
  { id: 'ai', label: 'AI', icon: MessageCircle },
];

export const FloatingTabDock: React.FC<FloatingTabDockProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.dockWrapper,
        {
          bottom: Math.max(insets.bottom, DOCK.minBottom),
        },
      ]}
    >
      <View
        accessibilityRole="tablist"
        style={[
          styles.dockCapsule,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
            shadowColor: isDark ? '#000000' : 'rgba(0,0,0,0.2)',
          },
        ]}
      >
        {TABS.map((tab) => {
          const isSelected = currentTab === tab.id;
          const IconComponent = tab.icon;

          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.8}
              onPress={() => onSelectTab(tab.id)}
              style={styles.tabButton}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              aria-selected={isSelected}
              accessibilityLabel={`${tab.label} tab`}
            >
              <View style={styles.slot}>
                {/*
                  The glow is its own circle and the active state is a different element, not a style added to
                  a mounted view. On Android a boxShadow or background added after mount can draw as a square.
                */}
                {isSelected ? (
                  <View
                    pointerEvents="none"
                    testID="dock-glow"
                    style={[styles.glow, { backgroundColor: tokens.limeGlow }]}
                  />
                ) : null}
                <View
                  key={isSelected ? 'active' : 'idle'}
                  testID={isSelected ? 'dock-active' : 'dock-idle'}
                  style={[styles.iconCircle, isSelected && { backgroundColor: tokens.lime }]}
                >
                  <IconComponent
                    size={22}
                    color={isSelected ? tokens.onLime : tokens.textSecondary}
                    strokeWidth={isSelected ? 2.4 : 1.8}
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999,
  },
  dockCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    height: DOCK.height,
    width: '100%',
    maxWidth: 420,
    borderRadius: RADIUS.dock,
    paddingHorizontal: 6,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  slot: {
    width: DOCK.activeSize,
    height: DOCK.activeSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    left: -(DOCK.glowSize - DOCK.activeSize) / 2,
    top: -(DOCK.glowSize - DOCK.activeSize) / 2,
    width: DOCK.glowSize,
    height: DOCK.glowSize,
    borderRadius: DOCK.glowSize / 2,
    // A soft halo, not a ring: the full-strength colour read as a thick olive outline on the dark dock.
    opacity: 0.45,
  },
  iconCircle: {
    width: DOCK.activeSize,
    height: DOCK.activeSize,
    borderRadius: DOCK.activeSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
