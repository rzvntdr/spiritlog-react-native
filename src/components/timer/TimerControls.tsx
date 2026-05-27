import React from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme/scale';

interface Props {
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onDiscard: () => void;
  onSkip: () => void;
}

export default function TimerControls({ isPaused, onPlay, onPause, onStop, onDiscard, onSkip }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const handleLongPressEnd = () => {
    Alert.alert(
      'Discard this session?',
      'Your progress will not be saved.',
      [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onDiscard },
      ]
    );
  };

  return (
    <View style={styles.row}>
      {/* End button — small, secondary */}
      <Pressable
        onPress={onStop}
        onLongPress={handleLongPressEnd}
        hitSlop={12}
        delayLongPress={500}
      >
        <View style={[styles.smallButton, { backgroundColor: c.surface2, borderColor: c.line }]}>
          <Text style={{ fontSize: 18, color: c.textDim }}>✕</Text>
        </View>
      </Pressable>

      {/* Play / Pause — large, primary */}
      <Pressable onPress={isPaused ? onPlay : onPause} hitSlop={4}>
        <View style={[styles.largeButton, { backgroundColor: c.accent }]}>
          <Text style={{ fontSize: 28, color: '#fff', marginLeft: isPaused ? 3 : 0 }}>
            {isPaused ? '▶' : '❚❚'}
          </Text>
        </View>
      </Pressable>

      {/* Skip button — small, secondary */}
      <Pressable onPress={onSkip} hitSlop={12}>
        <View style={[styles.smallButton, { backgroundColor: c.surface2, borderColor: c.line }]}>
          <Text style={{ fontSize: 18, color: c.textDim }}>⏭</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  largeButton: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
