import { getDatabase } from './database';
import { MeditationSession, SessionNotes } from '../types/session';
import { getWeekStartTimestamp, getTodayStartTimestamp } from '../utils/time';
import { computeStreak, StreakState } from '../utils/streakCompute';

export type { StreakState };

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

/** Q2 streak model. Fetches distinct session days; math is in `computeStreak`. */
export async function getStreakState(freezeEarnRate: number): Promise<StreakState> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ day_start: number }>(
    `SELECT DISTINCT date / 86400000 * 86400000 as day_start
     FROM sessions ORDER BY day_start ASC`
  );
  return computeStreak(rows.map((r) => r.day_start), freezeEarnRate, getTodayStartTimestamp());
}

