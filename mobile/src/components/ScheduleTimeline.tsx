import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SPACING, RADIUS } from '../theme/tokens';

interface ScheduledTask {
  name: string;
  startHour: number; // 0 to 24
  durationHours: number;
  priority: string;
  color?: string;
}

interface ScheduleTimelineProps {
  tasks: ScheduledTask[];
}

export const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({ tasks }) => {
  const { tokens } = useTheme();

  const hours = [0, 4, 8, 12, 16, 20, 24];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: tokens.textSecondary }]}>
          24-HOUR OPTIMIZED SCHEDULE TIMELINE
        </Text>
        <Text style={[styles.sourceTag, { color: tokens.lime }]}>
          OR-TOOLS SOLVER
        </Text>
      </View>

      {/* Axis Hour Markers */}
      <View style={styles.axisRow}>
        {hours.map((h) => (
          <Text key={h} style={[styles.axisText, { color: tokens.textMuted }]}>
            {h.toString().padStart(2, '0')}:00
          </Text>
        ))}
      </View>

      {/* Task Bands */}
      <View style={styles.bandsContainer}>
        {tasks.map((task, idx) => {
          const leftPercent = (task.startHour / 24) * 100;
          const widthPercent = (task.durationHours / 24) * 100;

          return (
            <View key={idx} style={styles.taskRow}>
              <Text style={[styles.taskName, { color: tokens.textPrimary }]}>
                {task.name}
              </Text>
              <View style={[styles.track, { backgroundColor: tokens.surfaceElevated }]}>
                <View
                  style={[
                    styles.band,
                    {
                      left: `${leftPercent}%`,
                      width: `${Math.max(widthPercent, 4)}%`,
                      backgroundColor: task.color || tokens.lime,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    marginVertical: SPACING.sm,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sourceTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    paddingHorizontal: 75,
  },
  axisText: {
    fontSize: 9,
    fontWeight: '600',
  },
  bandsContainer: {
    gap: 12,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskName: {
    width: 75,
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    flex: 1,
    height: 18,
    borderRadius: 9,
    position: 'relative',
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 9,
  },
});
