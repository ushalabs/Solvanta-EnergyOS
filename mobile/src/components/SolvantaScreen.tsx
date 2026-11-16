import React, { ReactNode, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { DOCK, RADIUS, SPACING } from '../theme/tokens';

interface SolvantaScreenProps {
  /** Provenance label at the top. Pass null only when the screen labels each data block itself. */
  banner?: string | null;
  children: ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  /** Stays pinned at the bottom while the content scrolls, for one primary action. */
  footer?: ReactNode;
  /** Tab screens sit under the floating dock, so the footer must stay above it. Stack screens pass false. */
  footerClearsDock?: boolean;
}

const DOCK_CLEARANCE = 110; // Scroll room for the floating navigation dock
const FOOTER_GAP = 10;

// Kept separate so the safe-area hook only runs on screens that pin a footer.
function PinnedFooter({ children, clearsDock, onHeight }: { children: ReactNode; clearsDock: boolean; onHeight: (height: number) => void }) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, DOCK.minBottom) + (clearsDock ? DOCK.height + FOOTER_GAP : 0);
  return (
    <View pointerEvents="box-none" style={[styles.footerWrapper, { bottom }]}>
      <View testID="screen-footer" onLayout={e => onHeight(e.nativeEvent.layout.height)} style={styles.footer}>
        {children}
      </View>
    </View>
  );
}

export const SolvantaScreen: React.FC<SolvantaScreenProps> = ({
  banner = 'DEMO • Fixture preview; live tools are labelled separately',
  children,
  scrollable = true,
  style,
  contentContainerStyle,
  footer,
  footerClearsDock = true,
}) => {
  const { tokens, isDark } = useTheme();
  const [footerHeight, setFooterHeight] = useState(0);
  const footerRoom = footer ? footerHeight + FOOTER_GAP : 0;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: tokens.background },
        style,
      ]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {scrollable ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: DOCK_CLEARANCE + footerRoom },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {banner ? (
            <View style={[styles.banner, { backgroundColor: tokens.amberTint }]}>
              <View style={[styles.bannerDot, { backgroundColor: tokens.amberText }]} />
              <Text style={[styles.bannerText, { color: tokens.amberText }]}>{banner}</Text>
            </View>
          ) : null}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.container, contentContainerStyle]}>
          {children}
        </View>
      )}
      {footer ? <PinnedFooter clearsDock={footerClearsDock} onHeight={setFooterHeight}>{footer}</PinnedFooter> : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: SPACING.horizontalPadding,
    paddingTop: SPACING.md,
  },
  banner: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    maxWidth: '100%',
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bannerText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  footerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: SPACING.horizontalPadding,
  },
  footer: {
    width: '100%',
    maxWidth: 560 - SPACING.horizontalPadding * 2,
  },
});
