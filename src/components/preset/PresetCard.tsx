import React, { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { PresetTimer } from '../../types/preset';
import { useTheme } from '../../theme/ThemeContext';
import { formatPhaseDuration } from '../../utils/time';
import { getPresetTotalDurationMs, getPhaseCount, hasInfinitePhase } from '../../utils/presetBuilder';
import PhaseBadge from './PhaseBadge';

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
  const [expanded, setExpanded] = useState(false);

  const totalMs = getPresetTotalDurationMs(preset);
  const phaseCount = getPhaseCount(preset);
  const isInfinite = hasInfinitePhase(preset);
  const durationLabel = isInfinite ? '∞' : formatPhaseDuration(totalMs);

  const confirmDelete = () => {
    Alert.alert('Delete Preset', `Are you sure you want to delete "${preset.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          backgroundColor: expanded ? c.surfaceVariant : c.surface,
          borderRadius: 12,
          padding: 16,
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Timer icon */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: c.surfaceVariant,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Text style={{ fontSize: 18 }}>⏱</Text>
          </View>

          {/* Name & info */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: c.onBackground }}>
              {preset.name}
            </Text>
            <Text style={{ fontSize: 12, color: c.onSurface, marginTop: 2 }}>
              {durationLabel} · {phaseCount} {phaseCount === 1 ? 'phase' : 'phases'}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              {preset.durations.map((phase, i) => (
                <PhaseBadge key={i} phase={phase} />
              ))}
            </View>
          </View>

          {/* Favorite + expand */}
          <Pressable onPress={onToggleFavorite} hitSlop={12} style={{ marginRight: 8 }}>
            <Text style={{ fontSize: 20, color: preset.isFavorite ? c.favorite : c.onSurface }}>
              {preset.isFavorite ? '♥' : '♡'}
            </Text>
          </Pressable>
          <Pressable onPress={() => setExpanded(!expanded)} hitSlop={12}>
            <Text style={{ fontSize: 18, color: c.onSurface }}>
              {expanded ? '⌃' : '⌄'}
            </Text>
          </Pressable>
        </View>

        {/* Expanded actions */}
        {expanded && (
          <View style={{ flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.surface }}>
            <Pressable onPress={onEdit} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 24 }}>
              <Text style={{ color: c.primary, fontWeight: '600' }}>✎ Edit</Text>
            </Pressable>
            <Pressable onPress={confirmDelete} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: c.error, fontWeight: '600' }}>🗑 Delete</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Pressable>
  );
}
