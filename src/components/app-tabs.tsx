import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';

export default function AppTabs() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const hideTabBar =
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/new-task') ||
    pathname.startsWith('/task/');

  const isHome = pathname === '/' || pathname === '/index';
  const isLedger = pathname.startsWith('/explore');

  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      {!hideTabBar ? (
        <TabList asChild>
          <View
            style={StyleSheet.flatten([
              styles.tabBarWrapper,
              { paddingBottom: Math.max(insets.bottom, 14) },
            ])}
          >
            <View style={styles.tabBarPill}>
              <TabTrigger name="index" href="/" asChild>
                <Pressable
                  style={StyleSheet.flatten([
                    styles.tabItem,
                    isHome && styles.tabItemActive,
                  ])}
                >
                  <Ionicons
                    name={isHome ? 'calendar' : 'calendar-outline'}
                    size={18}
                    color={isHome ? Palette.white : Palette.inkMuted}
                  />
                  <Text
                    style={[styles.tabLabel, isHome && styles.tabLabelActive]}
                  >
                    Schedule
                  </Text>
                </Pressable>
              </TabTrigger>

              <TabTrigger name="explore" href="/explore" asChild>
                <Pressable
                  style={StyleSheet.flatten([
                    styles.tabItem,
                    isLedger && styles.tabItemActive,
                  ])}
                >
                  <Ionicons
                    name={isLedger ? 'stats-chart' : 'stats-chart-outline'}
                    size={18}
                    color={isLedger ? Palette.white : Palette.inkMuted}
                  />
                  <Text
                    style={[styles.tabLabel, isLedger && styles.tabLabelActive]}
                  >
                    SQLite Ledger
                  </Text>
                </Pressable>
              </TabTrigger>
            </View>
          </View>
        </TabList>
      ) : null}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  tabBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.paperElevated,
    borderRadius: 999,
    padding: 5,
    gap: 6,
    borderWidth: 1,
    borderColor: Palette.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  tabItemActive: {
    backgroundColor: Palette.ink,
  },
  tabLabel: {
    color: Palette.inkMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: Palette.white,
  },
});
