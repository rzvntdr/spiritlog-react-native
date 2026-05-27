import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { MeditationElement } from '../../types/timer';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/scale';
import { ThemeColors } from '../../theme/tokens';

interface Props {
  elements: MeditationElement[];
  currentIndex: number;
}

function emojiFor(el: MeditationElement): string {
  if (el.kind === 'sound') return '🎵';
  switch (el.type) {
    case 'WARMUP':   return '🌅';
    case 'INFINITE': return '∞';
    default:         return '🧘';
  }
}

function phaseAccentColor(el: MeditationElement, c: ThemeColors): string {
  if (el.kind === 'sound') return c.accent;
  switch (el.type) {
    case 'WARMUP':   return c.warmup;
    case 'INFINITE': return c.accent;
    default:         return c.accent;
  }
}

interface NodeProps {
  el: MeditationElement;
  isCurrent: boolean;
  isCompleted: boolean;
}

function PhaseNode({ el, isCurrent, isCompleted }: NodeProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isCurrent) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.82, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => {
      loopRef.current?.stop();
    };
  }, [isCurrent]);

  const size = isCurrent ? 34 : 24;
  const bgColor = isCurrent
    ? phaseAccentColor(el, c)
    : isCompleted
    ? c.tealSoft
    : c.surface3;

  const staticOpacity = isCurrent ? undefined : isCompleted ? 0.35 : 0.45;
  const textColor = isCurrent ? '#fff' : isCompleted ? c.textMute : c.textDim;
  const emoji = emojiFor(el);

  return (
    <Animated.View
      style={[
        styles.node,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
          opacity: isCurrent ? pulseAnim : staticOpacity,
        },
      ]}
    >
      <Text style={{ fontSize: isCurrent ? 15 : 11, color: textColor }}>{emoji}</Text>
    </Animated.View>
  );
}

export default function PhaseTimeline({ elements, currentIndex }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={styles.row}>
      {elements.map((el, i) => {
        const isCurrent = i === currentIndex;
        const isCompleted = i < currentIndex;

        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor: isCompleted ? c.tealSoft : c.line,
                    opacity: isCompleted ? 0.5 : 0.3,
                  },
                ]}
              />
            )}
            <PhaseNode el={el} isCurrent={isCurrent} isCompleted={isCompleted} />
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  node: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  connector: {
    height: 2,
    width: 14,
  },
});
