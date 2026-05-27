import React, { useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { RootStackParamList } from '../navigation/navigation';
import { useTheme } from '../theme/ThemeContext';
import { usePresetStore } from '../stores/presetStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getPresetTotalDurationMs, hasInfinitePhase } from '../utils/presetBuilder';
import { formatPhaseDuration } from '../utils/time';
import { radius, spacing, typography } from '../theme/scale';
import PhaseChip from '../components/preset/PhaseChip';
import SoundMarker from '../components/preset/SoundMarker';
import { soundConfigToLabel } from '../utils/presetBuilder';

type Props = NativeStackScreenProps<RootStackParamList, 'PreSession'>;

export default function PreSessionScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const { presetId } = route.params;
  const preset = usePresetStore((s) => s.presets.find((p) => p.id === presetId));

  const screenAwake = useSettingsStore((s) => s.screenAwake);
  const setScreenAwake = useSettingsStore((s) => s.setScreenAwake);

  // Pre-activate keep-awake if enabled so it's ready when the session starts
  useEffect(() => {
    if (screenAwake) {
      activateKeepAwakeAsync('pre-session');
    }
    return () => {
      deactivateKeepAwake('pre-session');
    };
  }, [screenAwake]);

  if (!preset) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={[typography.body, { color: c.textMute }]}>Preset not found.</Text>
      </SafeAreaView>
    );
  }

  const totalMs = getPresetTotalDurationMs(preset);
  const isInfinite = hasInfinitePhase(preset);
  const durationLabel = isInfinite ? 'Open-ended' : formatPhaseDuration(totalMs);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={{ fontSize: 22, color: c.textDim }}>←</Text>
        </Pressable>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Preset title */}
        <Text style={[typography.title, { color: c.onBackground, textAlign: 'center' }]}>
          {preset.name}
        </Text>
        <Text style={[typography.body, { color: c.textMute, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg }]}>
          {durationLabel}
        </Text>

        {/* Phase preview */}
        <View style={[styles.previewCard, { backgroundColor: c.surface }]}>
          <Text style={[typography.label, { color: c.textMute, marginBottom: spacing.sm }]}>
            Session structure
          </Text>
          {preset.elements.map((el, i) => {
            if (el.kind === 'sound') {
              return (
                <View key={i} style={{ marginBottom: spacing.xs }}>
                  <SoundMarker soundId={el.soundId} name={el.name} mode="preview" />
                </View>
              );
            }
            return (
              <View key={i} style={{ marginBottom: spacing.xs }}>
                <PhaseChip
                  type={el.type}
                  name={el.name}
                  durationMs={el.type === 'INFINITE' ? null : el.durationMillis}
                  attachedSounds={el.soundConfigs.map(soundConfigToLabel)}
                  mode="preview"
                />
              </View>
            );
          })}
        </View>

        {/* Session settings */}
        <View style={[styles.settingsCard, { backgroundColor: c.surface }]}>
          <Text style={[typography.label, { color: c.textMute, marginBottom: spacing.md }]}>
            Session settings
          </Text>

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyEm, { color: c.onBackground }]}>☀️  Keep Screen Awake</Text>
              <Text style={[typography.meta, { color: c.textMute, marginTop: 2 }]}>
                Prevent the screen from turning off
              </Text>
            </View>
            <Switch
              value={screenAwake}
              onValueChange={setScreenAwake}
              trackColor={{ false: c.surface2, true: c.tealSoft }}
              thumbColor={screenAwake ? c.accent : c.textDim}
            />
          </View>
        </View>
      </ScrollView>

      {/* Begin button */}
      <View style={[styles.footer, { backgroundColor: c.background }]}>
        <Pressable
          onPress={() => navigation.replace('Timer', { presetId })}
          style={[styles.beginButton, { backgroundColor: c.accent }]}
        >
          <Text style={[typography.bodyEm, { color: '#fff', fontSize: 17 }]}>Begin when ready</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  previewCard: {
    borderRadius: radius.card,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  settingsCard: {
    borderRadius: radius.card,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    padding: spacing.base,
  },
  beginButton: {
    borderRadius: radius.pill,
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
});
