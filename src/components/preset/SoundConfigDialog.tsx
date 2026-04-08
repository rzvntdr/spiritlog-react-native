import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { DurationConfig, SoundConfig } from '../../types/preset';
import { SOUNDS, getSoundById } from '../../types/sound';
import IntervalSoundDialog from './IntervalSoundDialog';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (startSound: number | null, endSound: number | null, soundConfigs: SoundConfig[]) => void;
  phase: DurationConfig;
}

function SoundDropdown({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: number | null;
  onChange: (id: number | null) => void;
  colors: ReturnType<typeof useTheme>['theme']['colors'];
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? getSoundById(value) : null;

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, color: colors.onSurface, marginBottom: 4 }}>{label}</Text>
      <Pressable
        onPress={() => setOpen(!open)}
        style={{
          backgroundColor: colors.surfaceVariant,
          borderRadius: 8,
          padding: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.onBackground }}>{selected ? selected.name : 'None'}</Text>
        <Text style={{ color: colors.onSurface }}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && (
        <View style={{ backgroundColor: colors.surfaceVariant, borderRadius: 8, marginTop: 4 }}>
          <Pressable
            onPress={() => { onChange(null); setOpen(false); }}
            style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: colors.surface }}
          >
            <Text style={{ color: colors.onSurface }}>None</Text>
          </Pressable>
          {SOUNDS.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => { onChange(s.id); setOpen(false); }}
              style={{
                padding: 10,
                flexDirection: 'row',
                justifyContent: 'space-between',
                backgroundColor: value === s.id ? colors.primaryContainer : 'transparent',
                borderRadius: 4,
              }}
            >
              <Text style={{ color: value === s.id ? colors.onPrimary : colors.onBackground }}>{s.name}</Text>
              <Text style={{ color: colors.accent }}>▶</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function SoundConfigDialog({ visible, onClose, onSave, phase }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [startSound, setStartSound] = useState<number | null>(phase.startSound);
  const [endSound, setEndSound] = useState<number | null>(phase.endSound);
  const [intervalSounds, setIntervalSounds] = useState<SoundConfig[]>([...phase.soundConfigs]);
  const [addIntervalVisible, setAddIntervalVisible] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setStartSound(phase.startSound);
      setEndSound(phase.endSound);
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
            {/* Start/End Sounds */}
            <Text style={{ fontSize: 14, fontWeight: '600', color: c.onBackground, marginBottom: 8 }}>
              Start/End Sounds
            </Text>
            <SoundDropdown label="Start Sound" value={startSound} onChange={setStartSound} colors={c} />
            <SoundDropdown label="End Sound" value={endSound} onChange={setEndSound} colors={c} />

            {/* Interval Sounds */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8 }}>
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
              onPress={() => { onSave(startSound, endSound, intervalSounds); onClose(); }}
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
