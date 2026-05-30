import React, { useEffect, useRef, useState } from 'react';
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
import AnimatedStreakHero from '../components/home/AnimatedStreakHero';
import WelcomeToStreakTransition from '../components/home/WelcomeToStreakTransition';
import WelcomeCard from '../components/home/WelcomeCard';
import HomeStats from '../components/home/HomeStats';
import DemoStreakBar from '../components/home/DemoStreakBar';
import StreakCelebration, { CelebrationKind, CELEBRATION_ASSETS } from '../components/home/StreakCelebration';
import { pushWidgetUpdate } from '../widget/widgetData';
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
  const lastShownStreakState = useSessionStore((s) => s.lastShownStreakState);
  const setLastShownStreakState = useSessionStore((s) => s.setLastShownStreakState);
  const achievementsEnabled = useSettingsStore((s) => s.achievementsEnabled);
  const demoStreakOverride = useSettingsStore((s) => s.demoStreakOverride);
  const setDemoStreakOverride = useSettingsStore((s) => s.setDemoStreakOverride);
  const demoFreezeOverride = useSettingsStore((s) => s.demoFreezeOverride);
  const setDemoFreezeOverride = useSettingsStore((s) => s.setDemoFreezeOverride);
  const streakHeroText = useSettingsStore((s) => s.streakHeroText);
  const streakArtStyle = useSettingsStore((s) => s.streakArtStyle);
  const freezeEarnRate = useSettingsStore((s) => s.freezeEarnRate);
  const celebrationAssetId = useSettingsStore((s) => s.celebrationAssetId);
  const setCelebrationAssetId = useSettingsStore((s) => s.setCelebrationAssetId);

  // Tracks the demo value shown on the previous render so we can animate
  // from old → new when the user bumps it with +/- in debug mode.
  const prevDemoStreakRef = useRef<number | null>(demoStreakOverride);
  useEffect(() => {
    prevDemoStreakRef.current = demoStreakOverride;
  }, [demoStreakOverride]);

  // ---- Effective streak/freeze values (demo override or real) ----
  const demoActive = demoStreakOverride !== null;
  const rate = Math.max(1, freezeEarnRate);
  const effectiveStreak = demoActive ? demoStreakOverride! : (stats.currentStreak ?? 0);
  const derivedDemoFreezes = Math.floor((demoStreakOverride ?? 0) / rate);
  const effectiveFreezes = demoActive
    ? (demoFreezeOverride ?? derivedDemoFreezes)
    : (stats.freezesAvailable ?? 0);

  // ---- Celebration overlay (Lottie burst on streak/freeze increase) ----
  const [celebration, setCelebration] = useState<{ kind: CelebrationKind; key: number } | null>(null);
  const celebKeyRef = useRef(0);
  // Latest measured rect of the streak number (relative to the hero card),
  // so celebration bursts anchor on/around the number rather than the card middle.
  const numberRectRef = useRef<{ cx: number; cy: number; w: number; h: number } | null>(null);
  const celebDemoBaselineRef = useRef<{ s: number; f: number } | null>(null);
  const freezeBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fireBurst = (kind: CelebrationKind) => {
    celebKeyRef.current += 1;
    setCelebration({ kind, key: celebKeyRef.current });
  };
  // When both increase in one step (the threshold day: +1 streak earns a freeze),
  // play the gold streak burst first, then the frost freeze burst a beat later.
  const fireBursts = (streakUp: boolean, freezeUp: boolean) => {
    if (freezeBurstTimerRef.current) clearTimeout(freezeBurstTimerRef.current);
    if (streakUp) {
      fireBurst('streak');
      if (freezeUp) {
        freezeBurstTimerRef.current = setTimeout(() => fireBurst('freeze'), 650);
      }
    } else if (freezeUp) {
      fireBurst('freeze');
    }
  };

  useEffect(() => {
    if (demoActive) {
      const prev = celebDemoBaselineRef.current;
      celebDemoBaselineRef.current = { s: effectiveStreak, f: effectiveFreezes };
      if (!prev) return; // first demo render: establish baseline, don't fire
      fireBursts(effectiveStreak > prev.s, effectiveFreezes > prev.f);
    } else {
      celebDemoBaselineRef.current = null;
      // Real mode: celebrate only a genuine increase vs the last shown state
      // (avoids firing on the initial 0 → realValue stats load at app open).
      const ls = lastShownStreakState;
      if (!ls) return;
      fireBursts(effectiveStreak > ls.streak, effectiveFreezes > ls.freezesAvailable);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveStreak, effectiveFreezes, demoActive]);

  useEffect(() => () => {
    if (freezeBurstTimerRef.current) clearTimeout(freezeBurstTimerRef.current);
  }, []);

  // Keep the home-screen widget in sync with whatever the hero shows (incl. demo).
  useEffect(() => {
    pushWidgetUpdate();
  }, [effectiveStreak, effectiveFreezes]);

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
        const currentStreak = effectiveStreak;
        const freezes = effectiveFreezes;
        const hasHistory = stats.totalMinutes > 0;

        // Decide whether to animate, and what to animate FROM.
        //  - Demo mode: animate when the user bumps the streak UP (+/preset higher).
        //    Snap on toggle-on (prev null) and on decrease.
        //  - Real mode: animate from the last shown state → current when streak grew.
        let animate = false;
        let fromStreak = currentStreak;
        let fromFreezes = freezes;

        if (demoActive) {
          const prev = prevDemoStreakRef.current;
          if (prev !== null && currentStreak > prev) {
            animate = true;
            fromStreak = prev;
            // Don't animate the freeze count in demo — the Lottie burst marks it.
            fromFreezes = freezes;
          }
        } else if (
          lastShownStreakState !== null &&
          currentStreak > 0 &&
          (lastShownStreakState.streak !== currentStreak ||
            lastShownStreakState.freezesAvailable !== freezes) &&
          currentStreak >= lastShownStreakState.streak
        ) {
          animate = true;
          fromStreak = lastShownStreakState.streak;
          fromFreezes = lastShownStreakState.freezesAvailable;
        }

        // 0 → N: crossfade WelcomeCard → StreakHero instead of counting up from 0.
        const fromZeroToN = animate && fromStreak === 0 && currentStreak > 0;

        const handleSettled = () => {
          // Only persist real state — demo values must not pollute lastShown.
          if (demoActive) return;
          setLastShownStreakState({
            streak: currentStreak,
            freezesAvailable: freezes,
            lastSessionDayMs: lastShownStreakState?.lastSessionDayMs ?? null,
            ts: Date.now(),
          });
        };

        // No-animation real path: snap and write through if changed.
        if (!animate && !demoActive) {
          const needsPersist =
            !lastShownStreakState ||
            lastShownStreakState.streak !== currentStreak ||
            lastShownStreakState.freezesAvailable !== freezes;
          if (needsPersist) {
            setTimeout(handleSettled, 0);
          }
        }

        const heroProps = {
          subtitleTemplate: streakHeroText,
          bestStreak: stats.bestStreak,
          totalMinutes: stats.totalMinutes,
          totalSessions: stats.totalSessions,
          artStyle: streakArtStyle,
          onNumberRect: (cx: number, cy: number, w: number, h: number) => {
            numberRectRef.current = { cx, cy, w, h };
          },
        };

        return (
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            {demoActive && (
              <DemoStreakBar
                value={demoStreakOverride!}
                onChange={(v) => setDemoStreakOverride(v)}
                freezeValue={freezes}
                onFreezeChange={(v) => setDemoFreezeOverride(v)}
                onBoth={() => {
                  setDemoStreakOverride((demoStreakOverride ?? 0) + 1);
                  setDemoFreezeOverride(freezes + 1);
                }}
                onDismiss={() => {
                  setDemoStreakOverride(null);
                  setDemoFreezeOverride(null);
                }}
                celebrationOptions={CELEBRATION_ASSETS.map((a) => ({ id: a.id, label: a.label }))}
                celebrationAssetId={celebrationAssetId}
                onCelebrationAssetChange={setCelebrationAssetId}
              />
            )}

            {/* Hero + celebration overlay */}
            <View>
              {currentStreak > 0 ? (
                fromZeroToN ? (
                  <WelcomeToStreakTransition
                    toStreak={currentStreak}
                    toFreezes={freezes}
                    {...heroProps}
                    onSettled={handleSettled}
                  />
                ) : animate ? (
                  <AnimatedStreakHero
                    fromStreak={fromStreak}
                    fromFreezes={fromFreezes}
                    toStreak={currentStreak}
                    toFreezes={freezes}
                    {...heroProps}
                    onSettled={handleSettled}
                  />
                ) : (
                  <StreakHero
                    currentStreak={currentStreak}
                    freezesAvailable={freezes}
                    {...heroProps}
                  />
                )
              ) : (
                <WelcomeCard />
              )}
              {celebration && (
                <StreakCelebration
                  key={celebration.key}
                  kind={celebration.kind}
                  assetId={celebrationAssetId}
                  numberRect={numberRectRef.current}
                />
              )}
            </View>

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

