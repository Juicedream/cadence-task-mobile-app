import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, TodoistColors } from '@/constants/theme';
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
        pressed && { opacity: 0.96 },
      ]}
    >
      {/* Top Status Strip */}
      <View style={styles.topRow}>
        <View style={styles.liveBadge}>
          <View
            style={[
              styles.pulseDot,
              {
                backgroundColor: isRunning
                  ? TodoistColors.red
                  : TodoistColors.p2,
              },
            ]}
          />
          <Text style={styles.liveBadgeText}>
            {isRunning ? 'TRACKING NOW' : 'TIMER PAUSED'}
          </Text>
        </View>

        {deadlineDiffSec !== null ? (
          <Text
            style={[
              styles.deadlineBadgeText,
              deadlineDiffSec < 0 && { color: '#FF7A6B' },
            ]}
          >
            {deadlineDiffSec >= 0
              ? `${formatHumanDuration(deadlineDiffSec)} until deadline (${formatClockTime(
                  task.deadlineAt
                )})`
              : `${formatHumanDuration(Math.abs(deadlineDiffSec))} past deadline`}
          </Text>
        ) : (
          <Text style={styles.deadlineBadgeText}>
            Started {formatClockTime(task.actualStartedAt ?? task.scheduledStartAt)}
          </Text>
        )}
      </View>

      {/* Main Row: Task Title + Big Chronometer + Controls */}
      <View style={styles.mainRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {task.title}
          </Text>
          <Text style={styles.timerDigits}>
            {formatDurationClock(elapsedSeconds)}
          </Text>
        </View>

        <View style={styles.actionsCluster}>
          {isRunning ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                pauseTask(task.id);
              }}
              style={styles.iconCircleBtn}
            >
              <Ionicons name="pause" size={16} color={TodoistColors.white} />
            </Pressable>
          ) : (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                resumeTask(task.id);
              }}
              style={[
                styles.iconCircleBtn,
                { backgroundColor: TodoistColors.p2 },
              ]}
            >
              <Ionicons name="play" size={16} color={TodoistColors.white} />
            </Pressable>
          )}

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              completeTask(task.id);
            }}
            style={styles.doneBtn}
          >
            <Ionicons name="checkmark" size={16} color={TodoistColors.white} />
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: TodoistColors.trackerBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: TodoistColors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  deadlineBadgeText: {
    color: '#B5B5B5',
    fontSize: 11,
    fontWeight: '500',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    color: '#E5E5E5',
    fontSize: 14,
    fontWeight: '600',
  },
  timerDigits: {
    color: TodoistColors.white,
    fontFamily: Fonts?.mono,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  actionsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TodoistColors.trackerCard,
    borderWidth: 1,
    borderColor: TodoistColors.trackerBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TodoistColors.dateToday,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
  },
  doneBtnText: {
    color: TodoistColors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
