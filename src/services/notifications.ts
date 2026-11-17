import {
  AndroidImportance,
  cancelScheduledNotificationAsync,
  getPermissionsAsync,
  IosAuthorizationStatus,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import type { TaskRecord, UpdateTaskNotificationsInput } from './database';

const CHANNEL_ID = 'cadence-task-alerts';

export function configureNotificationsHandler(): void {
  if (Platform.OS === 'web') return;

  setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermissionsAsync(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    if (Platform.OS === 'android') {
      await setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Task Cadence Alerts (30m, 15m, Start)',
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 250, 200, 250],
        lightColor: '#D84A27',
        sound: 'default',
      });
    }

    const existing = await getPermissionsAsync();
    if (
      existing.granted ||
      existing.ios?.status === IosAuthorizationStatus.PROVISIONAL
    ) {
      return true;
    }

    const requested = await requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return (
      requested.granted ||
      requested.ios?.status === IosAuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

function formatShortTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export async function scheduleTaskCadenceNotificationsAsync(params: {
  taskId: number;
  title: string;
  scheduledStartAt: string;
  deadlineAt: string | null;
}): Promise<UpdateTaskNotificationsInput> {
  const emptyResult: UpdateTaskNotificationsInput = {
    notif30Id: null,
    notif15Id: null,
    notif0Id: null,
    notifDeadlineId: null,
  };

  if (Platform.OS === 'web') {
    return emptyResult;
  }

  const hasPermission = await requestNotificationPermissionsAsync();
  if (!hasPermission) {
    return emptyResult;
  }

  const nowMs = Date.now();
  const startDate = new Date(params.scheduledStartAt);
  const startMs = startDate.getTime();
  const formattedStart = formatShortTime(startDate);

  const time30Ms = startMs - 30 * 60 * 1000;
  const time15Ms = startMs - 15 * 60 * 1000;

  let notif30Id: string | null = null;
  let notif15Id: string | null = null;
  let notif0Id: string | null = null;
  let notifDeadlineId: string | null = null;

  try {
    // 1. 30-Minute Heads Up
    if (time30Ms > nowMs + 3000) {
      notif30Id = await scheduleNotificationAsync({
        content: {
          title: '30 Minutes Until Start',
          subtitle: params.title,
          body: `Get ready: "${params.title}" is scheduled to begin in 30 minutes (${formattedStart}).`,
          sound: 'default',
          data: {
            taskId: params.taskId,
            stage: '30m',
          },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: new Date(time30Ms),
          channelId: CHANNEL_ID,
        },
      });
    }

    // 2. 15-Minute Prep Alert
    if (time15Ms > nowMs + 3000) {
      notif15Id = await scheduleNotificationAsync({
        content: {
          title: '15 Minutes Remaining',
          subtitle: params.title,
          body: `Wrap up what you're doing — "${params.title}" starts in 15 minutes (${formattedStart}).`,
          sound: 'default',
          data: {
            taskId: params.taskId,
            stage: '15m',
          },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: new Date(time15Ms),
          channelId: CHANNEL_ID,
        },
      });
    }

    // 3. Exact Start Time Alert (0m)
    if (startMs > nowMs + 2000) {
      notif0Id = await scheduleNotificationAsync({
        content: {
          title: 'Start Your Task Now',
          subtitle: params.title,
          body: `It's ${formattedStart}. Open Cadence and tap "Start Now" to begin tracking "${params.title}".`,
          sound: 'default',
          data: {
            taskId: params.taskId,
            stage: 'start',
          },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: new Date(startMs),
          channelId: CHANNEL_ID,
        },
      });
    }

    // 4. Optional Deadline Alert
    if (params.deadlineAt) {
      const deadlineDate = new Date(params.deadlineAt);
      const deadlineMs = deadlineDate.getTime();
      if (deadlineMs > nowMs + 5000 && deadlineMs > startMs) {
        notifDeadlineId = await scheduleNotificationAsync({
          content: {
            title: 'Task Deadline Reached',
            subtitle: params.title,
            body: `Deadline (${formatShortTime(deadlineDate)}) reached for "${params.title}". Mark complete or review your progress.`,
            sound: 'default',
            data: {
              taskId: params.taskId,
              stage: 'deadline',
            },
          },
          trigger: {
            type: SchedulableTriggerInputTypes.DATE,
            date: deadlineDate,
            channelId: CHANNEL_ID,
          },
        });
      }
    }
  } catch (err) {
    console.warn('Error scheduling cadence notifications:', err);
  }

  return {
    notif30Id,
    notif15Id,
    notif0Id,
    notifDeadlineId,
  };
}

export async function cancelPreStartNotificationsAsync(
  task: Pick<TaskRecord, 'notif30Id' | 'notif15Id' | 'notif0Id'>
): Promise<void> {
  if (Platform.OS === 'web') return;
  const ids = [task.notif30Id, task.notif15Id, task.notif0Id].filter(
    (id): id is string => Boolean(id)
  );
  await Promise.all(
    ids.map((id) =>
      cancelScheduledNotificationAsync(id).catch(() => undefined)
    )
  );
}

export async function cancelAllTaskNotificationsAsync(
  task: Pick<TaskRecord, 'notif30Id' | 'notif15Id' | 'notif0Id' | 'notifDeadlineId'>
): Promise<void> {
  if (Platform.OS === 'web') return;
  const ids = [
    task.notif30Id,
    task.notif15Id,
    task.notif0Id,
    task.notifDeadlineId,
  ].filter((id): id is string => Boolean(id));

  await Promise.all(
    ids.map((id) =>
      cancelScheduledNotificationAsync(id).catch(() => undefined)
    )
  );
}

export async function sendInstantPreviewNotificationAsync(
  task: TaskRecord,
  stage: '30m' | '15m' | 'start'
): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const granted = await requestNotificationPermissionsAsync();
  if (!granted) return false;

  const startFormatted = formatShortTime(new Date(task.scheduledStartAt));
  const messages = {
    '30m': {
      title: '30 Minutes Until Start',
      body: `Get ready: "${task.title}" is scheduled to begin in 30 minutes (${startFormatted}).`,
    },
    '15m': {
      title: '15 Minutes Remaining',
      body: `Wrap up what you're doing — "${task.title}" starts in 15 minutes (${startFormatted}).`,
    },
    start: {
      title: 'Start Your Task Now',
      body: `It's ${startFormatted}. Tap to open Cadence and click "Starting Now" on "${task.title}".`,
    },
  };

  await scheduleNotificationAsync({
    content: {
      title: messages[stage].title,
      subtitle: task.title,
      body: messages[stage].body,
      sound: 'default',
      data: {
        taskId: task.id,
        stage,
      },
    },
    trigger: null,
  });

  return true;
}
