import React from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { PresetTimer } from '../../types/preset';
import { useTheme } from '../../theme/ThemeContext';
import { getPresetTotalDurationMs, hasInfinitePhase } from '../../utils/presetBuilder';
import { formatPhaseDuration } from '../../utils/time';
import { radius, spacing, typography } from '../../theme/scale';
import PresetStrip from './PresetStrip';

interface Props {
  preset: PresetTimer;
  onPress: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function PresetCard({ preset, onPress, onToggleFavorite, onEdit, onDelete }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const totalMs = getPresetTotalDurationMs(preset);
  const isInfinite = hasInfinitePhase(preset);
  const durationLabel = isInfinite ? 'Open-ended' : formatPhaseDuration(totalMs);

  const confirmDelete = () => {
    Alert.alert('Delete Preset', `Delete "${preset.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  const showContextMenu = () => {
    Alert.alert(preset.name, durationLabel, [
      {
        text: preset.isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
        onPress: onToggleFavorite,
      },
      { text: 'Edit', onPress: onEdit },
      { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <Pressable onPress={onPress} onLongPress={showContextMenu} delayLongPress={400}>
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        {/* Header row */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyEm, { color: c.onBackground }]} numberOfLines={1}>
              {preset.name}
            </Text>
            <Text style={[typography.meta, { color: c.textMute, marginTop: 2 }]}>
              {durationLabel}
            </Text>
          </View>
          <Pressable onPress={onToggleFavorite} hitSlop={12}>
            <Text style={{ fontSize: 18, color: preset.isFavorite ? c.favorite : c.textMute }}>
              {preset.isFavorite ? '♥' : '♡'}
            </Text>
          </Pressable>
        </View>

        {/* Elements strip — proportional, no scroll */}
        {preset.elements.length > 0 && (
          <View style={{ marginTop: spacing.sm }}>
            <PresetStrip elements={preset.elements} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
