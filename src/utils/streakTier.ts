export type StreakTier =
  | 'ember'      // 1–2
  | 'seed'       // 3–6
  | 'spark'      // 7–13
  | 'sprout'     // 14–29
  | 'bud'        // 30–59
  | 'bloom'      // 60–99
  | 'flourish'   // 100–199
  | 'radiance'   // 200–364
  | 'year'       // 365–729
  | 'aurora';    // 730+

export function streakTierFor(days: number): StreakTier {
  if (days >= 730) return 'aurora';
  if (days >= 365) return 'year';
  if (days >= 200) return 'radiance';
  if (days >= 100) return 'flourish';
  if (days >= 60)  return 'bloom';
  if (days >= 30)  return 'bud';
  if (days >= 14)  return 'sprout';
  if (days >= 7)   return 'spark';
  if (days >= 3)   return 'seed';
  return 'ember';
}

/**
 * Continuous visual parameters interpolated from streak length.
 * Pure functions of `days` so the card breathes between tier boundaries,
 * not just at named milestones.
 */
export function streakVisuals(days: number) {
  const t = Math.max(0, days);
  return {
    glowOpacity:   clamp(t / 100, 0.04, 0.42),
    borderOpacity: clamp(t / 80,  0.14, 0.80),
    sparkleCount:  Math.min(8, Math.floor(t / 30)),
    goldMix:       clamp((t - 60) / 200, 0, 1),
    flameGlow:     clamp(t / 120, 0, 0.7),
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
