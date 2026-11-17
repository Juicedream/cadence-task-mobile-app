import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Fonts,
  getCategoryMeta,
  getPriorityMeta,
  TodoistColors,
} from '@/constants/theme';
import { useTasks } from '@/context/tasks-context';
import { computeLiveElapsedSeconds } from '@/services/database';
import {
  formatClockTime,
  formatDurationClock,
  formatHumanDuration,
  formatShortDate,
  getStartOfDay,
  getTaskCadenceMeta,
} from '@/utils/time';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = Number(id);

  const {
    tasks,
    nowMs,
    startTaskNow,
    pauseTask,
    resumeTask,
    completeTask,
    removeTask,
    rescheduleTask,
    triggerPreviewAlert,
  } = useTasks();

  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={TodoistColors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Task Not Found</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>
    );
  }

  const category = getCategoryMeta(task.category);
  const priority = getPriorityMeta(task.priority);
  const cadence = getTaskCadenceMeta(
    task.scheduledStartAt,
    task.deadlineAt,
    task.status,
    nowMs
  );
  const elapsedSec = computeLiveElapsedSeconds(task, nowMs);

  const startMs = new Date(task.scheduledStartAt).getTime();
  const time30Iso = new Date(startMs - 30 * 60 * 1000).toISOString();
  const time15Iso = new Date(startMs - 15 * 60 * 1000).toISOString();

  const isScheduled = task.status === 'scheduled';
  const isInProgress = task.status === 'in_progress';
  const isPaused = task.status === 'paused';
  const isCompleted = task.status === 'completed';

  const deadlineDiffSec = task.deadlineAt
    ? Math.floor((new Date(task.deadlineAt).getTime() - nowMs) / 1000)
    : null;

  const handleDelete = async () => {
    await removeTask(task.id);
    router.back();
  };

  const handleQuickMoveDay = async (targetDayOffset: number) => {
    const currentStart = new Date(task.scheduledStartAt);
    const durationMs = task.deadlineAt
      ? new Date(task.deadlineAt).getTime() - currentStart.getTime()
      : 60 * 60 * 1000;

    let nextStart: Date;
    if (targetDayOffset === 0) {
      nextStart = new Date(nowMs + 31 * 60 * 1000);
    } else {
      nextStart = getStartOfDay(new Date(nowMs));
      nextStart.setDate(nextStart.getDate() + targetDayOffset);
      nextStart.setHours(
        currentStart.getHours(),
        currentStart.getMinutes(),
        0,
        0
      );
    }
    const nextDeadline = task.deadlineAt
      ? new Date(nextStart.getTime() + durationMs).toISOString()
      : null;

    await rescheduleTask(task.id, nextStart.toISOString(), nextDeadline);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Todoist Task Detail Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={TodoistColors.text} />
        </Pressable>

        <View style={styles.projectHeaderPill}>
          <Text style={[styles.projectHash, { color: category.color }]}>#</Text>
          <Text style={styles.projectHeaderText}>{category.label}</Text>
        </View>

        <Pressable
          onPress={handleDelete}
          hitSlop={10}
          style={styles.deleteBtn}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={TodoistColors.red}
          />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Todoist Checkbox + Title Row */}
        <View style={styles.titleBlock}>
          <View style={styles.titleCheckRow}>
            <Pressable
              onPress={() =>
                isCompleted ? startTaskNow(task.id) : completeTask(task.id)
              }
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
                <Ionicons
                  name="checkmark"
                  size={15}
                  color={TodoistColors.white}
                />
              ) : null}
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text
                style={[styles.title, isCompleted && styles.titleCompleted]}
              >
                {task.title}
              </Text>
              {task.notes ? (
                <Text style={styles.notes}>{task.notes}</Text>
              ) : null}
            </View>
          </View>

          {/* Metadata Strip */}
          <View style={styles.metaChipsRow}>
            <View style={styles.metaChip}>
              <Ionicons
                name="calendar-outline"
                size={13}
                color={TodoistColors.red}
              />
              <Text style={styles.metaChipText}>
                {formatShortDate(task.scheduledStartAt, nowMs)} ·{' '}
                {formatClockTime(task.scheduledStartAt)}
              </Text>
            </View>

            <View style={styles.metaChip}>
              <Ionicons name="flag" size={13} color={priority.color} />
              <Text style={styles.metaChipText}>{priority.label}</Text>
            </View>
          </View>
        </View>

        {/* Todoist Quick Reschedule Strip (Today · Tomorrow · Next Tomorrow) */}
        <View style={styles.rescheduleCard}>
          <Text style={styles.rescheduleLabel}>
            RESCHEDULE TASK (RE-ARMS 30M · 15M · START ALERTS)
          </Text>
          <View style={styles.rescheduleButtonsRow}>
            <Pressable
              onPress={() => handleQuickMoveDay(0)}
              style={styles.reschedulePill}
            >
              <Ionicons
                name="today-outline"
                size={14}
                color={TodoistColors.dateToday}
              />
              <Text style={styles.reschedulePillText}>Today (+31m)</Text>
            </Pressable>

            <Pressable
              onPress={() => handleQuickMoveDay(1)}
              style={styles.reschedulePill}
            >
              <Ionicons
                name="sunny-outline"
                size={14}
                color={TodoistColors.dateTomorrow}
              />
              <Text style={styles.reschedulePillText}>Tomorrow</Text>
            </Pressable>

            <Pressable
              onPress={() => handleQuickMoveDay(2)}
              style={styles.reschedulePill}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={TodoistColors.dateUpcoming}
              />
              <Text style={styles.reschedulePillText}>Next Tomorrow</Text>
            </Pressable>
          </View>
        </View>

        {/* Live Task Tracker Console */}
        <View style={styles.consoleCard}>
          <View style={styles.consoleModeBadge}>
            <View
              style={[
                styles.consoleDot,
                {
                  backgroundColor: isInProgress
                    ? TodoistColors.red
                    : isPaused
                    ? TodoistColors.p2
                    : isCompleted
                    ? TodoistColors.dateToday
                    : '#888888',
                },
              ]}
            />
            <Text style={styles.consoleModeText}>
              {isInProgress
                ? 'LIVE TRACKER RUNNING'
                : isPaused
                ? 'TRACKER PAUSED'
                : isCompleted
                ? 'COMPLETED & LOGGED IN SQLITE'
                : 'READY TO TRACK ("START NOW")'}
            </Text>
          </View>

          <Text style={styles.bigChronometer}>
            {formatDurationClock(elapsedSec)}
          </Text>
          <Text style={styles.chronometerCaption}>
            {isScheduled
              ? cadence.countdownText
              : `Started at ${formatClockTime(
                  task.actualStartedAt ?? task.scheduledStartAt
                )}`}
          </Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>START</Text>
              <Text style={styles.metricValue}>
                {formatClockTime(task.scheduledStartAt)}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>DEADLINE</Text>
              <Text style={styles.metricValue}>
                {task.deadlineAt ? formatClockTime(task.deadlineAt) : 'None'}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>
                {deadlineDiffSec !== null && deadlineDiffSec < 0
                  ? 'OVERDUE'
                  : 'REMAINING'}
              </Text>
              <Text
                style={[
                  styles.metricValue,
                  deadlineDiffSec !== null &&
                    deadlineDiffSec < 0 && { color: '#FF7A6B' },
                ]}
              >
                {deadlineDiffSec === null
                  ? 'Open'
                  : formatHumanDuration(Math.abs(deadlineDiffSec))}
              </Text>
            </View>
          </View>

          {/* Tracker Controls */}
          <View style={styles.consoleActions}>
            {isScheduled ? (
              <Pressable
                onPress={() => startTaskNow(task.id)}
                style={styles.startNowBigBtn}
              >
                <Ionicons
                  name="play-circle"
                  size={20}
                  color={TodoistColors.white}
                />
                <Text style={styles.startNowBigBtnText}>
                  Starting Now — Begin Live Tracker
                </Text>
              </Pressable>
            ) : null}

            {isInProgress ? (
              <View style={styles.splitActions}>
                <Pressable
                  onPress={() => pauseTask(task.id)}
                  style={styles.pauseBtn}
                >
                  <Ionicons name="pause" size={17} color={TodoistColors.white} />
                  <Text style={styles.pauseBtnText}>Pause</Text>
                </Pressable>

                <Pressable
                  onPress={() => completeTask(task.id)}
                  style={styles.completeBigBtn}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={19}
                    color={TodoistColors.white}
                  />
                  <Text style={styles.completeBigBtnText}>Complete Task</Text>
                </Pressable>
              </View>
            ) : null}

            {isPaused ? (
              <View style={styles.splitActions}>
                <Pressable
                  onPress={() => resumeTask(task.id)}
                  style={[styles.pauseBtn, { borderColor: TodoistColors.p2 }]}
                >
                  <Ionicons name="play" size={17} color={TodoistColors.p2} />
                  <Text
                    style={[styles.pauseBtnText, { color: TodoistColors.p2 }]}
                  >
                    Resume
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => completeTask(task.id)}
                  style={styles.completeBigBtn}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={19}
                    color={TodoistColors.white}
                  />
                  <Text style={styles.completeBigBtnText}>Complete Task</Text>
                </Pressable>
              </View>
            ) : null}

            {isCompleted ? (
              <Pressable
                onPress={() => startTaskNow(task.id)}
                style={styles.pauseBtn}
              >
                <Ionicons
                  name="refresh"
                  size={16}
                  color={TodoistColors.white}
                />
                <Text style={styles.pauseBtnText}>
                  Reopen & Continue Tracking
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Push Notification Intervals (30m · 15m · 0m) */}
        <View style={styles.scheduleCard}>
          <Text style={styles.scheduleTitle}>
            PUSH NOTIFICATION INTERVALS (30M · 15M · START)
          </Text>
          <Text style={styles.scheduleSubtitle}>
            Tap &quot;Test Push&quot; on any interval below to fire that notification on
            your phone right now.
          </Text>

          <View style={styles.intervalRow}>
            <View style={styles.intervalLeft}>
              <View style={styles.intervalBadge}>
                <Text style={styles.intervalBadgeText}>-30m</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.intervalHeading}>
                  30-Min Heads-Up ({formatClockTime(time30Iso)})
                </Text>
                <Text style={styles.intervalCopy}>
                  Reminds you 30 minutes before start time.
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => triggerPreviewAlert(task, '30m')}
              style={styles.testPushBtn}
            >
              <Text style={styles.testPushText}>Test Push</Text>
            </Pressable>
          </View>

          <View style={styles.intervalRow}>
            <View style={styles.intervalLeft}>
              <View style={styles.intervalBadge}>
                <Text style={styles.intervalBadgeText}>-15m</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.intervalHeading}>
                  15-Min Prep Alert ({formatClockTime(time15Iso)})
                </Text>
                <Text style={styles.intervalCopy}>
                  Second reminder 15 minutes before start time.
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => triggerPreviewAlert(task, '15m')}
              style={styles.testPushBtn}
            >
              <Text style={styles.testPushText}>Test Push</Text>
            </Pressable>
          </View>

          <View style={[styles.intervalRow, { borderBottomWidth: 0 }]}>
            <View style={styles.intervalLeft}>
              <View
                style={[
                  styles.intervalBadge,
                  { backgroundColor: TodoistColors.redSoft },
                ]}
              >
                <Text
                  style={[
                    styles.intervalBadgeText,
                    { color: TodoistColors.red },
                  ]}
                >
                  0m
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.intervalHeading}>
                  Start Task Now ({formatClockTime(task.scheduledStartAt)})
                </Text>
                <Text style={styles.intervalCopy}>
                  Prompts you to open the app and click &quot;Starting Now&quot;.
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => triggerPreviewAlert(task, 'start')}
              style={styles.testPushBtn}
            >
              <Text style={styles.testPushText}>Test Push</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: TodoistColors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TodoistColors.border,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: TodoistColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  projectHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TodoistColors.bgSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  projectHash: {
    fontSize: 14,
    fontWeight: '800',
  },
  projectHeaderText: {
    color: TodoistColors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TodoistColors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 18,
    gap: 16,
    paddingBottom: 40,
  },
  titleBlock: {
    gap: 12,
  },
  titleCheckRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  priorityCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: TodoistColors.text,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: TodoistColors.textMuted,
  },
  notes: {
    color: TodoistColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  metaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: TodoistColors.bgSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TodoistColors.border,
  },
  metaChipText: {
    color: TodoistColors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  rescheduleCard: {
    backgroundColor: TodoistColors.bgSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: TodoistColors.border,
    gap: 8,
  },
  rescheduleLabel: {
    color: TodoistColors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rescheduleButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reschedulePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: TodoistColors.bg,
    borderWidth: 1,
    borderColor: TodoistColors.borderStrong,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reschedulePillText: {
    color: TodoistColors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  consoleCard: {
    backgroundColor: TodoistColors.trackerBg,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  consoleModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TodoistColors.trackerCard,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  consoleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  consoleModeText: {
    color: TodoistColors.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  bigChronometer: {
    color: TodoistColors.white,
    fontFamily: Fonts?.mono,
    fontSize: 48,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  chronometerCaption: {
    color: '#B0B0B0',
    fontSize: 12,
    marginTop: 3,
  },
  metricsGrid: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: TodoistColors.trackerBorder,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: TodoistColors.trackerBorder,
  },
  metricLabel: {
    color: '#999999',
    fontSize: 9,
    fontWeight: '700',
  },
  metricValue: {
    color: TodoistColors.white,
    fontFamily: Fonts?.mono,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  consoleActions: {
    width: '100%',
    marginTop: 16,
  },
  startNowBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TodoistColors.red,
    paddingVertical: 14,
    borderRadius: 12,
  },
  startNowBigBtnText: {
    color: TodoistColors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  splitActions: {
    flexDirection: 'row',
    gap: 10,
  },
  pauseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: TodoistColors.trackerCard,
    borderWidth: 1,
    borderColor: TodoistColors.trackerBorder,
    paddingVertical: 13,
    borderRadius: 12,
  },
  pauseBtnText: {
    color: TodoistColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  completeBigBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: TodoistColors.dateToday,
    paddingVertical: 13,
    borderRadius: 12,
  },
  completeBigBtnText: {
    color: TodoistColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  scheduleCard: {
    backgroundColor: TodoistColors.bgSecondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: TodoistColors.border,
    gap: 10,
  },
  scheduleTitle: {
    color: TodoistColors.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scheduleSubtitle: {
    color: TodoistColors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TodoistColors.borderStrong,
  },
  intervalLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  intervalBadge: {
    backgroundColor: TodoistColors.bgTertiary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 44,
    alignItems: 'center',
  },
  intervalBadgeText: {
    color: TodoistColors.text,
    fontFamily: Fonts?.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  intervalHeading: {
    color: TodoistColors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  intervalCopy: {
    color: TodoistColors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  testPushBtn: {
    backgroundColor: TodoistColors.bg,
    borderWidth: 1,
    borderColor: TodoistColors.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
  },
  testPushText: {
    color: TodoistColors.text,
    fontSize: 11,
    fontWeight: '700',
  },
});
