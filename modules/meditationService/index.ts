import { requireNativeModule, Platform, EventSubscription } from 'expo-modules-core';
import { createLogger } from '../../src/utils/logger';

const log = createLogger('meditationService');

const Native = Platform.OS === 'android' ? safeRequire() : null;

function safeRequire() {
  try {
    return requireNativeModule('MeditationService');
  } catch (e) {
    log.error('native module MeditationService not available', e);
    return null;
  }
}

export interface MeditationState {
  presetName: string;
  phaseName: string;
  isPaused: boolean;
  remainingMs: number;
  totalMs: number;
  canSkip: boolean;
}

export type MeditationActionEvent = 'restart' | 'pausePlay' | 'stop' | 'skip';

/**
 * One entry in the per-phase sound schedule. The native service owns timing and
 * playback so sounds keep firing in the background where JS would be suspended.
 *
 * Only the fields relevant to `type` need to be set:
 * - `FIXED_INTERVAL`  → `intervalMs`
 * - `RANDOM_INTERVAL` → `minIntervalMs` + `maxIntervalMs`
 * - `AMBIENT`         → no extra fields (looping playback)
 * - `ONE_SHOT`        → `offsetMs` (fires once after this delay from setSchedule call)
 */
export interface SoundScheduleEntry {
  type: 'FIXED_INTERVAL' | 'RANDOM_INTERVAL' | 'AMBIENT' | 'ONE_SHOT';
  soundId: number;
  intervalMs?: number;
  minIntervalMs?: number;
  maxIntervalMs?: number;
  offsetMs?: number;
}

function call<T>(method: string, fn: () => T): T | undefined {
  if (!Native) return undefined;
  try {
    return fn();
  } catch (e) {
    log.error(`${method} failed`, e);
    return undefined;
  }
}

export function start(state: MeditationState): void {
  log.info('start', { preset: state.presetName, phase: state.phaseName, remainingMs: state.remainingMs });
  call('start', () => Native?.start(state));
}

export function update(state: MeditationState): void {
  call('update', () => Native?.update(state));
}

export function stop(): void {
  log.info('stop');
  call('stop', () => Native?.stop());
}

export function setSoundSchedule(entries: SoundScheduleEntry[]): void {
  log.debug('setSoundSchedule', { count: entries.length, types: entries.map((e) => e.type) });
  const payload = entries.map((e) => ({
    type: e.type,
    soundId: e.soundId,
    intervalMs: e.intervalMs ?? 0,
    minIntervalMs: e.minIntervalMs ?? 0,
    maxIntervalMs: e.maxIntervalMs ?? 0,
    offsetMs: e.offsetMs ?? 0,
  }));
  call('setSoundSchedule', () => Native?.setSoundSchedule(payload));
}

export function clearSoundSchedule(): void {
  log.debug('clearSoundSchedule');
  call('clearSoundSchedule', () => Native?.clearSoundSchedule());
}

export function pauseSoundSchedule(): void {
  log.debug('pauseSoundSchedule');
  call('pauseSoundSchedule', () => Native?.pauseSoundSchedule());
}

export function resumeSoundSchedule(): void {
  log.debug('resumeSoundSchedule');
  call('resumeSoundSchedule', () => Native?.resumeSoundSchedule());
}

export function setAmbientVolume(volume: number): void {
  call('setAmbientVolume', () => Native?.setAmbientVolume(volume));
}

/**
 * Tell the native service whether the app is in the foreground. When foreground,
 * the JS layer plays sound markers itself, so native suppresses its ONE_SHOT
 * fallback to avoid doubling. When backgrounded, native plays markers on time.
 */
export function setForeground(foreground: boolean): void {
  call('setForeground', () => Native?.setForeground(foreground));
}

export function addActionListener(
  event: MeditationActionEvent,
  callback: () => void,
): EventSubscription | null {
  if (!Native) return null;
  try {
    return Native.addListener(event, () => {
      log.info('native action received', event);
      callback();
    });
  } catch (e) {
    log.error('addActionListener failed', { event }, e);
    return null;
  }
}
