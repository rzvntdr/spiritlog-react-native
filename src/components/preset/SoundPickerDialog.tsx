import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SOUNDS } from '../../types/sound';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, soundId: number) => void;
  initialName?: string;
  initialSoundId?: number;
  title?: string;
}

export default function SoundPickerDialog({
  visible,
  onClose,
  onSave,
  initialName = '',
  initialSoundId = 1,
  title = 'Edit Sound',
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [name, setName] = useState(initialName);
  const [soundId, setSoundId] = useState(initialSoundId);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (visible) {
      setName(initialName);
      setSoundId(initialSoundId);
    }
  }, [visible, initialName, initialSoundId]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 }}>
        <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: c.onBackground, marginBottom: 16 }}>
            {title}
          </Text>

          {/* Sound Name */}
          <Text style={{ fontSize: 12, color: c.onSurface, marginBottom: 4 }}>Sound Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Start Meditation"
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

          {/* Sound Selector */}
          <Text style={{ fontSize: 12, color: c.onSurface, marginBottom: 8 }}>Sound</Text>
          <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
            {SOUNDS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setSoundId(s.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: soundId === s.id ? c.primaryContainer : 'transparent',
                  marginBottom: 4,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: soundId === s.id ? c.onPrimary : c.onSurface,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  {soundId === s.id && (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.onPrimary }} />
                  )}
                </View>
                <Text style={{ flex: 1, color: soundId === s.id ? c.onPrimary : c.onBackground, fontSize: 16 }}>
                  {s.name}
                </Text>
                <Pressable hitSlop={8}>
                  <Text style={{ color: c.accent, fontSize: 16 }}>▶</Text>
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            <Pressable onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ color: c.primary, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => { onSave(name || 'Sound', soundId); onClose(); }}
              style={{ backgroundColor: c.primaryContainer, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }}
            >
              <Text style={{ color: c.onPrimary, fontWeight: '600' }}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
