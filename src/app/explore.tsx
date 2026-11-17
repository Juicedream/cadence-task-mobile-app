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

import { Categories, Fonts, getCategoryMeta, Palette } from '@/constants/theme';
import { useTasks } from '@/context/tasks-context';
import { computeLiveElapsedSeconds } from '@/services/database';
import {
  formatClockTime,
  formatDurationClock,
  formatHumanDuration,
  formatShortDate,
} from '@/utils/time';

export default function ExploreScreen() {
  const { tasks, nowMs, resetOnboarding } = useTasks();

  const analytics = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'completed');
    const inProgress = tasks.filter(
      (t) => t.status === 'in_progress' || t.status === 'paused'
    );
    const scheduled = tasks.filter((t) => t.status === 'scheduled');

    const totalSeconds = tasks.reduce(
      (sum, t) => sum + computeLiveElapsedSeconds(t, nowMs),
      0
    );

    const byCategory = Categories.map((cat) => {
      const catTasks = tasks.filter((t) => t.category === cat.id);
      const seconds = catTasks.reduce(
        (sum, t) => sum + computeLiveElapsedSeconds(t, nowMs),
        0
      );
      return {
        ...cat,
        count: catTasks.length,
        seconds,
      };
    });

    // Count scheduled push notifications currently armed
    const armedNotificationsCount = scheduled.reduce((count, t) => {
      const startMs = new Date(t.scheduledStartAt).getTime();
      let c = 0;
      if (startMs - 30 * 60 * 1000 > nowMs) c++;
      if (startMs - 15 * 60 * 1000 > nowMs) c++;
      if (startMs > nowMs) c++;
      if (t.deadlineAt && new Date(t.deadlineAt).getTime() > nowMs) c++;
      return count + c;
    }, 0);

    return {
      completed,
      inProgress,
      scheduled,
      totalSeconds,
      byCategory,
      armedNotificationsCount,
    };
  }, [tasks, nowMs]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>ON-DEVICE SQLITE STORAGE</Text>
            <Text style={styles.title}>Activity Ledger</Text>
          </View>

          <Pressable
            onPress={async () => {
              await resetOnboarding();
              router.push('/onboarding');
            }}
            style={styles.replayBtn}
          >
            <Ionicons name="book-outline" size={14} color={Palette.ink} />
            <Text style={styles.replayBtnText}>View Intro</Text>
          </Pressable>
        </View>

        {/* Storage & Notification Engine Status Card */}
        <View style={styles.engineCard}>
          <View style={styles.engineTopRow}>
            <View style={styles.engineBadge}>
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={Palette.forest}
              />
              <Text style={styles.engineBadgeText}>
                LOCAL DEVICE DATABASE ACTIVE
              </Text>
            </View>
            <Text style={styles.engineTableCount}>{tasks.length} rows</Text>
          </View>

          <Text style={styles.engineCopy}>
            All tasks, elapsed session timers, and notification IDs are saved in{' '}
            <Text style={styles.monoInline}>cadence_tasks.db</Text> on your
            phone—zero external cloud dependency, ready for future device-switch
            export.
          </Text>

          <View style={styles.engineStatsRow}>
            <View style={styles.engineStatItem}>
              <Text style={styles.engineStatNumber}>
                {formatDurationClock(analytics.totalSeconds)}
              </Text>
              <Text style={styles.engineStatLabel}>TOTAL TRACKED</Text>
            </View>

            <View style={styles.engineDivider} />

            <View style={styles.engineStatItem}>
              <Text style={styles.engineStatNumber}>
                {analytics.armedNotificationsCount}
              </Text>
              <Text style={styles.engineStatLabel}>ARMED ALERTS</Text>
            </View>

            <View style={styles.engineDivider} />

            <View style={styles.engineStatItem}>
              <Text style={styles.engineStatNumber}>
                {analytics.completed.length}
              </Text>
              <Text style={styles.engineStatLabel}>FINISHED TASKS</Text>
            </View>
          </View>
        </View>

        {/* Category Time Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>EFFORT BY CATEGORY</Text>
          {analytics.byCategory.map((cat) => (
            <View key={cat.id} style={styles.catRow}>
              <View style={styles.catLeft}>
                <View style={[styles.catIconBox, { backgroundColor: cat.bg }]}>
                  <Ionicons name={cat.icon} size={15} color={cat.color} />
                </View>
                <View>
                  <Text style={styles.catName}>{cat.label}</Text>
                  <Text style={styles.catCount}>
                    {cat.count} {cat.count === 1 ? 'task' : 'tasks'}
                  </Text>
                </View>
              </View>

              <Text style={styles.catDuration}>
                {formatHumanDuration(cat.seconds)}
              </Text>
            </View>
          ))}
        </View>

        {/* Completed Sessions History */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>COMPLETED TASK LOG</Text>
          {analytics.completed.length === 0 ? (
            <Text style={styles.emptyLogText}>
              Complete an active task to see its timestamped audit log here.
            </Text>
          ) : (
            analytics.completed.map((task) => {
              const cat = getCategoryMeta(task.category);
              return (
                <Pressable
                  key={task.id}
                  onPress={() => router.push(`/task/${task.id}`)}
                  style={styles.logRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logTitle}>{task.title}</Text>
                    <Text style={styles.logMeta}>
                      {cat.label} · Finished{' '}
                      {formatShortDate(task.completedAt)}{' '}
                      {formatClockTime(task.completedAt)}
                    </Text>
                  </View>

                  <View style={styles.logTimePill}>
                    <Text style={styles.logTimeText}>
                      {formatHumanDuration(task.accumulatedSeconds || 0)}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: Palette.vermilion,
    fontFamily: Fonts?.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: Palette.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginTop: 2,
  },
  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.paperElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
  },
  replayBtnText: {
    color: Palette.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  engineCard: {
    backgroundColor: Palette.ink,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  engineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#23221E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  engineBadgeText: {
    color: Palette.paper,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  engineTableCount: {
    color: Palette.inkFaint,
    fontFamily: Fonts?.mono,
    fontSize: 12,
    fontWeight: '600',
  },
  engineCopy: {
    color: Palette.inkFaint,
    fontSize: 13,
    lineHeight: 19,
  },
  monoInline: {
    color: Palette.paper,
    fontFamily: Fonts?.mono,
    fontWeight: '700',
  },
  engineStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2B2A26',
  },
  engineStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  engineDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#2B2A26',
  },
  engineStatNumber: {
    color: Palette.white,
    fontFamily: Fonts?.mono,
    fontSize: 17,
    fontWeight: '800',
  },
  engineStatLabel: {
    color: Palette.inkFaint,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 3,
  },
  sectionCard: {
    backgroundColor: Palette.paperElevated,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 12,
  },
  sectionTitle: {
    color: Palette.inkMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    color: Palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  catCount: {
    color: Palette.inkMuted,
    fontSize: 12,
  },
  catDuration: {
    color: Palette.ink,
    fontFamily: Fonts?.mono,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyLogText: {
    color: Palette.inkMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  logTitle: {
    color: Palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  logMeta: {
    color: Palette.inkMuted,
    fontSize: 12,
    marginTop: 2,
  },
  logTimePill: {
    backgroundColor: Palette.forestSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  logTimeText: {
    color: Palette.forest,
    fontFamily: Fonts?.mono,
    fontSize: 12,
    fontWeight: '700',
  },
});
