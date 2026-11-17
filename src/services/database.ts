import type { SQLiteDatabase } from 'expo-sqlite';

export type TaskStatus = 'scheduled' | 'in_progress' | 'paused' | 'completed';

export interface TaskRecord {
  id: number;
  title: string;
  notes: string;
  category: string;
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
      category TEXT NOT NULL DEFAULT 'deep-work',
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

  // Seed initial sample tasks if the database is brand new so the user sees a rich timeline immediately
  const seeded = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    'seeded_v1'
  );

  if (!seeded) {
    const now = Date.now();
    const in45Min = new Date(now + 45 * 60 * 1000).toISOString();
    const in105Min = new Date(now + 105 * 60 * 1000).toISOString();
    const in2Hours = new Date(now + 120 * 60 * 1000).toISOString();
    const in3Hours = new Date(now + 180 * 60 * 1000).toISOString();
    const earlierStart = new Date(now - 90 * 60 * 1000).toISOString();
    const earlierDone = new Date(now - 52 * 60 * 1000).toISOString();

    await db.runAsync(
      `INSERT INTO tasks (
        title, notes, category, scheduledStartAt, deadlineAt, status,
        actualStartedAt, lastResumedAt, accumulatedSeconds, completedAt, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'Q4 Tax Filing & Expense Reconciliation',
      'Cross-check Stripe payouts, contractor invoices, and quarterly deduction receipts before closing the ledger.',
      'tax-finance',
      in45Min,
      in105Min,
      'scheduled',
      null,
      null,
      0,
      null,
      new Date(now).toISOString()
    );

    await db.runAsync(
      `INSERT INTO tasks (
        title, notes, category, scheduledStartAt, deadlineAt, status,
        actualStartedAt, lastResumedAt, accumulatedSeconds, completedAt, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'Architecture Review & API Contract Sign-off',
      'Finalize SQLite offline schema and review notification cadence intervals with mobile team.',
      'deep-work',
      in2Hours,
      in3Hours,
      'scheduled',
      null,
      null,
      0,
      null,
      new Date(now).toISOString()
    );

    await db.runAsync(
      `INSERT INTO tasks (
        title, notes, category, scheduledStartAt, deadlineAt, status,
        actualStartedAt, lastResumedAt, accumulatedSeconds, completedAt, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'Morning Payroll & Vendor Audit',
      'Verified recurring software subscriptions and cleared pending reimbursement receipts.',
      'operations',
      earlierStart,
      earlierDone,
      'completed',
      earlierStart,
      null,
      38 * 60 + 14,
      earlierDone,
      earlierStart
    );

    await db.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      'seeded_v1',
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
    'SELECT * FROM tasks ORDER BY scheduledStartAt ASC'
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
      title, notes, category, scheduledStartAt, deadlineAt,
      status, accumulatedSeconds, createdAt
    ) VALUES (?, ?, ?, ?, ?, 'scheduled', 0, ?)`,
    input.title.trim(),
    input.notes.trim(),
    input.category,
    input.scheduledStartAt,
    input.deadlineAt,
    nowIso
  );
  return result.lastInsertRowId;
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
