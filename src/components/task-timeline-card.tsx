import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Fonts,
  getCategoryMeta,
  getPriorityMeta,
  TodoistColors,
} from '@/constants/theme';
import { useTasks } from '@/context/tasks-context';
import { computeLiveElapsedSeconds, type TaskRecord } from '@/services/database';
import {
  formatClockTime,
  formatDurationClock,
  formatHumanDuration,
  formatShortDate,
  getTaskCadenceMeta,
  getTodoistDateChipColor,
} from '@/utils/time';

export function TaskTimelineCard({
  task,
  showDateLabel = true,
}: {
  task: TaskRecord;
  showDateLabel?: boolean;
}) {
  const { nowMs, startTaskNow, resumeTask, completeTask } = useTasks();
  const category = getCategoryMeta(task.category);
  const priority = getPriorityMeta(task.priority);
  const cadence = getTaskCadenceMeta(
    task.scheduledStartAt,
    task.deadlineAt,
    task.status,
    nowMs
  );
  const dateChip = getTodoistDateChipColor(
    task.scheduledStartAt,
    task.status,
    nowMs
  );
  const elapsedSec = computeLiveElapsedSeconds(task, nowMs);

  const isCompleted = task.status === 'completed';
  const isInProgress = task.status === 'in_progress';
  const isPaused = task.status === 'paused';

  const startMs = new Date(task.scheduledStartAt).getTime();
  const passed30m = nowMs >= startMs - 30 * 60 * 1000;
  const passed15m = nowMs >= startMs - 15 * 60 * 1000;
  const passed0m = nowMs >= startMs;

  return (
    <Pressable
      onPress={() => router.push(`/task/${task.id}`)}
      style={({ pressed }) => [
        styles.rowContainer,
        isInProgress && styles.rowContainerActive,
        pressed && { backgroundColor: TodoistColors.bgSecondary },
      ]}
    >
      {/* Left Column: Authentic Todoist Priority Circle Checkbox */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          if (!isCompleted) {
            completeTask(task.id);
          } else {
            startTaskNow(task.id);
          }
        }}
        hitSlop={10}
        style={styles.checkboxHitArea}
      >
        <View
          style={[
            styles.priorityCircle,
            {
              borderColor: isCompleted
                ? TodoistColors.textMuted
                : priority.color,
              backgroundColor: isCompleted
                ? TodoistColors.textMuted
                : priority.fill,
            },
          ]}
        >
          {isCompleted ? (
            <Ionicons name="checkmark" size={14} color={TodoistColors.white} />
          ) : isInProgress ? (
            <View
              style={[
                styles.activeInnerDot,
                { backgroundColor: priority.color },
              ]}
            />
          ) : null}
        </View>
      </Pressable>

      {/* Center Column: Task Title, Notes, Todoist Metadata Chips & 30m/15m/0m Alert Strip */}
      <View style={styles.contentCol}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, isCompleted && styles.titleCompleted]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
        </View>

        {task.notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            {task.notes}
          </Text>
        ) : null}

        {/* Todoist Metadata Chips Row: Date + Time + Deadline + Push Cadence + #Project */}
        <View style={styles.metaRow}>
          {/* Date & Time Chip */}
          <View style={styles.dateChip}>
            <Ionicons name={dateChip.icon} size={12} color={dateChip.text} />
            <Text style={[styles.dateChipText, { color: dateChip.text }]}>
              {showDateLabel
                ? `${formatShortDate(task.scheduledStartAt, nowMs)} `
                : ''}
              {formatClockTime(task.scheduledStartAt)}
              {task.deadlineAt ? ` – ${formatClockTime(task.deadlineAt)}` : ''}
            </Text>
          </View>

          {/* 30m · 15m · 0m Push Cadence Mini Indicator */}
          {!isCompleted ? (
            <View
              style={[
                styles.cadenceChip,
                cadence.isUrgent && styles.cadenceChipUrgent,
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={11}
                color={
                  cadence.isUrgent
                    ? TodoistColors.red
                    : TodoistColors.textSecondary
                }
              />
              <Text
                style={[
                  styles.cadenceStepText,
                  passed30m && styles.cadenceStepFired,
                ]}
              >
                30m
              </Text>
              <Text style={styles.cadenceDotSep}>·</Text>
              <Text
                style={[
                  styles.cadenceStepText,
                  passed15m && styles.cadenceStepFired,
                ]}
              >
                15m
              </Text>
              <Text style={styles.cadenceDotSep}>·</Text>
              <Text
                style={[
                  styles.cadenceStepText,
                  passed0m && styles.cadenceStepFired,
                ]}
              >
                0m
              </Text>
            </View>
          ) : (
            <View style={styles.loggedChip}>
              <Ionicons
                name="stopwatch-outline"
                size={12}
                color={TodoistColors.dateToday}
              />
              <Text style={styles.loggedChipText}>
                Tracked {formatHumanDuration(task.accumulatedSeconds || 0)}
              </Text>
            </View>
          )}

          {/* #Project Label (Right-aligned Todoist style) */}
          <View style={styles.projectTag}>
            <Text style={styles.projectHash}>#</Text>
            <Text style={styles.projectLabelText}>{category.label}</Text>
            <View
              style={[styles.projectColorDot, { backgroundColor: category.color }]}
            />
          </View>
        </View>

        {/* Bottom Action Strip for Starting Now / Active Tracking */}
        {!isCompleted ? (
          <View style={styles.actionRow}>
            <Text
              style={[
                styles.countdownHint,
                cadence.isUrgent && { color: TodoistColors.red, fontWeight: '700' },
              ]}
            >
              {cadence.countdownText}
            </Text>

            {task.status === 'scheduled' ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  startTaskNow(task.id);
                }}
                style={({ pressed }) => [
                  styles.startPillBtn,
                  cadence.isUrgent && styles.startPillBtnUrgent,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Ionicons name="play" size={11} color={TodoistColors.white} />
                <Text style={styles.startPillBtnText}>Start Now</Text>
              </Pressable>
            ) : null}

            {isInProgress ? (
              <View style={styles.liveTrackingBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveTrackingText}>
                  {formatDurationClock(elapsedSec)}
                </Text>
              </View>
            ) : null}

            {isPaused ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  resumeTask(task.id);
                }}
                style={styles.pausedPillBtn}
              >
                <Ionicons name="play" size={11} color={TodoistColors.p2} />
                <Text style={styles.pausedPillText}>
                  Resume ({formatDurationClock(elapsedSec)})
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: TodoistColors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TodoistColors.border,
    gap: 12,
  },
  rowContainerActive: {
    backgroundColor: '#FFF8F7',
  },
  checkboxHitArea: {
    paddingTop: 2,
  },
  priorityCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contentCol: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    color: TodoistColors.text,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: TodoistColors.textMuted,
  },
  notes: {
    color: TodoistColors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 3,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cadenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: TodoistColors.bgTertiary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  cadenceChipUrgent: {
    backgroundColor: TodoistColors.redSoft,
  },
  cadenceStepText: {
    fontSize: 10,
    fontFamily: Fonts?.mono,
    color: TodoistColors.textMuted,
    fontWeight: '600',
  },
  cadenceStepFired: {
    color: TodoistColors.red,
    fontWeight: '800',
  },
  cadenceDotSep: {
    fontSize: 10,
    color: TodoistColors.textFaint,
  },
  loggedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TodoistColors.dateTodayBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  loggedChipText: {
    color: TodoistColors.dateToday,
    fontSize: 11,
    fontWeight: '600',
  },
  projectTag: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  projectHash: {
    color: TodoistColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  projectLabelText: {
    color: TodoistColors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  projectColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  countdownHint: {
    color: TodoistColors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  startPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TodoistColors.text,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  startPillBtnUrgent: {
    backgroundColor: TodoistColors.red,
  },
  startPillBtnText: {
    color: TodoistColors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  liveTrackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: TodoistColors.redSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TodoistColors.red,
  },
  liveTrackingText: {
    color: TodoistColors.red,
    fontFamily: Fonts?.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  pausedPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TodoistColors.p2Bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pausedPillText: {
    color: TodoistColors.p2,
    fontFamily: Fonts?.mono,
    fontSize: 11,
    fontWeight: '700',
  },
});
