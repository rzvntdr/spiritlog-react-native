/**
 * Pure streak math (Q2 model with freeze auto-consumption).
 *
 * Extracted from the DB layer so it can be unit-tested in isolation: it takes
 * the distinct session-day timestamps (day starts, ascending) plus the freeze
 * earn rate and "today", and returns the streak state. No I/O.
 *
 * Rules:
 *  - Each session day increments the streak by 1.
 *  - Every `freezeEarnRate` streak days earns +1 freeze (no cap).
 *  - Missed days between two sessions consume 1 freeze each; the streak does
 *    NOT increment for a freeze-covered day — only the new session day bumps it.
 *  - If freezes are insufficient for the gap, the streak breaks and restarts at
 *    the new session day.
 *  - Days between the last session and `today` are also freeze-covered; if
 *    insufficient, the streak is considered broken (alive = false).
 */

export const DAY_MS = 86400000;

export interface StreakState {
  streak: number;
  best: number;
  freezesAvailable: number;
  alive: boolean;
  lastSessionDayMs: number | null;
}

export function computeStreak(
  dayStarts: number[],
  freezeEarnRate: number,
  todayStart: number,
): StreakState {
  if (dayStarts.length === 0) {
    return { streak: 0, best: 0, freezesAvailable: 0, alive: false, lastSessionDayMs: null };
  }

  const rate = Math.max(1, Math.floor(freezeEarnRate));
  const days = [...dayStarts].sort((a, b) => a - b);

  let streak = 1;
  let earned = Math.floor(streak / rate);
  let used = 0;
  let best = 1;

  const refreshEarned = () => {
    earned = Math.floor(streak / rate);
  };

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

  const lastSessionDay = days[days.length - 1];
  const daysSinceLast = Math.round((todayStart - lastSessionDay) / DAY_MS);

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
