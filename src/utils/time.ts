import { TodoistColors } from '@/constants/theme';

export function formatClockTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getDayOffsetFromToday(
  isoString: string | null | undefined,
  nowMs = Date.now()
): number {
  if (!isoString) return 0;
  const target = getStartOfDay(new Date(isoString));
  const today = getStartOfDay(new Date(nowMs));
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function formatShortDate(
  isoString: string | null | undefined,
  nowMs = Date.now()
): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  const offset = getDayOffsetFromToday(isoString, nowMs);
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  if (offset === 2) return 'Next Tomorrow';
  if (offset === -1) return 'Yesterday';

  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTodoistDateHeader(date: Date, nowMs = Date.now()): string {
  const offset = getDayOffsetFromToday(date.toISOString(), nowMs);
  const formatted = date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
  const weekday = date.toLocaleDateString([], { weekday: 'long' });

  if (offset === 0) return `${formatted} · Today · ${weekday}`;
  if (offset === 1) return `${formatted} · Tomorrow · ${weekday}`;
  if (offset === 2) return `${formatted} · Next Tomorrow · ${weekday}`;
  return `${formatted} · ${weekday}`;
}

export function getTodoistDateChipColor(
  isoString: string,
  status: string,
  nowMs = Date.now()
): { text: string; bg: string; icon: 'calendar-outline' | 'alert-circle-outline' } {
  const startMs = new Date(isoString).getTime();
  const offset = getDayOffsetFromToday(isoString, nowMs);

  if (status !== 'completed' && startMs < nowMs - 60 * 1000) {
    return {
      text: TodoistColors.dateOverdue,
      bg: TodoistColors.dateOverdueBg,
      icon: 'alert-circle-outline',
    };
  }
  if (offset === 0) {
    return {
      text: TodoistColors.dateToday,
      bg: TodoistColors.dateTodayBg,
      icon: 'calendar-outline',
    };
  }
  if (offset === 1) {
    return {
      text: TodoistColors.dateTomorrow,
      bg: TodoistColors.dateTomorrowBg,
      icon: 'calendar-outline',
    };
  }
  return {
    text: TodoistColors.dateUpcoming,
    bg: TodoistColors.dateUpcomingBg,
    icon: 'calendar-outline',
  };
}

export function formatDurationClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function formatHumanDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  if (clamped < 60) return `${clamped}s`;
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return seconds > 0 && minutes < 10 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export type CadencePhase =
  | 'completed'
  | 'in_progress'
  | 'paused'
  | 'overdue_start'
  | 'starting_now'
  | 'window_15m'
  | 'window_30m'
  | 'upcoming';

export interface CadenceTimingMeta {
  phase: CadencePhase;
  badgeLabel: string;
  countdownText: string;
  minutesUntilStart: number;
  secondsUntilStart: number;
  secondsUntilDeadline: number | null;
  isUrgent: boolean;
}

export function getTaskCadenceMeta(
  scheduledStartAt: string,
  deadlineAt: string | null,
  status: string,
  nowMs = Date.now()
): CadenceTimingMeta {
  const startMs = new Date(scheduledStartAt).getTime();
  const diffSec = Math.floor((startMs - nowMs) / 1000);
  const diffMin = Math.ceil(diffSec / 60);

  const secondsUntilDeadline = deadlineAt
    ? Math.floor((new Date(deadlineAt).getTime() - nowMs) / 1000)
    : null;

  if (status === 'completed') {
    return {
      phase: 'completed',
      badgeLabel: 'COMPLETED',
      countdownText: 'Saved to local SQLite log',
      minutesUntilStart: 0,
      secondsUntilStart: 0,
      secondsUntilDeadline,
      isUrgent: false,
    };
  }

  if (status === 'in_progress') {
    return {
      phase: 'in_progress',
      badgeLabel: 'TRACKING LIVE',
      countdownText: 'Active timer running',
      minutesUntilStart: diffMin,
      secondsUntilStart: diffSec,
      secondsUntilDeadline,
      isUrgent: true,
    };
  }

  if (status === 'paused') {
    return {
      phase: 'paused',
      badgeLabel: 'PAUSED',
      countdownText: 'Timer paused',
      minutesUntilStart: diffMin,
      secondsUntilStart: diffSec,
      secondsUntilDeadline,
      isUrgent: false,
    };
  }

  if (diffSec <= -60) {
    const overdueMin = Math.abs(Math.floor(diffSec / 60));
    return {
      phase: 'overdue_start',
      badgeLabel: 'OVERDUE',
      countdownText:
        overdueMin < 60
          ? `${overdueMin}m overdue`
          : `${Math.floor(overdueMin / 60)}h ${overdueMin % 60}m overdue`,
      minutesUntilStart: diffMin,
      secondsUntilStart: diffSec,
      secondsUntilDeadline,
      isUrgent: true,
    };
  }

  if (diffSec <= 60) {
    return {
      phase: 'starting_now',
      badgeLabel: 'START NOW',
      countdownText: diffSec > 0 ? `In ${diffSec}s` : 'Starting now',
      minutesUntilStart: 0,
      secondsUntilStart: diffSec,
      secondsUntilDeadline,
      isUrgent: true,
    };
  }

  if (diffSec <= 15 * 60) {
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return {
      phase: 'window_15m',
      badgeLabel: '15M ALERT WINDOW',
      countdownText: `Starts in ${mins}m ${String(secs).padStart(2, '0')}s`,
      minutesUntilStart: diffMin,
      secondsUntilStart: diffSec,
      secondsUntilDeadline,
      isUrgent: true,
    };
  }

  if (diffSec <= 30 * 60) {
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return {
      phase: 'window_30m',
      badgeLabel: '30M ALERT WINDOW',
      countdownText: `Starts in ${mins}m ${String(secs).padStart(2, '0')}s`,
      minutesUntilStart: diffMin,
      secondsUntilStart: diffSec,
      secondsUntilDeadline,
      isUrgent: true,
    };
  }

  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const mins = Math.ceil((diffSec % 3600) / 60);
  return {
    phase: 'upcoming',
    badgeLabel: 'SCHEDULED',
    countdownText:
      days > 0
        ? `In ${days}d ${hours}h`
        : hours > 0
        ? `In ${hours}h ${mins}m`
        : `In ${diffMin}m`,
    minutesUntilStart: diffMin,
    secondsUntilStart: diffSec,
    secondsUntilDeadline,
    isUrgent: false,
  };
}
