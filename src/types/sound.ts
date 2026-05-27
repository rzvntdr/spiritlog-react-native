export interface SoundAsset {
  id: number;
  name: string;
  file: string;
  category: 'effect' | 'ambient';
  emoji: string;
}

export const SOUNDS: SoundAsset[] = [
  { id: 1, name: 'Bell',       file: 'bell.mp3',           category: 'effect',  emoji: '🔔' },
  { id: 2, name: 'Swoosh',     file: 'swoosh.mp3',          category: 'effect',  emoji: '💨' },
  { id: 3, name: 'Drone',      file: 'drone.mp3',           category: 'effect',  emoji: '🎶' },
  { id: 4, name: 'Bird',       file: 'bird_sing.mp3',       category: 'effect',  emoji: '🐦' },
  { id: 5, name: 'Bark',       file: 'bark.wav',            category: 'effect',  emoji: '🐕' },
  { id: 6, name: 'Rar',        file: 'distorted_rar.mp3',   category: 'effect',  emoji: '⚡' },
  { id: 7, name: 'Rainforest', file: 'ambient_rain.mp3',    category: 'ambient', emoji: '🌿' },
  { id: 8, name: 'Ocean',      file: 'ambient_ocean.mp3',   category: 'ambient', emoji: '🌊' },
  { id: 9, name: 'Forest',     file: 'ambient_forest.mp3',  category: 'ambient', emoji: '🌲' },
];

export const EFFECT_SOUNDS  = SOUNDS.filter((s) => s.category === 'effect');
export const AMBIENT_SOUNDS = SOUNDS.filter((s) => s.category === 'ambient');

export function getSoundById(id: number): SoundAsset | undefined {
  return SOUNDS.find((s) => s.id === id);
}
