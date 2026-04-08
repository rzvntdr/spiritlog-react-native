import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { DurationType } from '../../types/preset';
import { formatTimer } from '../../utils/time';

interface Props {
  displayTimeMs: number;
  progress: number; // 0–1
  phaseName: string;
  phaseType: DurationType | null;
}

const SIZE = 260;
const STROKE_WIDTH = 4;
const RADIUS = (SIZE - STROKE_WIDTH * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function TimerCircle({ displayTimeMs, progress, phaseName, phaseType }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const arcColor =
    phaseType === 'WARMUP' ? c.warmup : phaseType === 'INFINITE' ? c.infinite : c.accent;

  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <View style={{ width: SIZE, height: SIZE, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        {/* Background circle */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={c.surfaceVariant}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        {/* Progress arc */}
        {progress > 0 && (
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={arcColor}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        )}
      </Svg>

      {/* Center content */}
      <View style={{ alignItems: 'center' }}>
        {phaseName !== '' && (
          <Text style={{ fontSize: 16, color: arcColor, marginBottom: 8, fontWeight: '500' }}>
            {phaseName}
          </Text>
        )}
        <Text
          style={{
            fontSize: 52,
            fontWeight: '200',
            color: c.onBackground,
            fontVariant: ['tabular-nums'],
            letterSpacing: 2,
          }}
        >
          {formatTimer(displayTimeMs)}
        </Text>
      </View>
    </View>
  );
}
