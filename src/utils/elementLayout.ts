import { PresetElement } from '../types/preset';

/**
 * Relative weights for the proportional strip layout. Higher = wider share.
 * Tune here if the visual balance feels off.
 */
export const ELEMENT_WEIGHTS = {
  sound: 1,
  warmup: 3,
  infinite: 3,
  normal: 10,
} as const;

export type ElementLayoutKind = keyof typeof ELEMENT_WEIGHTS;

export function elementKind(el: PresetElement): ElementLayoutKind {
  if (el.kind === 'sound') return 'sound';
  if (el.type === 'WARMUP') return 'warmup';
  if (el.type === 'INFINITE') return 'infinite';
  return 'normal';
}

/**
 * Distribute `availableWidth` across `elements` proportionally to their weight,
 * accounting for the gaps between them. Returns one integer pixel width per
 * element in the same order. Uses largest-fractional-remainder rounding so the
 * sum matches the available width exactly.
 */
export function allocateWidths(
  elements: PresetElement[],
  availableWidth: number,
  gap: number,
): number[] {
  if (elements.length === 0) return [];
  const weights = elements.map((el) => ELEMENT_WEIGHTS[elementKind(el)]);
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const totalGaps = Math.max(0, (elements.length - 1) * gap);
  const usable = Math.max(0, availableWidth - totalGaps);

  const raw = weights.map((w) => (usable * w) / totalWeight);
  const floored = raw.map(Math.floor);
  let leftover = usable - floored.reduce((s, w) => s + w, 0);

  if (leftover > 0) {
    const order = raw
      .map((r, i) => ({ i, frac: r - Math.floor(r) }))
      .sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < leftover && k < order.length; k++) {
      floored[order[k].i] += 1;
    }
  }
  return floored;
}

/* ---------- per-kind tier breakpoints ---------- */

export type NormalTier = 'full' | 'medium' | 'small' | 'tiny' | 'block';
export function normalTier(w: number): NormalTier {
  if (w >= 140) return 'full';
  if (w >= 80) return 'medium';
  if (w >= 50) return 'small';
  if (w >= 28) return 'tiny';
  return 'block';
}

export type ShortTier = 'full' | 'emoji' | 'block';
export function warmupTier(w: number): ShortTier {
  if (w >= 55) return 'full';
  if (w >= 28) return 'emoji';
  return 'block';
}
export function infiniteTier(w: number): ShortTier {
  return warmupTier(w);
}

export type SoundTier = 'emoji' | 'line';
export function soundTier(w: number): SoundTier {
  return w >= 18 ? 'emoji' : 'line';
}
