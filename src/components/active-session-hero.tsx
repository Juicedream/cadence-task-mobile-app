import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Palette } from '@/constants/theme';
import { useTasks } from '@/context/tasks-context';
import { computeLiveElapsedSeconds, type TaskRecord } from '@/services/database';
import {
  formatClockTime,
  formatDurationClock,
  formatHumanDuration,
} from '@/utils/time';

export function ActiveSessionHero({ task }: { task: TaskRecord }) {
  const { nowMs, pauseTask, resumeTask, completeTask } = useTasks();
  const elapsedSeconds = computeLiveElapsedSeconds(task, nowMs);
  const isRunning = task.status === 'in_progress';

  const deadlineDiffSec = task.deadlineAt
    ? Math.floor((new Date(task.deadlineAt).getTime() - nowMs) / 1000)
    : null;

  return (
    <Pressable
      onPress={() => router.push(`/task/${task.id}`)}
      style={({ pressed }) => [
        styles.container,
        pressed && { opacity: 0.96, transform: [{ scale: 0.995 }] },
      ]}
    >
      {/* Top Status Strip */}
      <View style={styles.topRow}>
        <View style={styles.liveBadge}>
          <View
            style={[
              styles.pulseDot,
              { backgroundColor: isRunning ? Palette.vermilion : Palette.amber },
            ]}
          />
          <Text style={styles.liveBadgeText}>
            {isRunning ? 'ACTIVE SESSION · LIVE' : 'SESSION PAUSED'}
          </Text>
        </View>

        <View style={styles.openPill}>
          <Text style={styles.openPillText}>Focus Console</Text>
          <Ionicons name="arrow-up-right-box-outline" size={13} color={Palette.inkFaint} />
        </View>
      </View>

      {/* Task Title & Schedule */}
      <Text style={styles.title} numberOfLines={2}>
        {task.title}
      </Text>
      {task.notes ? (
        <Text style={styles.notes} numberOfLines={1}>
          {task.notes}
        </Text>
      ) : null}

      {/* Big Chronometer Readout */}
      <View style={styles.timerRow}>
        <View>
          <Text style={styles.timerLabel}>ELAPSED TIME</Text>
          <Text style={styles.timerDigits}>{formatDurationClock(elapsedSeconds)}</Text>
        </View>

        {deadlineDiffSec !== null ? (
          <View style={styles.deadlineBox}>
            <Text style={styles.deadlineLabel}>
              {deadlineDiffSec >= 0 ? 'UNTIL DEADLINE' : 'PAST DEADLINE'}
            </Text>
            <Text
              style={[
                styles.deadlineValue,
                deadlineDiffSec < 0 && { color: '#FF7A6B' },
              ]}
            >
              {deadlineDiffSec >= 0
                ? formatHumanDuration(deadlineDiffSec)
                : `+${formatHumanDuration(Math.abs(deadlineDiffSec))}`}
            </Text>
            <Text style={styles.deadlineClock}>
              Due {formatClockTime(task.deadlineAt)}
            </Text>
          </View>
        ) : (
          <View style={styles.deadlineBox}>
            <Text style={styles.deadlineLabel}>STARTED AT</Text>
            <Text style={styles.deadlineValue}>
              {formatClockTime(task.actualStartedAt ?? task.scheduledStartAt)}
            </Text>
            <Text style={styles.deadlineClock}>On-device log</Text>
          </View>
        )}
      </View>

      {/* Controls Bar */}
      <View style={styles.controlsRow}>
        {isRunning ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              pauseTask(task.id);
            }}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons name="pause" size={16} color={Palette.paper} />
            <Text style={styles.secondaryBtnText}>Pause</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              resumeTask(task.id);
            }}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: Palette.amber },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons name="play" size={16} color={Palette.amber} />
            <Text style={[styles.secondaryBtnText, { color: Palette.amber }]}>
              Resume
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            completeTask(task.id);
          }}
          style={({ pressed }) => [
            styles.completeBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="checkmark-circle" size={18} color={Palette.white} />
          <Text style={styles.completeBtnText}>Complete Task</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.ink,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2E2D29',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252420',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 7,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: Palette.paper,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openPillText: {
    color: Palette.inkFaint,
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    color: Palette.paper,
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  notes: {
    color: Palette.inkFaint,
    fontSize: 13,
    marginTop: 4,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2925',
  },
  timerLabel: {
    color: Palette.inkFaint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  timerDigits: {
    color: Palette.white,
    fontFamily: Fonts?.mono,
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  deadlineBox: {
    alignItems: 'flex-end',
    backgroundColor: '#21201C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E2C27',
  },
  deadlineLabel: {
    color: Palette.inkFaint,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  deadlineValue: {
    color: Palette.paper,
    fontFamily: Fonts?.mono,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  deadlineClock: {
    color: Palette.inkFaint,
    fontSize: 11,
    marginTop: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#24231F',
    borderWidth: 1,
    borderColor: '#3A3832',
  },
  secondaryBtnText: {
    color: Palette.paper,
    fontSize: 14,
    fontWeight: '600',
  },
  completeBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Palette.vermilion,
  },
  completeBtnText: {
    color: Palette.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
