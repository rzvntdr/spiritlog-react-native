import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { DurationConfig, SoundConfig } from '../../types/preset';
import { getSoundById } from '../../types/sound';
import IntervalSoundDialog from './IntervalSoundDialog';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (startSound: number | null, endSound: number | null, soundConfigs: SoundConfig[]) => void;
  phase: DurationConfig;
}

export default function SoundConfigDialog({ visible, onClose, onSave, phase }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [intervalSounds, setIntervalSounds] = useState<SoundConfig[]>([...phase.soundConfigs]);
  const [addIntervalVisible, setAddIntervalVisible] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setIntervalSounds([...phase.soundConfigs]);
    }
  }, [visible, phase]);

  const removeInterval = (index: number) => {
    setIntervalSounds((prev) => prev.filter((_, i) => i !== index));
  };

  const getIntervalLabel = (config: SoundConfig): string => {
    const sound = getSoundById(config.soundId);
    const name = sound?.name ?? 'Unknown';
    if (config.type === 'FIXED_INTERVAL') {
      const secs = (config.params as { intervalMillis: number }).intervalMillis / 1000;
      return `${name} — every ${secs}s`;
    }
    if (config.type === 'RANDOM_INTERVAL') {
      const p = config.params as { minIntervalMillis: number; maxIntervalMillis: number };
      return `${name} — random ${p.minIntervalMillis / 1000}s–${p.maxIntervalMillis / 1000}s`;
    }
    return `${name} — ambient loop`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 }}>
        <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 20, maxHeight: '85%' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: c.onBackground, marginBottom: 4 }}>
            Sound Configuration
          </Text>
          <Text style={{ fontSize: 13, color: c.onSurface, marginBottom: 16 }}>
            Phase: {phase.name}
          </Text>

          <ScrollView>
            {/* Interval Sounds */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.onBackground }}>Interval Sounds</Text>
              <Pressable
                onPress={() => setAddIntervalVisible(true)}
                style={{ backgroundColor: c.primaryContainer, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
              >
                <Text style={{ color: c.onPrimary, fontWeight: '600', fontSize: 13 }}>+ Add Sound</Text>
              </Pressable>
            </View>

            {intervalSounds.length === 0 ? (
              <Text style={{ color: c.onSurface, fontStyle: 'italic', marginBottom: 12 }}>
                No interval sounds configured
              </Text>
            ) : (
              intervalSounds.map((config, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: c.surfaceVariant,
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ color: c.onBackground, flex: 1, fontSize: 13 }}>
                    {getIntervalLabel(config)}
                  </Text>
                  <Pressable onPress={() => removeInterval(i)} hitSlop={8}>
                    <Text style={{ color: c.error, fontSize: 16 }}>✕</Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>

          {/* Actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            <Pressable onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ color: c.primary, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => { onSave(null, null, intervalSounds); onClose(); }}
              style={{ backgroundColor: c.primaryContainer, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }}
            >
              <Text style={{ color: c.onPrimary, fontWeight: '600' }}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <IntervalSoundDialog
        visible={addIntervalVisible}
        onClose={() => setAddIntervalVisible(false)}
        onAdd={(config) => setIntervalSounds((prev) => [...prev, config])}
      />
    </Modal>
  );
}
