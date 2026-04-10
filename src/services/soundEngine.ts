import { Audio } from 'expo-av';
import { SoundConfig, SoundIntervalType } from '../types/preset';

// Map sound IDs to require paths
const SOUND_FILES: Record<number, ReturnType<typeof require>> = {
  1: require('../../assets/sounds/bell.mp3'),
  2: require('../../assets/sounds/swoosh.mp3'),
  3: require('../../assets/sounds/drone.mp3'),
  4: require('../../assets/sounds/bird_sing.mp3'),
  5: require('../../assets/sounds/bark.wav'),
  6: require('../../assets/sounds/distorted_rar.mp3'),
};

interface IntervalTracker {
  config: SoundConfig;
  lastPlayTime: number;
  nextPlayTime: number;
}

class SoundEngine {
  private ambientSound: Audio.Sound | null = null;
  private intervalTrackers: IntervalTracker[] = [];
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
    this.initialized = true;
  }

  /**
   * Play a one-shot sound effect (bell, swoosh, etc.)
   * Creates a new Audio.Sound instance each time so effects can overlap.
   */
  async playSound(soundId: number): Promise<void> {
    const file = SOUND_FILES[soundId];
    if (!file) return;

    try {
      const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: true });
      // Auto-unload when finished
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      // Silently fail — don't crash the timer for a sound error
    }
  }

  /**
   * Play a sound and return a promise that resolves when it finishes.
   * Used for sound marker elements that need to wait for completion.
   */
  async playSoundAndWait(soundId: number): Promise<void> {
    const file = SOUND_FILES[soundId];
    if (!file) return;

    try {
      const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: true });
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
            resolve();
          }
        });
      });
    } catch (e) {
      // Silently fail
    }
  }

  /**
   * Start ambient sound loop on a dedicated channel.
   */
  async startAmbient(soundId: number, volume = 0.5): Promise<void> {
    await this.stopAmbient();
    const file = SOUND_FILES[soundId];
    if (!file) return;

    try {
      const { sound } = await Audio.Sound.createAsync(file, {
        shouldPlay: true,
        isLooping: true,
        volume,
      });
      this.ambientSound = sound;
    } catch (e) {
      // Silently fail
    }
  }

  /**
   * Stop ambient sound with optional fade out.
   */
  async stopAmbient(): Promise<void> {
    if (this.ambientSound) {
      try {
        await this.ambientSound.stopAsync();
        await this.ambientSound.unloadAsync();
      } catch (e) {
        // Already unloaded
      }
      this.ambientSound = null;
    }
  }

  async pauseAmbient(): Promise<void> {
    if (this.ambientSound) {
      try {
        await this.ambientSound.pauseAsync();
      } catch (e) {}
    }
  }

  async resumeAmbient(): Promise<void> {
    if (this.ambientSound) {
      try {
        await this.ambientSound.playAsync();
      } catch (e) {}
    }
  }

  /**
   * Start tracking interval sounds for a duration phase.
   */
  startIntervalSounds(configs: SoundConfig[]): void {
    this.intervalTrackers = configs.map((config) => {
      const nextTime = this.calculateNextTime(config, 0);
      return { config, lastPlayTime: 0, nextPlayTime: nextTime };
    });

    // Start any ambient sounds immediately
    for (const config of configs) {
      if (config.type === 'AMBIENT') {
        const volume = (config.params as { volume: number }).volume ?? 0.5;
        this.startAmbient(config.soundId, volume);
      }
    }
  }

  /**
   * Stop all interval sound tracking and ambient.
   */
  stopIntervalSounds(): void {
    this.intervalTrackers = [];
    this.stopAmbient();
  }

  /**
   * Called every tick from the timer. Checks if any interval sounds should play.
   * Updates nextPlayTime BEFORE playing to prevent overlapping triggers from
   * concurrent ticks.
   */
  tick(elapsedMs: number): void {
    for (const tracker of this.intervalTrackers) {
      if (tracker.config.type === 'AMBIENT') continue;

      if (elapsedMs >= tracker.nextPlayTime) {
        tracker.lastPlayTime = elapsedMs;
        tracker.nextPlayTime = this.calculateNextTime(tracker.config, elapsedMs);
        this.playSound(tracker.config.soundId); // fire-and-forget
      }
    }
  }

  private calculateNextTime(config: SoundConfig, currentMs: number): number {
    if (config.type === 'FIXED_INTERVAL') {
      const interval = (config.params as { intervalMillis: number }).intervalMillis;
      return currentMs + interval;
    }
    if (config.type === 'RANDOM_INTERVAL') {
      const params = config.params as { minIntervalMillis: number; maxIntervalMillis: number };
      const range = params.maxIntervalMillis - params.minIntervalMillis;
      const random = params.minIntervalMillis + Math.random() * range;
      return currentMs + random;
    }
    // Ambient — no interval scheduling
    return Infinity;
  }

  /**
   * Clean up all resources.
   */
  async dispose(): Promise<void> {
    await this.stopAmbient();
    this.intervalTrackers = [];
  }
}

// Singleton
export const soundEngine = new SoundEngine();
