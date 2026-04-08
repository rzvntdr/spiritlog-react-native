import { PresetTimer, DurationConfig } from '../types/preset';
import { MeditationElement } from '../types/timer';

/**
 * Calculate total duration of a preset in milliseconds.
 * Infinite phases are excluded from the total.
 */
export function getPresetTotalDurationMs(preset: PresetTimer): number {
  return preset.durations.reduce((total, d) => {
    if (d.type === 'INFINITE') return total;
    return total + d.durationMillis;
  }, 0);
}

/**
 * Get total phase count (only duration phases, not sounds).
 */
export function getPhaseCount(preset: PresetTimer): number {
  return preset.durations.length;
}

/**
 * Check if a preset has any infinite phase.
 */
export function hasInfinitePhase(preset: PresetTimer): boolean {
  return preset.durations.some((d) => d.type === 'INFINITE');
}

/**
 * Convert a PresetTimer into a flat sequence of MeditationElements
 * that the TimerEngine can process.
 *
 * Example: preset with [warmup 30s, meditation 20m] becomes:
 * [StartSound] → [Warmup 30s] → [TransitionSound] → [Meditation 20m] → [EndSound]
 */
export function buildElements(preset: PresetTimer): MeditationElement[] {
  const elements: MeditationElement[] = [];

  for (let i = 0; i < preset.durations.length; i++) {
    const dur = preset.durations[i];

    // Start sound as a separate sound element
    if (dur.startSound) {
      elements.push({
        kind: 'sound',
        soundId: dur.startSound,
        name: `Start ${dur.name}`,
      });
    }

    // The duration element itself
    elements.push({
      kind: 'duration',
      type: dur.type,
      durationMs: dur.durationMillis,
      name: dur.name,
      soundConfigs: dur.soundConfigs,
      startSound: null, // already handled as separate element above
      endSound: null,   // will be handled as separate element below
    });

    // End sound as a separate sound element
    if (dur.endSound) {
      elements.push({
        kind: 'sound',
        soundId: dur.endSound,
        name: `End ${dur.name}`,
      });
    }
  }

  return elements;
}
