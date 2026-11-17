import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TodoistColors } from '@/constants/theme';

export default function AppTabs() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const hideTabBar =
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/new-task') ||
    pathname.startsWith('/task/');

  const isToday = pathname === '/' || pathname === '/index';
  const isUpcoming = pathname.startsWith('/upcoming');
  const isActivity = pathname.startsWith('/explore');

  const todayNumber = new Date().getDate();

  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      {!hideTabBar ? (
        <TabList asChild>
          <View
            style={StyleSheet.flatten([
              styles.bottomBar,
              { paddingBottom: Math.max(insets.bottom, 10) },
            ])}
          >
            {/* 1. Today Tab (with Todoist calendar date badge) */}
            <TabTrigger name="index" href="/" asChild>
              <Pressable style={styles.tabButton}>
                <View style={styles.todayIconWrap}>
                  <Ionicons
                    name={isToday ? 'calendar' : 'calendar-clear-outline'}
                    size={22}
                    color={
                      isToday ? TodoistColors.red : TodoistColors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.todayBadgeNum,
                      {
                        color: isToday
                          ? TodoistColors.white
                          : TodoistColors.textSecondary,
                      },
                    ]}
                  >
                    {todayNumber}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    isToday && styles.tabLabelActive,
                  ]}
                >
                  Today
                </Text>
              </Pressable>
            </TabTrigger>

            {/* 2. Upcoming Tab (Tomorrow, Next Tomorrow & 14-day calendar) */}
            <TabTrigger name="upcoming" href="/upcoming" asChild>
              <Pressable style={styles.tabButton}>
                <Ionicons
                  name={isUpcoming ? 'calendar-number' : 'calendar-outline'}
                  size={22}
                  color={
                    isUpcoming ? TodoistColors.red : TodoistColors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isUpcoming && styles.tabLabelActive,
                  ]}
                >
                  Upcoming
                </Text>
              </Pressable>
            </TabTrigger>

            {/* 3. Activity & Records Tab */}
            <TabTrigger name="explore" href="/explore" asChild>
              <Pressable style={styles.tabButton}>
                <Ionicons
                  name={isActivity ? 'checkmark-done-circle' : 'checkmark-done-circle-outline'}
                  size={23}
                  color={
                    isActivity ? TodoistColors.red : TodoistColors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isActivity && styles.tabLabelActive,
                  ]}
                >
                  Activity Log
                </Text>
              </Pressable>
            </TabTrigger>
          </View>
        </TabList>
      ) : null}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: TodoistColors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TodoistColors.borderStrong,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  todayIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadgeNum: {
    position: 'absolute',
    top: 7,
    fontSize: 8,
    fontWeight: '800',
  },
  tabLabel: {
    color: TodoistColors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: TodoistColors.red,
    fontWeight: '700',
  },
});
