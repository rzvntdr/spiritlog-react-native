import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/scale';
import { getSoundById } from '../../types/sound';
import { ChipMode } from './PhaseChip';

type Props = {
  soundId: number;
  name: string;
  mode: ChipMode;
  onEdit?: () => void;
  onDrag?: () => void;
  isDragging?: boolean;
};

export default function SoundMarker({ soundId, name, mode, onEdit, onDrag, isDragging }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const asset = getSoundById(soundId);
  const emoji = asset?.emoji ?? '🎵';
  // The sound's own name is the label — no custom naming (see SoundPickerDialog).
  const label = asset?.name ?? name;

  const inner = (
    <View
      style={[
        styles.marker,
        {
          backgroundColor: isDragging ? c.surface3 : c.surface,
          borderColor: c.line,
        },
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text
        style={[typography.meta, { color: c.textDim, marginLeft: spacing.xs - 2 }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {mode === 'editor' && (
        <Pressable onLongPress={onDrag} delayLongPress={300} hitSlop={8} style={styles.dragHandle}>
          <Text style={{ fontSize: 14, color: c.textMute, opacity: 0.45 }}>≡</Text>
        </Pressable>
      )}
    </View>
  );

  if (mode === 'preview') return inner;

  return (
    <Pressable onPress={onEdit} style={styles.pressable}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: spacing.xs,
  },
  marker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    alignSelf: 'flex-start',
  },
  emoji: {
    fontSize: 13,
  },
  dragHandle: {
    marginLeft: spacing.sm,
  },
});
