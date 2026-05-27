import { Audio } from 'expo-av';
import { SoundConfig, SoundIntervalType } from '../types/preset';
import { useSettingsStore } from '../stores/settingsStore';
import { createLogger } from '../utils/logger';

const log = createLogger('soundEngine');

// Effect sounds — one-shot playback
const SOUND_FILES: Record<number, ReturnType<typeof require>> = {
  1: require('../../assets/sounds/bell.mp3'),
  2: require('../../assets/sounds/swoosh.mp3'),
  3: require('../../assets/sounds/drone.mp3'),
  4: require('../../assets/sounds/bird_sing.mp3'),
  5: require('../../assets/sounds/bark.wav'),
  6: require('../../assets/sounds/distorted_rar.mp3'),
};

// Ambient sounds — looping, kept separate so a bad file can't break effect sounds
const AMBIENT_FILES: Record<number, ReturnType<typeof require>> = {
  7: require('../../assets/sounds/ambient_rain.mp3'),
  8: require('../../assets/sounds/ambient_ocean.mp3'),
  9: require('../../assets/sounds/ambient_forest.mp3'),
};

interface IntervalTracker {
  config: SoundConfig;
  lastPlayTime: number;
  nextPlayTime: number;
}

class SoundEngine {
  private ambientSound: Audio.Sound | null = null;
  private previewSound: Audio.Sound | null = null;
  private previewTimeout: ReturnType<typeof setTimeout> | null = null;
  private intervalTrackers: IntervalTracker[] = [];
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      this.initialized = true;
      log.info('init: audio mode set');
    } catch (e) {
      log.error('init: setAudioModeAsync failed', e);
    }
  }

  async stopPreview(): Promise<void> {
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }
    if (this.previewSound) {
      try {
        await this.previewSound.stopAsync();
        await this.previewSound.unloadAsync();
      } catch (e) {}
      this.previewSound = null;
    }
  }

  async playPreview(soundId: number, durationMs = 8000): Promise<void> {
    await this.stopPreview();
    const file = SOUND_FILES[soundId] ?? AMBIENT_FILES[soundId];
    if (!file) return;

    try {
      const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: true });
      this.previewSound = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.previewSound = null;
          sound.unloadAsync();
        }
      });
      this.previewTimeout = setTimeout(() => this.stopPreview(), durationMs);
    } catch (e) {}
  }

  /**
   * Play a one-shot sound effect (bell, swoosh, etc.)
   * Creates a new Audio.Sound instance each time so effects can overlap.
   */
  async playSound(soundId: number): Promise<void> {
    const file = SOUND_FILES[soundId] ?? AMBIENT_FILES[soundId];
    if (!file) {
      log.warn('playSound: unknown soundId', soundId);
      return;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: true });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch((e) => log.warn('playSound: unloadAsync failed', e));
        }
      });
    } catch (e) {
      log.error('playSound: failed', { soundId }, e);
    }
  }

  /**
   * Play a sound and return a promise that resolves when it finishes.
   * Used for sound marker elements that need to wait for completion.
   */
  async playSoundAndWait(soundId: number): Promise<void> {
    const file = SOUND_FILES[soundId] ?? AMBIENT_FILES[soundId];
    if (!file) {
      log.warn('playSoundAndWait: unknown soundId', soundId);
      return;
    }

    try {
      log.debug('playSoundAndWait: start', { soundId });
      const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: true });
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch((e) => log.warn('playSoundAndWait: unloadAsync failed', e));
            resolve();
          }
        });
      });
      log.debug('playSoundAndWait: done', { soundId });
    } catch (e) {
      log.error('playSoundAndWait: failed', { soundId }, e);
    }
  }

  /**
   * Start ambient sound loop on a dedicated channel.
   */
  async startAmbient(soundId: number, volume = 0.5): Promise<void> {
    await this.stopAmbient();
    const file = AMBIENT_FILES[soundId];
    if (!file) {
      log.warn('startAmbient: unknown soundId', soundId);
      return;
    }

    try {
      log.info('startAmbient', { soundId, volume });
      const { sound } = await Audio.Sound.createAsync(file, {
        shouldPlay: true,
        isLooping: true,
        volume,
      });
      this.ambientSound = sound;
    } catch (e) {
      log.error('startAmbient: failed', { soundId }, e);
    }
  }

  /**
   * Stop ambient sound.
   */
  async stopAmbient(): Promise<void> {
    if (this.ambientSound) {
      try {
        await this.ambientSound.stopAsync();
        await this.ambientSound.unloadAsync();
        log.info('stopAmbient: stopped');
      } catch (e) {
        log.warn('stopAmbient: already unloaded or failed', e);
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

  async setAmbientVolume(volume: number): Promise<void> {
    if (this.ambientSound) {
      try {
        await this.ambientSound.setVolumeAsync(volume);
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

    // Start any ambient sounds immediately using the user's last-set volume
    for (const config of configs) {
      if (config.type === 'AMBIENT') {
        const volume = useSettingsStore.getState().ambientVolume;
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
      if (!interval || interval <= 0) return Infinity;
      return currentMs + interval;
    }
    if (config.type === 'RANDOM_INTERVAL') {
      const params = config.params as { minIntervalMillis: number; maxIntervalMillis: number };
      const min = params.minIntervalMillis ?? 10000;
      const max = params.maxIntervalMillis ?? 60000;
      const range = Math.max(0, max - min);
      const random = min + Math.random() * range;
      if (!isFinite(random) || random <= 0) return currentMs + min;
      return currentMs + random;
    }
    // Ambient — no interval scheduling
    return Infinity;
  }

  /**
   * Clean up all resources.
   */
  async dispose(): Promise<void> {
    log.info('dispose');
    await this.stopAmbient();
    this.intervalTrackers = [];
  }
}

// Singleton
export const soundEngine = new SoundEngine();
