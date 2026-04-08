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
      session.presetId,
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

export async function getCurrentStreak(): Promise<number> {
  const db = await getDatabase();
  // Get all unique session dates (as day timestamps) for the last 365 days
  const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const rows = await db.getAllAsync<{ day_start: number }>(
    `SELECT DISTINCT date / 86400000 * 86400000 as day_start
     FROM sessions WHERE date >= ?
     ORDER BY day_start DESC`,
    [yearAgo]
  );

  if (rows.length === 0) return 0;

  const todayStart = getTodayStartTimestamp();
  const yesterdayStart = todayStart - 86400000;
  const oneDayMs = 86400000;

  // Streak must start from today or yesterday
  const firstDay = rows[0].day_start;
  if (firstDay < yesterdayStart) return 0;

  let streak = 1;
  for (let i = 1; i < rows.length; i++) {
    const expected = rows[i - 1].day_start - oneDayMs;
    if (rows[i].day_start === expected) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
