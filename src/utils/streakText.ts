/**
 * Streak subtitle template interpolation.
 *
 * Supported placeholders:
 *   {streak}    current streak (days)
 *   {best}      all-time best streak (days)
 *   {hours}     total practice — "12h 30m" style
 *   {sessions}  total session count
 *   {freezes}   freezes available right now
 *
 * If `template` is null, returns the default "{N} DAY[S] IN A ROW".
 */
export interface StreakStats {
  streak: number;
  best: number;
  totalMinutes: number;
  totalSessions: number;
  freezesAvailable: number;
}

function formatHours(minutes: number): string {
  if (minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function renderStreakText(template: string | null, stats: StreakStats): string {
  if (template === null) {
    return stats.streak === 1 ? 'DAY IN A ROW' : 'DAYS IN A ROW';
  }
  return template
    .replace(/\{streak\}/g, String(stats.streak))
    .replace(/\{best\}/g, String(stats.best))
    .replace(/\{hours\}/g, formatHours(stats.totalMinutes))
    .replace(/\{sessions\}/g, String(stats.totalSessions))
    .replace(/\{freezes\}/g, String(stats.freezesAvailable));
}

/** Suggested presets the user can tap to fill the input. */
export const STREAK_TEXT_PRESETS: { label: string; template: string }[] = [
  { label: 'Default',  template: '' }, // empty → null = default
  { label: 'Strong',   template: '{streak} DAYS STRONG' },
  { label: 'Compact',  template: '🔥 day {streak}' },
  { label: 'Best ever',template: '{streak} / {best} best' },
  { label: 'Total',    template: '{streak} days · {hours} total' },
];
