import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Sliders,
  Activity,
  Sun,
  Bot,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING } from '../theme/tokens';

export type TabName = 'index' | 'appliances' | 'simulation' | 'rooftop' | 'ai';

interface FloatingTabDockProps {
  currentTab: TabName;
  onSelectTab: (tab: TabName) => void;
}

const TABS: { id: TabName; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'index', label: 'Home', icon: Home },
  { id: 'appliances', label: 'Loads', icon: Sliders },
  { id: 'simulation', label: 'Sim', icon: Activity },
  { id: 'rooftop', label: 'Roof', icon: Sun },
  { id: 'ai', label: 'AI', icon: Bot },
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
          bottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View
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
              {isSelected ? (
                <View
                  style={[
                    styles.activePill,
                    {
                      backgroundColor: tokens.lime,
                    },
                  ]}
                >
                  <IconComponent size={18} color={tokens.onLime} strokeWidth={2.5} />
                  <Text style={[styles.activeLabel, { color: tokens.onLime }]}>
                    {tab.label}
                  </Text>
                </View>
              ) : (
                <View style={styles.inactiveIconContainer}>
                  <IconComponent
                    size={20}
                    color={tokens.textMuted}
                    strokeWidth={1.8}
                  />
                </View>
              )}
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
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  dockCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    width: Dimensions.get('window').width - 32,
    maxWidth: 420,
    borderRadius: RADIUS.dock,
    paddingHorizontal: 8,
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
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    shadowColor: '#C6F43D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  inactiveIconContainer: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
