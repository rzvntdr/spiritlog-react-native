export interface SoundAsset {
  id: number;
  name: string;
  file: string;
}

export const SOUNDS: SoundAsset[] = [
  { id: 1, name: 'Bell', file: 'bell.mp3' },
  { id: 2, name: 'Swoosh', file: 'swoosh.mp3' },
  { id: 3, name: 'Drone', file: 'drone.mp3' },
  { id: 4, name: 'Bird', file: 'bird_sing.mp3' },
  { id: 5, name: 'Bark', file: 'bark.wav' },
  { id: 6, name: 'Rar', file: 'distorted_rar.mp3' },
];

export function getSoundById(id: number): SoundAsset | undefined {
  return SOUNDS.find((s) => s.id === id);
}
