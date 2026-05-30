import React from 'react';
import { StreakArtProps, StreakArtStyle, StreakArtMeta } from './types';
import ClassicArt from './ClassicArt';
import PlantArt from './PlantArt';

/**
 * Registry of streak-art renderers. Adding a new style = add a row here.
 * Order here drives the order shown in the Settings picker.
 */
const REGISTRY: Record<StreakArtStyle, { component: React.FC<StreakArtProps>; meta: StreakArtMeta }> = {
  classic: {
    component: ClassicArt,
    meta: {
      id: 'classic',
      label: 'Classic',
      description: 'Soft glow + sparkles',
    },
  },
  plant: {
    component: PlantArt,
    meta: {
      id: 'plant',
      label: 'Plant',
      description: 'A plant that grows with your streak',
    },
  },
};

export function getStreakArt(style: StreakArtStyle): React.FC<StreakArtProps> {
  return REGISTRY[style]?.component ?? ClassicArt;
}

export function listStreakArtStyles(): StreakArtMeta[] {
  return Object.values(REGISTRY).map((r) => r.meta);
}

export type { StreakArtStyle } from './types';
