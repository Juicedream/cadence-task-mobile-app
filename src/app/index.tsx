import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveSessionHero } from '@/components/active-session-hero';
import { TaskTimelineCard } from '@/components/task-timeline-card';
import { Brand, Fonts, Palette } from '@/constants/theme';
import { useTasks } from '@/context/tasks-context';
import { computeLiveElapsedSeconds } from '@/services/database';
import { formatHumanDuration } from '@/utils/time';

type FilterTab = 'upcoming' | 'all' | 'completed';

export default function HomeScreen() {
  const {
    tasks,
    activeTask,
    hasCompletedOnboarding,
    userName,
    nowMs,
  } = useTasks();

  const [filter, setFilter] = useState<FilterTab>('upcoming');

  // Compute daily metrics before early return so hooks never change order
  const stats = useMemo(() => {
    const scheduledCount = tasks.filter((t) => t.status === 'scheduled').length;
    const completedCount = tasks.filter((t) => t.status === 'completed').length;
    const totalTrackedSec = tasks.reduce(
      (acc, t) => acc + computeLiveElapsedSeconds(t, nowMs),
      0
    );
    return {
      scheduledCount,
      completedCount,
      totalTrackedSec,
    };
  }, [tasks, nowMs]);

  const filteredTasks = useMemo(() => {
    if (filter === 'upcoming') {
      return tasks.filter((t) => t.status !== 'completed');
    }
    if (filter === 'completed') {
      return tasks.filter((t) => t.status === 'completed');
    }
    return tasks;
  }, [tasks, filter]);

  if (hasCompletedOnboarding === false) {
    return <Redirect href="/onboarding" />;
  }

  const todayFormatted = new Date(nowMs).toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const liveClockFormatted = new Date(nowMs).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Editorial Masthead */}
        <View style={styles.masthead}>
          <View>
            <View style={styles.datePillRow}>
              <View style={styles.liveClockDot} />
              <Text style={styles.dateText}>{todayFormatted.toUpperCase()}</Text>
              <Text style={styles.liveClockText}>· {liveClockFormatted}</Text>
            </View>
            <Text style={styles.greeting}>
              {userName && userName !== 'Operator'
                ? `${userName}'s Cadence`
                : Brand.name}
            </Text>
          </View>

          <View style={styles.mastheadActions}>
            <Pressable
              onPress={() => router.push('/onboarding')}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <Ionicons
                name="sparkles-outline"
                size={17}
                color={Palette.ink}
              />
            </Pressable>
            <Pressable
              onPress={() => router.push('/new-task')}
              style={styles.newTaskTopBtn}
            >
              <Ionicons name="add" size={18} color={Palette.white} />
              <Text style={styles.newTaskTopBtnText}>New Task</Text>
            </Pressable>
          </View>
        </View>

        {/* Active Session Live Banner (when a task is in_progress or paused) */}
        {activeTask ? (
          <View style={styles.sectionBlock}>
            <ActiveSessionHero task={activeTask} />
          </View>
        ) : null}

        {/* Summary Metrics Strip */}
        <View style={styles.metricsStrip}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stats.scheduledCount}</Text>
            <Text style={styles.metricLabel}>UPCOMING</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: Palette.vermilion }]}>
              {formatHumanDuration(stats.totalTrackedSec)}
            </Text>
            <Text style={styles.metricLabel}>TRACKED TIME</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: Palette.forest }]}>
              {stats.completedCount}
            </Text>
            <Text style={styles.metricLabel}>COMPLETED</Text>
          </View>
        </View>

        {/* Filter Segmented Control */}
        <View style={styles.filterHeaderRow}>
          <Text style={styles.sectionHeading}>TASK TIMELINE</Text>

          <View style={styles.filterPills}>
            {(
              [
                { id: 'upcoming', label: 'Active' },
                { id: 'all', label: 'All' },
                { id: 'completed', label: 'Done' },
              ] as const
            ).map((tab) => {
              const selected = filter === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setFilter(tab.id)}
                  style={[
                    styles.filterPill,
                    selected && styles.filterPillSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      selected && styles.filterPillTextSelected,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Task Cards List */}
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name="calendar-clear-outline"
                size={24}
                color={Palette.vermilion}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {filter === 'completed'
                ? 'No completed tasks yet'
                : 'Your schedule is clear'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Schedule a task with a start time and deadline. Cadence will alert
              you 30m before, 15m before, and right when it is time to begin.
            </Text>
            <Pressable
              onPress={() => router.push('/new-task')}
              style={styles.emptyBtn}
            >
              <Ionicons name="add-circle" size={18} color={Palette.white} />
              <Text style={styles.emptyBtnText}>Schedule a Task</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cardsStack}>
            {filteredTasks.map((task) => (
              <TaskTimelineCard key={task.id} task={task} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.paper,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 110,
    gap: 18,
  },
  masthead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  datePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  liveClockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.vermilion,
  },
  dateText: {
    color: Palette.inkMuted,
    fontFamily: Fonts?.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  liveClockText: {
    color: Palette.ink,
    fontFamily: Fonts?.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  greeting: {
    color: Palette.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  mastheadActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Palette.paperElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTaskTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.ink,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
  },
  newTaskTopBtnText: {
    color: Palette.white,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionBlock: {
    marginTop: 2,
  },
  metricsStrip: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Palette.paperElevated,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  metricValue: {
    color: Palette.ink,
    fontFamily: Fonts?.mono,
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    color: Palette.inkMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 3,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionHeading: {
    color: Palette.inkMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  filterPills: {
    flexDirection: 'row',
    backgroundColor: Palette.paperSubtle,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 7,
  },
  filterPillSelected: {
    backgroundColor: Palette.paperElevated,
  },
  filterPillText: {
    color: Palette.inkMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextSelected: {
    color: Palette.ink,
    fontWeight: '700',
  },
  cardsStack: {
    gap: 14,
  },
  emptyCard: {
    backgroundColor: Palette.paperElevated,
    borderRadius: 20,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 10,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.vermilionSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: Palette.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: Palette.inkMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.vermilion,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyBtnText: {
    color: Palette.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
