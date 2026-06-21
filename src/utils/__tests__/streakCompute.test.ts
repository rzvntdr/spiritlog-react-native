import {
  DAY_MS,
  StreakState,
  applyRateChange,
  applySession,
  advanceToDay,
  computeStreak,
  emptyCheckpoint,
  rebuildFromHistory,
  toStreakState,
} from '../streakCompute';

/** day index → day-start ms */
const D = (n: number) => n * DAY_MS;

/**
 * Reference implementation: the ORIGINAL from-scratch streak reduction, kept
 * here so we can prove the new checkpoint model produces identical read-time
 * results across random histories.
 */
function referenceComputeStreak(
  dayStarts: number[],
  freezeEarnRate: number,
  todayStart: number,
): StreakState {
  if (dayStarts.length === 0) {
    return { streak: 0, best: 0, freezesAvailable: 0, alive: false, lastSessionDayMs: null };
  }
  const rate = Math.max(1, Math.floor(freezeEarnRate));
  const days = Array.from(new Set(dayStarts)).sort((a, b) => a - b);

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

describe('rebuildFromHistory / computeStreak', () => {
  it('empty history → zeroed state', () => {
    const cp = rebuildFromHistory([], 10, D(100));
    expect(toStreakState(cp)).toEqual({
      streak: 0,
      best: 0,
      freezesAvailable: 0,
      alive: false,
      lastSessionDayMs: null,
    });
  });

  it('single session today → streak 1, no freezes', () => {
    const s = computeStreak([D(100)], 10, D(100));
    expect(s.streak).toBe(1);
    expect(s.best).toBe(1);
    expect(s.freezesAvailable).toBe(0);
    expect(s.alive).toBe(true);
  });

  it('consecutive days accrue streak; earns a freeze every `rate` days', () => {
    const days = [D(1), D(2), D(3), D(4)]; // rate 2
    const s = computeStreak(days, 2, D(4));
    expect(s.streak).toBe(4);
    expect(s.best).toBe(4);
    expect(s.freezesAvailable).toBe(2); // floor(4/2)
    expect(s.alive).toBe(true);
  });

  it('a gap is covered by an earned freeze (streak survives, no bump for the gap)', () => {
    // rate 2: days 1,2,3 earn 1 freeze; skip day 4; session day 5 covered.
    const s = computeStreak([D(1), D(2), D(3), D(5)], 2, D(6));
    expect(s.streak).toBe(4); // 1,2,3, +5 (4 is freeze-covered, no bump)
    expect(s.freezesAvailable).toBe(1);
    expect(s.alive).toBe(true);
  });

  it('a gap larger than available freezes breaks and restarts the run', () => {
    // rate 2: days 1,2 earn 1 freeze; skip 3 AND 4 (2 missed) > 1 → break, restart at 5.
    const s = computeStreak([D(1), D(2), D(5)], 2, D(6));
    expect(s.streak).toBe(1);
    expect(s.best).toBe(2);
    expect(s.freezesAvailable).toBe(0);
    expect(s.alive).toBe(true);
  });

  it('missed days up to today are freeze-covered while affordable', () => {
    // rate 2: days 1,2 → 1 freeze. today = day 4 (skip day 3, 1 missed ≤ 1).
    const s = computeStreak([D(1), D(2)], 2, D(4));
    expect(s.streak).toBe(2);
    expect(s.freezesAvailable).toBe(0);
    expect(s.alive).toBe(true);
  });

  it('today-gap that outruns freezes marks the streak broken', () => {
    // rate 2: days 1,2 → 1 freeze. today = day 5 (skip 3,4 → 2 missed > 1) → broken.
    const s = computeStreak([D(1), D(2)], 2, D(5));
    expect(s.streak).toBe(0);
    expect(s.alive).toBe(false);
    expect(s.freezesAvailable).toBe(0);
    expect(s.best).toBe(2);
  });

  it('matches the reference implementation across random histories (fuzz)', () => {
    let seed = 1234567;
    const rand = () => {
      // deterministic LCG so failures reproduce
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let iter = 0; iter < 2000; iter++) {
      const rate = 1 + Math.floor(rand() * 12);
      const n = Math.floor(rand() * 25);
      let day = 1 + Math.floor(rand() * 5);
      const days: number[] = [];
      for (let i = 0; i < n; i++) {
        days.push(D(day));
        day += 1 + Math.floor(rand() * 6); // 1..6 day steps (some create gaps)
      }
      const lastDay = days.length ? days[days.length - 1] / DAY_MS : day;
      const today = D(lastDay + Math.floor(rand() * 5)); // today on/after last session

      const got = computeStreak(days, rate, today);
      const ref = referenceComputeStreak(days, rate, today);
      expect({ days, rate, today, got }).toEqual({ days, rate, today, got: ref });
    }
  });
});

describe('applySession (incremental) equals rebuildFromHistory', () => {
  it('folding applySession over days matches a full rebuild', () => {
    const days = [D(1), D(2), D(4), D(5), D(6), D(10), D(11)];
    const rate = 3;
    const today = D(12);

    let cp = emptyCheckpoint(rate, today);
    for (const d of days) cp = applySession(cp, d, rate);
    cp = advanceToDay(cp, today, rate);

    const rebuilt = rebuildFromHistory(days, rate, today);
    expect(toStreakState(cp)).toEqual(toStreakState(rebuilt));
  });

  it('duplicate same-day session does not change the streak', () => {
    const rate = 5;
    let cp = emptyCheckpoint(rate, D(10));
    cp = applySession(cp, D(10), rate);
    const after = applySession(cp, D(10), rate);
    expect(after.streak).toBe(cp.streak);
    expect(after.freezeBalance).toBe(cp.freezeBalance);
  });
});

describe('advanceToDay', () => {
  it('is additive: A→B→C equals A→C', () => {
    const base = rebuildFromHistory([D(1), D(2), D(3)], 3, D(3)); // some freezes banked
    const direct = advanceToDay(base, D(9), 3);
    const stepwise = advanceToDay(advanceToDay(base, D(6), 3), D(9), 3);
    expect(toStreakState(stepwise)).toEqual(toStreakState(direct));
  });

  it('breaks the run once missed days exceed the freeze balance', () => {
    const base = rebuildFromHistory([D(1), D(2)], 2, D(2)); // 1 freeze, streak 2
    const broken = advanceToDay(base, D(6), 2); // many missed days
    expect(broken.streak).toBe(0);
    expect(broken.freezeBalance).toBe(0);
  });
});

describe('applyRateChange — no retroactive rewrite', () => {
  it('lowering the rate converts accumulated progress into freezes (9 → +1, progress 4)', () => {
    // Build a run of 9 consecutive days at rate 10: progress 9, balance 0.
    const days = Array.from({ length: 9 }, (_, i) => D(i + 1));
    const cp = rebuildFromHistory(days, 10, D(9));
    expect(cp.streak).toBe(9);
    expect(cp.freezeBalance).toBe(0);
    expect(cp.freezeProgress).toBe(9);

    const changed = applyRateChange(cp, 5, D(9));
    expect(changed.streak).toBe(9); // streak untouched
    expect(changed.freezeBalance).toBe(1); // 9 >= 5 → +1
    expect(changed.freezeProgress).toBe(4); // 9 - 5
    expect(changed.rate).toBe(5);
  });

  it('raising the rate keeps streak + balance, just delays the next freeze', () => {
    const days = Array.from({ length: 12 }, (_, i) => D(i + 1)); // rate 5 → 2 freezes, progress 2
    const cp = rebuildFromHistory(days, 5, D(12));
    expect(cp.freezeBalance).toBe(2);
    expect(cp.freezeProgress).toBe(2);

    const changed = applyRateChange(cp, 20, D(12));
    expect(changed.streak).toBe(cp.streak); // unchanged
    expect(changed.freezeBalance).toBe(2); // progress 2 < 20 → no conversion
    expect(changed.freezeProgress).toBe(2);
    expect(changed.rate).toBe(20);
  });

  it('the displayed streak/freezes do not move at the instant of the change', () => {
    const days = [D(1), D(2), D(3), D(5), D(6)]; // some gaps + freezes
    const today = D(6);
    const before = computeStreak(days, 4, today);

    const cp = rebuildFromHistory(days, 4, today);
    const after = toStreakState(applyRateChange(cp, 7, today));
    expect(after.streak).toBe(before.streak);
    expect(after.best).toBe(before.best);
    // balance can only grow (never shrink) from a rate change at the moment of change
    expect(after.freezesAvailable).toBeGreaterThanOrEqual(before.freezesAvailable);
  });
});
