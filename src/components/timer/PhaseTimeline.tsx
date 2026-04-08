import React from 'react';
import { View, Text } from 'react-native';
import { MeditationElement } from '../../types/timer';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  elements: MeditationElement[];
  currentIndex: number;
}

export default function PhaseTimeline({ elements, currentIndex }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
      {elements.map((el, i) => {
        const isCurrent = i === currentIndex;
        const isCompleted = i < currentIndex;
        const isSound = el.kind === 'sound';

        let bgColor: string;
        if (isCurrent) {
          bgColor = isSound
            ? c.accent
            : el.kind === 'duration'
            ? el.type === 'WARMUP'
              ? c.warmup
              : el.type === 'INFINITE'
              ? c.infinite
              : c.accent
            : c.accent;
        } else if (isCompleted) {
          bgColor = c.primary;
        } else {
          bgColor = c.surfaceVariant;
        }

        const size = isCurrent ? 32 : 24;
        const icon = isSound ? '♪' : '⏱';
        const iconSize = isCurrent ? 14 : 11;
        const iconColor = isCurrent || isCompleted ? '#fff' : c.onSurface;

        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <View
                style={{
                  height: 2,
                  width: 12,
                  backgroundColor: isCompleted ? c.primary : c.surfaceVariant,
                }}
              />
            )}
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: bgColor,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: iconSize, color: iconColor }}>{icon}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}
