import React from 'react';
import { View, Text, Pressable } from 'react-native';
import BottomSheet from '../common/BottomSheet';
import { useTheme } from '../../theme/ThemeContext';
import { DurationType } from '../../types/preset';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddSound: () => void;
  onAddDuration: (type: DurationType) => void;
}

export default function AddElementSheet({ visible, onClose, onAddSound, onAddDuration }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const durationTypes: { type: DurationType; label: string; icon: string; color: string }[] = [
    { type: 'WARMUP', label: 'Warm-up', icon: '⏳', color: c.warmup },
    { type: 'NORMAL', label: 'Normal', icon: '🕐', color: c.accent },
    { type: 'INFINITE', label: 'Infinite', icon: '∞', color: c.infinite },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Add Element">
      {/* Sound */}
      <Pressable
        onPress={() => { onAddSound(); onClose(); }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: c.surfaceVariant,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 24, marginRight: 14 }}>🎵</Text>
        <View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: c.onBackground }}>Sound Marker</Text>
          <Text style={{ fontSize: 12, color: c.onSurface }}>Play a sound between phases</Text>
        </View>
      </Pressable>

      {/* Duration types */}
      {durationTypes.map((dt) => (
        <Pressable
          key={dt.type}
          onPress={() => { onAddDuration(dt.type); onClose(); }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.surfaceVariant,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: dt.color,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 14,
            }}
          >
            <Text style={{ fontSize: 18, color: '#fff' }}>{dt.icon}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: c.onBackground }}>{dt.label} Phase</Text>
            <Text style={{ fontSize: 12, color: c.onSurface }}>
              {dt.type === 'WARMUP' && 'Short preparation phase (counts up)'}
              {dt.type === 'NORMAL' && 'Timed meditation phase (counts down)'}
              {dt.type === 'INFINITE' && 'Open-ended, stop when ready'}
            </Text>
          </View>
        </Pressable>
      ))}
    </BottomSheet>
  );
}
