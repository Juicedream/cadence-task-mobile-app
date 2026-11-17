import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import {
  completeTaskAsync,
  createTaskAsync,
  type CreateTaskInput,
  deleteTaskAsync,
  getAllTasksAsync,
  getSettingAsync,
  getTaskByIdAsync,
  pauseTaskAsync,
  resumeTaskAsync,
  setSettingAsync,
  startTaskNowAsync,
  type TaskRecord,
  updateTaskNotificationsAsync,
} from '@/services/database';
import {
  cancelAllTaskNotificationsAsync,
  cancelPreStartNotificationsAsync,
  configureNotificationsHandler,
  requestNotificationPermissionsAsync,
  scheduleTaskCadenceNotificationsAsync,
  sendInstantPreviewNotificationAsync,
} from '@/services/notifications';

export interface InAppBannerAlert {
  id: string;
  taskId?: number;
  title: string;
  body: string;
  stage?: '30m' | '15m' | 'start' | 'deadline';
}

interface TasksContextValue {
  tasks: TaskRecord[];
  activeTask: TaskRecord | null;
  hasCompletedOnboarding: boolean | null;
  userName: string;
  nowMs: number;
  inAppBanner: InAppBannerAlert | null;
  dismissInAppBanner: () => void;
  completeOnboarding: (name: string) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  addTask: (input: CreateTaskInput) => Promise<number>;
  startTaskNow: (taskId: number) => Promise<void>;
  pauseTask: (taskId: number) => Promise<void>;
  resumeTask: (taskId: number) => Promise<void>;
  completeTask: (taskId: number) => Promise<void>;
  removeTask: (taskId: number) => Promise<void>;
  triggerPreviewAlert: (task: TaskRecord, stage: '30m' | '15m' | 'start') => Promise<void>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(
    null
  );
  const [userName, setUserName] = useState<string>('Operator');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [inAppBanner, setInAppBanner] = useState<InAppBannerAlert | null>(null);

  useEffect(() => {
    configureNotificationsHandler();
  }, []);

  // 1-second real-time ticker for live task timers & 30m/15m/0m countdown badges
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshTasks = useCallback(async () => {
    const rows = await getAllTasksAsync(db);
    setTasks(rows);
  }, [db]);

  // Load initial settings and tasks from SQLite
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [onboardedVal, savedName, rows] = await Promise.all([
        getSettingAsync(db, 'onboarding_completed'),
        getSettingAsync(db, 'user_name'),
        getAllTasksAsync(db),
      ]);
      if (!mounted) return;
      setHasCompletedOnboarding(onboardedVal === 'true');
      if (savedName) setUserName(savedName);
      setTasks(rows);
    })();
    return () => {
      mounted = false;
    };
  }, [db]);

  // Listen to incoming push notifications & notification taps
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      const taskId = typeof data?.taskId === 'number' ? data.taskId : undefined;
      const stage = data?.stage as InAppBannerAlert['stage'] | undefined;

      setInAppBanner({
        id: notification.request.identifier,
        taskId,
        title: title ?? 'Task Cadence Alert',
        body: body ?? 'Check your scheduled task.',
        stage,
      });
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        const taskId = typeof data?.taskId === 'number' ? data.taskId : undefined;
        if (taskId) {
          router.push(`/task/${taskId}`);
        }
      }
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  const dismissInAppBanner = useCallback(() => {
    setInAppBanner(null);
  }, []);

  const completeOnboarding = useCallback(
    async (name: string) => {
      const cleanName = name.trim() || 'Operator';
      await setSettingAsync(db, 'user_name', cleanName);
      await setSettingAsync(db, 'onboarding_completed', 'true');
      setUserName(cleanName);
      setHasCompletedOnboarding(true);
      await requestNotificationPermissionsAsync();
      await refreshTasks();
    },
    [db, refreshTasks]
  );

  const resetOnboarding = useCallback(async () => {
    await setSettingAsync(db, 'onboarding_completed', 'false');
    setHasCompletedOnboarding(false);
  }, [db]);

  const addTask = useCallback(
    async (input: CreateTaskInput) => {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => undefined
        );
      }

      const taskId = await createTaskAsync(db, input);
      const notifIds = await scheduleTaskCadenceNotificationsAsync({
        taskId,
        title: input.title,
        scheduledStartAt: input.scheduledStartAt,
        deadlineAt: input.deadlineAt,
      });
      await updateTaskNotificationsAsync(db, taskId, notifIds);
      await refreshTasks();
      return taskId;
    },
    [db, refreshTasks]
  );

  const startTaskNow = useCallback(
    async (taskId: number) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
      }

      // Pause any other currently running task so the user has one focused active session
      const currentRows = await getAllTasksAsync(db);
      for (const row of currentRows) {
        if (row.id !== taskId && row.status === 'in_progress') {
          await pauseTaskAsync(db, row.id);
        }
      }

      const target = await getTaskByIdAsync(db, taskId);
      if (target) {
        await cancelPreStartNotificationsAsync(target);
      }

      await startTaskNowAsync(db, taskId);
      await refreshTasks();
    },
    [db, refreshTasks]
  );

  const pauseTask = useCallback(
    async (taskId: number) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      }
      await pauseTaskAsync(db, taskId);
      await refreshTasks();
    },
    [db, refreshTasks]
  );

  const resumeTask = useCallback(
    async (taskId: number) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      }
      // Pause any other running task
      const currentRows = await getAllTasksAsync(db);
      for (const row of currentRows) {
        if (row.id !== taskId && row.status === 'in_progress') {
          await pauseTaskAsync(db, row.id);
        }
      }
      await resumeTaskAsync(db, taskId);
      await refreshTasks();
    },
    [db, refreshTasks]
  );

  const completeTask = useCallback(
    async (taskId: number) => {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => undefined
        );
      }
      const target = await getTaskByIdAsync(db, taskId);
      if (target) {
        await cancelAllTaskNotificationsAsync(target);
      }
      await completeTaskAsync(db, taskId);
      await refreshTasks();
    },
    [db, refreshTasks]
  );

  const removeTask = useCallback(
    async (taskId: number) => {
      const target = await getTaskByIdAsync(db, taskId);
      if (target) {
        await cancelAllTaskNotificationsAsync(target);
      }
      await deleteTaskAsync(db, taskId);
      await refreshTasks();
    },
    [db, refreshTasks]
  );

  const triggerPreviewAlert = useCallback(
    async (task: TaskRecord, stage: '30m' | '15m' | 'start') => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      }
      const sentNative = await sendInstantPreviewNotificationAsync(task, stage);
      if (!sentNative) {
        // Fallback or web preview banner
        const labels = {
          '30m': {
            title: '30 Minutes Until Start',
            body: `Get ready to start "${task.title}" in 30 minutes.`,
          },
          '15m': {
            title: '15 Minutes Remaining',
            body: `Reminder: "${task.title}" starts in 15 minutes.`,
          },
          start: {
            title: 'Start Your Task Now',
            body: `It's time! Tap "Starting Now" to begin tracking "${task.title}".`,
          },
        };
        setInAppBanner({
          id: `${task.id}-${stage}-${Date.now()}`,
          taskId: task.id,
          title: labels[stage].title,
          body: labels[stage].body,
          stage,
        });
      }
    },
    []
  );

  const activeTask = useMemo(() => {
    return (
      tasks.find((t) => t.status === 'in_progress') ??
      tasks.find((t) => t.status === 'paused') ??
      null
    );
  }, [tasks]);

  const value = useMemo<TasksContextValue>(
    () => ({
      tasks,
      activeTask,
      hasCompletedOnboarding,
      userName,
      nowMs,
      inAppBanner,
      dismissInAppBanner,
      completeOnboarding,
      resetOnboarding,
      refreshTasks,
      addTask,
      startTaskNow,
      pauseTask,
      resumeTask,
      completeTask,
      removeTask,
      triggerPreviewAlert,
    }),
    [
      tasks,
      activeTask,
      hasCompletedOnboarding,
      userName,
      nowMs,
      inAppBanner,
      dismissInAppBanner,
      completeOnboarding,
      resetOnboarding,
      refreshTasks,
      addTask,
      startTaskNow,
      pauseTask,
      resumeTask,
      completeTask,
      removeTask,
      triggerPreviewAlert,
    ]
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error('useTasks must be used inside TasksProvider');
  }
  return ctx;
}
