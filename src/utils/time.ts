export function formatClockTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatShortDate(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';

  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
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
      countdownText: 'Logged on device',
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
      countdownText: 'Active session in progress',
      minutesUntilStart: diffMin,
      secondsUntilStart: diffSec,
      secondsUntilDeadline,
      isUrgent: true,
    };
  }

  if (status === 'paused') {
    return {
      phase: 'paused',
      badgeLabel: 'SESSION PAUSED',
      countdownText: 'Tap resume to continue tracking',
      minutesUntilStart: diffMin,
      secondsUntilStart: diffSec,
      secondsUntilDeadline,
      isUrgent: false,
    };
  }

  // Scheduled tasks: evaluate against the 30m -> 15m -> 0m cadence windows
  if (diffSec <= -60) {
    const overdueMin = Math.abs(Math.floor(diffSec / 60));
    return {
      phase: 'overdue_start',
      badgeLabel: 'START TIME PASSED',
      countdownText:
        overdueMin < 60
          ? `${overdueMin}m past scheduled start`
          : `${Math.floor(overdueMin / 60)}h ${overdueMin % 60}m past start`,
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
      countdownText: diffSec > 0 ? `Starts in ${diffSec}s` : 'Scheduled right now',
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
      badgeLabel: '15M PREP WINDOW',
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
      badgeLabel: '30M HEADS-UP',
      countdownText: `Starts in ${mins}m ${String(secs).padStart(2, '0')}s`,
      minutesUntilStart: diffMin,
      secondsUntilStart: diffSec,
      secondsUntilDeadline,
      isUrgent: true,
    };
  }

  const hours = Math.floor(diffSec / 3600);
  const mins = Math.ceil((diffSec % 3600) / 60);
  return {
    phase: 'upcoming',
    badgeLabel: 'SCHEDULED',
    countdownText:
      hours > 0 ? `In ${hours}h ${mins}m` : `In ${diffMin} mins`,
    minutesUntilStart: diffMin,
    secondsUntilStart: diffSec,
    secondsUntilDeadline,
    isUrgent: false,
  };
}
