import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../theme/ThemeContext';
import { DurationType } from '../../types/preset';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, type: DurationType, durationMs: number) => void;
  initialName?: string;
  initialType?: DurationType;
  initialDurationMs?: number;
  title?: string;
}

// Duration presets for the slider
const DURATION_STEPS = [
  10_000, 15_000, 20_000, 30_000, 45_000, // seconds
  60_000, 90_000, 120_000, 180_000, 300_000, // 1-5 min
  600_000, 900_000, 1_200_000, 1_500_000, 1_800_000, // 10-30 min
  2_700_000, 3_600_000, 5_400_000, 7_200_000, // 45min - 2h
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
  title = 'Edit Phase',
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<DurationType>(initialType);
  const [stepIndex, setStepIndex] = useState(
    Math.max(0, DURATION_STEPS.indexOf(closestStep(initialDurationMs)))
  );

  React.useEffect(() => {
    if (visible) {
      setName(initialName);
      setType(initialType);
      setStepIndex(Math.max(0, DURATION_STEPS.indexOf(closestStep(initialDurationMs))));
    }
  }, [visible, initialName, initialType, initialDurationMs]);

  const isInfinite = type === 'INFINITE';

  const typeOptions: { value: DurationType; label: string; color: string }[] = [
    { value: 'WARMUP', label: 'Warm-up', color: c.warmup },
    { value: 'NORMAL', label: 'Normal', color: c.accent },
    { value: 'INFINITE', label: 'Infinite', color: c.infinite },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 }}>
        <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: c.onBackground, marginBottom: 16 }}>
            {title}
          </Text>

          {/* Phase Name */}
          <Text style={{ fontSize: 12, color: c.onSurface, marginBottom: 4 }}>Phase Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Meditation"
            placeholderTextColor={c.onSurface}
            style={{
              backgroundColor: c.surfaceVariant,
              borderRadius: 8,
              padding: 12,
              color: c.onBackground,
              fontSize: 16,
              marginBottom: 16,
            }}
          />

          {/* Duration Type */}
          <Text style={{ fontSize: 12, color: c.onSurface, marginBottom: 8 }}>Duration Type</Text>
          <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
            {typeOptions.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setType(opt.value)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: type === opt.value ? opt.color : c.surfaceVariant,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: type === opt.value ? '#fff' : c.onSurface,
                    fontWeight: '600',
                    fontSize: 13,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Duration Slider (hidden for infinite) */}
          {!isInfinite && (
            <>
              <Text style={{ fontSize: 12, color: c.onSurface, marginBottom: 4 }}>Duration</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: c.onBackground, textAlign: 'center', marginBottom: 8 }}>
                {formatMs(DURATION_STEPS[stepIndex])}
              </Text>
              <Slider
                minimumValue={0}
                maximumValue={DURATION_STEPS.length - 1}
                step={1}
                value={stepIndex}
                onValueChange={(v) => setStepIndex(Math.round(v))}
                minimumTrackTintColor={c.primary}
                maximumTrackTintColor={c.surfaceVariant}
                thumbTintColor={c.primary}
                style={{ marginBottom: 16 }}
              />
            </>
          )}

          {isInfinite && (
            <View style={{ backgroundColor: c.surfaceVariant, borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <Text style={{ color: c.onSurface, textAlign: 'center' }}>
                No time limit — meditation ends when you stop
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            <Pressable onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ color: c.primary, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const ms = isInfinite ? 0 : DURATION_STEPS[stepIndex];
                onSave(name || 'Phase', type, ms);
                onClose();
              }}
              style={{ backgroundColor: c.primaryContainer, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }}
            >
              <Text style={{ color: c.onPrimary, fontWeight: '600' }}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
