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

export function start(state: MeditationState): void {
  Native?.start(state);
}

export function update(state: MeditationState): void {
  Native?.update(state);
}

export function stop(): void {
  Native?.stop();
}

export function addActionListener(
  event: MeditationActionEvent,
  callback: () => void,
): EventSubscription | null {
  if (!Native) return null;
  return Native.addListener(event, callback);
}
