import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRestart: () => void;
  onSkip: () => void;
}

export default function TimerControls({ isPaused, onPlay, onPause, onStop, onRestart, onSkip }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 32, marginBottom: 16 }}>
        {/* Restart */}
        <Pressable onPress={onRestart} hitSlop={12}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceVariant, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, color: c.onSurface }}>↺</Text>
          </View>
        </Pressable>

        {/* Play / Pause */}
        <Pressable onPress={isPaused ? onPlay : onPause}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: c.accent,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 28, color: '#fff', marginLeft: isPaused ? 4 : 0 }}>
              {isPaused ? '▶' : '❚❚'}
            </Text>
          </View>
        </Pressable>

        {/* Stop */}
        <Pressable onPress={onStop} hitSlop={12}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceVariant, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, color: c.onSurface }}>■</Text>
          </View>
        </Pressable>
      </View>

      {/* Skip */}
      <Pressable onPress={onSkip} hitSlop={12}>
        <Text style={{ color: c.primary, fontSize: 14, fontWeight: '500' }}>▶❙ Skip to next phase</Text>
      </Pressable>
    </View>
  );
}
