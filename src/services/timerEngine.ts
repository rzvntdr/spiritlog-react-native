import { MeditationElement } from '../types/timer';
import { DurationType } from '../types/preset';

export interface TimerEngineState {
  currentElementIndex: number;
  displayTimeMs: number;
  phaseElapsedMs: number; // elapsed in current phase (always counts up)
  phaseProgress: number; // 0–1
  phaseName: string;
  phaseType: DurationType | null;
  isComplete: boolean;
  elapsedMeditationMs: number; // only duration elements count
  totalElements: number;
}

export interface TimerTickResult {
  state: TimerEngineState;
  /** Sound ID to play this tick (transition sound), or null */
  playSoundId: number | null;
  /** true if a phase just transitioned (for haptics) */
  phaseTransitioned: boolean;
}

const MAX_INFINITE_MS = 24 * 60 * 60 * 1000; // 24 hours safety cap

export class TimerEngine {
  private elements: MeditationElement[] = [];
  private currentIndex = 0;
  private elapsedInCurrentMs = 0;
  private totalMeditationMs = 0;
  private isRunning = false;
  private lastTickTime = 0;

  init(elements: MeditationElement[]): TimerEngineState {
    this.elements = elements;
    this.currentIndex = 0;
    this.elapsedInCurrentMs = 0;
    this.totalMeditationMs = 0;
    this.isRunning = false;
    this.lastTickTime = 0;
    return this.getState();
  }

  play(): void {
    this.isRunning = true;
    this.lastTickTime = Date.now();
  }

  pause(): void {
    this.isRunning = false;
  }

  stop(): TimerEngineState {
    this.isRunning = false;
    return this.getState();
  }

  skipToNext(): TimerTickResult {
    let playSoundId: number | null = null;

    // Play end sound of current element if it's a duration
    const current = this.elements[this.currentIndex];
    if (current?.kind === 'duration' && current.endSound) {
      playSoundId = current.endSound;
    }

    this.currentIndex++;
    this.elapsedInCurrentMs = 0;

    // Skip over any sound elements
    while (this.currentIndex < this.elements.length && this.elements[this.currentIndex].kind === 'sound') {
      const soundEl = this.elements[this.currentIndex];
      if (soundEl.kind === 'sound') {
        playSoundId = soundEl.soundId;
      }
      this.currentIndex++;
    }

    return {
      state: this.getState(),
      playSoundId,
      phaseTransitioned: true,
    };
  }

  restartCurrent(): void {
    this.elapsedInCurrentMs = 0;
  }

  /**
   * Called every tick (100ms). Returns state + any sounds to play.
   */
  tick(): TimerTickResult {
    if (!this.isRunning || this.currentIndex >= this.elements.length) {
      return { state: this.getState(), playSoundId: null, phaseTransitioned: false };
    }

    const now = Date.now();
    const deltaMs = this.lastTickTime > 0 ? now - this.lastTickTime : 0;
    this.lastTickTime = now;

    const current = this.elements[this.currentIndex];
    let playSoundId: number | null = null;
    let phaseTransitioned = false;

    if (current.kind === 'sound') {
      // Play sound on first tick, then dwell to let it finish
      if (this.elapsedInCurrentMs === 0 && deltaMs > 0) {
        playSoundId = current.soundId;
      }

      this.elapsedInCurrentMs += deltaMs;

      if (this.elapsedInCurrentMs >= SOUND_DWELL_MS) {
        this.currentIndex++;
        this.elapsedInCurrentMs = 0;
        phaseTransitioned = true;
      }

      return { state: this.getState(), playSoundId, phaseTransitioned };
    }

    if (current.kind === 'duration') {
      // First tick of this phase? Play start sound
      if (this.elapsedInCurrentMs === 0 && deltaMs > 0 && current.startSound) {
        playSoundId = current.startSound;
      }

      this.elapsedInCurrentMs += deltaMs;

      // Count toward total meditation time
      this.totalMeditationMs += deltaMs;

      const isInfinite = current.type === 'INFINITE';
      const targetMs = isInfinite ? MAX_INFINITE_MS : current.durationMs;

      if (!isInfinite && this.elapsedInCurrentMs >= targetMs) {
        // Phase complete
        if (current.endSound) {
          playSoundId = current.endSound;
        }
        this.currentIndex++;
        this.elapsedInCurrentMs = 0;
        phaseTransitioned = true;
      }
    }

    return { state: this.getState(), playSoundId, phaseTransitioned };
  }

  getState(): TimerEngineState {
    const current = this.elements[this.currentIndex];
    const isComplete = this.currentIndex >= this.elements.length;

    if (isComplete || !current) {
      return {
        currentElementIndex: this.currentIndex,
        displayTimeMs: 0,
        phaseElapsedMs: 0,
        phaseProgress: 1,
        phaseName: '',
        phaseType: null,
        isComplete: true,
        elapsedMeditationMs: this.totalMeditationMs,
        totalElements: this.elements.length,
      };
    }

    if (current.kind === 'sound') {
      return {
        currentElementIndex: this.currentIndex,
        displayTimeMs: Math.max(SOUND_DWELL_MS - this.elapsedInCurrentMs, 0),
        phaseElapsedMs: this.elapsedInCurrentMs,
        phaseProgress: Math.min(this.elapsedInCurrentMs / SOUND_DWELL_MS, 1),
        phaseName: current.name,
        phaseType: null,
        isComplete: false,
        elapsedMeditationMs: this.totalMeditationMs,
        totalElements: this.elements.length,
      };
    }

    // Duration element
    const isInfinite = current.type === 'INFINITE';
    const targetMs = isInfinite ? 0 : current.durationMs;

    let displayTimeMs: number;
    let phaseProgress: number;

    if (current.type === 'WARMUP') {
      // Counts up
      displayTimeMs = this.elapsedInCurrentMs;
      phaseProgress = targetMs > 0 ? Math.min(this.elapsedInCurrentMs / targetMs, 1) : 0;
    } else if (current.type === 'NORMAL') {
      // Counts down
      displayTimeMs = Math.max(targetMs - this.elapsedInCurrentMs, 0);
      phaseProgress = targetMs > 0 ? Math.min(this.elapsedInCurrentMs / targetMs, 1) : 0;
    } else {
      // Infinite: counts up, no progress
      displayTimeMs = this.elapsedInCurrentMs;
      phaseProgress = 0;
    }

    return {
      currentElementIndex: this.currentIndex,
      displayTimeMs,
      phaseElapsedMs: this.elapsedInCurrentMs,
      phaseProgress,
      phaseName: current.name,
      phaseType: current.type,
      isComplete: false,
      elapsedMeditationMs: this.totalMeditationMs,
      totalElements: this.elements.length,
    };
  }

  /**
   * Calculate total remaining milliseconds across all remaining duration elements.
   * Returns null for presets containing infinite phases (can't schedule a notification).
   */
  getRemainingMs(): number | null {
    let remaining = 0;

    for (let i = this.currentIndex; i < this.elements.length; i++) {
      const el = this.elements[i];
      if (el.kind === 'sound') {
        if (i === this.currentIndex) {
          remaining += Math.max(SOUND_DWELL_MS - this.elapsedInCurrentMs, 0);
        } else {
          remaining += SOUND_DWELL_MS;
        }
        continue;
      }
      if (el.type === 'INFINITE') return null;

      if (i === this.currentIndex) {
        remaining += Math.max(el.durationMs - this.elapsedInCurrentMs, 0);
      } else {
        remaining += el.durationMs;
      }
    }

    return remaining;
  }

  getElements(): MeditationElement[] {
    return this.elements;
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
