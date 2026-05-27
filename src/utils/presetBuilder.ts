import { PresetTimer, PresetElement, SoundConfig } from '../types/preset';
import { MeditationElement } from '../types/timer';
import { AttachedSound } from '../components/preset/PhaseChip';

export function soundConfigToLabel(sc: SoundConfig): AttachedSound {
  let paramsLabel = '';
  if (sc.type === 'FIXED_INTERVAL') {
    const secs = (sc.params as { intervalMillis: number }).intervalMillis / 1000;
    paramsLabel = `every ${secs}s`;
  } else if (sc.type === 'RANDOM_INTERVAL') {
    const p = sc.params as { minIntervalMillis: number; maxIntervalMillis: number };
    paramsLabel = `${p.minIntervalMillis / 1000}–${p.maxIntervalMillis / 1000}s`;
  } else {
    paramsLabel = 'ambient';
  }
  return { soundId: sc.soundId, type: sc.type, paramsLabel };
}

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
