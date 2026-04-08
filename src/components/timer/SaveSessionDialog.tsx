import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { formatTimer } from '../../utils/time';

interface Props {
  visible: boolean;
  elapsedMs: number;
  presetTotalMinutes: number;
  onSave: (durationMinutes: number) => void;
  onDiscard: () => void;
}

export default function SaveSessionDialog({ visible, elapsedMs, presetTotalMinutes, onSave, onDiscard }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const defaultMinutes = Math.max(1, Math.round(elapsedMs / 60000));
  const [minutes, setMinutes] = useState(String(presetTotalMinutes > 0 ? presetTotalMinutes : defaultMinutes));

  React.useEffect(() => {
    if (visible) {
      const val = presetTotalMinutes > 0 ? presetTotalMinutes : Math.max(1, Math.round(elapsedMs / 60000));
      setMinutes(String(val));
    }
  }, [visible, elapsedMs, presetTotalMinutes]);

  const handleSave = () => {
    const parsed = parseInt(minutes, 10);
    onSave(isNaN(parsed) || parsed < 1 ? 1 : parsed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 32 }}>
        <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: c.onBackground, marginBottom: 8 }}>
            Save Meditation Session
          </Text>

          <Text style={{ color: c.onSurface, marginBottom: 12 }}>Your Meditation Time</Text>

          <Text
            style={{
              fontSize: 44,
              fontWeight: '300',
              color: c.accent,
              fontVariant: ['tabular-nums'],
              marginBottom: 20,
            }}
          >
            {formatTimer(elapsedMs)}
          </Text>

          <Text style={{ color: c.onSurface, fontSize: 13, marginBottom: 6 }}>Total Time (minutes)</Text>
          <TextInput
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            style={{
              backgroundColor: c.surfaceVariant,
              borderRadius: 8,
              padding: 12,
              color: c.onBackground,
              fontSize: 20,
              fontWeight: '700',
              textAlign: 'center',
              width: 120,
              marginBottom: 8,
            }}
          />
          <Text style={{ color: c.onSurface, fontSize: 11, marginBottom: 24 }}>
            You can adjust the total time if needed
          </Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={onDiscard} style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
              <Text style={{ color: c.primary, fontWeight: '600' }}>Don't Save</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={{ backgroundColor: c.primaryContainer, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}
            >
              <Text style={{ color: c.onPrimary, fontWeight: '600' }}>Save Session</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
