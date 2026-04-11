import { MeditationSession } from '../types/session';

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Build a map of "YYYY-MM-DD" -> total minutes for a given month.
 * Used by CalendarHeatmap.
 */
export function buildMonthHeatmapData(
  sessions: MeditationSession[],
  month: Date
): Map<string, number> {
  const year = month.getFullYear();
  const m = month.getMonth();
  const startMs = new Date(year, m, 1).getTime();
  const endMs = new Date(year, m + 1, 1).getTime();

  const map = new Map<string, number>();
  for (const s of sessions) {
    if (s.date >= startMs && s.date < endMs) {
      const key = dateKey(new Date(s.date));
      map.set(key, (map.get(key) ?? 0) + s.duration);
    }
  }
  return map;
}
