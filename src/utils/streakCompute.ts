/**
 * Pure streak math (Q2 model with freeze auto-consumption), expressed as an
 * incrementally-advanceable **checkpoint** instead of a from-scratch reduction.
 *
 * Why a checkpoint: the freeze earn rate must NOT rewrite history when the user
 * changes it. We seal the current state into a checkpoint and apply the new rate
 * only going forward. The same checkpoint is what the home-screen widget reads +
 * projects to "now" without re-querying the whole session history.
 *
 * Model (running balance, equivalent to the old `earned - used`):
 *  - Each session day: streak += 1; progress += 1; every `rate` progress → +1
 *    freeze (progress -= rate).
 *  - Missed days between sessions / up to today consume 1 freeze each; the streak
 *    does NOT increment for a covered day.
 *  - If freezes can't cover a gap, the run breaks (streak → 0 / restarts at the
 *    next session) and any unused freezes are lost.
 *
 * Everything here is pure + I/O-free so it can be unit-tested in isolation.
 */

export const DAY_MS = 86400000;

/** Read-time view used by the UI / widget. */
export interface StreakState {
  streak: number;
  best: number;
  freezesAvailable: number;
  alive: boolean;
  lastSessionDayMs: number | null;
}

/**
 * Sealed, incrementally-advanceable streak state.
 * `asOfDayMs` is the day this snapshot is current as of; project forward with
 * {@link advanceToDay} (which bakes in missed-day freeze consumption).
 */
export interface StreakCheckpoint {
  /** UTC day-start this checkpoint reflects state as of. */
  asOfDayMs: number;
  /** Current streak length (0 when broken / no sessions). */
  streak: number;
  /** Spendable freezes (earned − used). */
  freezeBalance: number;
  /** Days accumulated toward the next freeze (0 ≤ progress < rate, normally). */
  freezeProgress: number;
  /** Best streak ever — never decreases. */
  best: number;
  /** Last day that actually had a session (≤ asOfDayMs); null if no sessions. */
  lastSessionDayMs: number | null;
  /** Earn rate in force from this checkpoint forward. */
  rate: number;
}

function dayDiff(a: number, b: number): number {
  return Math.round((a - b) / DAY_MS);
}

function toDayStart(ms: number): number {
  return Math.round(ms / DAY_MS) * DAY_MS;
}

function normRate(rate: number): number {
  return Math.max(1, Math.floor(rate));
}

export function emptyCheckpoint(rate: number, asOfDayMs: number): StreakCheckpoint {
  return {
    asOfDayMs: toDayStart(asOfDayMs),
    streak: 0,
    freezeBalance: 0,
    freezeProgress: 0,
    best: 0,
    lastSessionDayMs: null,
    rate: normRate(rate),
  };
}

/**
 * Count of fully-passed days with no session when day `toDayMs` is the current
 * (ongoing) day. The ongoing day itself is not counted — you can still meditate.
 * If `asOfDayMs` was itself a session day, it isn't a missed day either.
 */
function missedBefore(cp: StreakCheckpoint, toDayMs: number): number {
  const daysPassed = dayDiff(toDayMs, cp.asOfDayMs);
  if (daysPassed <= 0) return 0;
  const asOfHadSession =
    cp.lastSessionDayMs !== null && cp.lastSessionDayMs === cp.asOfDayMs;
  return Math.max(0, daysPassed - (asOfHadSession ? 1 : 0));
}

function earn(cp: StreakCheckpoint, rate: number): void {
  while (cp.freezeProgress >= rate) {
    cp.freezeBalance += 1;
    cp.freezeProgress -= rate;
  }
}

function addAliveDay(cp: StreakCheckpoint, rate: number): void {
  cp.streak += 1;
  cp.freezeProgress += 1;
  earn(cp, rate);
  if (cp.streak > cp.best) cp.best = cp.streak;
}

function startFreshRun(cp: StreakCheckpoint, rate: number): void {
  cp.streak = 1;
  cp.freezeBalance = 0; // unused freezes are lost on a break
  cp.freezeProgress = 1;
  earn(cp, rate); // rate === 1 earns immediately
  if (cp.streak > cp.best) cp.best = cp.streak;
}

/**
 * Apply a session on `sessionDayMs`. Consumes freezes for any missed days since
 * the last session; if they can't be covered the run restarts at this day.
 * Restores the invariant `asOfDayMs === lastSessionDayMs` on return.
 */
export function applySession(
  cp: StreakCheckpoint,
  sessionDayMs: number,
  rate?: number,
): StreakCheckpoint {
  const r = normRate(rate ?? cp.rate);
  const sDay = toDayStart(sessionDayMs);
  const next: StreakCheckpoint = { ...cp, rate: r };

  if (next.lastSessionDayMs === null) {
    startFreshRun(next, r);
    next.lastSessionDayMs = sDay;
    next.asOfDayMs = sDay;
    return next;
  }
  if (sDay <= next.lastSessionDayMs) {
    // duplicate same-day session (or out-of-order) — no streak change
    return next;
  }

  const missed = missedBefore(next, sDay);
  if (missed <= next.freezeBalance) {
    next.freezeBalance -= missed;
    addAliveDay(next, r);
  } else {
    startFreshRun(next, r);
  }
  next.lastSessionDayMs = sDay;
  next.asOfDayMs = sDay;
  return next;
}

/**
 * Project the checkpoint forward to `toDayMs` (no new sessions), baking in
 * missed-day freeze consumption. Idempotent + additive: advancing A→B→C equals
 * A→C. Safe to call on read (transient) or to persist.
 */
export function advanceToDay(
  cp: StreakCheckpoint,
  toDayMs: number,
  rate?: number,
): StreakCheckpoint {
  const r = normRate(rate ?? cp.rate);
  const tDay = toDayStart(toDayMs);
  const next: StreakCheckpoint = { ...cp, rate: r };

  if (next.lastSessionDayMs === null) {
    if (tDay > next.asOfDayMs) next.asOfDayMs = tDay;
    return next;
  }
  if (tDay <= next.asOfDayMs) return next;

  const missed = missedBefore(next, tDay);
  if (next.streak > 0 && missed <= next.freezeBalance) {
    next.freezeBalance -= missed;
  } else if (missed > 0) {
    // run broke — streak gone, unused freezes lost; lastSessionDayMs preserved
    next.streak = 0;
    next.freezeBalance = 0;
    next.freezeProgress = 0;
  }
  next.asOfDayMs = tDay;
  return next;
}

/**
 * Seal the current state under the OLD rate, then switch to `newRate` going
 * forward. Accumulated `freezeProgress` is converted at the new rate (e.g. 9/10
 * → switch to 5 → +1 freeze, progress 4), so lowering the rate can immediately
 * grant freezes. History before the change is untouched.
 */
export function applyRateChange(
  cp: StreakCheckpoint,
  newRate: number,
  todayStartMs: number,
): StreakCheckpoint {
  const nr = normRate(newRate);
  const sealed = advanceToDay(cp, todayStartMs, cp.rate);
  const next: StreakCheckpoint = { ...sealed, rate: nr };
  if (next.streak > 0) {
    earn(next, nr);
  } else {
    next.freezeProgress = 0;
  }
  return next;
}

/**
 * Rebuild a checkpoint from the full session history (distinct day-starts).
 * Used to bootstrap/migrate existing users and to recover after a session is
 * edited/deleted. Equivalent to folding {@link applySession} over the sorted
 * days then projecting to today.
 */
export function rebuildFromHistory(
  dayStarts: number[],
  rate: number,
  todayStartMs: number,
): StreakCheckpoint {
  const r = normRate(rate);
  const days = Array.from(new Set(dayStarts.map(toDayStart))).sort((a, b) => a - b);
  let cp = emptyCheckpoint(r, todayStartMs);
  for (const d of days) {
    cp = applySession(cp, d, r);
  }
  return advanceToDay(cp, todayStartMs, r);
}

/** Adapt a checkpoint to the read-time {@link StreakState} the UI consumes. */
export function toStreakState(cp: StreakCheckpoint): StreakState {
  const alive = cp.streak > 0;
  return {
    streak: cp.streak,
    best: cp.best,
    freezesAvailable: alive ? cp.freezeBalance : 0,
    alive,
    lastSessionDayMs: cp.lastSessionDayMs,
  };
}

/**
 * Backward-compatible entry point: full-history → read-time state. Behaviour is
 * identical to the previous implementation (covered by unit tests), so existing
 * callers (`getStreakState`) keep working unchanged.
 */
export function computeStreak(
  dayStarts: number[],
  freezeEarnRate: number,
  todayStart: number,
): StreakState {
  return toStreakState(rebuildFromHistory(dayStarts, freezeEarnRate, todayStart));
}
