import React, { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../theme/tokens';

interface ModalSheetProps {
  visible: boolean;
  title: string;
  /** Android back and web Escape always call this. */
  onRequestClose: () => void;
  /** Tapping outside closes it. Leave off for forms, where a stray tap would lose typed values. */
  dismissOnBackdrop?: boolean;
  role?: 'dialog' | 'alertdialog';
  /** Stays visible while the body scrolls and the keyboard is open. */
  footer?: ReactNode;
  children: ReactNode;
}

/** Popup built on React Native Modal, so it behaves the same on native and web. */
export const ModalSheet: React.FC<ModalSheetProps> = ({ visible, title, onRequestClose, dismissOnBackdrop = false, role = 'dialog', footer, children }) => {
  const { tokens: t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fill}>
        <View style={[styles.frame, { paddingTop: Math.max(insets.top + SPACING.md, SPACING.xxl), paddingBottom: Math.max(insets.bottom + SPACING.md, SPACING.xxl) }]}>
          {/* A plain View: a Pressable here would become a keyboard stop inside the web focus trap. */}
          <View testID="modal-backdrop" onStartShouldSetResponder={() => dismissOnBackdrop} onResponderRelease={onRequestClose} style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay }]} />
          <View role={role} accessibilityViewIsModal accessibilityLabel={title} style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text accessibilityRole="header" style={[styles.title, { color: t.textPrimary }]}>{title}</Text>
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
              {children}
            </ScrollView>
            {footer && <View style={[styles.footer, { borderTopColor: t.divider }]}>{footer}</View>}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  frame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '100%',
    flexShrink: 1,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  title: {
    fontSize: TYPOGRAPHY.heading,
    lineHeight: 28,
    fontWeight: '700',
    paddingHorizontal: SPACING.cardPadding,
    paddingTop: SPACING.cardPadding,
    paddingBottom: SPACING.sm,
  },
  body: {
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyContent: {
    gap: SPACING.md,
    paddingHorizontal: SPACING.cardPadding,
    paddingBottom: SPACING.cardPadding,
  },
  footer: {
    gap: SPACING.sm,
    padding: SPACING.cardPadding,
    borderTopWidth: 1,
  },
});
