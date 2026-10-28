import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock } from 'lucide-react-native';
import { SolvantaScreen } from '../src/components/SolvantaScreen';
import { PillSegmentedControl } from '../src/components/PillSegmentedControl';
import { ScheduleTimeline } from '../src/components/ScheduleTimeline';
import { RecommendationCard } from '../src/components/RecommendationCard';
import { ApprovalActions } from '../src/components/ApprovalActions';
import { useTheme } from '../src/theme/ThemeContext';
import { DEMO_RECOMMENDATION } from '../src/fixtures/mockData';
import { SPACING, RADIUS } from '../src/theme/tokens';

export default function SchedulingScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const [scheduleMode, setScheduleMode] = useState('optimized');
  const [planStatus, setPlanStatus] = useState<'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'>('PENDING_APPROVAL');

  const scheduledTasks = [
    { name: 'Water Pump', startHour: 12.5, durationHours: 0.75, priority: 'medium', color: tokens.cyan },
    { name: 'Washing Machine', startHour: 13.5, durationHours: 1.5, priority: 'low', color: tokens.cyan },
    { name: 'Air Conditioner', startHour: 15.0, durationHours: 3.0, priority: 'low', color: tokens.amber },
    { name: 'Outage Window', startHour: 18.0, durationHours: 6.0, priority: 'critical', color: tokens.red },
  ];

  const handleApprove = (id: string) => {
    setPlanStatus('APPROVED');
    Alert.alert(
      'Plan Approved by User',
      `Energy Plan "${id}" marked APPROVED in PostgreSQL audit log. Revised digital twin simulation dispatched with 100% critical coverage verified.`
    );
  };

  const handleModify = (id: string) => {
    Alert.alert('Modify Constraints', 'Adjust flexible appliance run windows or shift priority tier.');
  };

  const handleReject = (id: string) => {
    setPlanStatus('REJECTED');
    Alert.alert('Plan Rejected', `Plan "${id}" marked REJECTED. Previous baseline schedule retained.`);
  };

  return (
    <SolvantaScreen>
      {/* Header with back button */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={18} color={tokens.textPrimary} />
        </TouchableOpacity>

        <View style={styles.titleCol}>
          <Text style={[styles.title, { color: tokens.textPrimary }]}>
            RESILIENCE SCHEDULER
          </Text>
          <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
            Constraint-Aware Load Dispatch • Google OR-Tools
          </Text>
        </View>

        <View style={[styles.dateBadge, { backgroundColor: tokens.surfaceElevated }]}>
          <Clock size={12} color={tokens.lime} style={{ marginRight: 4 }} />
          <Text style={[styles.dateText, { color: tokens.lime }]}>Tomorrow</Text>
        </View>
      </View>

      {/* Mode Pills */}
      <PillSegmentedControl
        selectedId={scheduleMode}
        onSelect={setScheduleMode}
        options={[
          { id: 'manual', label: 'Manual' },
          { id: 'optimized', label: 'Optimized Plan ●' },
        ]}
      />

      {/* Recommended Plan Hero */}
      <RecommendationCard
        title={DEMO_RECOMMENDATION.title}
        summary={DEMO_RECOMMENDATION.summary}
        criticalCoveragePct={DEMO_RECOMMENDATION.criticalCoveragePct}
        batteryEndSocPct={DEMO_RECOMMENDATION.batteryEndSocPct}
      />

      {/* 24-Hour Visual Schedule Timeline */}
      <ScheduleTimeline tasks={scheduledTasks} />

      {/* Scheduled Appliance Detail List */}
      <View
        style={[
          styles.detailCard,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
          },
        ]}
      >
        <Text style={[styles.detailTitle, { color: tokens.textSecondary }]}>
          SOLVER ALLOCATION DETAILS
        </Text>

        <View style={styles.detailRow}>
          <Text style={[styles.dName, { color: tokens.textPrimary }]}>Water Pump (1.0 kW)</Text>
          <Text style={[styles.dAction, { color: tokens.lime }]}>Shifted to 12:30–13:15 (Solar Peak)</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.dName, { color: tokens.textPrimary }]}>Air Conditioner (1.5 kW)</Text>
          <Text style={[styles.dAction, { color: tokens.amber }]}>Restricted during 18:00–24:00 Blackout</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.dName, { color: tokens.textPrimary }]}>Refrigerator (250 W)</Text>
          <Text style={[styles.dAction, { color: tokens.green }]}>100% Uninterrupted Continuous Service</Text>
        </View>
      </View>

      {/* Human-in-the-Loop Approval Action Bar */}
      <ApprovalActions
        planId={DEMO_RECOMMENDATION.id}
        status={planStatus}
        onApprove={handleApprove}
        onModify={handleModify}
        onReject={handleReject}
      />
    </SolvantaScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 10,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailCard: {
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    marginVertical: SPACING.sm,
    borderWidth: 1,
  },
  detailTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  detailRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dName: {
    fontSize: 13,
    fontWeight: '700',
  },
  dAction: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
