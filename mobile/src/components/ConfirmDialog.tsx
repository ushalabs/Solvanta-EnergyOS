import React, { ReactNode } from 'react';
import { Text } from 'react-native';
import { ModalSheet } from './ModalSheet';
import { Action, ActionRow } from './TwinControls';
import { useTheme } from '../theme/ThemeContext';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
}

/** Cross-platform replacement for Alert.alert, whose buttons do nothing on web. Nothing happens until confirm is pressed. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ visible, title, children, confirmLabel, onConfirm, onCancel, confirmDisabled = false }) => {
  const { tokens: t } = useTheme();
  return (
    <ModalSheet
      visible={visible}
      title={title}
      role="alertdialog"
      dismissOnBackdrop
      onRequestClose={onCancel}
      footer={<ActionRow><Action title="Cancel" variant="secondary" onPress={onCancel} /><Action title={confirmLabel} variant="danger" disabled={confirmDisabled} onPress={onConfirm} /></ActionRow>}
    >
      <Text style={{ color: t.textPrimary, fontSize: 15, lineHeight: 22 }}>{children}</Text>
    </ModalSheet>
  );
};
