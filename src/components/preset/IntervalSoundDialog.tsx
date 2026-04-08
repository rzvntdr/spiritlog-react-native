import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../theme/ThemeContext';
import { SOUNDS } from '../../types/sound';
import { SoundConfig, SoundIntervalType } from '../../types/preset';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (config: SoundConfig) => void;
}

export default function IntervalSoundDialog({ visible, onClose, onAdd }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [soundId, setSoundId] = useState(1);
  const [intervalType, setIntervalType] = useState<SoundIntervalType>('FIXED_INTERVAL');
  const [fixedInterval, setFixedInterval] = useState(30); // seconds
  const [minInterval, setMinInterval] = useState(10); // seconds
  const [maxInterval, setMaxInterval] = useState(60); // seconds

  React.useEffect(() => {
    if (visible) {
      setSoundId(1);
      setIntervalType('FIXED_INTERVAL');
      setFixedInterval(30);
      setMinInterval(10);
      setMaxInterval(60);
    }
  }, [visible]);

  const handleAdd = () => {
    let config: SoundConfig;
    if (intervalType === 'FIXED_INTERVAL') {
      config = { type: 'FIXED_INTERVAL', soundId, params: { intervalMillis: fixedInterval * 1000 } };
    } else if (intervalType === 'RANDOM_INTERVAL') {
      config = {
        type: 'RANDOM_INTERVAL',
        soundId,
        params: { minIntervalMillis: minInterval * 1000, maxIntervalMillis: Math.max(minInterval + 1, maxInterval) * 1000 },
      };
    } else {
      config = { type: 'AMBIENT', soundId, params: { volume: 0.5 } };
    }
    onAdd(config);
    onClose();
  };

  const typeOptions: { type: SoundIntervalType; label: string }[] = [
    { type: 'FIXED_INTERVAL', label: 'Fixed' },
    { type: 'RANDOM_INTERVAL', label: 'Random' },
    { type: 'AMBIENT', label: 'Ambient' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 }}>
        <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: c.onBackground, marginBottom: 16 }}>
            Add Interval Sound
          </Text>

          {/* Sound selector */}
          <Text style={{ fontSize: 12, color: c.onSurface, marginBottom: 8 }}>Select Sound</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {SOUNDS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setSoundId(s.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: soundId === s.id ? c.primaryContainer : c.surfaceVariant,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: soundId === s.id ? c.onPrimary : c.onSurface, fontWeight: '600' }}>
                  {s.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Interval Type */}
          <Text style={{ fontSize: 12, color: c.onSurface, marginBottom: 8 }}>Interval Type</Text>
          <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
            {typeOptions.map((opt) => (
              <Pressable
                key={opt.type}
                onPress={() => setIntervalType(opt.type)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: intervalType === opt.type ? c.primaryContainer : c.surfaceVariant,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: intervalType === opt.type ? c.onPrimary : c.onSurface,
                    fontWeight: '600',
                    fontSize: 13,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Fixed interval slider */}
          {intervalType === 'FIXED_INTERVAL' && (
            <>
              <Text style={{ fontSize: 12, color: c.onSurface, marginBottom: 4 }}>Interval (seconds)</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: c.onBackground, textAlign: 'center' }}>
                {fixedInterval}s
              </Text>
              <Slider
                minimumValue={5}
                maximumValue={300}
                step={5}
                value={fixedInterval}
                onValueChange={setFixedInterval}
                minimumTrackTintColor={c.primary}
                maximumTrackTintColor={c.surfaceVariant}
                thumbTintColor={c.primary}
                style={{ marginBottom: 16 }}
              />
            </>
          )}

          {/* Random interval sliders */}
          {intervalType === 'RANDOM_INTERVAL' && (
            <>
              <Text style={{ fontSize: 12, color: c.onSurface, marginBottom: 4 }}>Minimum Interval (seconds)</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: c.onBackground, textAlign: 'center' }}>
                {minInterval}s
              </Text>
              <Slider
                minimumValue={5}
                maximumValue={300}
                step={5}
                value={minInterval}
                onValueChange={(v) => {
                  setMinInterval(v);
                  if (v >= maxInterval) setMaxInterval(v + 5);
                }}
                minimumTrackTintColor={c.primary}
                maximumTrackTintColor={c.surfaceVariant}
                thumbTintColor={c.primary}
                style={{ marginBottom: 12 }}
              />

              <Text style={{ fontSize: 12, color: c.onSurface, marginBottom: 4 }}>Maximum Interval (seconds)</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: c.onBackground, textAlign: 'center' }}>
                {maxInterval}s
              </Text>
              <Slider
                minimumValue={10}
                maximumValue={600}
                step={5}
                value={maxInterval}
                onValueChange={(v) => setMaxInterval(Math.max(minInterval + 5, v))}
                minimumTrackTintColor={c.primary}
                maximumTrackTintColor={c.surfaceVariant}
                thumbTintColor={c.primary}
                style={{ marginBottom: 16 }}
              />
            </>
          )}

          {/* Ambient info */}
          {intervalType === 'AMBIENT' && (
            <View style={{ backgroundColor: c.surfaceVariant, borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <Text style={{ color: c.onSurface, textAlign: 'center' }}>
                Loops continuously during the phase. Other sounds play on top.
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            <Pressable onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ color: c.primary, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleAdd} style={{ backgroundColor: c.primaryContainer, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ color: c.onPrimary, fontWeight: '600' }}>Add Sound</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
