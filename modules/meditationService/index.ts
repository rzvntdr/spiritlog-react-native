import { requireNativeModule, Platform, EventSubscription } from 'expo-modules-core';

const Native = Platform.OS === 'android' ? requireNativeModule('MeditationService') : null;

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
 */
export interface SoundScheduleEntry {
  type: 'FIXED_INTERVAL' | 'RANDOM_INTERVAL' | 'AMBIENT';
  soundId: number;
  intervalMs?: number;
  minIntervalMs?: number;
  maxIntervalMs?: number;
}

export function start(state: MeditationState): void {
  Native?.start(state);
}

export function update(state: MeditationState): void {
  Native?.update(state);
}

export function stop(): void {
  Native?.stop();
}

export function setSoundSchedule(entries: SoundScheduleEntry[]): void {
  // Normalize so unset fields become 0 (the native record requires all fields)
  const payload = entries.map((e) => ({
    type: e.type,
    soundId: e.soundId,
    intervalMs: e.intervalMs ?? 0,
    minIntervalMs: e.minIntervalMs ?? 0,
    maxIntervalMs: e.maxIntervalMs ?? 0,
  }));
  Native?.setSoundSchedule(payload);
}

export function clearSoundSchedule(): void {
  Native?.clearSoundSchedule();
}

export function pauseSoundSchedule(): void {
  Native?.pauseSoundSchedule();
}

export function resumeSoundSchedule(): void {
  Native?.resumeSoundSchedule();
}

export function setAmbientVolume(volume: number): void {
  Native?.setAmbientVolume(volume);
}

export function addActionListener(
  event: MeditationActionEvent,
  callback: () => void,
): EventSubscription | null {
  if (!Native) return null;
  return Native.addListener(event, callback);
}
