import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { DurationType } from '../../types/preset';
import { formatTimer } from '../../utils/time';

interface Props {
  displayTimeMs: number;
  progress: number;
  phaseName: string;
  phaseType: DurationType | null;
  isPlayingSound?: boolean;
}

const SIZE = 260;
const STROKE_WIDTH = 4;
const RADIUS = (SIZE - STROKE_WIDTH * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function TimerCircle({ displayTimeMs, progress, phaseName, phaseType, isPlayingSound }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPlayingSound) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPlayingSound]);

  const arcColor =
    phaseType === 'WARMUP' ? c.warmup : phaseType === 'INFINITE' ? c.infinite : c.accent;

  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <View style={{ width: SIZE, height: SIZE, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={c.surfaceVariant}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        {progress > 0 && !isPlayingSound && (
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

      <View style={{ alignItems: 'center' }}>
        {isPlayingSound ? (
          <>
            <Animated.Text style={{ fontSize: 64, transform: [{ scale: pulseAnim }] }}>
              🔔
            </Animated.Text>
            {phaseName !== '' && (
              <Text style={{ fontSize: 16, color: c.onSurface, marginTop: 8, fontWeight: '500' }}>
                {phaseName}
              </Text>
            )}
          </>
        ) : (
          <>
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
          </>
        )}
      </View>
    </View>
  );
}
