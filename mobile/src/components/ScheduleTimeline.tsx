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

export type LaneTone = 'solar' | 'grid' | 'appliance';
export interface TimelineLane {
  id: string;
  label: string;
  tone: LaneTone;
  /** Spans in minutes after midnight. */
  segments: Array<{ start_min: number; end_min: number }>;
  /** Spoken description, for example the times. Defaults to the label and the times. */
  a11yLabel?: string;
  /** Shown on the lane instead of bars when there is nothing to draw, for example No PV estimate. */
  emptyNote?: string;
}

interface ScheduleTimelineProps {
  /** One bar per task, as before. */
  tasks?: ScheduledTask[];
  /** A shared timeline: one lane per source or appliance on a single 24-hour axis. */
  lanes?: TimelineLane[];
  /** Shaded spans across all lanes, for example outages. */
  bands?: Array<{ from: number; to: number }>;
  bandLabel?: string;
  title?: string;
  /** Where the numbers come from, for example SIMULATED. */
  sourceTag?: string;
  /** Legend entries; each lane tone present gets one. */
  legend?: Array<{ tone: LaneTone | 'outage'; label: string }>;
  emptyText?: string;
}

const hours = [0, 4, 8, 12, 16, 20, 24];
const LABEL_W = 96;
/** Room to the right of the plot, so the 24:00 label that is centred on the last gridline stays inside the card. */
const INSET_R = 20;
const AXIS_LABEL_W = 40;
const AXIS = [0, 360, 720, 1080, 1440];
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({ tasks = [], lanes, bands = [], bandLabel = 'Outage', title, sourceTag, legend, emptyText }) => {
  const { tokens } = useTheme();
  const colourOf = (tone: LaneTone | 'outage') => ({ solar: tokens.limeMark, grid: tokens.textSecondary, appliance: tokens.amberText, outage: tokens.redText })[tone];

  if (lanes) {
    const used = legend ?? [];
    return (
      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: tokens.textSecondary }]}>{title ?? '24-HOUR SCHEDULE TIMELINE'}</Text>
          {sourceTag ? <Text style={[styles.sourceTag, { color: tokens.amberText }]}>{sourceTag}</Text> : null}
        </View>
        <View style={styles.sharedRow}>
          <View style={{ width: LABEL_W }} />
          <View style={[styles.axisPlot, { marginRight: INSET_R }]}>
            {AXIS.map(m => <Text key={m} style={[styles.axisText, { position: 'absolute', width: AXIS_LABEL_W, marginLeft: -AXIS_LABEL_W / 2, textAlign: 'center', color: tokens.textSecondary, left: `${m / 14.4}%` }]}>{clock(m)}</Text>)}
          </View>
        </View>
        <View style={{ position: 'relative' }}>
          <View pointerEvents="none" style={[styles.plotOverlay, { left: LABEL_W, right: INSET_R }]}>
            {bands.map((b, i) => <View key={`band${i}`} testID="timeline-band" style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.max(0, b.from) / 14.4}%`, width: `${Math.max(0, Math.min(1440, b.to) - Math.max(0, b.from)) / 14.4}%`, backgroundColor: tokens.redText, opacity: 0.14 }} />)}
            {AXIS.map(m => <View key={`grid${m}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${m / 14.4}%`, width: 1, backgroundColor: tokens.border }} />)}
          </View>
          <View style={styles.bandsContainer}>
            {lanes.map(lane => (
              <View key={lane.id} testID={`lane-${lane.id}`} accessible accessibilityLabel={lane.a11yLabel ?? `${lane.label}: ${lane.segments.length ? lane.segments.map(s => `${clock(s.start_min)} to ${clock(s.end_min)}`).join(', ') : 'none'}`} style={styles.taskRow}>
                <Text numberOfLines={1} style={[styles.taskName, { width: LABEL_W, color: tokens.textPrimary }]}>{lane.label}</Text>
                <View style={[styles.laneTrack, { marginRight: INSET_R }]}>
                  {lane.segments.map((s, i) => <View key={i} testID="lane-bar" style={[styles.laneBar, { left: `${s.start_min / 14.4}%`, width: `${Math.max(1.5, (s.end_min - s.start_min) / 14.4)}%`, backgroundColor: colourOf(lane.tone) }]} />)}
                  {!lane.segments.length && lane.emptyNote ? <Text numberOfLines={1} style={[styles.emptyNote, { color: tokens.textSecondary }]}>{lane.emptyNote}</Text> : null}
                </View>
              </View>
            ))}
            {!lanes.length && emptyText ? <Text style={[styles.emptyNote, { color: tokens.textSecondary }]}>{emptyText}</Text> : null}
          </View>
        </View>
        {used.length ? <View style={styles.legend}>{used.map(l => <View key={l.label} style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colourOf(l.tone), opacity: l.tone === 'outage' ? 0.6 : 1 }]} /><Text style={[styles.legendText, { color: tokens.textPrimary }]}>{l.label}</Text></View>)}</View> : null}
        {bands.length && !used.some(l => l.tone === 'outage') ? <Text style={[styles.legendText, { color: tokens.textSecondary }]}>{bandLabel} shaded</Text> : null}
      </View>
    );
  }

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
          <Text key={h} style={[styles.axisText, styles.axisTextInline, { color: tokens.textMuted }]}>
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
    flexWrap: 'wrap',
    gap: 6,
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
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  axisTextInline: {
    fontSize: 9,
  },
  sharedRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  axisPlot: {
    flex: 1,
    height: 16,
    position: 'relative',
  },
  plotOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
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
    paddingRight: 6,
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
  laneTrack: {
    flex: 1,
    height: 14,
    position: 'relative',
    justifyContent: 'center',
  },
  laneBar: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: 5,
  },
  emptyNote: {
    fontSize: 11,
    lineHeight: 15,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
