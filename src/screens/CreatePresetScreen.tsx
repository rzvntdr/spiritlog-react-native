import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { RootStackParamList } from '../navigation/navigation';
import { useTheme } from '../theme/ThemeContext';
import { usePresetStore } from '../stores/presetStore';
import { useAchievementStore } from '../stores/achievementStore';
import { PresetTimer, DurationConfig, DurationType, SoundConfig, PresetElement } from '../types/preset';
import { generateUUID } from '../utils/uuid';
import { formatPhaseDuration } from '../utils/time';
import { soundConfigToLabel } from '../utils/presetBuilder';
import { radius, spacing, typography } from '../theme/scale';
import AddElementSheet from '../components/preset/AddElementSheet';
import DurationEditor from '../components/preset/DurationEditor';
import SoundPickerDialog from '../components/preset/SoundPickerDialog';
import PhaseChip from '../components/preset/PhaseChip';
import SoundMarker from '../components/preset/SoundMarker';

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

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [elements, setElements] = useState<BuilderElement[]>([]);

  const [addElementVisible, setAddElementVisible] = useState(false);
  const [durationEditorVisible, setDurationEditorVisible] = useState(false);
  const [soundPickerVisible, setSoundPickerVisible] = useState(false);

  const [editingElementIndex, setEditingElementIndex] = useState<number | null>(null);
  // null => append at end; n => insert at position n
  const [addInsertIndex, setAddInsertIndex] = useState<number | null>(null);

  useEffect(() => {
    if (existingPreset) {
      setName(existingPreset.name);
      setDescription(existingPreset.description);
      const built: BuilderElement[] = existingPreset.elements.map((el): BuilderElement => {
        if (el.kind === 'sound') {
          return { kind: 'sound', id: generateUUID(), name: el.name, soundId: el.soundId };
        }
        return {
          kind: 'duration',
          id: generateUUID(),
          config: { type: el.type, durationMillis: el.durationMillis, name: el.name, soundConfigs: el.soundConfigs },
        };
      });
      setElements(built);
    }
  }, [existingPreset]);

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
  const phaseCount = durationElements.length;
  const canSave = name.trim().length > 0 && elements.length > 0;

  // The AddElement sheet is a <Modal>, and so are the editors. Android can't
  // present a second Modal while the first is still dismissing — the new one
  // silently never appears. Wait for the sheet's close animation to finish
  // before opening the editor.
  const MODAL_SWAP_DELAY = 350;

  const handleOpenAddPhase = () => {
    setEditingElementIndex(null);
    setAddElementVisible(false);
    setTimeout(() => setDurationEditorVisible(true), MODAL_SWAP_DELAY);
  };

  const handleOpenAddSound = () => {
    setEditingElementIndex(null);
    setAddElementVisible(false);
    setTimeout(() => setSoundPickerVisible(true), MODAL_SWAP_DELAY);
  };

  const insertOrAppend = (newEl: BuilderElement) => {
    setElements((prev) => {
      if (addInsertIndex === null) return [...prev, newEl];
      return [...prev.slice(0, addInsertIndex), newEl, ...prev.slice(addInsertIndex)];
    });
    setAddInsertIndex(null);
  };

  const handleSaveDuration = (phaseName: string, type: DurationType, durationMs: number, soundConfigs: SoundConfig[]) => {
    const config: DurationConfig = {
      type,
      durationMillis: durationMs,
      name: phaseName,
      soundConfigs,
    };

    if (editingElementIndex !== null) {
      setElements((prev) =>
        prev.map((e, i) => {
          if (i !== editingElementIndex || e.kind !== 'duration') return e;
          return { ...e, config };
        })
      );
    } else {
      insertOrAppend({ kind: 'duration', id: generateUUID(), config });
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
      insertOrAppend({ kind: 'sound', id: generateUUID(), name: soundName, soundId });
    }
  };

  const removeElement = useCallback((index: number) => {
    setElements((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = async () => {
    const presetElements: PresetElement[] = elements.map((el): PresetElement => {
      if (el.kind === 'sound') {
        return { kind: 'sound', soundId: el.soundId, name: el.name };
      }
      return { kind: 'duration', ...el.config };
    });

    if (!presetElements.some((el) => el.kind === 'duration')) {
      Alert.alert('No Phases', 'Add at least one meditation phase.');
      return;
    }

    const preset: PresetTimer = {
      id: existingPreset?.id ?? generateUUID(),
      name: name.trim(),
      description: description.trim(),
      elements: presetElements,
      isFavorite: existingPreset?.isFavorite ?? false,
      sortOrder: existingPreset?.sortOrder ?? 0,
      lastUsed: existingPreset?.lastUsed ?? 0,
      createdAt: existingPreset?.createdAt ?? Date.now(),
    };

    try {
      if (isEditing) {
        await updatePreset(preset);
      } else {
        await createPreset(preset);
        useAchievementStore.getState().triggerCheck({ type: 'preset_created' });
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Save Failed', e.message ?? 'An error occurred while saving the preset.');
    }
  };

  const editingDurationElement =
    editingElementIndex !== null && elements[editingElementIndex]?.kind === 'duration'
      ? elements[editingElementIndex] as BuilderElement & { kind: 'duration' }
      : null;

  const editingSoundElement =
    editingElementIndex !== null && elements[editingElementIndex]?.kind === 'sound'
      ? elements[editingElementIndex] as BuilderElement & { kind: 'sound' }
      : null;

  const openInsertAt = useCallback((index: number) => {
    setEditingElementIndex(null);
    setAddInsertIndex(index);
    setAddElementVisible(true);
  }, []);

  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<BuilderElement>) => {
    const index = getIndex() ?? 0;

    // "+ Add here" affordance between adjacent items (above every item except the first)
    const insertButton = index > 0 ? (
      <Pressable
        onPress={() => openInsertAt(index)}
        style={{
          alignSelf: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs - 1,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: c.line,
          borderStyle: 'dashed',
          marginVertical: spacing.xs - 2,
        }}
      >
        <Text style={[typography.meta, { color: c.textMute, opacity: 0.7 }]}>+ Add here</Text>
      </Pressable>
    ) : null;

    if (item.kind === 'sound') {
      return (
        <ScaleDecorator>
          {insertButton}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <View style={{ flex: 1 }}>
              <SoundMarker
                soundId={item.soundId}
                name={item.name}
                mode="editor"
                onEdit={() => { setEditingElementIndex(index); setSoundPickerVisible(true); }}
                onDrag={drag}
                isDragging={isActive}
              />
            </View>
            <Pressable onPress={() => removeElement(index)} hitSlop={8} style={{ marginLeft: spacing.sm }}>
              <Text style={{ color: c.error, fontSize: 18 }}>⊖</Text>
            </Pressable>
          </View>
        </ScaleDecorator>
      );
    }

    const cfg = item.config;
    return (
      <ScaleDecorator>
        {insertButton}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs }}>
          <View style={{ flex: 1 }}>
            <PhaseChip
              type={cfg.type}
              name={cfg.name}
              durationMs={cfg.type === 'INFINITE' ? null : cfg.durationMillis}
              attachedSounds={cfg.soundConfigs.map(soundConfigToLabel)}
              mode="editor"
              onEdit={() => {
                setEditingElementIndex(index);
                setDurationEditorVisible(true);
              }}
              onDrag={drag}
              isDragging={isActive}
            />
          </View>
          <Pressable onPress={() => removeElement(index)} hitSlop={8} style={{ marginLeft: spacing.sm, marginTop: spacing.xs + 2 }}>
            <Text style={{ color: c.error, fontSize: 18 }}>⊖</Text>
          </Pressable>
        </View>
      </ScaleDecorator>
    );
  }, [c, removeElement, openInsertAt]);

  const listHeader = useMemo(() => (
    <View style={{ padding: spacing.base }}>
      {/* Preset details */}
      <View style={{ backgroundColor: c.surface, borderRadius: radius.md, padding: spacing.base, marginBottom: spacing.base }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Preset Name"
          placeholderTextColor={c.textMute}
          style={{
            backgroundColor: c.surface2,
            borderRadius: radius.sm,
            padding: spacing.md,
            color: c.onBackground,
            fontSize: 16,
            marginBottom: spacing.sm,
          }}
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Description (optional)"
          placeholderTextColor={c.textMute}
          multiline
          style={{
            backgroundColor: c.surface2,
            borderRadius: radius.sm,
            padding: spacing.md,
            color: c.onBackground,
            fontSize: 15,
            minHeight: 56,
          }}
        />
      </View>

      {/* Elements header */}
      <View style={{ marginBottom: spacing.sm }}>
        <Text style={[typography.section, { color: c.onBackground }]}>Meditation Phases</Text>
        {phaseCount > 0 && (
          <Text style={[typography.meta, { color: c.textMute, marginTop: 2 }]}>
            {totalLabel} · {phaseCount} {phaseCount === 1 ? 'phase' : 'phases'}
          </Text>
        )}
      </View>

      {elements.length === 0 && (
        <View style={{ backgroundColor: c.surface, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.sm }}>
          <Text style={[typography.body, { color: c.textMute, textAlign: 'center' }]}>
            Add phases and sound markers to build your preset.
          </Text>
        </View>
      )}
    </View>
  ), [c, name, description, phaseCount, totalLabel, elements.length]);

  const listFooter = useMemo(() => (
    <View style={{ paddingHorizontal: spacing.base }}>
      <Pressable
        onPress={() => { setAddInsertIndex(null); setAddElementVisible(true); }}
        style={{
          backgroundColor: c.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: c.line,
          borderStyle: 'dashed',
          paddingVertical: spacing.md,
          alignItems: 'center',
          marginBottom: spacing.sm,
        }}
      >
        <Text style={[typography.bodyEm, { color: c.accent }]}>+ Add Element</Text>
      </Pressable>
      <View style={{ height: 100 }} />
    </View>
  ), [c]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.base }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={{ fontSize: 22, color: c.textDim }}>✕</Text>
        </Pressable>
        <Text style={[typography.section, { flex: 1, textAlign: 'center', color: c.onBackground }]}>
          {isEditing ? 'Edit Preset' : 'Create Preset'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <DraggableFlatList
        data={elements}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={({ data }) => setElements(data)}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={{ paddingHorizontal: spacing.base }}
        containerStyle={{ flex: 1 }}
      />

      {/* Save Button */}
      <View style={{ padding: spacing.base, backgroundColor: c.background }}>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={{
            backgroundColor: c.primaryContainer,
            borderRadius: radius.pill,
            padding: spacing.base,
            alignItems: 'center',
            opacity: canSave ? 1 : 0.4,
          }}
        >
          <Text style={[typography.bodyEm, { color: c.onPrimary }]}>✓ Save Preset</Text>
        </Pressable>
      </View>

      {/* Dialogs */}
      <AddElementSheet
        visible={addElementVisible}
        onClose={() => setAddElementVisible(false)}
        onAddPhase={handleOpenAddPhase}
        onAddSoundMarker={handleOpenAddSound}
      />

      <DurationEditor
        visible={durationEditorVisible}
        onClose={() => { setDurationEditorVisible(false); setEditingElementIndex(null); setAddInsertIndex(null); }}
        onSave={handleSaveDuration}
        initialName={editingDurationElement?.config.name ?? 'Meditation'}
        initialType={editingDurationElement?.config.type ?? 'NORMAL'}
        initialDurationMs={editingDurationElement?.config.durationMillis ?? 600_000}
        initialSoundConfigs={editingDurationElement?.config.soundConfigs ?? []}
        title={editingElementIndex !== null ? 'Edit Phase' : 'Add Phase'}
      />

      <SoundPickerDialog
        visible={soundPickerVisible}
        onClose={() => { setSoundPickerVisible(false); setEditingElementIndex(null); setAddInsertIndex(null); }}
        onSave={handleSaveSound}
        initialSoundId={editingSoundElement?.soundId ?? 1}
        title={editingElementIndex !== null ? 'Edit Sound' : 'Add Sound'}
      />
    </SafeAreaView>
  );
}
