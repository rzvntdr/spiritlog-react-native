import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { StreakArtProps } from './types';
import { spacing } from '../../../theme/scale';
import { useSettingsStore } from '../../../stores/settingsStore';
import { FinalizeOpts, foliageDensity, PlantStreak } from './plant-engine';

/** The art is authored in a 170×170 box (see plant-engine docs). */
const ART_SIZE = 170;

/**
 * Procedural plant streak art (the plant-engine project, integrated).
 * Sits in the RIGHT slot of the hero card; the text column owns the left.
 *
 * The plant's identity (seed) is rolled ONCE on first activation and then
 * persisted — release builds have no UI to change it afterwards. Dev builds
 * expose PlantTuningPanel (HomeScreen, __DEV__) for seed/config exploration.
 */
export default function TreeArt({ days }: StreakArtProps) {
  const savedSeed = useSettingsStore((s) => s.plantSeed);
  const savedAlgorithm = useSettingsStore((s) => s.plantAlgorithm);
  const savedForm = useSettingsStore((s) => s.plantForm);
  const savedTuning = useSettingsStore((s) => s.plantTuning);
  // Transient debugger draft (if any) takes precedence — the tuning panel
  // edits the draft, the explicit save button commits it to the fields above.
  const draft = useSettingsStore((s) => s.plantDraft);
  const setPlantSeed = useSettingsStore((s) => s.setPlantSeed);

  // First activation: roll the plant's identity once; it stays for good.
  useEffect(() => {
    if (savedSeed == null) setPlantSeed(Math.floor(Math.random() * 1e9));
  }, [savedSeed, setPlantSeed]);

  const seed = draft?.seed ?? savedSeed;
  const algorithm = draft?.algorithm ?? savedAlgorithm;
  const form = draft?.form ?? savedForm;
  const tuning = draft?.tuning ?? savedTuning;

  const config: FinalizeOpts = useMemo(
    () => ({
      leaf: foliageDensity(tuning.density),
      leafSizeScale: tuning.leafScale,
      thicknessScale: tuning.thickness,
      branchiness: tuning.branchiness,
      crownSpread: tuning.crownSpread,
      ...(form !== 'auto' ? { lsystemForm: form } : {}),
    }),
    [tuning, form],
  );

  if (seed == null) return null;
  return (
    <View pointerEvents="none" style={styles.slot}>
      <PlantStreak streakDays={days} seed={seed} size={ART_SIZE} algorithm={algorithm} config={config} />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    // inset from the card edge so the plant sits balanced in the right half
    // (mirrors the widget's comfortable margin) instead of hugging the border
    right: spacing.lg,
    top: 0,
    bottom: 0,
    width: ART_SIZE,
  },
});
