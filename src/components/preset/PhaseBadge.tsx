import React from 'react';
import { View, Text } from 'react-native';
import { DurationConfig } from '../../types/preset';
import { useTheme } from '../../theme/ThemeContext';
import { formatPhaseDuration } from '../../utils/time';
import { radius, spacing, typography } from '../../theme/scale';

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
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs - 1,
        marginRight: spacing.sm - 2,
      }}
    >
      <Text style={{ ...typography.micro, color: theme.colors.onPrimary }}>{label}</Text>
    </View>
  );
}
