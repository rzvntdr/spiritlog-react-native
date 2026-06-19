/**
 * Growth model: maps a streak length (in days) to a normalized maturity
 * value in [0, 1], where 0 = freshly planted seed and 1 = fully grown tree.
 *
 * The cadence is intentionally non-linear (designed with the product spec):
 *   - days 0..14    : a growth "tick" every day   (sprout barely emerges)
 *   - days 14..195  : a tick every 2 days         (~6 months, young sapling)
 *   - days 195..560 : a tick every 3 days         (~+1 year, young tree)
 *   - days 560+     : a tick every 4 days          (matures slowly)
 * The tree reaches full maturity around day MAX_DAY (~4.5 years).
 *
 * Because ticks accumulate ever more slowly, maturity decelerates naturally
 * over real time: lots of visible early feedback, then a long, slow approach
 * to the cap. Everything here is a tunable constant.
 */

export const GROWTH = {
  phase1End: 14, // daily ticks until here
  phase2End: 195, // every-2-day ticks until here (~6 months)
  phase3End: 560, // every-3-day ticks until here (~+1 year)
  maxDay: 1640, // full maturity (~4.5 years)
} as const;

/** Cumulative number of growth "ticks" accrued by a given streak day. */
export function growthTicks(day: number): number {
  const d = Math.max(0, Math.floor(day));
  if (d <= GROWTH.phase1End) {
    return d; // 1 tick/day
  }
  if (d <= GROWTH.phase2End) {
    return GROWTH.phase1End + Math.floor((d - GROWTH.phase1End) / 2);
  }
  const p2 = GROWTH.phase1End + Math.floor((GROWTH.phase2End - GROWTH.phase1End) / 2);
  if (d <= GROWTH.phase3End) {
    return p2 + Math.floor((d - GROWTH.phase2End) / 3);
  }
  const p3 = p2 + Math.floor((GROWTH.phase3End - GROWTH.phase2End) / 3);
  return p3 + Math.floor((d - GROWTH.phase3End) / 4);
}

/** Ticks accrued at full maturity — used to normalize. (~495) */
export const MAX_TICKS = growthTicks(GROWTH.maxDay);

/** Normalized maturity in [0, 1]. Monotonic non-decreasing, capped at 1. */
export function maturity(streakDays: number): number {
  return Math.min(1, growthTicks(streakDays) / MAX_TICKS);
}

/** Human-readable life stage, for labels / haptics / milestone celebrations. */
export type Stage = 'seed' | 'sprout' | 'sapling' | 'young' | 'maturing' | 'mature';

export function stageOf(streakDays: number): Stage {
  const m = maturity(streakDays);
  if (streakDays <= 0) return 'seed';
  if (m < 0.05) return 'sprout';
  if (m < 0.22) return 'sapling';
  if (m < 0.5) return 'young';
  if (m < 1) return 'maturing';
  return 'mature';
}
