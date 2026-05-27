import React, { useEffect } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation';
import { useTheme } from '../theme/ThemeContext';
import { usePresetStore } from '../stores/presetStore';
import { useShallow } from 'zustand/react/shallow';
import { useSessionStore } from '../stores/sessionStore';
import { useSettingsStore } from '../stores/settingsStore';
import PresetCard from '../components/preset/PresetCard';
import StreakHero from '../components/home/StreakHero';
import WelcomeCard from '../components/home/WelcomeCard';
import HomeStats from '../components/home/HomeStats';
import { spacing } from '../theme/scale';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const loadPresets = usePresetStore((s) => s.loadPresets);
  const isPresetsLoaded = usePresetStore((s) => s.isLoaded);
  const favorites = usePresetStore(useShallow((s) => s.presets.filter((p) => p.isFavorite)));
  const nonFavorites = usePresetStore(useShallow((s) => s.presets.filter((p) => !p.isFavorite)));
  const toggleFavorite = usePresetStore((s) => s.toggleFavorite);
  const deletePreset = usePresetStore((s) => s.deletePreset);

  const loadStats = useSessionStore((s) => s.loadStats);
  const stats = useSessionStore((s) => s.stats);
  const achievementsEnabled = useSettingsStore((s) => s.achievementsEnabled);
  const demoStreakOverride = useSettingsStore((s) => s.demoStreakOverride);

  useEffect(() => {
    loadPresets();
    loadStats();
  }, []);

  // Refresh stats when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadStats();
      loadPresets();
    });
    return unsubscribe;
  }, [navigation]);

  if (!isPresetsLoaded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={c.accent} />
      </SafeAreaView>
    );
  }

  // Build a flat list with section headers
  type ListItem =
    | { type: 'stats' }
    | { type: 'sectionHeader'; title: string; icon: string }
    | { type: 'preset'; preset: (typeof favorites)[0] }
    | { type: 'empty'; message: string };

  const data: ListItem[] = [{ type: 'stats' }];

  if (favorites.length > 0) {
    data.push({ type: 'sectionHeader', title: 'Favorites', icon: '♥' });
    favorites.forEach((preset) => data.push({ type: 'preset', preset }));
  }

  data.push({ type: 'sectionHeader', title: 'All Presets', icon: '⏱' });
  if (nonFavorites.length > 0) {
    nonFavorites.forEach((preset) => data.push({ type: 'preset', preset }));
  } else if (favorites.length === 0) {
    data.push({ type: 'empty', message: 'No presets yet. Create your first one!' });
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.type) {
      case 'stats': {
        const realStreak = stats.currentStreak ?? 0;
        const currentStreak = demoStreakOverride ?? realStreak;
        const freezes = stats.freezesAvailable ?? 0;
        const hasHistory = stats.totalMinutes > 0;
        return (
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            {currentStreak > 0
              ? <StreakHero currentStreak={currentStreak} freezesAvailable={freezes} />
              : <WelcomeCard />}
            {hasHistory && (
              <HomeStats totalMinutes={stats.totalMinutes} avgMinutes={stats.avgDuration} />
            )}
          </View>
        );
      }

      case 'sectionHeader':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 8 }}>
            <Text style={{ fontSize: 16, marginRight: 6 }}>{item.icon}</Text>
            <Text style={{ fontSize: 18, fontWeight: '600', color: c.onBackground }}>{item.title}</Text>
          </View>
        );

      case 'preset':
        return (
          <PresetCard
            preset={item.preset}
            onPress={() => navigation.navigate('Timer', { presetId: item.preset.id })}
            onToggleFavorite={() => toggleFavorite(item.preset.id)}
            onEdit={() => navigation.navigate('EditPreset', { presetId: item.preset.id })}
            onDelete={() => deletePreset(item.preset.id)}
          />
        );

      case 'empty':
        return (
          <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 20, alignItems: 'center' }}>
            <Text style={{ color: c.onSurface }}>{item.message}</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
        <View>
          <Text style={{ fontSize: 28, fontWeight: '700', color: c.onBackground }}>SpiritLog</Text>
          <Text style={{ fontSize: 14, color: c.onSurface }}>Create your meditation</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Pressable onPress={() => navigation.navigate('Journey')} hitSlop={8}>
            <Text style={{ fontSize: 22, color: c.onSurface }}>📊</Text>
          </Pressable>
          {achievementsEnabled && (
            <Pressable onPress={() => navigation.navigate('Achievements')} hitSlop={8}>
              <Text style={{ fontSize: 22, color: c.onSurface }}>🏆</Text>
            </Pressable>
          )}
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={8}>
            <Text style={{ fontSize: 22, color: c.onSurface }}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      {/* Preset List */}
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item, index) => {
          if (item.type === 'preset') return item.preset.id;
          return `${item.type}-${index}`;
        }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      />

      {/* FAB */}
      <Pressable
        onPress={() => navigation.navigate('CreatePreset')}
        style={{
          position: 'absolute',
          bottom: spacing.lg,
          right: spacing.lg,
          backgroundColor: c.primaryContainer,
          borderRadius: 28,
          paddingHorizontal: spacing.xl / 2 + 4,
          paddingVertical: spacing.md + 2,
          flexDirection: 'row',
          alignItems: 'center',
          elevation: 4,
          shadowColor: c.accent,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 24,
        }}
      >
        <Text style={{ color: c.onPrimary, fontSize: 16, fontWeight: '600' }}>+ Create Preset</Text>
      </Pressable>

    </SafeAreaView>
  );
}

