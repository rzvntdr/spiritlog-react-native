import { PresetTimer, PresetElement } from '../types/preset';
import { MeditationElement } from '../types/timer';

export function getPresetTotalDurationMs(preset: PresetTimer): number {
  return preset.elements.reduce((total, el) => {
    if (el.kind !== 'duration' || el.type === 'INFINITE') return total;
    return total + el.durationMillis;
  }, 0);
}

export function getPhaseCount(preset: PresetTimer): number {
  return preset.elements.filter((el) => el.kind === 'duration').length;
}

export function hasInfinitePhase(preset: PresetTimer): boolean {
  return preset.elements.some((el) => el.kind === 'duration' && el.type === 'INFINITE');
}

export function getDurationElements(preset: PresetTimer): (PresetElement & { kind: 'duration' })[] {
  return preset.elements.filter((el): el is PresetElement & { kind: 'duration' } => el.kind === 'duration');
}

export function buildElements(preset: PresetTimer): MeditationElement[] {
  return preset.elements.map((el): MeditationElement => {
    if (el.kind === 'sound') {
      return { kind: 'sound', soundId: el.soundId, name: el.name };
    }
    return {
      kind: 'duration',
      type: el.type,
      durationMs: el.durationMillis,
      name: el.name,
      soundConfigs: el.soundConfigs,
    };
  });
}
