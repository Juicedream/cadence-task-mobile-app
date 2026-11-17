import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import {
  formatTodoistDateHeader,
  getDayOffsetFromToday,
  getStartOfDay,
} from '@/utils/time';

export default function UpcomingScreen() {
  const { tasks, activeTask, nowMs } = useTasks();
  const [selectedDayOffset, setSelectedDayOffset] = useState<number | null>(
    null
  );

  // Build 14-day calendar strip starting from Today (0) through +13 days
  const calendarDays = useMemo(() => {
    const baseToday = getStartOfDay(new Date(nowMs));
    return Array.from({ length: 14 }, (_, idx) => {
      const date = new Date(baseToday);
      date.setDate(baseToday.getDate() + idx);
      const dayNumber = date.getDate();
      const shortWeekday = date.toLocaleDateString([], { weekday: 'short' });
      const count = tasks.filter(
        (t) =>
          t.status !== 'completed' &&
          getDayOffsetFromToday(t.scheduledStartAt, nowMs) === idx
      ).length;

      return {
        offset: idx,
        date,
        dayNumber,
        shortWeekday,
        count,
      };
    });
  }, [tasks, nowMs]);

  // Group all upcoming sections (Today, Tomorrow, Next Tomorrow, and future days)
  const sections = useMemo(() => {
    const offsetsToRender =
      selectedDayOffset !== null
        ? [selectedDayOffset]
        : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

    const list = offsetsToRender.map((offset) => {
      const baseDate = getStartOfDay(new Date(nowMs));
      baseDate.setDate(baseDate.getDate() + offset);

      const dayTasks = tasks.filter(
        (t) =>
          getDayOffsetFromToday(t.scheduledStartAt, nowMs) === offset &&
          t.status !== 'completed'
      );

      return {
        offset,
        date: baseDate,
        headerLabel: formatTodoistDateHeader(baseDate, nowMs),
        tasks: dayTasks,
      };
    });

    // Also include tasks scheduled beyond 14 days
    if (selectedDayOffset === null) {
      const futureTasks = tasks.filter(
        (t) =>
          getDayOffsetFromToday(t.scheduledStartAt, nowMs) >= 14 &&
          t.status !== 'completed'
      );
      if (futureTasks.length > 0) {
        list.push({
          offset: 99,
          date: new Date(nowMs + 14 * 86400 * 1000),
          headerLabel: 'Later · Beyond 2 Weeks',
          tasks: futureTasks,
        });
      }
    }

    return list;
  }, [tasks, nowMs, selectedDayOffset]);

  const monthTitle = new Date(nowMs).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Todoist Upcoming Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.pageTitle}>Upcoming</Text>
          <Text style={styles.monthSubtext}>{monthTitle}</Text>
        </View>

        {selectedDayOffset !== null ? (
          <Pressable
            onPress={() => setSelectedDayOffset(null)}
            style={styles.showAllBtn}
          >
            <Text style={styles.showAllBtnText}>Show All Days</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/new-task',
                params: { preset: 'tomorrow' },
              })
            }
            style={styles.planBtn}
          >
            <Ionicons name="add" size={16} color={TodoistColors.white} />
            <Text style={styles.planBtnText}>Schedule Ahead</Text>
          </Pressable>
        )}
      </View>

      {/* Horizontal 14-Day Todoist Calendar Strip */}
      <View style={styles.calendarStripWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendarStrip}
        >
          {calendarDays.map((d) => {
            const isSelected = selectedDayOffset === d.offset;
            const isToday = d.offset === 0;
            return (
              <Pressable
                key={d.offset}
                onPress={() =>
                  setSelectedDayOffset((prev) =>
                    prev === d.offset ? null : d.offset
                  )
                }
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayWeekday,
                    isToday && { color: TodoistColors.red, fontWeight: '700' },
                    isSelected && { color: TodoistColors.white },
                  ]}
                >
                  {d.shortWeekday}
                </Text>
                <View
                  style={[
                    styles.dayNumberCircle,
                    isToday && !isSelected && styles.dayNumberCircleToday,
                    isSelected && styles.dayNumberCircleSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumberText,
                      isToday && !isSelected && { color: TodoistColors.red },
                      isSelected && { color: TodoistColors.white },
                    ]}
                  >
                    {d.dayNumber}
                  </Text>
                </View>
                {/* Task Count Indicator Dot */}
                <View
                  style={[
                    styles.dayDot,
                    d.count > 0 && {
                      backgroundColor: isSelected
                        ? TodoistColors.white
                        : TodoistColors.red,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Vertically Scrolling Day-by-Day Sections (Today, Tomorrow, Next Tomorrow, etc.) */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTask ? <ActiveSessionHero task={activeTask} /> : null}

        {sections.map((section) => {
          // Always show Today (0), Tomorrow (1), Next Tomorrow (2), and any day that has tasks or is selected
          if (
            section.offset > 2 &&
            section.tasks.length === 0 &&
            selectedDayOffset === null
          ) {
            return null;
          }

          return (
            <View key={section.offset} style={styles.daySection}>
              <View style={styles.dayHeaderBar}>
                <Text
                  style={[
                    styles.dayHeaderTitle,
                    section.offset === 0 && { color: TodoistColors.dateToday },
                    section.offset === 1 && {
                      color: TodoistColors.dateTomorrow,
                    },
                    section.offset === 2 && {
                      color: TodoistColors.dateUpcoming,
                    },
                  ]}
                >
                  {section.headerLabel}
                </Text>

                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/new-task',
                      params: { dayOffset: String(section.offset) },
                    })
                  }
                  hitSlop={8}
                >
                  <Text style={styles.addDayTaskText}>+ Add task</Text>
                </Pressable>
              </View>

              {section.tasks.length === 0 ? (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/new-task',
                      params: { dayOffset: String(section.offset) },
                    })
                  }
                  style={styles.emptyDayRow}
                >
                  <Text style={styles.emptyDayText}>
                    No tasks scheduled — tap to add a task with push alerts
                  </Text>
                </Pressable>
              ) : (
                section.tasks.map((task) => (
                  <TaskTimelineCard
                    key={task.id}
                    task={task}
                    showDateLabel={false}
                  />
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/new-task',
            params:
              selectedDayOffset !== null
                ? { dayOffset: String(selectedDayOffset) }
                : { preset: 'tomorrow' },
          })
        }
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
  },
  pageTitle: {
    color: TodoistColors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  monthSubtext: {
    color: TodoistColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  showAllBtn: {
    backgroundColor: TodoistColors.bgTertiary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  showAllBtnText: {
    color: TodoistColors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  planBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TodoistColors.red,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  planBtnText: {
    color: TodoistColors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  calendarStripWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TodoistColors.border,
    paddingBottom: 10,
  },
  calendarStrip: {
    paddingHorizontal: 14,
    gap: 6,
  },
  dayCell: {
    width: 46,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  dayCellSelected: {
    backgroundColor: TodoistColors.red,
  },
  dayWeekday: {
    color: TodoistColors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  dayNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberCircleToday: {
    backgroundColor: TodoistColors.redSoft,
  },
  dayNumberCircleSelected: {
    backgroundColor: 'transparent',
  },
  dayNumberText: {
    color: TodoistColors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 130,
  },
  daySection: {
    marginBottom: 12,
  },
  dayHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: TodoistColors.bgSecondary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TodoistColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TodoistColors.border,
  },
  dayHeaderTitle: {
    color: TodoistColors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  addDayTaskText: {
    color: TodoistColors.red,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyDayRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TodoistColors.border,
  },
  emptyDayText: {
    color: TodoistColors.textMuted,
    fontSize: 13,
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
