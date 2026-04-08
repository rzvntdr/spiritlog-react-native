import React from 'react';
import { View, Text } from 'react-native';
import { DurationConfig } from '../../types/preset';
import { useTheme } from '../../theme/ThemeContext';
import { formatPhaseDuration } from '../../utils/time';

interface Props {
  phase: DurationConfig;
}

export default function PhaseBadge({ phase }: Props) {
  const { theme } = useTheme();

  const bgColor =
    phase.type === 'WARMUP'
      ? theme.colors.warmup
      : phase.type === 'INFINITE'
      ? theme.colors.infinite
      : theme.colors.primaryContainer;

  const label = phase.type === 'INFINITE' ? '∞' : formatPhaseDuration(phase.durationMillis);

  return (
    <View
      style={{
        backgroundColor: bgColor,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginRight: 6,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
