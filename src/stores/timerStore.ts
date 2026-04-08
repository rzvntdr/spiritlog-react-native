import { create } from 'zustand';
import { PresetTimer } from '../types/preset';
import { MeditationElement } from '../types/timer';
import { TimerEngine, TimerEngineState } from '../services/timerEngine';
import { buildElements } from '../utils/presetBuilder';

interface TimerStoreState {
  // Session context
  activePreset: PresetTimer | null;
  elements: MeditationElement[];

  // Engine state (mirrors TimerEngineState)
  isActive: boolean;
  isPaused: boolean;
  engineState: TimerEngineState;

  // Pending sound to play (consumed by the UI/sound layer)
  pendingSoundId: number | null;
  pendingHaptic: boolean;

  // Actions
  startSession: (preset: PresetTimer) => void;
  play: () => void;
  pause: () => void;
  stop: () => TimerEngineState;
  skipToNext: () => void;
  restartCurrent: () => void;
  tick: () => void;
  clearPendingSound: () => void;
  clearPendingHaptic: () => void;
  reset: () => void;
  getRemainingMs: () => number | null;
}

const engine = new TimerEngine();

const emptyEngineState: TimerEngineState = {
  currentElementIndex: 0,
  displayTimeMs: 0,
  phaseProgress: 0,
  phaseName: '',
  phaseType: null,
  isComplete: false,
  elapsedMeditationMs: 0,
  totalElements: 0,
};

export const useTimerStore = create<TimerStoreState>((set, get) => ({
  activePreset: null,
  elements: [],
  isActive: false,
  isPaused: false,
  engineState: emptyEngineState,
  pendingSoundId: null,
  pendingHaptic: false,

  startSession: (preset) => {
    const elements = buildElements(preset);
    const state = engine.init(elements);
    set({
      activePreset: preset,
      elements,
      isActive: true,
      isPaused: true, // Start paused, user taps play
      engineState: state,
      pendingSoundId: null,
      pendingHaptic: false,
    });
  },

  play: () => {
    engine.play();
    set({ isPaused: false });
  },

  pause: () => {
    engine.pause();
    set({ isPaused: true });
  },

  stop: () => {
    const finalState = engine.stop();
    set({ isPaused: true, engineState: finalState });
    return finalState;
  },

  skipToNext: () => {
    const result = engine.skipToNext();
    set({
      engineState: result.state,
      pendingSoundId: result.playSoundId,
      pendingHaptic: result.phaseTransitioned,
    });
  },

  restartCurrent: () => {
    engine.restartCurrent();
    set({ engineState: engine.getState() });
  },

  tick: () => {
    const result = engine.tick();
    const updates: Partial<TimerStoreState> = { engineState: result.state };

    if (result.playSoundId !== null) {
      updates.pendingSoundId = result.playSoundId;
    }
    if (result.phaseTransitioned) {
      updates.pendingHaptic = true;
    }
    if (result.state.isComplete) {
      updates.isPaused = true;
    }

    set(updates);
  },

  clearPendingSound: () => set({ pendingSoundId: null }),
  clearPendingHaptic: () => set({ pendingHaptic: false }),

  getRemainingMs: () => engine.getRemainingMs(),

  reset: () => {
    engine.stop();
    set({
      activePreset: null,
      elements: [],
      isActive: false,
      isPaused: false,
      engineState: emptyEngineState,
      pendingSoundId: null,
      pendingHaptic: false,
    });
  },
}));
