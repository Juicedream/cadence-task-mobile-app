import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppTabs from '@/components/app-tabs';
import { InAppAlertBanner } from '@/components/in-app-alert-banner';
import { Palette } from '@/constants/theme';
import { TasksProvider } from '@/context/tasks-context';
import { migrateDatabaseAsync } from '@/services/database';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <SafeAreaProvider>
      <SQLiteProvider
        databaseName="cadence_tasks.db"
        onInit={migrateDatabaseAsync}
      >
        <TasksProvider>
          <View style={{ flex: 1, backgroundColor: Palette.paper }}>
            <StatusBar style="dark" />
            <InAppAlertBanner />
            <AppTabs />
          </View>
        </TasksProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
