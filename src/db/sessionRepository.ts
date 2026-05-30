import { getDatabase } from './database';
import { MeditationSession, SessionNotes } from '../types/session';
import { getWeekStartTimestamp, getTodayStartTimestamp } from '../utils/time';

interface SessionRow {
  id: string;
  duration: number;
  date: number;
  preset_id: string | null;
  notes: string | null;
}

function rowToSession(row: SessionRow): MeditationSession {
  return {
    id: row.id,
    duration: row.duration,
    date: row.date,
    presetId: row.preset_id,
    notes: row.notes ? (JSON.parse(row.notes) as SessionNotes) : null,
  };
}

export async function insertSession(session: MeditationSession): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sessions (id, duration, date, preset_id, notes) VALUES (?, ?, ?, ?, ?)`,
    [
      session.id,
      session.duration,
      session.date,
      session.presetId ?? null,
      session.notes ? JSON.stringify(session.notes) : null,
    ]
  );
}

export async function getAllSessions(): Promise<MeditationSession[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SessionRow>(
    'SELECT * FROM sessions ORDER BY date DESC'
  );
  return rows.map(rowToSession);
}

export async function getSessionsInRange(
  startMs: number,
  endMs: number
): Promise<MeditationSession[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SessionRow>(
    'SELECT * FROM sessions WHERE date >= ? AND date <= ? ORDER BY date DESC',
    [startMs, endMs]
  );
  return rows.map(rowToSession);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
}

// --- Stats queries ---

export async function getTotalSessionCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sessions'
  );
  return result?.count ?? 0;
}

export async function getTotalMeditationMinutes(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(duration) as total FROM sessions'
  );
  return result?.total ?? 0;
}

export async function getSessionsCountThisWeek(): Promise<number> {
  const weekStart = getWeekStartTimestamp();
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sessions WHERE date >= ?',
    [weekStart]
  );
  return result?.count ?? 0;
}

export async function getAverageSessionDuration(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ avg: number | null }>(
    'SELECT AVG(duration) as avg FROM sessions'
  );
  return Math.round(result?.avg ?? 0);
}

export async function getLongestSession(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ max: number | null }>(
    'SELECT MAX(duration) as max FROM sessions'
  );
  return result?.max ?? 0;
}

/**
 * Q2 streak model with freeze auto-consumption.
 *
 * Rules:
 *  - Each session day increments streak by 1.
 *  - Every `freezeEarnRate` session days of streak → +1 freeze (no cap).
 *  - Missed days between sessions consume 1 freeze each. Streak does NOT
 *    increment for a freeze-covered day. Only the new session day itself
 *    bumps streak (by 1), in addition to consuming freezes for the gap.
 *  - If freezes are insufficient for the gap, the streak breaks and restarts
 *    at the new session day.
 *  - Days between the last session and today are also covered by freezes;
 *    if insufficient, streak is broken at the next view.
 */
export interface StreakState {
  streak: number;
  best: number;
  freezesAvailable: number;
  alive: boolean;
  lastSessionDayMs: number | null;
}

const DAY_MS = 86400000;

export async function getStreakState(freezeEarnRate: number): Promise<StreakState> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ day_start: number }>(
    `SELECT DISTINCT date / 86400000 * 86400000 as day_start
     FROM sessions ORDER BY day_start ASC`
  );
  if (rows.length === 0) {
    return { streak: 0, best: 0, freezesAvailable: 0, alive: false, lastSessionDayMs: null };
  }

  const rate = Math.max(1, Math.floor(freezeEarnRate));
  const today = getTodayStartTimestamp();
  const days = rows.map((r) => r.day_start);

  let streak = 1;
  let earned = Math.floor(streak / rate);
  let used = 0;
  let best = 1;

  const refreshEarned = () => { earned = Math.floor(streak / rate); };

  for (let i = 1; i < days.length; i++) {
    const gap = Math.round((days[i] - days[i - 1]) / DAY_MS) - 1;
    if (gap === 0) {
      streak += 1;
    } else if (gap <= earned - used) {
      used += gap;
      streak += 1;
    } else {
      streak = 1;
      used = 0;
    }
    refreshEarned();
    if (streak > best) best = streak;
  }

  // Gap from last session to today
  const lastSessionDay = days[days.length - 1];
  const daysSinceLast = Math.round((today - lastSessionDay) / DAY_MS);

  let alive = true;
  if (daysSinceLast > 1) {
    const missed = daysSinceLast - 1;
    if (missed <= earned - used) {
      used += missed;
    } else {
      streak = 0;
      alive = false;
    }
  }

  return {
    streak,
    best,
    freezesAvailable: alive ? earned - used : 0,
    alive,
    lastSessionDayMs: lastSessionDay,
  };
}

