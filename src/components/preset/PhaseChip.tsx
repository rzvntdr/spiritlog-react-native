import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/scale';
import { DurationType, SoundIntervalType } from '../../types/preset';
import { getSoundById } from '../../types/sound';

export type ChipMode = 'card' | 'editor' | 'preview';

export type AttachedSound = {
  soundId: number;
  type: SoundIntervalType;
  paramsLabel?: string;
};

type Props = {
  type: DurationType;
  name: string;
  durationMs: number | null;   // null for INFINITE
  attachedSounds?: AttachedSound[];
  mode: ChipMode;
  onEdit?: () => void;
  onDrag?: () => void;         // editor mode drag trigger
  isDragging?: boolean;
};

function typeEmoji(t: DurationType): string {
  switch (t) {
    case 'WARMUP':   return '🌅';
    case 'INFINITE': return '∞';
    default:         return '🧘';
  }
}

function formatMs(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  const remainMin = min % 60;
  return remainMin > 0 ? `${hr}h ${remainMin}m` : `${hr}h`;
}

export default function PhaseChip({
  type,
  name,
  durationMs,
  attachedSounds = [],
  mode,
  onEdit,
  onDrag,
  isDragging,
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const typeColor =
    type === 'WARMUP' ? c.warmup :
    type === 'INFINITE' ? c.accent :
    c.accent;

  const bgColor =
    type === 'WARMUP'   ? `${c.warmup}22` :
    type === 'INFINITE' ? 'transparent' :
    `${c.accent}18`;

  const borderColor =
    type === 'WARMUP'   ? `${c.warmup}60` :
    type === 'INFINITE' ? c.accent :
    `${c.accent}50`;

  const borderStyle = type === 'INFINITE' ? 'dashed' : 'solid';

  const durationLabel = durationMs === null ? '∞' : formatMs(durationMs);

  const inner = (
    <View
      style={[
        styles.chip,
        mode === 'card' && styles.chipCard,
        {
          backgroundColor: isDragging ? c.surface3 : bgColor,
          borderColor,
          borderStyle,
        },
      ]}
    >
      {/* Type dot + name row */}
      <View style={styles.topRow}>
        <View style={[styles.typeDot, { backgroundColor: typeColor }]}>
          <Text style={styles.typeEmoji}>{typeEmoji(type)}</Text>
        </View>
        <Text
          style={[typography.bodyEm, { color: c.onBackground, flex: 1, flexShrink: 1, marginHorizontal: spacing.xs }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {name}
        </Text>
        <Text style={[typography.meta, { color: c.textMute, fontVariant: ['tabular-nums'] }]}>
          {durationLabel}
        </Text>
        {mode === 'editor' && (
          <Pressable onLongPress={onDrag} delayLongPress={300} hitSlop={8} style={styles.dragHandle}>
            <Text style={{ fontSize: 16, color: c.textMute, opacity: 0.5 }}>≡</Text>
          </Pressable>
        )}
      </View>

      {/* Attached sounds — compact single line */}
      {attachedSounds.length > 0 && (
        <Text
          style={[typography.meta, { color: c.textDim, marginTop: 3, marginLeft: spacing.xl - 4 }]}
          numberOfLines={1}
        >
          {attachedSounds
            .map((s) => {
              const asset = getSoundById(s.soundId);
              const emoji = asset?.emoji ?? '🎵';
              return s.paramsLabel ? `${emoji} ${s.paramsLabel}` : emoji;
            })
            .join('   ')}
        </Text>
      )}
    </View>
  );

  if (mode === 'preview') {
    return inner;
  }

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
  chip: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipCard: {
    width: 220,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeEmoji: {
    fontSize: 11,
  },
  dragHandle: {
    marginLeft: spacing.xs,
    paddingHorizontal: 4,
  },
});
