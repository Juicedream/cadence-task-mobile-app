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
import { TodoistColors } from '@/constants/theme';
import { useTasks } from '@/context/tasks-context';
import { computeLiveElapsedSeconds } from '@/services/database';
import {
  formatHumanDuration,
  getDayOffsetFromToday,
} from '@/utils/time';

export default function TodayScreen() {
  const {
    tasks,
    activeTask,
    hasCompletedOnboarding,
    nowMs,
    rescheduleTask,
  } = useTasks();

  const [showCompletedToday, setShowCompletedToday] = useState(true);

  const grouped = useMemo(() => {
    const overdue: typeof tasks = [];
    const todayActive: typeof tasks = [];
    const todayCompleted: typeof tasks = [];
    const tomorrowPreview: typeof tasks = [];

    for (const t of tasks) {
      const dayOffset = getDayOffsetFromToday(t.scheduledStartAt, nowMs);
      const startMs = new Date(t.scheduledStartAt).getTime();

      if (t.status === 'completed') {
        const completedOffset = getDayOffsetFromToday(
          t.completedAt ?? t.scheduledStartAt,
          nowMs
        );
        if (completedOffset === 0 || dayOffset === 0) {
          todayCompleted.push(t);
        }
        continue;
      }

      if (dayOffset < 0 || (dayOffset === 0 && startMs < nowMs - 60 * 1000 && t.status === 'scheduled')) {
        overdue.push(t);
      } else if (dayOffset === 0) {
        todayActive.push(t);
      } else if (dayOffset === 1) {
        tomorrowPreview.push(t);
      }
    }

    const todayTrackedSec = [...todayActive, ...todayCompleted, ...overdue].reduce(
      (sum, t) => sum + computeLiveElapsedSeconds(t, nowMs),
      0
    );

    return {
      overdue,
      todayActive,
      todayCompleted,
      tomorrowPreview,
      todayTrackedSec,
    };
  }, [tasks, nowMs]);

  if (hasCompletedOnboarding === false) {
    return <Redirect href="/onboarding" />;
  }

  const todayHeaderDate = new Date(nowMs).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
  const todayWeekday = new Date(nowMs).toLocaleDateString([], {
    weekday: 'long',
  });

  const totalRemainingToday =
    grouped.overdue.length + grouped.todayActive.length;

  const handleRescheduleOverdueToToday = async () => {
    const in35Min = new Date(Date.now() + 35 * 60 * 1000).toISOString();
    const in95Min = new Date(Date.now() + 95 * 60 * 1000).toISOString();
    for (const item of grouped.overdue) {
      await rescheduleTask(item.id, in35Min, in95Min);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Todoist Navigation Header */}
      <View style={styles.topNav}>
        <View>
          <Text style={styles.pageTitle}>Today</Text>
          <View style={styles.subtitleRow}>
            <Ionicons
              name="checkmark-circle-outline"
              size={14}
              color={TodoistColors.textSecondary}
            />
            <Text style={styles.subtitleText}>
              {totalRemainingToday} {totalRemainingToday === 1 ? 'task' : 'tasks'}{' '}
              left · {grouped.todayCompleted.length} done today
              {grouped.todayTrackedSec > 0
                ? ` · ${formatHumanDuration(grouped.todayTrackedSec)} tracked`
                : ''}
            </Text>
          </View>
        </View>

        <View style={styles.topRightActions}>
          <Pressable
            onPress={() => router.push('/onboarding')}
            style={styles.topIconBtn}
            hitSlop={8}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={TodoistColors.text}
            />
          </Pressable>
          <Pressable
            onPress={() => router.push('/explore')}
            style={styles.topIconBtn}
            hitSlop={8}
          >
            <Ionicons
              name="time-outline"
              size={20}
              color={TodoistColors.text}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Active Session Tracker Bar */}
        {activeTask ? <ActiveSessionHero task={activeTask} /> : null}

        {/* Overdue Section (Todoist Red Header + Reschedule link) */}
        {grouped.overdue.length > 0 ? (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleOverdue}>Overdue</Text>
              <Pressable onPress={handleRescheduleOverdueToToday}>
                <Text style={styles.rescheduleLink}>Reschedule (+35m)</Text>
              </Pressable>
            </View>
            {grouped.overdue.map((task) => (
              <TaskTimelineCard key={task.id} task={task} showDateLabel />
            ))}
          </View>
        ) : null}

        {/* Today Section */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {todayHeaderDate} · Today · {todayWeekday}
            </Text>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/new-task', params: { preset: 'today' } })
              }
            >
              <Text style={styles.addInlineLink}>+ Add task</Text>
            </Pressable>
          </View>

          {grouped.todayActive.length === 0 && grouped.overdue.length === 0 ? (
            <View style={styles.emptyTodayBox}>
              <View style={styles.emptyCheckCircle}>
                <Ionicons
                  name="checkmark-done"
                  size={24}
                  color={TodoistColors.red}
                />
              </View>
              <Text style={styles.emptyTitle}>
                You&apos;re all caught up for today!
              </Text>
              <Text style={styles.emptySubtext}>
                Tap the red + button to schedule a task for Today, Tomorrow, or
                Next Tomorrow with automatic 30m, 15m, and Start push alerts.
              </Text>
            </View>
          ) : (
            grouped.todayActive.map((task) => (
              <TaskTimelineCard
                key={task.id}
                task={task}
                showDateLabel={false}
              />
            ))
          )}
        </View>

        {/* Completed Today Accordion ("What you have done today") */}
        {grouped.todayCompleted.length > 0 ? (
          <View style={styles.sectionBlock}>
            <Pressable
              onPress={() => setShowCompletedToday((v) => !v)}
              style={styles.sectionHeader}
            >
              <View style={styles.accordionHeaderLeft}>
                <Ionicons
                  name={showCompletedToday ? 'chevron-down' : 'chevron-forward'}
                  size={15}
                  color={TodoistColors.dateToday}
                />
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: TodoistColors.dateToday },
                  ]}
                >
                  Done Today ({grouped.todayCompleted.length})
                </Text>
              </View>
              <Text style={styles.doneSummaryMeta}>Saved on device</Text>
            </Pressable>

            {showCompletedToday
              ? grouped.todayCompleted.map((task) => (
                  <TaskTimelineCard
                    key={task.id}
                    task={task}
                    showDateLabel={false}
                  />
                ))
              : null}
          </View>
        ) : null}

        {/* Tomorrow Preview Strip ("What you do tomorrow") */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <View style={styles.accordionHeaderLeft}>
              <Ionicons
                name="sunny-outline"
                size={15}
                color={TodoistColors.dateTomorrow}
              />
              <Text style={styles.sectionTitle}>
                Tomorrow ({grouped.tomorrowPreview.length})
              </Text>
            </View>
            <Pressable onPress={() => router.push('/upcoming')}>
              <Text style={styles.rescheduleLink}>See Upcoming →</Text>
            </Pressable>
          </View>

          {grouped.tomorrowPreview.length === 0 ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/new-task',
                  params: { preset: 'tomorrow' },
                })
              }
              style={styles.planTomorrowBanner}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={TodoistColors.dateTomorrow}
              />
              <Text style={styles.planTomorrowText}>
                Nothing scheduled for tomorrow yet — tap to plan tomorrow
              </Text>
            </Pressable>
          ) : (
            grouped.tomorrowPreview.map((task) => (
              <TaskTimelineCard
                key={task.id}
                task={task}
                showDateLabel={false}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Iconic Todoist Red Floating Action Button (FAB) */}
      <Pressable
        onPress={() => router.push('/new-task')}
        style={({ pressed }) => [
          styles.fab,
          pressed && { transform: [{ scale: 0.95 }], opacity: 0.92 },
        ]}
      >
        <Ionicons name="add" size={30} color={TodoistColors.white} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: TodoistColors.bg,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TodoistColors.border,
  },
  pageTitle: {
    color: TodoistColors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  subtitleText: {
    color: TodoistColors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TodoistColors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 130,
  },
  sectionBlock: {
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: TodoistColors.bgSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TodoistColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TodoistColors.border,
  },
  sectionTitle: {
    color: TodoistColors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitleOverdue: {
    color: TodoistColors.red,
    fontSize: 13,
    fontWeight: '700',
  },
  rescheduleLink: {
    color: TodoistColors.red,
    fontSize: 12,
    fontWeight: '600',
  },
  addInlineLink: {
    color: TodoistColors.red,
    fontSize: 12,
    fontWeight: '700',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doneSummaryMeta: {
    color: TodoistColors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  emptyTodayBox: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    gap: 8,
  },
  emptyCheckCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TodoistColors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    color: TodoistColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtext: {
    color: TodoistColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  planTomorrowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TodoistColors.border,
  },
  planTomorrowText: {
    color: TodoistColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 92,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TodoistColors.red,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TodoistColors.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
