import type { SQLiteDatabase } from 'expo-sqlite';

export type TaskStatus = 'scheduled' | 'in_progress' | 'paused' | 'completed';

export interface TaskRecord {
  id: number;
  title: string;
  notes: string;
  category: string;
  priority: number; // 1 = P1 (Red), 2 = P2 (Orange), 3 = P3 (Blue), 4 = P4 (Grey)
  scheduledStartAt: string; // ISO 8601 timestamp
  deadlineAt: string | null; // ISO 8601 timestamp
  status: TaskStatus;
  actualStartedAt: string | null;
  lastResumedAt: string | null;
  accumulatedSeconds: number;
  completedAt: string | null;
  notif30Id: string | null;
  notif15Id: string | null;
  notif0Id: string | null;
  notifDeadlineId: string | null;
  createdAt: string;
}

export interface CreateTaskInput {
  title: string;
  notes: string;
  category: string;
  priority?: number;
  scheduledStartAt: string;
  deadlineAt: string | null;
}

export interface UpdateTaskNotificationsInput {
  notif30Id: string | null;
  notif15Id: string | null;
  notif0Id: string | null;
  notifDeadlineId: string | null;
}

export async function migrateDatabaseAsync(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'inbox',
      priority INTEGER NOT NULL DEFAULT 4,
      scheduledStartAt TEXT NOT NULL,
      deadlineAt TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      actualStartedAt TEXT,
      lastResumedAt TEXT,
      accumulatedSeconds INTEGER NOT NULL DEFAULT 0,
      completedAt TEXT,
      notif30Id TEXT,
      notif15Id TEXT,
      notif0Id TEXT,
      notifDeadlineId TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON tasks(scheduledStartAt);
  `);

  // Ensure priority column exists if upgrading from v1 schema
  try {
    await db.execAsync(
      'ALTER TABLE tasks ADD COLUMN priority INTEGER NOT NULL DEFAULT 4;'
    );
  } catch {
    // Column already exists
  }

  // Seed initial sample tasks for Today, Tomorrow, and Next Tomorrow if not yet seeded
  const seeded = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    'seeded_todoist_v2'
  );

  if (!seeded) {
    const now = Date.now();
    const in40Min = new Date(now + 40 * 60 * 1000).toISOString();
    const in100Min = new Date(now + 100 * 60 * 1000).toISOString();
    const in2Hours = new Date(now + 120 * 60 * 1000).toISOString();
    const in3Hours = new Date(now + 180 * 60 * 1000).toISOString();

    // Tomorrow at 10:00 AM and 2:00 PM
    const tomorrow10am = new Date(now);
    tomorrow10am.setDate(tomorrow10am.getDate() + 1);
    tomorrow10am.setHours(10, 0, 0, 0);
    const tomorrow11am = new Date(tomorrow10am.getTime() + 60 * 60 * 1000);

    const tomorrow2pm = new Date(now);
    tomorrow2pm.setDate(tomorrow2pm.getDate() + 1);
    tomorrow2pm.setHours(14, 0, 0, 0);
    const tomorrow330pm = new Date(tomorrow2pm.getTime() + 90 * 60 * 1000);

    // Next Tomorrow (+2 days) at 11:00 AM
    const nextTomorrow11am = new Date(now);
    nextTomorrow11am.setDate(nextTomorrow11am.getDate() + 2);
    nextTomorrow11am.setHours(11, 0, 0, 0);
    const nextTomorrow12pm = new Date(
      nextTomorrow11am.getTime() + 60 * 60 * 1000
    );

    const earlierStart = new Date(now - 75 * 60 * 1000).toISOString();
    const earlierDone = new Date(now - 30 * 60 * 1000).toISOString();

    // Clear old seed if user hasn't added custom tasks
    const existingCount = await db.getFirstAsync<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM tasks'
    );
    if ((existingCount?.cnt ?? 0) <= 3) {
      await db.execAsync('DELETE FROM tasks;');

      // 1. Today Urgent P1 Task
      await db.runAsync(
        `INSERT INTO tasks (
          title, notes, category, priority, scheduledStartAt, deadlineAt, status,
          actualStartedAt, lastResumedAt, accumulatedSeconds, completedAt, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        'Review quarterly tax filings & VAT receipts',
        'Verify deductible invoices and export signed PDF ledger before deadline.',
        'tax-finance',
        1,
        in40Min,
        in100Min,
        'scheduled',
        null,
        null,
        0,
        null,
        new Date(now).toISOString()
      );

      // 2. Today High P2 Task
      await db.runAsync(
        `INSERT INTO tasks (
          title, notes, category, priority, scheduledStartAt, deadlineAt, status,
          actualStartedAt, lastResumedAt, accumulatedSeconds, completedAt, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        'Prepare client sprint roadmap & deliverables',
        'Send updated milestone schedule and confirm Friday demo slot.',
        'deep-work',
        2,
        in2Hours,
        in3Hours,
        'scheduled',
        null,
        null,
        0,
        null,
        new Date(now).toISOString()
      );

      // 3. Tomorrow Task 1
      await db.runAsync(
        `INSERT INTO tasks (
          title, notes, category, priority, scheduledStartAt, deadlineAt, status,
          actualStartedAt, lastResumedAt, accumulatedSeconds, completedAt, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        'Submit contractor payout batch & bank reconciliation',
        'Double check routing numbers and tax withholding percentages.',
        'tax-finance',
        1,
        tomorrow10am.toISOString(),
        tomorrow11am.toISOString(),
        'scheduled',
        null,
        null,
        0,
        null,
        new Date(now).toISOString()
      );

      // 4. Tomorrow Task 2
      await db.runAsync(
        `INSERT INTO tasks (
          title, notes, category, priority, scheduledStartAt, deadlineAt, status,
          actualStartedAt, lastResumedAt, accumulatedSeconds, completedAt, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        'Product design sync & mobile UI walkthrough',
        'Review Todoist Today & Upcoming calendar interactions.',
        'client',
        3,
        tomorrow2pm.toISOString(),
        tomorrow330pm.toISOString(),
        'scheduled',
        null,
        null,
        0,
        null,
        new Date(now).toISOString()
      );

      // 5. Next Tomorrow (+2 days) Task
      await db.runAsync(
        `INSERT INTO tasks (
          title, notes, category, priority, scheduledStartAt, deadlineAt, status,
          actualStartedAt, lastResumedAt, accumulatedSeconds, completedAt, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        'Audit monthly cloud & software subscriptions',
        'Cancel unused seats and archive receipts in local SQLite log.',
        'operations',
        2,
        nextTomorrow11am.toISOString(),
        nextTomorrow12pm.toISOString(),
        'scheduled',
        null,
        null,
        0,
        null,
        new Date(now).toISOString()
      );

      // 6. Completed Today Task (so Activity Log shows What You've Done Today right away)
      await db.runAsync(
        `INSERT INTO tasks (
          title, notes, category, priority, scheduledStartAt, deadlineAt, status,
          actualStartedAt, lastResumedAt, accumulatedSeconds, completedAt, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        'Morning inbox zero & priority triage',
        'Cleared 18 emails and scheduled deep-work blocks for the week.',
        'inbox',
        3,
        earlierStart,
        earlierDone,
        'completed',
        earlierStart,
        null,
        42 * 60 + 18,
        earlierDone,
        earlierStart
      );
    }

    await db.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      'seeded_todoist_v2',
      'true'
    );
  }
}

export async function getSettingAsync(
  db: SQLiteDatabase,
  key: string
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setSettingAsync(
  db: SQLiteDatabase,
  key: string,
  value: string
): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    key,
    value
  );
}

export async function getAllTasksAsync(db: SQLiteDatabase): Promise<TaskRecord[]> {
  return db.getAllAsync<TaskRecord>(
    'SELECT * FROM tasks ORDER BY scheduledStartAt ASC, priority ASC'
  );
}

export async function getTaskByIdAsync(
  db: SQLiteDatabase,
  id: number
): Promise<TaskRecord | null> {
  return db.getFirstAsync<TaskRecord>('SELECT * FROM tasks WHERE id = ?', id);
}

export async function createTaskAsync(
  db: SQLiteDatabase,
  input: CreateTaskInput
): Promise<number> {
  const nowIso = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO tasks (
      title, notes, category, priority, scheduledStartAt, deadlineAt,
      status, accumulatedSeconds, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', 0, ?)`,
    input.title.trim(),
    input.notes.trim(),
    input.category,
    input.priority ?? 4,
    input.scheduledStartAt,
    input.deadlineAt,
    nowIso
  );
  return result.lastInsertRowId;
}

export async function rescheduleTaskAsync(
  db: SQLiteDatabase,
  taskId: number,
  scheduledStartAt: string,
  deadlineAt: string | null
): Promise<void> {
  await db.runAsync(
    `UPDATE tasks
     SET scheduledStartAt = ?,
         deadlineAt = ?,
         status = CASE WHEN status = 'completed' THEN 'scheduled' ELSE status END
     WHERE id = ?`,
    scheduledStartAt,
    deadlineAt,
    taskId
  );
}

export async function updateTaskNotificationsAsync(
  db: SQLiteDatabase,
  taskId: number,
  notifs: UpdateTaskNotificationsInput
): Promise<void> {
  await db.runAsync(
    `UPDATE tasks
     SET notif30Id = ?, notif15Id = ?, notif0Id = ?, notifDeadlineId = ?
     WHERE id = ?`,
    notifs.notif30Id,
    notifs.notif15Id,
    notifs.notif0Id,
    notifs.notifDeadlineId,
    taskId
  );
}

export async function startTaskNowAsync(
  db: SQLiteDatabase,
  taskId: number
): Promise<void> {
  const nowIso = new Date().toISOString();
  const task = await getTaskByIdAsync(db, taskId);
  if (!task) return;

  const actualStart = task.actualStartedAt ?? nowIso;
  await db.runAsync(
    `UPDATE tasks
     SET status = 'in_progress',
         actualStartedAt = ?,
         lastResumedAt = ?,
         notif30Id = NULL,
         notif15Id = NULL,
         notif0Id = NULL
     WHERE id = ?`,
    actualStart,
    nowIso,
    taskId
  );
}

export async function pauseTaskAsync(
  db: SQLiteDatabase,
  taskId: number
): Promise<void> {
  const task = await getTaskByIdAsync(db, taskId);
  if (!task || task.status !== 'in_progress') return;

  const nowMs = Date.now();
  const resumedMs = task.lastResumedAt ? new Date(task.lastResumedAt).getTime() : nowMs;
  const deltaSec = Math.max(0, Math.floor((nowMs - resumedMs) / 1000));
  const totalSec = (task.accumulatedSeconds || 0) + deltaSec;

  await db.runAsync(
    `UPDATE tasks
     SET status = 'paused',
         lastResumedAt = NULL,
         accumulatedSeconds = ?
     WHERE id = ?`,
    totalSec,
    taskId
  );
}

export async function resumeTaskAsync(
  db: SQLiteDatabase,
  taskId: number
): Promise<void> {
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `UPDATE tasks
     SET status = 'in_progress',
         lastResumedAt = ?
     WHERE id = ?`,
    nowIso,
    taskId
  );
}

export async function completeTaskAsync(
  db: SQLiteDatabase,
  taskId: number
): Promise<void> {
  const task = await getTaskByIdAsync(db, taskId);
  if (!task) return;

  const now = new Date();
  const nowIso = now.toISOString();
  let totalSec = task.accumulatedSeconds || 0;

  if (task.status === 'in_progress' && task.lastResumedAt) {
    const resumedMs = new Date(task.lastResumedAt).getTime();
    const deltaSec = Math.max(0, Math.floor((now.getTime() - resumedMs) / 1000));
    totalSec += deltaSec;
  }

  await db.runAsync(
    `UPDATE tasks
     SET status = 'completed',
         lastResumedAt = NULL,
         accumulatedSeconds = ?,
         completedAt = ?,
         notif30Id = NULL,
         notif15Id = NULL,
         notif0Id = NULL,
         notifDeadlineId = NULL
     WHERE id = ?`,
    totalSec,
    nowIso,
    taskId
  );
}

export async function deleteTaskAsync(
  db: SQLiteDatabase,
  taskId: number
): Promise<void> {
  await db.runAsync('DELETE FROM tasks WHERE id = ?', taskId);
}

export function computeLiveElapsedSeconds(task: TaskRecord, nowMs = Date.now()): number {
  const base = task.accumulatedSeconds || 0;
  if (task.status === 'in_progress' && task.lastResumedAt) {
    const resumedMs = new Date(task.lastResumedAt).getTime();
    const activeDelta = Math.max(0, Math.floor((nowMs - resumedMs) / 1000));
    return base + activeDelta;
  }
  return base;
}
