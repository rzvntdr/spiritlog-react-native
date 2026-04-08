import { DurationType, SoundConfig } from './preset';

export type MeditationElement =
  | { kind: 'sound'; soundId: number; name: string }
  | {
      kind: 'duration';
      type: DurationType;
      durationMs: number;
      name: string;
      soundConfigs: SoundConfig[];
      startSound: number | null;
      endSound: number | null;
    };

export type PlaybackAction = 'play' | 'pause' | 'stop' | 'skip' | 'restart';

export interface TimerState {
  isActive: boolean;
  isPaused: boolean;
  currentElementIndex: number;
  displayTimeMs: number;
  currentPhaseName: string;
  currentPhaseType: DurationType | null;
  phaseProgress: number;
  elapsedMeditationMs: number;
  isComplete: boolean;
}
