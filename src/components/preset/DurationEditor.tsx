import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../theme/ThemeContext';
import { DurationType, SoundConfig } from '../../types/preset';
import { radius, spacing, typography } from '../../theme/scale';
import { getSoundById } from '../../types/sound';
import { soundConfigToLabel } from '../../utils/presetBuilder';
import IntervalSoundDialog from './IntervalSoundDialog';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, type: DurationType, durationMs: number, soundConfigs: SoundConfig[]) => void;
  initialName?: string;
  initialType?: DurationType;
  initialDurationMs?: number;
  initialSoundConfigs?: SoundConfig[];
  title?: string;
}

const DURATION_STEPS = [
  10_000, 15_000, 20_000, 30_000, 45_000,
  60_000, 90_000, 120_000, 180_000, 300_000,
  600_000, 900_000, 1_200_000, 1_500_000, 1_800_000,
  2_700_000, 3_600_000, 5_400_000, 7_200_000,
];

function closestStep(ms: number): number {
  let closest = DURATION_STEPS[0];
  let minDiff = Math.abs(ms - closest);
  for (const step of DURATION_STEPS) {
    const diff = Math.abs(ms - step);
    if (diff < minDiff) {
      minDiff = diff;
      closest = step;
    }
  }
  return closest;
}

function formatMs(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  const remainMin = min % 60;
  return remainMin > 0 ? `${hr}h ${remainMin}m` : `${hr}h`;
}

export default function DurationEditor({
  visible,
  onClose,
  onSave,
  initialName = 'Meditation',
  initialType = 'NORMAL',
  initialDurationMs = 600_000,
  initialSoundConfigs = [],
  title = 'Edit Phase',
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<DurationType>(initialType);
  const [stepIndex, setStepIndex] = useState(
    Math.max(0, DURATION_STEPS.indexOf(closestStep(initialDurationMs)))
  );
  const [soundConfigs, setSoundConfigs] = useState<SoundConfig[]>(initialSoundConfigs);

  const [soundDialogVisible, setSoundDialogVisible] = useState(false);
  const [editingSoundIndex, setEditingSoundIndex] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setType(initialType);
      setStepIndex(Math.max(0, DURATION_STEPS.indexOf(closestStep(initialDurationMs))));
      setSoundConfigs(initialSoundConfigs);
    }
  }, [visible, initialName, initialType, initialDurationMs, initialSoundConfigs]);

  const isInfinite = type === 'INFINITE';

  const typeOptions: { value: DurationType; label: string; color: string }[] = [
    { value: 'WARMUP', label: 'Warm-up', color: c.warmup },
    { value: 'NORMAL', label: 'Normal', color: c.accent },
    { value: 'INFINITE', label: 'Infinite', color: c.infinite },
  ];

  const handleSaveSound = (config: SoundConfig) => {
    if (editingSoundIndex !== null) {
      setSoundConfigs((prev) => prev.map((sc, i) => i === editingSoundIndex ? config : sc));
    } else {
      setSoundConfigs((prev) => [...prev, config]);
    }
  };

  const handleRemoveSound = (i: number) => {
    setSoundConfigs((prev) => prev.filter((_, idx) => idx !== i));
  };

  return (
    <>
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: spacing.lg }}>
        <View style={{ backgroundColor: c.surface, borderRadius: radius.card, padding: spacing.base, maxHeight: '90%' }}>
          <Text style={[typography.section, { fontSize: 18, color: c.onBackground, marginBottom: spacing.base }]}>
            {title}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Phase Name */}
            <Text style={[typography.meta, { color: c.textMute, marginBottom: spacing.xs }]}>Phase Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Meditation"
              placeholderTextColor={c.textMute}
              style={{
                backgroundColor: c.surface2,
                borderRadius: radius.sm,
                padding: spacing.md,
                color: c.onBackground,
                fontSize: 16,
                marginBottom: spacing.base,
              }}
            />

            {/* Duration Type */}
            <Text style={[typography.meta, { color: c.textMute, marginBottom: spacing.sm }]}>Duration Type</Text>
            <View style={{ flexDirection: 'row', marginBottom: spacing.base, gap: spacing.sm }}>
              {typeOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setType(opt.value)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm + 2,
                    borderRadius: radius.sm,
                    backgroundColor: type === opt.value ? opt.color : c.surface2,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={[
                      typography.bodyEm,
                      { color: type === opt.value ? '#fff' : c.textDim },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Duration Slider (hidden for infinite) */}
            {!isInfinite && (
              <>
                <Text style={[typography.meta, { color: c.textMute, marginBottom: spacing.xs }]}>Duration</Text>
                <Text style={[typography.title, { fontSize: 24, color: c.onBackground, textAlign: 'center', marginBottom: spacing.sm }]}>
                  {formatMs(DURATION_STEPS[stepIndex])}
                </Text>
                <Slider
                  minimumValue={0}
                  maximumValue={DURATION_STEPS.length - 1}
                  step={1}
                  value={stepIndex}
                  onValueChange={(v) => setStepIndex(Math.round(v))}
                  minimumTrackTintColor={c.accent}
                  maximumTrackTintColor={c.surface2}
                  thumbTintColor={c.accent}
                  style={{ marginBottom: spacing.base }}
                />
              </>
            )}

            {isInfinite && (
              <View style={{ backgroundColor: c.surface2, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.base }}>
                <Text style={[typography.body, { color: c.textDim, textAlign: 'center' }]}>
                  No time limit — meditation ends when you stop
                </Text>
              </View>
            )}

            {/* Sounds during this phase */}
            <Text style={[typography.label, { color: c.textMute, marginBottom: spacing.sm }]}>
              Sounds during this phase
            </Text>
            {soundConfigs.length === 0 ? (
              <Text style={[typography.meta, { color: c.textMute, fontStyle: 'italic', marginBottom: spacing.sm }]}>
                No sounds attached. Add interval bells, ambient loops, etc.
              </Text>
            ) : (
              soundConfigs.map((sc, i) => {
                const asset = getSoundById(sc.soundId);
                const emoji = asset?.emoji ?? '🎵';
                const soundName = asset?.name ?? 'Sound';
                const label = soundConfigToLabel(sc);
                return (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: c.surface2,
                      borderRadius: radius.sm,
                      paddingHorizontal: spacing.sm + 2,
                      paddingVertical: spacing.xs + 2,
                      marginBottom: spacing.xs,
                    }}
                  >
                    <Text style={{ fontSize: 16, marginRight: spacing.sm }}>{emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodyEm, { color: c.onBackground }]} numberOfLines={1}>
                        {soundName}
                      </Text>
                      <Text style={[typography.meta, { color: c.textMute, marginTop: 1 }]}>
                        {label.paramsLabel}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={8}
                      onPress={() => { setEditingSoundIndex(i); setSoundDialogVisible(true); }}
                      style={{ marginRight: spacing.sm }}
                    >
                      <Text style={{ fontSize: 16, color: c.accent }}>✏</Text>
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => handleRemoveSound(i)}>
                      <Text style={{ color: c.error, fontSize: 16 }}>⊖</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
            <Pressable
              onPress={() => { setEditingSoundIndex(null); setSoundDialogVisible(true); }}
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.sm,
                backgroundColor: c.surface2,
                marginTop: soundConfigs.length > 0 ? 0 : spacing.xs,
                marginBottom: spacing.base,
              }}
            >
              <Text style={[typography.bodyEm, { color: c.accent }]}>+ Add sound</Text>
            </Pressable>
          </ScrollView>

          {/* Actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.sm }}>
            <Pressable onPress={onClose} style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.sm + 2 }}>
              <Text style={[typography.bodyEm, { color: c.textDim }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const ms = isInfinite ? 0 : DURATION_STEPS[stepIndex];
                onSave(name || 'Phase', type, ms, soundConfigs);
                onClose();
              }}
              style={{ backgroundColor: c.accent, borderRadius: radius.sm, paddingHorizontal: spacing.base, paddingVertical: spacing.sm + 2 }}
            >
              <Text style={[typography.bodyEm, { color: c.onPrimary }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>

    {/* Sound config dialog — sibling Modal (avoids Android nested-modal issues) */}
    <IntervalSoundDialog
      visible={soundDialogVisible}
      onClose={() => { setSoundDialogVisible(false); setEditingSoundIndex(null); }}
      onSave={handleSaveSound}
      initialConfig={editingSoundIndex !== null ? soundConfigs[editingSoundIndex] : undefined}
    />
    </>
  );
}
