import { create } from 'zustand';
import { PresetTimer } from '../types/preset';
import { MeditationElement } from '../types/timer';
import { TimerEngine, TimerEngineState } from '../services/timerEngine';
import { buildElements } from '../utils/presetBuilder';
import { createLogger } from '../utils/logger';

const log = createLogger('timerStore');

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
  /** Sound marker waiting for playback to finish */
  pendingSoundMarker: number | null;
  hasStarted: boolean;

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
  clearPendingSoundMarker: () => void;
  soundMarkerFinished: () => void;
  reset: () => void;
  getRemainingMs: () => number | null;
}

const engine = new TimerEngine();

const emptyEngineState: TimerEngineState = {
  currentElementIndex: 0,
  currentElementKind: null,
  displayTimeMs: 0,
  phaseElapsedMs: 0,
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
  pendingSoundMarker: null,
  hasStarted: false,

  startSession: (preset) => {
    log.info('startSession', { presetId: preset.id, name: preset.name, elementCount: preset.elements.length });
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
      pendingSoundMarker: null,
    });
  },

  play: () => {
    log.info('play');
    engine.play();
    set({ isPaused: false, hasStarted: true });
  },

  pause: () => {
    log.info('pause');
    engine.pause();
    set({ isPaused: true });
  },

  stop: () => {
    log.info('stop');
    const finalState = engine.stop();
    set({ isPaused: true, engineState: finalState, pendingSoundMarker: null });
    return finalState;
  },

  skipToNext: () => {
    log.info('skipToNext', { from: get().engineState.currentElementIndex });
    const result = engine.skipToNext();
    set({
      engineState: result.state,
      pendingSoundId: result.playSoundId,
      pendingHaptic: result.phaseTransitioned,
      pendingSoundMarker: null,
    });
  },

  restartCurrent: () => {
    log.info('restartCurrent', { idx: get().engineState.currentElementIndex });
    engine.restartCurrent();
    set({ engineState: engine.getState(), pendingSoundMarker: null });
  },

  tick: () => {
    const result = engine.tick();
    const updates: Partial<TimerStoreState> = { engineState: result.state };

    if (result.playSoundId !== null) {
      if (result.waitingForSound) {
        log.debug('tick: sound marker queued', { soundId: result.playSoundId });
        updates.pendingSoundMarker = result.playSoundId;
      } else {
        updates.pendingSoundId = result.playSoundId;
      }
    }
    if (result.phaseTransitioned) {
      log.info('tick: phase transition', { newIdx: result.state.currentElementIndex, name: result.state.phaseName });
      updates.pendingHaptic = true;
    }
    if (result.state.isComplete) {
      log.info('tick: session complete');
      updates.isPaused = true;
    }

    set(updates);
  },

  clearPendingSound: () => set({ pendingSoundId: null }),
  clearPendingHaptic: () => set({ pendingHaptic: false }),
  clearPendingSoundMarker: () => set({ pendingSoundMarker: null }),

  soundMarkerFinished: () => {
    const result = engine.soundMarkerFinished();
    set({
      engineState: result.state,
      pendingSoundMarker: null,
      pendingHaptic: result.phaseTransitioned,
    });
  },

  getRemainingMs: () => engine.getRemainingMs(),

  reset: () => {
    log.info('reset');
    engine.stop();
    set({
      activePreset: null,
      elements: [],
      isActive: false,
      isPaused: false,
      engineState: emptyEngineState,
      pendingSoundId: null,
      pendingHaptic: false,
      pendingSoundMarker: null,
      hasStarted: false,
    });
  },
}));
