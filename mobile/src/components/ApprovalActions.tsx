import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';

interface ApprovalActionsProps {
  planId: string;
  onApprove: (planId: string) => void;
  onModify: (planId: string) => void;
  onReject: (planId: string) => void;
  status?: string;
}

export const ApprovalActions: React.FC<ApprovalActionsProps> = ({
  planId,
  onApprove,
  onModify,
  onReject,
  status = 'PENDING_APPROVAL',
}) => {
  const { tokens } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: tokens.textSecondary }]}>
          HUMAN-IN-THE-LOOP APPROVAL GATE
        </Text>
        <Text
          style={[
            styles.status,
            { color: status === 'APPROVED' ? tokens.green : tokens.amber },
          ]}
        >
          {status}
        </Text>
      </View>

      <Text style={[styles.disclaimer, { color: tokens.textMuted }]}>
        FYP-I Notice: Approving executes a verified revised simulation; it does not actuate physical home circuits.
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onApprove(planId)}
          style={[styles.btn, styles.approveBtn, { backgroundColor: tokens.lime }]}
        >
          <Text style={[styles.btnText, { color: tokens.onLime }]}>
            ✓ Approve Plan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onModify(planId)}
          style={[styles.btn, { backgroundColor: tokens.surfaceElevated }]}
        >
          <Text style={[styles.btnText, { color: tokens.textPrimary }]}>
            Modify
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onReject(planId)}
          style={[styles.btn, { backgroundColor: 'rgba(255, 98, 106, 0.15)' }]}
        >
          <Text style={[styles.btnText, { color: tokens.red }]}>
            Reject
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    marginVertical: SPACING.sm,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  status: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  disclaimer: {
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 15,
    marginVertical: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    flex: 1.4,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
