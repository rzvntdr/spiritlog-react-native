import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation';
import { useTheme } from '../theme/ThemeContext';
import { usePresetStore } from '../stores/presetStore';
import { PresetTimer, DurationConfig, DurationType, SoundConfig } from '../types/preset';
import { getSoundById } from '../types/sound';
import { generateUUID } from '../utils/uuid';
import { formatPhaseDuration } from '../utils/time';
import { getPresetTotalDurationMs, hasInfinitePhase } from '../utils/presetBuilder';
import PhaseBadge from '../components/preset/PhaseBadge';
import AddElementSheet from '../components/preset/AddElementSheet';
import DurationEditor from '../components/preset/DurationEditor';
import SoundPickerDialog from '../components/preset/SoundPickerDialog';
import SoundConfigDialog from '../components/preset/SoundConfigDialog';

// Internal element representation for the builder
type BuilderElement =
  | { kind: 'sound'; id: string; name: string; soundId: number }
  | { kind: 'duration'; id: string; config: DurationConfig };

type Props = NativeStackScreenProps<RootStackParamList, 'CreatePreset' | 'EditPreset'>;

export default function CreatePresetScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const isEditing = route.name === 'EditPreset';
  const editPresetId = isEditing ? (route.params as { presetId: string }).presetId : null;

  const presets = usePresetStore((s) => s.presets);
  const createPreset = usePresetStore((s) => s.createPreset);
  const updatePreset = usePresetStore((s) => s.updatePreset);

  const existingPreset = editPresetId ? presets.find((p) => p.id === editPresetId) : null;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [elements, setElements] = useState<BuilderElement[]>([]);

  // Dialog visibility
  const [addElementVisible, setAddElementVisible] = useState(false);
  const [durationEditorVisible, setDurationEditorVisible] = useState(false);
  const [soundPickerVisible, setSoundPickerVisible] = useState(false);
  const [soundConfigVisible, setSoundConfigVisible] = useState(false);

  // Editing state for dialogs
  const [editingElementIndex, setEditingElementIndex] = useState<number | null>(null);
  const [newDurationType, setNewDurationType] = useState<DurationType>('NORMAL');

  // Load existing preset for editing
  useEffect(() => {
    if (existingPreset) {
      setName(existingPreset.name);
      setDescription(existingPreset.description);
      // Convert preset durations to builder elements
      // For simplicity: each DurationConfig becomes a duration element
      // with start/end sounds as separate sound elements
      const built: BuilderElement[] = [];
      for (const dur of existingPreset.durations) {
        if (dur.startSound) {
          const sound = getSoundById(dur.startSound);
          built.push({ kind: 'sound', id: generateUUID(), name: `Start ${dur.name}`, soundId: dur.startSound });
        }
        built.push({ kind: 'duration', id: generateUUID(), config: { ...dur } });
        if (dur.endSound) {
          built.push({ kind: 'sound', id: generateUUID(), name: `End ${dur.name}`, soundId: dur.endSound });
        }
      }
      setElements(built);
    }
  }, [existingPreset]);

  // Compute total duration from duration elements
  const durationElements = useMemo(
    () => elements.filter((e): e is BuilderElement & { kind: 'duration' } => e.kind === 'duration'),
    [elements]
  );

  const totalMs = useMemo(
    () => durationElements.reduce((sum, e) => sum + (e.config.type === 'INFINITE' ? 0 : e.config.durationMillis), 0),
    [durationElements]
  );

  const isInfinite = durationElements.some((e) => e.config.type === 'INFINITE');
  const totalLabel = isInfinite ? '∞' : formatPhaseDuration(totalMs);
  const canSave = name.trim().length > 0 && elements.length > 0;

  // --- Handlers ---

  const handleAddDuration = (type: DurationType) => {
    setNewDurationType(type);
    setEditingElementIndex(null);
    setDurationEditorVisible(true);
  };

  const handleAddSound = () => {
    setEditingElementIndex(null);
    setSoundPickerVisible(true);
  };

  const handleSaveDuration = (phaseName: string, type: DurationType, durationMs: number) => {
    const config: DurationConfig = {
      type,
      durationMillis: durationMs,
      name: phaseName,
      startSound: null,
      endSound: null,
      soundConfigs: [],
    };

    if (editingElementIndex !== null) {
      setElements((prev) =>
        prev.map((e, i) => (i === editingElementIndex ? { ...e, config } as BuilderElement : e))
      );
    } else {
      setElements((prev) => [...prev, { kind: 'duration', id: generateUUID(), config }]);
    }
  };

  const handleSaveSound = (soundName: string, soundId: number) => {
    if (editingElementIndex !== null) {
      setElements((prev) =>
        prev.map((e, i) =>
          i === editingElementIndex ? { ...e, name: soundName, soundId } as BuilderElement : e
        )
      );
    } else {
      setElements((prev) => [...prev, { kind: 'sound', id: generateUUID(), name: soundName, soundId }]);
    }
  };

  const handleSaveSoundConfig = (startSound: number | null, endSound: number | null, soundConfigs: SoundConfig[]) => {
    if (editingElementIndex !== null) {
      setElements((prev) =>
        prev.map((e, i) => {
          if (i === editingElementIndex && e.kind === 'duration') {
            return { ...e, config: { ...e.config, startSound, endSound, soundConfigs } };
          }
          return e;
        })
      );
    }
  };

  const removeElement = (index: number) => {
    setElements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Convert builder elements to PresetTimer
    const durations: DurationConfig[] = [];
    let currentDuration: DurationConfig | null = null;

    for (const el of elements) {
      if (el.kind === 'duration') {
        if (currentDuration) durations.push(currentDuration);
        currentDuration = { ...el.config };
      } else if (el.kind === 'sound') {
        // Attach to nearest duration as start or end sound
        // If no current duration yet, it's a start sound for the next one
        // If there is one, it's an end sound for the current one
      }
    }
    if (currentDuration) durations.push(currentDuration);

    // If no duration elements, just use the raw sound/duration list
    // Simpler approach: just extract all duration elements directly
    const finalDurations = elements
      .filter((e): e is BuilderElement & { kind: 'duration' } => e.kind === 'duration')
      .map((e) => e.config);

    if (finalDurations.length === 0) {
      Alert.alert('No Phases', 'Add at least one meditation phase.');
      return;
    }

    const preset: PresetTimer = {
      id: existingPreset?.id ?? generateUUID(),
      name: name.trim(),
      description: description.trim(),
      durations: finalDurations,
      isFavorite: existingPreset?.isFavorite ?? false,
      sortOrder: existingPreset?.sortOrder ?? 0,
      lastUsed: existingPreset?.lastUsed ?? 0,
      createdAt: existingPreset?.createdAt ?? Date.now(),
    };

    if (isEditing) {
      await updatePreset(preset);
    } else {
      await createPreset(preset);
    }
    navigation.goBack();
  };

  // Get the currently editing element for the dialogs
  const editingDurationElement =
    editingElementIndex !== null && elements[editingElementIndex]?.kind === 'duration'
      ? elements[editingElementIndex] as BuilderElement & { kind: 'duration' }
      : null;

  const editingSoundElement =
    editingElementIndex !== null && elements[editingElementIndex]?.kind === 'sound'
      ? elements[editingElementIndex] as BuilderElement & { kind: 'sound' }
      : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={{ fontSize: 24, color: c.onSurface }}>✕</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '600', color: c.onBackground }}>
          {isEditing ? 'Edit Preset' : 'Create Preset'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Preset Details */}
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: c.onBackground, marginBottom: 8 }}>
            Preset Details
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Preset Name"
            placeholderTextColor={c.onSurface}
            style={{
              backgroundColor: c.surfaceVariant,
              borderRadius: 8,
              padding: 12,
              color: c.onBackground,
              fontSize: 16,
              marginBottom: 10,
            }}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor={c.onSurface}
            multiline
            style={{
              backgroundColor: c.surfaceVariant,
              borderRadius: 8,
              padding: 12,
              color: c.onBackground,
              fontSize: 16,
              minHeight: 60,
            }}
          />
        </View>

        {/* Duration Preview */}
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: c.onBackground, marginBottom: 8 }}>
            Duration Preview
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ backgroundColor: c.primaryContainer, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }}>
              <Text style={{ color: c.onPrimary, fontWeight: '700', fontSize: 18 }}>{totalLabel}</Text>
            </View>
            {durationElements.length > 0 && (
              <View style={{ flexDirection: 'row' }}>
                {durationElements.map((e, i) => (
                  <PhaseBadge key={e.id} phase={e.config} />
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Meditation Elements */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: c.onBackground }}>
            Meditation Elements
          </Text>
          <Pressable
            onPress={() => setAddElementVisible(true)}
            style={{ backgroundColor: c.primaryContainer, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Text style={{ color: c.onPrimary, fontWeight: '600' }}>+ Add Element</Text>
          </Pressable>
        </View>

        {elements.length === 0 && (
          <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ color: c.onSurface, textAlign: 'center' }}>
              No elements yet. Add sounds and meditation phases to build your preset.
            </Text>
          </View>
        )}

        {elements.map((element, index) => {
          if (element.kind === 'sound') {
            const sound = getSoundById(element.soundId);
            return (
              <Pressable
                key={element.id}
                onPress={() => { setEditingElementIndex(index); setSoundPickerVisible(true); }}
              >
                <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.accent, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Text style={{ fontSize: 16, color: '#fff' }}>🎵</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: c.onBackground }}>{element.name}</Text>
                    <Text style={{ fontSize: 12, color: c.onSurface }}>{sound?.name ?? 'Unknown'}</Text>
                  </View>
                  <Pressable hitSlop={8} style={{ marginLeft: 8 }}>
                    <Text style={{ color: c.accent }}>▶</Text>
                  </Pressable>
                  <Pressable onPress={() => removeElement(index)} hitSlop={8} style={{ marginLeft: 12 }}>
                    <Text style={{ color: c.error, fontSize: 18 }}>⊖</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          }

          // Duration element
          const cfg = element.config;
          const typeColor = cfg.type === 'WARMUP' ? c.warmup : cfg.type === 'INFINITE' ? c.infinite : c.accent;

          return (
            <View key={element.id} style={{ backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: typeColor, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Text style={{ fontSize: 16, color: '#fff' }}>⏱</Text>
                </View>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => {
                    setEditingElementIndex(index);
                    setNewDurationType(cfg.type);
                    setDurationEditorVisible(true);
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: c.onBackground }}>{cfg.name}</Text>
                  <Text style={{ fontSize: 12, color: c.onSurface }}>
                    {cfg.type === 'INFINITE' ? 'Infinite' : formatPhaseDuration(cfg.durationMillis)} · {cfg.type.toLowerCase().replace('_', ' ')}
                  </Text>
                </Pressable>
                <Pressable onPress={() => removeElement(index)} hitSlop={8} style={{ marginLeft: 12 }}>
                  <Text style={{ color: c.error, fontSize: 18 }}>⊖</Text>
                </Pressable>
              </View>
              {/* Configure Interval Sounds button */}
              <Pressable
                onPress={() => { setEditingElementIndex(index); setSoundConfigVisible(true); }}
                style={{ marginTop: 8, marginLeft: 48 }}
              >
                <Text style={{ color: c.primary, fontSize: 13, fontWeight: '600' }}>
                  🎵 Configure Interval Sounds
                  {cfg.soundConfigs.length > 0 && ` (${cfg.soundConfigs.length})`}
                </Text>
              </Pressable>
            </View>
          );
        })}

        {/* Spacer for save button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={{ padding: 16, backgroundColor: c.background }}>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={{
            backgroundColor: c.primaryContainer,
            borderRadius: 24,
            padding: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            opacity: canSave ? 1 : 0.4,
          }}
        >
          <Text style={{ color: c.onPrimary, fontSize: 16, fontWeight: '600' }}>
            ✓ Save Preset
          </Text>
        </Pressable>
      </View>

      {/* Dialogs */}
      <AddElementSheet
        visible={addElementVisible}
        onClose={() => setAddElementVisible(false)}
        onAddSound={handleAddSound}
        onAddDuration={handleAddDuration}
      />

      <DurationEditor
        visible={durationEditorVisible}
        onClose={() => { setDurationEditorVisible(false); setEditingElementIndex(null); }}
        onSave={handleSaveDuration}
        initialName={editingDurationElement?.config.name ?? 'Meditation'}
        initialType={editingDurationElement?.config.type ?? newDurationType}
        initialDurationMs={editingDurationElement?.config.durationMillis ?? 600_000}
        title={editingElementIndex !== null ? 'Edit Phase' : 'Add Phase'}
      />

      <SoundPickerDialog
        visible={soundPickerVisible}
        onClose={() => { setSoundPickerVisible(false); setEditingElementIndex(null); }}
        onSave={handleSaveSound}
        initialName={editingSoundElement?.name ?? 'Sound'}
        initialSoundId={editingSoundElement?.soundId ?? 1}
        title={editingElementIndex !== null ? 'Edit Sound' : 'Add Sound'}
      />

      {editingDurationElement && (
        <SoundConfigDialog
          visible={soundConfigVisible}
          onClose={() => { setSoundConfigVisible(false); setEditingElementIndex(null); }}
          onSave={handleSaveSoundConfig}
          phase={editingDurationElement.config}
        />
      )}
    </SafeAreaView>
  );
}
