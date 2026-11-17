import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Categories,
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
  getDayOffsetFromToday,
} from '@/utils/time';

export default function ActivityLogScreen() {
  const { tasks, nowMs, resetOnboarding } = useTasks();

  const records = useMemo(() => {
    const doneToday = tasks.filter((t) => {
      if (t.status !== 'completed') return false;
      const offset = getDayOffsetFromToday(
        t.completedAt ?? t.scheduledStartAt,
        nowMs
      );
      return offset === 0;
    });

    const todoToday = tasks.filter(
      (t) =>
        t.status !== 'completed' &&
        getDayOffsetFromToday(t.scheduledStartAt, nowMs) <= 0
    );

    const todoTomorrow = tasks.filter(
      (t) =>
        t.status !== 'completed' &&
        getDayOffsetFromToday(t.scheduledStartAt, nowMs) === 1
    );

    const todoNextTomorrow = tasks.filter(
      (t) =>
        t.status !== 'completed' &&
        getDayOffsetFromToday(t.scheduledStartAt, nowMs) === 2
    );

    const totalTrackedSec = tasks.reduce(
      (sum, t) => sum + computeLiveElapsedSeconds(t, nowMs),
      0
    );

    const byProject = Categories.map((cat) => {
      const catTasks = tasks.filter((t) => t.category === cat.id);
      const doneCount = catTasks.filter((t) => t.status === 'completed').length;
      const seconds = catTasks.reduce(
        (sum, t) => sum + computeLiveElapsedSeconds(t, nowMs),
        0
      );
      return {
        ...cat,
        totalCount: catTasks.length,
        doneCount,
        seconds,
      };
    });

    return {
      doneToday,
      todoToday,
      todoTomorrow,
      todoNextTomorrow,
      totalTrackedSec,
      byProject,
    };
  }, [tasks, nowMs]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Todoist Activity Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Activity & Records</Text>
          <Text style={styles.subtitle}>
            Local SQLite Ledger · Stored on your phone
          </Text>
        </View>

        <Pressable
          onPress={async () => {
            await resetOnboarding();
            router.push('/onboarding');
          }}
          style={styles.introBtn}
        >
          <Ionicons
            name="sparkles-outline"
            size={14}
            color={TodoistColors.red}
          />
          <Text style={styles.introBtnText}>Intro</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Karma / Productivity Summary Strip */}
        <View style={styles.summaryRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: TodoistColors.dateToday }]}>
              {records.doneToday.length}
            </Text>
            <Text style={styles.statLabel}>DONE TODAY</Text>
          </View>

          <View style={styles.statBox}>
            <Text
              style={[styles.statNumber, { color: TodoistColors.dateTomorrow }]}
            >
              {records.todoTomorrow.length}
            </Text>
            <Text style={styles.statLabel}>DO TOMORROW</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: TodoistColors.red }]}>
              {formatDurationClock(records.totalTrackedSec)}
            </Text>
            <Text style={styles.statLabel}>TRACKED TIME</Text>
          </View>
        </View>

        {/* 1. What You Have Done Today */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons
                name="checkmark-done-circle"
                size={18}
                color={TodoistColors.dateToday}
              />
              <Text style={styles.cardTitle}>What You Have Done Today</Text>
            </View>
            <Text style={styles.cardCountBadge}>
              {records.doneToday.length} completed
            </Text>
          </View>

          {records.doneToday.length === 0 ? (
            <Text style={styles.emptyText}>
              No tasks marked complete today yet. Start and complete a task to
              record it in your daily log.
            </Text>
          ) : (
            records.doneToday.map((task) => {
              const cat = getCategoryMeta(task.category);
              return (
                <Pressable
                  key={task.id}
                  onPress={() => router.push(`/task/${task.id}`)}
                  style={styles.recordRow}
                >
                  <View style={styles.checkGreenCircle}>
                    <Ionicons
                      name="checkmark"
                      size={12}
                      color={TodoistColors.white}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordTitle}>{task.title}</Text>
                    <Text style={styles.recordMeta}>
                      #{cat.label} · Completed at{' '}
                      {formatClockTime(task.completedAt)}
                    </Text>
                  </View>

                  <View style={styles.durationBadge}>
                    <Text style={styles.durationBadgeText}>
                      {formatHumanDuration(task.accumulatedSeconds || 0)}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* 2. What You Do Tomorrow & Next Tomorrow */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons
                name="sunny"
                size={17}
                color={TodoistColors.dateTomorrow}
              />
              <Text style={styles.cardTitle}>What You Do Tomorrow</Text>
            </View>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/new-task',
                  params: { preset: 'tomorrow' },
                })
              }
            >
              <Text style={styles.addSmallLink}>+ Plan Tomorrow</Text>
            </Pressable>
          </View>

          {records.todoTomorrow.length === 0 ? (
            <Text style={styles.emptyText}>
              Nothing scheduled for tomorrow yet. Tap &quot;+ Plan Tomorrow&quot; to
              schedule tasks ahead.
            </Text>
          ) : (
            records.todoTomorrow.map((task) => {
              const cat = getCategoryMeta(task.category);
              const prio = getPriorityMeta(task.priority);
              return (
                <Pressable
                  key={task.id}
                  onPress={() => router.push(`/task/${task.id}`)}
                  style={styles.recordRow}
                >
                  <View
                    style={[
                      styles.prioRing,
                      { borderColor: prio.color, backgroundColor: prio.fill },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordTitle}>{task.title}</Text>
                    <Text style={styles.recordMeta}>
                      #{cat.label} · Starts{' '}
                      {formatClockTime(task.scheduledStartAt)} (30m/15m/0m alerts
                      armed)
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}

          {/* Next Tomorrow Subsection */}
          {records.todoNextTomorrow.length > 0 ? (
            <View style={styles.subSection}>
              <Text style={styles.subSectionHeader}>
                NEXT TOMORROW (+2 DAYS)
              </Text>
              {records.todoNextTomorrow.map((task) => {
                const cat = getCategoryMeta(task.category);
                const prio = getPriorityMeta(task.priority);
                return (
                  <Pressable
                    key={task.id}
                    onPress={() => router.push(`/task/${task.id}`)}
                    style={styles.recordRow}
                  >
                    <View
                      style={[
                        styles.prioRing,
                        { borderColor: prio.color, backgroundColor: prio.fill },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recordTitle}>{task.title}</Text>
                      <Text style={styles.recordMeta}>
                        #{cat.label} · Starts{' '}
                        {formatClockTime(task.scheduledStartAt)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {/* 3. Project Breakdown & Local SQLite Status */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons
                name="folder-open-outline"
                size={17}
                color={TodoistColors.p3}
              />
              <Text style={styles.cardTitle}>Projects & Tracked Time</Text>
            </View>
            <Text style={styles.cardCountBadge}>{tasks.length} SQLite rows</Text>
          </View>

          {records.byProject.map((proj) => (
            <View key={proj.id} style={styles.projectRow}>
              <View style={styles.projectLeft}>
                <Text style={[styles.projectHash, { color: proj.color }]}>#</Text>
                <Text style={styles.projectName}>{proj.label}</Text>
                <Text style={styles.projectCount}>
                  ({proj.doneCount}/{proj.totalCount} done)
                </Text>
              </View>
              <Text style={styles.projectTime}>
                {formatHumanDuration(proj.seconds)}
              </Text>
            </View>
          ))}
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
  subtitle: {
    color: TodoistColors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  introBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: TodoistColors.redSoft,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
  },
  introBtnText: {
    color: TodoistColors.red,
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 120,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: TodoistColors.bgSecondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: TodoistColors.border,
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: Fonts?.mono,
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: TodoistColors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 3,
  },
  card: {
    backgroundColor: TodoistColors.bg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: TodoistColors.border,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TodoistColors.border,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cardTitle: {
    color: TodoistColors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  cardCountBadge: {
    color: TodoistColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  addSmallLink: {
    color: TodoistColors.red,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: TodoistColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checkGreenCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: TodoistColors.dateToday,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prioRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  recordTitle: {
    color: TodoistColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  recordMeta: {
    color: TodoistColors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  durationBadge: {
    backgroundColor: TodoistColors.dateTodayBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationBadgeText: {
    color: TodoistColors.dateToday,
    fontFamily: Fonts?.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  subSection: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TodoistColors.border,
    gap: 6,
  },
  subSectionHeader: {
    color: TodoistColors.dateUpcoming,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  projectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  projectHash: {
    fontSize: 15,
    fontWeight: '800',
  },
  projectName: {
    color: TodoistColors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  projectCount: {
    color: TodoistColors.textMuted,
    fontSize: 12,
  },
  projectTime: {
    color: TodoistColors.text,
    fontFamily: Fonts?.mono,
    fontSize: 12,
    fontWeight: '700',
  },
});
