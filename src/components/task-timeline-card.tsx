import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, getCategoryMeta, Palette } from '@/constants/theme';
import { useTasks } from '@/context/tasks-context';
import { computeLiveElapsedSeconds, type TaskRecord } from '@/services/database';
import {
  formatClockTime,
  formatDurationClock,
  formatHumanDuration,
  formatShortDate,
  getTaskCadenceMeta,
} from '@/utils/time';

export function TaskTimelineCard({ task }: { task: TaskRecord }) {
  const { nowMs, startTaskNow, resumeTask, completeTask } = useTasks();
  const category = getCategoryMeta(task.category);
  const cadence = getTaskCadenceMeta(
    task.scheduledStartAt,
    task.deadlineAt,
    task.status,
    nowMs
  );
  const elapsedSec = computeLiveElapsedSeconds(task, nowMs);

  const isCompleted = task.status === 'completed';
  const isInProgress = task.status === 'in_progress';
  const isPaused = task.status === 'paused';

  // Evaluate which of the 3 notification checkpoints have passed or are active
  const startMs = new Date(task.scheduledStartAt).getTime();
  const passed30m = nowMs >= startMs - 30 * 60 * 1000;
  const passed15m = nowMs >= startMs - 15 * 60 * 1000;
  const passed0m = nowMs >= startMs;

  return (
    <Pressable
      onPress={() => router.push(`/task/${task.id}`)}
      style={({ pressed }) => [
        styles.card,
        isInProgress && styles.cardActive,
        isCompleted && styles.cardCompleted,
        pressed && { opacity: 0.92 },
      ]}
    >
      {/* Top Meta Row: Time Block + Status Badge */}
      <View style={styles.topRow}>
        <View style={styles.timeCluster}>
          <Text style={styles.startTimeText}>
            {formatClockTime(task.scheduledStartAt)}
          </Text>
          {task.deadlineAt ? (
            <Text style={styles.deadlineTimeText}>
              → {formatClockTime(task.deadlineAt)}
            </Text>
          ) : null}
          <Text style={styles.dateLabel}>
            · {formatShortDate(task.scheduledStartAt)}
          </Text>
        </View>

        <View
          style={[
            styles.phaseBadge,
            cadence.isUrgent && !isCompleted && styles.phaseBadgeUrgent,
            isCompleted && styles.phaseBadgeCompleted,
          ]}
        >
          <Text
            style={[
              styles.phaseBadgeText,
              cadence.isUrgent && !isCompleted && styles.phaseBadgeTextUrgent,
              isCompleted && styles.phaseBadgeTextCompleted,
            ]}
          >
            {cadence.badgeLabel}
          </Text>
        </View>
      </View>

      {/* Main Title & Category */}
      <View style={styles.bodyRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryPill, { backgroundColor: category.bg }]}>
              <Ionicons name={category.icon} size={12} color={category.color} />
              <Text style={[styles.categoryText, { color: category.color }]}>
                {category.label}
              </Text>
            </View>
            <Text style={styles.countdownSubtext}>{cadence.countdownText}</Text>
          </View>

          <Text
            style={[styles.title, isCompleted && styles.titleCompleted]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          {task.notes ? (
            <Text style={styles.notes} numberOfLines={2}>
              {task.notes}
            </Text>
          ) : null}
        </View>
      </View>

      {/* 30m → 15m → Start Notification Cadence Rail */}
      {!isCompleted ? (
        <View style={styles.cadenceRail}>
          <View style={styles.railLabelRow}>
            <Ionicons
              name="notifications-outline"
              size={13}
              color={Palette.inkMuted}
            />
            <Text style={styles.railTitle}>Alert Cadence</Text>
          </View>

          <View style={styles.stepsRow}>
            <View
              style={[
                styles.stepChip,
                passed30m && styles.stepChipTriggered,
                cadence.phase === 'window_30m' && styles.stepChipCurrent,
              ]}
            >
              <View
                style={[
                  styles.stepDot,
                  passed30m && styles.stepDotTriggered,
                ]}
              />
              <Text
                style={[
                  styles.stepText,
                  passed30m && styles.stepTextTriggered,
                ]}
              >
                -30m Prep
              </Text>
            </View>

            <View style={styles.stepConnector} />

            <View
              style={[
                styles.stepChip,
                passed15m && styles.stepChipTriggered,
                cadence.phase === 'window_15m' && styles.stepChipCurrent,
              ]}
            >
              <View
                style={[
                  styles.stepDot,
                  passed15m && styles.stepDotTriggered,
                ]}
              />
              <Text
                style={[
                  styles.stepText,
                  passed15m && styles.stepTextTriggered,
                ]}
              >
                -15m Alert
              </Text>
            </View>

            <View style={styles.stepConnector} />

            <View
              style={[
                styles.stepChip,
                passed0m && styles.stepChipTriggered,
                (cadence.phase === 'starting_now' ||
                  cadence.phase === 'overdue_start') &&
                  styles.stepChipCurrent,
              ]}
            >
              <View
                style={[
                  styles.stepDot,
                  passed0m && styles.stepDotTriggered,
                ]}
              />
              <Text
                style={[
                  styles.stepText,
                  passed0m && styles.stepTextTriggered,
                ]}
              >
                Start Now
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Footer Action Bar */}
      <View style={styles.footerRow}>
        {task.status === 'scheduled' ? (
          <>
            <View style={styles.metaHint}>
              <Ionicons name="time-outline" size={14} color={Palette.inkMuted} />
              <Text style={styles.metaHintText}>
                Ready when you are
              </Text>
            </View>

            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                startTaskNow(task.id);
              }}
              style={({ pressed }) => [
                styles.startBtn,
                cadence.isUrgent && styles.startBtnUrgent,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="play" size={14} color={Palette.white} />
              <Text style={styles.startBtnText}>Starting Now</Text>
            </Pressable>
          </>
        ) : null}

        {isInProgress ? (
          <>
            <View style={styles.liveElapsedPill}>
              <View style={styles.liveRedDot} />
              <Text style={styles.liveElapsedText}>
                Tracking · {formatDurationClock(elapsedSec)}
              </Text>
            </View>

            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                completeTask(task.id);
              }}
              style={({ pressed }) => [
                styles.doneSmallBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="checkmark" size={15} color={Palette.white} />
              <Text style={styles.startBtnText}>Mark Done</Text>
            </Pressable>
          </>
        ) : null}

        {isPaused ? (
          <>
            <View style={styles.metaHint}>
              <Ionicons name="pause-circle-outline" size={15} color={Palette.amber} />
              <Text style={[styles.metaHintText, { color: Palette.amber }]}>
                Paused at {formatDurationClock(elapsedSec)}
              </Text>
            </View>

            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                resumeTask(task.id);
              }}
              style={({ pressed }) => [
                styles.startBtn,
                { backgroundColor: Palette.amber },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="play" size={14} color={Palette.white} />
              <Text style={styles.startBtnText}>Resume</Text>
            </Pressable>
          </>
        ) : null}

        {isCompleted ? (
          <View style={styles.completedFooter}>
            <View style={styles.completedStat}>
              <Ionicons
                name="checkmark-done-circle"
                size={16}
                color={Palette.forest}
              />
              <Text style={styles.completedStatText}>
                Tracked {formatHumanDuration(task.accumulatedSeconds || 0)}
              </Text>
            </View>
            {task.completedAt ? (
              <Text style={styles.completedTimeText}>
                Finished {formatClockTime(task.completedAt)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.paperElevated,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 12,
  },
  cardActive: {
    borderColor: Palette.vermilion,
    borderWidth: 1.5,
    backgroundColor: '#FFFDFB',
  },
  cardCompleted: {
    backgroundColor: Palette.paperSubtle,
    borderColor: Palette.border,
    opacity: 0.88,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  timeCluster: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    flexShrink: 1,
  },
  startTimeText: {
    color: Palette.ink,
    fontFamily: Fonts?.mono,
    fontSize: 15,
    fontWeight: '700',
  },
  deadlineTimeText: {
    color: Palette.inkMuted,
    fontFamily: Fonts?.mono,
    fontSize: 13,
    fontWeight: '500',
  },
  dateLabel: {
    color: Palette.inkFaint,
    fontSize: 12,
    fontWeight: '500',
  },
  phaseBadge: {
    backgroundColor: Palette.paperSubtle,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  phaseBadgeUrgent: {
    backgroundColor: Palette.vermilionSoft,
    borderColor: Palette.vermilionBorder,
  },
  phaseBadgeCompleted: {
    backgroundColor: Palette.forestSoft,
    borderColor: Palette.forestBorder,
  },
  phaseBadgeText: {
    color: Palette.inkMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  phaseBadgeTextUrgent: {
    color: Palette.vermilion,
  },
  phaseBadgeTextCompleted: {
    color: Palette.forest,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  countdownSubtext: {
    color: Palette.inkMuted,
    fontFamily: Fonts?.mono,
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    color: Palette.ink,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: Palette.inkMuted,
  },
  notes: {
    color: Palette.inkMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  cadenceRail: {
    backgroundColor: Palette.paper,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 7,
  },
  railLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  railTitle: {
    color: Palette.inkMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Palette.paperElevated,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  stepChipTriggered: {
    backgroundColor: Palette.amberSoft,
    borderColor: Palette.amberBorder,
  },
  stepChipCurrent: {
    backgroundColor: Palette.vermilionSoft,
    borderColor: Palette.vermilion,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.inkFaint,
  },
  stepDotTriggered: {
    backgroundColor: Palette.vermilion,
  },
  stepText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.inkMuted,
  },
  stepTextTriggered: {
    color: Palette.ink,
    fontWeight: '700',
  },
  stepConnector: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.border,
    marginHorizontal: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  metaHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaHintText: {
    color: Palette.inkMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.ink,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
  },
  startBtnUrgent: {
    backgroundColor: Palette.vermilion,
  },
  doneSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.forest,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
  },
  startBtnText: {
    color: Palette.white,
    fontSize: 13,
    fontWeight: '700',
  },
  liveElapsedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Palette.vermilionSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  liveRedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Palette.vermilion,
  },
  liveElapsedText: {
    color: Palette.vermilion,
    fontFamily: Fonts?.mono,
    fontSize: 12,
    fontWeight: '700',
  },
  completedFooter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedStatText: {
    color: Palette.forest,
    fontSize: 12,
    fontWeight: '700',
  },
  completedTimeText: {
    color: Palette.inkFaint,
    fontSize: 12,
  },
});
