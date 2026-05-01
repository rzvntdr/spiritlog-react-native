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
import { getSoundById } from '../types/sound';
import { generateUUID } from '../utils/uuid';
import { formatPhaseDuration } from '../utils/time';
import AddElementSheet from '../components/preset/AddElementSheet';
import DurationEditor from '../components/preset/DurationEditor';
import SoundPickerDialog from '../components/preset/SoundPickerDialog';
import IntervalSoundDialog from '../components/preset/IntervalSoundDialog';

type BuilderElement =
  | { kind: 'sound'; id: string; name: string; soundId: number }
  | { kind: 'duration'; id: string; config: DurationConfig };

type Props = NativeStackScreenProps<RootStackParamList, 'CreatePreset' | 'EditPreset'>;

function getPhaseSoundLabel(config: SoundConfig): string {
  const sound = getSoundById(config.soundId);
  const name = sound?.name ?? 'Unknown';
  if (config.type === 'FIXED_INTERVAL') {
    const secs = (config.params as { intervalMillis: number }).intervalMillis / 1000;
    return `${name} · every ${secs}s`;
  }
  if (config.type === 'RANDOM_INTERVAL') {
    const p = config.params as { minIntervalMillis: number; maxIntervalMillis: number };
    return `${name} · ${p.minIntervalMillis / 1000}s–${p.maxIntervalMillis / 1000}s`;
  }
  return `${name} · ambient`;
}

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
  const [intervalSoundVisible, setIntervalSoundVisible] = useState(false);

  const [editingElementIndex, setEditingElementIndex] = useState<number | null>(null);
  const [newDurationType, setNewDurationType] = useState<DurationType>('NORMAL');
  const [editingPhaseIndex, setEditingPhaseIndex] = useState<number | null>(null);
  const [editingSoundIndex, setEditingSoundIndex] = useState<number | null>(null);

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
      soundConfigs: [],
    };

    if (editingElementIndex !== null) {
      setElements((prev) =>
        prev.map((e, i) => {
          if (i !== editingElementIndex || e.kind !== 'duration') return e;
          return { ...e, config: { ...config, soundConfigs: e.config.soundConfigs } };
        })
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

  const removeElement = useCallback((index: number) => {
    setElements((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemovePhaseSound = useCallback((phaseIndex: number, soundIndex: number) => {
    setElements((prev) =>
      prev.map((e, i) => {
        if (i !== phaseIndex || e.kind !== 'duration') return e;
        return { ...e, config: { ...e.config, soundConfigs: e.config.soundConfigs.filter((_, si) => si !== soundIndex) } };
      })
    );
  }, []);

  const handleSavePhaseSound = useCallback((config: SoundConfig) => {
    setElements((prev) =>
      prev.map((e, i) => {
        if (i !== editingPhaseIndex || e.kind !== 'duration') return e;
        const sounds = editingSoundIndex !== null
          ? e.config.soundConfigs.map((sc, si) => si === editingSoundIndex ? config : sc)
          : [...e.config.soundConfigs, config];
        return { ...e, config: { ...e.config, soundConfigs: sounds } };
      })
    );
  }, [editingPhaseIndex, editingSoundIndex]);

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

  const editingPhaseSound =
    editingPhaseIndex !== null &&
    editingSoundIndex !== null &&
    elements[editingPhaseIndex]?.kind === 'duration'
      ? (elements[editingPhaseIndex] as BuilderElement & { kind: 'duration' }).config.soundConfigs[editingSoundIndex]
      : undefined;

  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<BuilderElement>) => {
    const index = getIndex() ?? 0;

    if (item.kind === 'sound') {
      const sound = getSoundById(item.soundId);
      return (
        <ScaleDecorator>
          <Pressable
            onPress={() => { setEditingElementIndex(index); setSoundPickerVisible(true); }}
            onLongPress={drag}
            disabled={isActive}
            style={{
              backgroundColor: isActive ? c.surfaceVariant : c.surface,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 14,
              marginBottom: 6,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pressable onLongPress={drag} disabled={isActive} hitSlop={12} style={{ paddingRight: 12 }}>
              <Text style={{ fontSize: 20, color: c.onSurface, opacity: 0.4 }}>≡</Text>
            </Pressable>
            <Text style={{ fontSize: 14, marginRight: 6 }}>🔔</Text>
            <Text style={{ flex: 1, fontSize: 13, color: c.onSurface, fontWeight: '500' }}>
              {item.name} · {sound?.name ?? 'Unknown'}
            </Text>
            <Pressable onPress={() => removeElement(index)} hitSlop={8}>
              <Text style={{ color: c.error, fontSize: 18 }}>⊖</Text>
            </Pressable>
          </Pressable>
        </ScaleDecorator>
      );
    }

    const cfg = item.config;
    const typeColor = cfg.type === 'WARMUP' ? c.warmup : cfg.type === 'INFINITE' ? c.infinite : c.accent;

    return (
      <ScaleDecorator>
        <View style={{ backgroundColor: isActive ? c.surfaceVariant : c.surface, borderRadius: 12, padding: 14, marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onLongPress={drag} disabled={isActive} hitSlop={12} style={{ paddingRight: 10 }}>
              <Text style={{ fontSize: 20, color: c.onSurface, opacity: 0.4 }}>≡</Text>
            </Pressable>
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

          {/* Inline phase sounds */}
          <View style={{ marginTop: 10, marginLeft: 56 }}>
            {cfg.soundConfigs.map((sc, si) => (
              <View
                key={si}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: c.surfaceVariant,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontSize: 13, flex: 1, color: c.onBackground }}>{getPhaseSoundLabel(sc)}</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => { setEditingPhaseIndex(index); setEditingSoundIndex(si); setIntervalSoundVisible(true); }}
                  style={{ marginRight: 10 }}
                >
                  <Text style={{ fontSize: 14, color: c.primary }}>✏</Text>
                </Pressable>
                <Pressable hitSlop={8} onPress={() => handleRemovePhaseSound(index, si)}>
                  <Text style={{ color: c.error, fontSize: 16 }}>⊖</Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={() => { setEditingPhaseIndex(index); setEditingSoundIndex(null); setIntervalSoundVisible(true); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-start',
                paddingVertical: 6,
                paddingHorizontal: 10,
                backgroundColor: c.surfaceVariant,
                borderRadius: 8,
                marginTop: cfg.soundConfigs.length > 0 ? 2 : 0,
              }}
            >
              <Text style={{ fontSize: 13, color: c.primary, fontWeight: '600' }}>+ Add sound</Text>
            </Pressable>
          </View>
        </View>
      </ScaleDecorator>
    );
  }, [c, removeElement, handleRemovePhaseSound]);

  const listHeader = useMemo(() => (
    <View style={{ padding: 16 }}>
      {/* Preset Details */}
      <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
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

      {/* Elements header */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: c.onBackground }}>
          Meditation Elements
        </Text>
        {phaseCount > 0 && (
          <Text style={{ fontSize: 13, color: c.onSurface, marginTop: 2 }}>
            {totalLabel} · {phaseCount} {phaseCount === 1 ? 'phase' : 'phases'}
          </Text>
        )}
      </View>

      {elements.length === 0 && (
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: c.onSurface, textAlign: 'center' }}>
            Add sounds and meditation phases to build your preset.
          </Text>
        </View>
      )}
    </View>
  ), [c, name, description, phaseCount, totalLabel, elements.length]);

  const listFooter = useMemo(() => (
    <View style={{ paddingHorizontal: 16 }}>
      <Pressable
        onPress={() => setAddElementVisible(true)}
        style={{
          backgroundColor: c.surface,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: c.surfaceVariant,
          borderStyle: 'dashed',
          padding: 16,
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Text style={{ color: c.primary, fontSize: 15, fontWeight: '600' }}>+ Add Element</Text>
      </Pressable>
      <View style={{ height: 100 }} />
    </View>
  ), [c]);

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

      <DraggableFlatList
        data={elements}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={({ data }) => setElements(data)}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={{ paddingHorizontal: 0 }}
        containerStyle={{ flex: 1 }}
        style={{ paddingHorizontal: 16 }}
      />

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

      <IntervalSoundDialog
        visible={intervalSoundVisible}
        onClose={() => { setIntervalSoundVisible(false); setEditingPhaseIndex(null); setEditingSoundIndex(null); }}
        onSave={handleSavePhaseSound}
        initialConfig={editingPhaseSound}
      />
    </SafeAreaView>
  );
}
