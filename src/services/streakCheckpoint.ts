import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStreakDayStarts } from '../db/sessionRepository';
import { getTodayStartTimestamp } from '../utils/time';
import {
  DAY_MS,
  StreakCheckpoint,
  StreakState,
  advanceToDay,
  applyRateChange,
  applySession,
  rebuildFromHistory,
  toStreakState,
} from '../utils/streakCompute';
import { createLogger } from '../utils/logger';

const log = createLogger('streak');

const CHECKPOINT_KEY = '@spiritlog_streak_checkpoint';

/**
 * Serialize all checkpoint operations. The checkpoint is read-modify-write state
 * in AsyncStorage; concurrent callers (e.g. 3 parallel `loadStats` at boot, or a
 * read overlapping a session insert) would otherwise race and clobber each other
 * — and all migrate from history at once. Chaining them keeps it consistent.
 */
let opChain: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = opChain.then(fn, fn);
  opChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Persisted streak checkpoint — the single source of truth for current streak /
 * freezes. The app maintains it incrementally (session add / rate change) and
 * rebuilds it from history on edit/delete/restore. The home-screen widget reads
 * it directly (DB-free) and projects to "now".
 *
 * Why a checkpoint instead of recomputing from history every time:
 *  - Changing the freeze earn rate must NOT rewrite past history — the checkpoint
 *    seals the rate at the moment of change (see `applyRateChange`).
 *  - The widget can refresh at midnight without opening the DB.
 */

function normRate(rate: number): number {
  return Math.max(1, Math.floor(rate));
}

/** Bucket a raw session timestamp to a UTC day-start, matching the DB query
 *  (`date / 86400000 * 86400000`, i.e. floor). Keeps the incremental
 *  `applySession` path consistent with a full `rebuildFromHistory`. */
function toSessionDay(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

export async function loadCheckpoint(): Promise<StreakCheckpoint | null> {
  try {
    const raw = await AsyncStorage.getItem(CHECKPOINT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StreakCheckpoint;
  } catch (e) {
    log.warn('loadCheckpoint failed', e);
    return null;
  }
}

export async function saveCheckpoint(cp: StreakCheckpoint): Promise<void> {
  try {
    await AsyncStorage.setItem(CHECKPOINT_KEY, JSON.stringify(cp));
  } catch (e) {
    log.warn('saveCheckpoint failed', e);
  }
}

/** Drop the checkpoint so the next read rebuilds it from history. Use after a
 *  bulk change the incremental ops can't track (e.g. backup restore). */
export async function clearCheckpoint(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHECKPOINT_KEY);
  } catch (e) {
    log.warn('clearCheckpoint failed', e);
  }
}

/**
 * Load the checkpoint, creating it from full history on first run (migration)
 * and reconciling its sealed rate with the user's current setting. Settings is
 * authoritative for the rate: if it differs from the checkpoint, that's a rate
 * change → seal under the old rate and switch (`applyRateChange`).
 */
async function loadReconciled(rate: number): Promise<StreakCheckpoint> {
  const today = getTodayStartTimestamp();
  let cp = await loadCheckpoint();

  if (!cp) {
    const days = await getStreakDayStarts();
    cp = rebuildFromHistory(days, rate, today);
    await saveCheckpoint(cp);
    log.debug('checkpoint migrated from history', { streak: cp.streak, freezes: cp.freezeBalance });
    return cp;
  }

  if (cp.rate !== normRate(rate)) {
    cp = applyRateChange(cp, rate, today);
    await saveCheckpoint(cp);
    log.debug('rate change sealed', { rate: cp.rate, streak: cp.streak, freezes: cp.freezeBalance });
  }
  return cp;
}

/** Live read for the app: reconcile rate, project to today, persist if advanced. */
export function getStreakState(rate: number): Promise<StreakState> {
  return serialize(async () => {
    const cp = await loadReconciled(rate);
    const advanced = advanceToDay(cp, getTodayStartTimestamp(), cp.rate);
    if (
      advanced.asOfDayMs !== cp.asOfDayMs ||
      advanced.streak !== cp.streak ||
      advanced.freezeBalance !== cp.freezeBalance
    ) {
      await saveCheckpoint(advanced);
    }
    return toStreakState(advanced);
  });
}

/** A session was saved — advance the checkpoint forward (preserves the sealed
 *  rate; no full rebuild). */
export function onSessionAdded(sessionDateMs: number, rate: number): Promise<StreakState> {
  return serialize(async () => {
    const cp = await loadReconciled(rate);
    const next = applySession(cp, toSessionDay(sessionDateMs), cp.rate);
    await saveCheckpoint(next);
    return toStreakState(advanceToDay(next, getTodayStartTimestamp(), next.rate));
  });
}

/** Sessions changed in a way we can't apply incrementally (delete / edit /
 *  backup restore) — rebuild from history. Uses the current rate over all
 *  history (accepted: a delete after a rate change won't preserve rate-history). */
export function onSessionsRebuilt(rate: number): Promise<StreakState> {
  return serialize(async () => {
    const days = await getStreakDayStarts();
    const cp = rebuildFromHistory(days, rate, getTodayStartTimestamp());
    await saveCheckpoint(cp);
    log.debug('checkpoint rebuilt', { streak: cp.streak, freezes: cp.freezeBalance });
    return toStreakState(cp);
  });
}

/**
 * Read for the widget headless task: DB-free. Returns null if no checkpoint has
 * been created yet (app hasn't run since install) so the caller can fall back.
 */
export function getWidgetStreakState(): Promise<StreakState | null> {
  return serialize(async () => {
    const cp = await loadCheckpoint();
    if (!cp) return null;
    const advanced = advanceToDay(cp, getTodayStartTimestamp(), cp.rate);
    if (advanced.asOfDayMs !== cp.asOfDayMs || advanced.streak !== cp.streak) {
      await saveCheckpoint(advanced);
    }
    return toStreakState(advanced);
  });
}
