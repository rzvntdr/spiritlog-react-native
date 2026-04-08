export type DurationType = 'WARMUP' | 'NORMAL' | 'INFINITE';

export type SoundIntervalType = 'FIXED_INTERVAL' | 'RANDOM_INTERVAL' | 'AMBIENT';

export interface SoundConfig {
  type: SoundIntervalType;
  soundId: number;
  params: FixedIntervalParams | RandomIntervalParams | AmbientParams;
}

export interface FixedIntervalParams {
  intervalMillis: number;
}

export interface RandomIntervalParams {
  minIntervalMillis: number;
  maxIntervalMillis: number;
}

export interface AmbientParams {
  volume: number;
}

export interface DurationConfig {
  type: DurationType;
  durationMillis: number;
  name: string;
  startSound: number | null;
  endSound: number | null;
  soundConfigs: SoundConfig[];
}

export interface PresetTimer {
  id: string;
  name: string;
  description: string;
  durations: DurationConfig[];
  isFavorite: boolean;
  sortOrder: number;
  lastUsed: number;
  createdAt: number;
}
