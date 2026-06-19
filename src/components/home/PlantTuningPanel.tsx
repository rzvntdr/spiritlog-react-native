import Slider from '@react-native-community/slider';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/scale';
import {
  PlantAlgorithmSetting,
  PlantDraft,
  PlantFormSetting,
  useSettingsStore,
} from '../../stores/settingsStore';

/**
 * Debug plant playground (shown while DEMO mode is on). Edits a TRANSIENT
 * draft — the live plant previews it, but nothing persists until the explicit
 * "💾 Salvează (override)" button commits the draft over the saved config.
 * Dismissing demo mode (panel unmount) discards the draft.
 *
 * Sliders are UNCONTROLLED (initial value + key-based remount on reset):
 * re-feeding `value` on every tick makes them fight the user's finger.
 */
export default function PlantTuningPanel() {
  const { theme } = useTheme();
  const c = theme.colors;
  const draft = useSettingsStore((s) => s.plantDraft);
  const savedSeed = useSettingsStore((s) => s.plantSeed);
  const savedAlgorithm = useSettingsStore((s) => s.plantAlgorithm);
  const savedForm = useSettingsStore((s) => s.plantForm);
  const savedTuning = useSettingsStore((s) => s.plantTuning);
  const setPlantDraft = useSettingsStore((s) => s.setPlantDraft);
  const clearPlantDraft = useSettingsStore((s) => s.clearPlantDraft);
  const commitPlantDraft = useSettingsStore((s) => s.commitPlantDraft);

  const saved: PlantDraft = {
    seed: savedSeed ?? 1337,
    algorithm: savedAlgorithm,
    form: savedForm,
    tuning: savedTuning,
  };
  const cur = draft ?? saved;
  const dirty = draft != null;

  // Slider baseline: captured per resetKey so dragging never re-feeds `value`.
  const [resetKey, setResetKey] = useState(0);
  const baselineRef = useRef<PlantDraft>(cur);
  const resetSlidersTo = (snapshot: PlantDraft) => {
    baselineRef.current = snapshot;
    setResetKey((k) => k + 1);
  };

  // Discard the draft when the panel goes away (demo mode dismissed).
  useEffect(() => () => clearPlantDraft(), [clearPlantDraft]);

  const knob = (
    label: string,
    field: keyof PlantDraft['tuning'],
    display: (v: number) => string,
    min = 0,
    max = 1,
  ) => (
    <View style={styles.knob} key={`${field}-${resetKey}`}>
      <Text style={[typography.micro, { color: c.textMute }]}>
        {label} · {display(cur.tuning[field])}
      </Text>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        value={baselineRef.current.tuning[field]}
        onValueChange={(v) => setPlantDraft({ tuning: { [field]: v } })}
        minimumTrackTintColor={c.accent}
        maximumTrackTintColor={c.surface3}
        thumbTintColor={c.accent}
      />
    </View>
  );

  const chip = (label: string, active: boolean, onPress: () => void, key?: string) => (
    <Pressable
      key={key ?? label}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? c.accent : c.surface2 }]}
    >
      <Text style={[typography.meta, { color: active ? c.background : c.textDim }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.card, { backgroundColor: c.surface2, borderColor: dirty ? c.accent : c.line }]}>
      <View style={styles.headerRow}>
        <Text style={[typography.label, { color: c.textMute }]}>🌱 plant tuning</Text>
        <Text style={[typography.meta, { color: dirty ? c.warmBright : c.textDim }]}>
          {dirty ? '● nesalvat' : '✓ salvat'}
        </Text>
      </View>

      <View style={styles.chipRow}>
        {(['colony', 'lsystem'] as PlantAlgorithmSetting[]).map((a) =>
          chip(a, cur.algorithm === a, () => setPlantDraft({ algorithm: a })),
        )}
        <View style={styles.chipSpacer} />
        {(['auto', 'tall', 'broad'] as PlantFormSetting[]).map((f) =>
          chip(f, cur.form === f, () => setPlantDraft({ form: f })),
        )}
      </View>

      {knob('stufoșenie', 'density', (v) => `${Math.round(v * 100)}%`)}
      {knob('mărime frunze', 'leafScale', (v) => `×${v.toFixed(2)}`, 0.5, 1.6)}
      {knob('grosime ramuri', 'thickness', (v) => `×${v.toFixed(2)}`, 0.5, 1.8)}
      {knob('număr ramuri', 'branchiness', (v) => `${Math.round(v * 100)}%`)}
      {knob('lățime coroană', 'crownSpread', (v) => `${Math.round(v * 100)}%`)}

      <View style={styles.chipRow}>
        {chip('🎲 alt seed', false, () => setPlantDraft({ seed: Math.floor(Math.random() * 1e9) }))}
        <Text style={[typography.meta, { color: c.textDim }]}>seed {cur.seed}</Text>
      </View>

      <View style={styles.chipRow}>
        <Pressable
          onPress={() => {
            commitPlantDraft();
            resetSlidersTo(cur);
          }}
          style={[styles.saveBtn, { backgroundColor: dirty ? c.accent : c.surface3 }]}
        >
          <Text style={[typography.bodyEm, { color: dirty ? c.background : c.textDim }]}>
            💾 Salvează (override)
          </Text>
        </Pressable>
        {chip('↩ revino la salvat', false, () => {
          clearPlantDraft();
          resetSlidersTo(saved);
        }, 'revert')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chipSpacer: { width: spacing.sm },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  saveBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.pill,
  },
  knob: { gap: 2 },
  slider: { width: '100%', height: 28 },
});
