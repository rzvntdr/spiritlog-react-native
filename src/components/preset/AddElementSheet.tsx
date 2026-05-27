import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import BottomSheet from '../common/BottomSheet';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/scale';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddPhase: () => void;
  onAddSoundMarker: () => void;
}

export default function AddElementSheet({ visible, onClose, onAddPhase, onAddSoundMarker }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Add Element">
      {/* Add Phase */}
      <Pressable
        onPress={() => { onAddPhase(); onClose(); }}
        style={[styles.option, { backgroundColor: c.surface2 }]}
      >
        <View style={[styles.icon, { backgroundColor: `${c.accent}28` }]}>
          <Text style={styles.iconText}>🧘</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyEm, { color: c.onBackground }]}>Add Phase</Text>
          <Text style={[typography.meta, { color: c.textMute, marginTop: 2 }]}>
            Warmup, timed, or open-ended meditation
          </Text>
        </View>
      </Pressable>

      {/* Add Sound Marker */}
      <Pressable
        onPress={() => { onAddSoundMarker(); onClose(); }}
        style={[styles.option, { backgroundColor: c.surface2 }]}
      >
        <View style={[styles.icon, { backgroundColor: `${c.warmup}28` }]}>
          <Text style={styles.iconText}>🎵</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyEm, { color: c.onBackground }]}>Add Sound Marker</Text>
          <Text style={[typography.meta, { color: c.textMute, marginTop: 2 }]}>
            Play a sound between phases
          </Text>
        </View>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
});
