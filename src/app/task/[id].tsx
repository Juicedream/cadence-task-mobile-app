import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, getCategoryMeta, Palette } from '@/constants/theme';
import { useTasks } from '@/context/tasks-context';
import { computeLiveElapsedSeconds } from '@/services/database';
import {
  formatClockTime,
  formatDurationClock,
  formatHumanDuration,
  formatShortDate,
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
    triggerPreviewAlert,
  } = useTasks();

  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={Palette.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>Task Not Found</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>
    );
  }

  const category = getCategoryMeta(task.category);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={Palette.ink} />
        </Pressable>

        <View style={[styles.catBadge, { backgroundColor: category.bg }]}>
          <Ionicons name={category.icon} size={13} color={category.color} />
          <Text style={[styles.catBadgeText, { color: category.color }]}>
            {category.label}
          </Text>
        </View>

        <Pressable
          onPress={handleDelete}
          hitSlop={10}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color={Palette.crimson} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title & Notes Block */}
        <View style={styles.titleSection}>
          <View style={styles.statusRow}>
            <Text style={styles.dateMeta}>
              {formatShortDate(task.scheduledStartAt)} · Scheduled{' '}
              {formatClockTime(task.scheduledStartAt)}
            </Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{cadence.badgeLabel}</Text>
            </View>
          </View>

          <Text style={styles.title}>{task.title}</Text>
          {task.notes ? <Text style={styles.notes}>{task.notes}</Text> : null}
        </View>

        {/* Live Chronometer Console */}
        <View style={styles.consoleCard}>
          <View style={styles.consoleTopRow}>
            <View style={styles.consoleModeRow}>
              <View
                style={[
                  styles.consoleDot,
                  {
                    backgroundColor: isInProgress
                      ? Palette.vermilion
                      : isPaused
                      ? Palette.amber
                      : isCompleted
                      ? Palette.forest
                      : Palette.inkFaint,
                  },
                ]}
              />
              <Text style={styles.consoleModeLabel}>
                {isInProgress
                  ? 'LIVE TRACKING IN PROGRESS'
                  : isPaused
                  ? 'CHRONOMETER PAUSED'
                  : isCompleted
                  ? 'COMPLETED & SAVED TO SQLITE'
                  : 'AWAITING START ("STARTING NOW")'}
              </Text>
            </View>
          </View>

          <Text style={styles.bigChronometer}>
            {formatDurationClock(elapsedSec)}
          </Text>
          <Text style={styles.chronometerCaption}>
            {isScheduled
              ? cadence.countdownText
              : `Actual start: ${formatClockTime(
                  task.actualStartedAt ?? task.scheduledStartAt
                )}`}
          </Text>

          {/* Metrics Grid inside Dark Console */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>SCHEDULED</Text>
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
                  ? 'OVERDUE BY'
                  : 'TIME LEFT'}
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

          {/* Primary Action Buttons inside Console */}
          <View style={styles.consoleActions}>
            {isScheduled ? (
              <Pressable
                onPress={() => startTaskNow(task.id)}
                style={({ pressed }) => [
                  styles.startNowBigBtn,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                ]}
              >
                <Ionicons name="play-circle" size={22} color={Palette.white} />
                <Text style={styles.startNowBigBtnText}>
                  Starting Now — Begin Tracking
                </Text>
              </Pressable>
            ) : null}

            {isInProgress ? (
              <View style={styles.splitActions}>
                <Pressable
                  onPress={() => pauseTask(task.id)}
                  style={styles.pauseBtn}
                >
                  <Ionicons name="pause" size={18} color={Palette.paper} />
                  <Text style={styles.pauseBtnText}>Pause</Text>
                </Pressable>

                <Pressable
                  onPress={() => completeTask(task.id)}
                  style={styles.completeBigBtn}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={Palette.white}
                  />
                  <Text style={styles.completeBigBtnText}>Complete Task</Text>
                </Pressable>
              </View>
            ) : null}

            {isPaused ? (
              <View style={styles.splitActions}>
                <Pressable
                  onPress={() => resumeTask(task.id)}
                  style={[styles.pauseBtn, { borderColor: Palette.amber }]}
                >
                  <Ionicons name="play" size={18} color={Palette.amber} />
                  <Text style={[styles.pauseBtnText, { color: Palette.amber }]}>
                    Resume
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => completeTask(task.id)}
                  style={styles.completeBigBtn}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={Palette.white}
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
                <Ionicons name="refresh" size={17} color={Palette.paper} />
                <Text style={styles.pauseBtnText}>
                  Reopen & Continue Tracking
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* 3-Interval Push Notification Breakdown + Instant Simulator */}
        <View style={styles.scheduleCard}>
          <View style={styles.scheduleHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.scheduleTitle}>
                PUSH NOTIFICATION INTERVALS
              </Text>
              <Text style={styles.scheduleSubtitle}>
                Automatic alerts at -30m, -15m, and 0m. Tap &quot;Test Push&quot; to
                fire any notification immediately on your phone.
              </Text>
            </View>
          </View>

          {/* Interval 1: 30 Mins Before */}
          <View style={styles.intervalRow}>
            <View style={styles.intervalLeft}>
              <View
                style={[
                  styles.intervalBadge,
                  nowMs >= startMs - 30 * 60 * 1000 &&
                    styles.intervalBadgePassed,
                ]}
              >
                <Text style={styles.intervalBadgeText}>-30m</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.intervalHeading}>
                  30-Minute Heads-Up ({formatClockTime(time30Iso)})
                </Text>
                <Text style={styles.intervalCopy}>
                  &quot;Get ready to start {task.title} in the next 30 minutes.&quot;
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => triggerPreviewAlert(task, '30m')}
              style={styles.testPushBtn}
            >
              <Ionicons
                name="paper-plane-outline"
                size={12}
                color={Palette.ink}
              />
              <Text style={styles.testPushText}>Test Push</Text>
            </Pressable>
          </View>

          {/* Interval 2: 15 Mins Before */}
          <View style={styles.intervalRow}>
            <View style={styles.intervalLeft}>
              <View
                style={[
                  styles.intervalBadge,
                  nowMs >= startMs - 15 * 60 * 1000 &&
                    styles.intervalBadgePassed,
                ]}
              >
                <Text style={styles.intervalBadgeText}>-15m</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.intervalHeading}>
                  15-Minute Reminder ({formatClockTime(time15Iso)})
                </Text>
                <Text style={styles.intervalCopy}>
                  &quot;15 minutes left — prepare to begin {task.title}.&quot;
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => triggerPreviewAlert(task, '15m')}
              style={styles.testPushBtn}
            >
              <Ionicons
                name="paper-plane-outline"
                size={12}
                color={Palette.ink}
              />
              <Text style={styles.testPushText}>Test Push</Text>
            </Pressable>
          </View>

          {/* Interval 3: Exact Start Time */}
          <View style={[styles.intervalRow, { borderBottomWidth: 0 }]}>
            <View style={styles.intervalLeft}>
              <View
                style={[
                  styles.intervalBadge,
                  { backgroundColor: Palette.vermilionSoft },
                ]}
              >
                <Text
                  style={[
                    styles.intervalBadgeText,
                    { color: Palette.vermilion },
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
                  &quot;Start your task now! Open the app and tap Starting Now.&quot;
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => triggerPreviewAlert(task, 'start')}
              style={styles.testPushBtn}
            >
              <Ionicons
                name="paper-plane-outline"
                size={12}
                color={Palette.ink}
              />
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
    backgroundColor: Palette.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.paperSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: Palette.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  catBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.crimsonSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  titleSection: {
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateMeta: {
    color: Palette.inkMuted,
    fontFamily: Fonts?.mono,
    fontSize: 12,
    fontWeight: '600',
  },
  statusPill: {
    backgroundColor: Palette.paperSubtle,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  statusPillText: {
    color: Palette.ink,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  title: {
    color: Palette.ink,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  notes: {
    color: Palette.inkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  consoleCard: {
    backgroundColor: Palette.ink,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E2D29',
  },
  consoleTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 14,
  },
  consoleModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#23221E',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  consoleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  consoleModeLabel: {
    color: Palette.paper,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  bigChronometer: {
    color: Palette.white,
    fontFamily: Fonts?.mono,
    fontSize: 54,
    fontWeight: '800',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  chronometerCaption: {
    color: Palette.inkFaint,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  metricsGrid: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    paddingTop: 16,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: '#2A2925',
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#2A2925',
  },
  metricLabel: {
    color: Palette.inkFaint,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  metricValue: {
    color: Palette.paper,
    fontFamily: Fonts?.mono,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  consoleActions: {
    width: '100%',
    marginTop: 18,
  },
  startNowBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: Palette.vermilion,
    paddingVertical: 16,
    borderRadius: 15,
  },
  startNowBigBtnText: {
    color: Palette.white,
    fontSize: 16,
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
    gap: 7,
    backgroundColor: '#24231F',
    borderWidth: 1,
    borderColor: '#3A3832',
    paddingVertical: 15,
    borderRadius: 14,
  },
  pauseBtnText: {
    color: Palette.paper,
    fontSize: 14,
    fontWeight: '700',
  },
  completeBigBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Palette.forest,
    paddingVertical: 15,
    borderRadius: 14,
  },
  completeBigBtnText: {
    color: Palette.white,
    fontSize: 15,
    fontWeight: '700',
  },
  scheduleCard: {
    backgroundColor: Palette.paperElevated,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 12,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  scheduleTitle: {
    color: Palette.ink,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  scheduleSubtitle: {
    color: Palette.inkMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  intervalLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  intervalBadge: {
    backgroundColor: Palette.paperSubtle,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  intervalBadgePassed: {
    backgroundColor: Palette.amberSoft,
  },
  intervalBadgeText: {
    color: Palette.ink,
    fontFamily: Fonts?.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  intervalHeading: {
    color: Palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  intervalCopy: {
    color: Palette.inkMuted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  testPushBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.paperSubtle,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },
  testPushText: {
    color: Palette.ink,
    fontSize: 11,
    fontWeight: '700',
  },
});
