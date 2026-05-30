import { StreakTier } from '../../../utils/streakTier';
import { ThemeColors } from '../../../theme/tokens';

/**
 * Contract every streak-art renderer obeys. The art fills the StreakHero
 * card background; the parent overlays the number + subtitle on top.
 *
 * To add a new style:
 *   1. Add an id to `StreakArtStyle` below.
 *   2. Implement a component matching `StreakArtProps`.
 *   3. Register it in `index.tsx` (`STREAK_ART_REGISTRY`).
 *   4. Add the option to the Settings picker.
 */
export type StreakArtStyle = 'classic' | 'plant';

export interface StreakArtProps {
  tier: StreakTier;
  /** Streak length in days — useful for finer-grained visuals than just tier. */
  days: number;
  c: ThemeColors;
}

export interface StreakArtMeta {
  id: StreakArtStyle;
  label: string;
  description: string;
}
