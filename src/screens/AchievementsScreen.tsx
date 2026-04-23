import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation';
import { useTheme } from '../theme/ThemeContext';
import { useAchievementStore } from '../stores/achievementStore';
import { useSessionStore } from '../stores/sessionStore';
import { useBackupStore } from '../stores/backupStore';
import { useSettingsStore } from '../stores/settingsStore';
import { usePresetStore } from '../stores/presetStore';
import { getAllAchievements } from '../data/achievements';
import AchievementCard from '../components/achievement/AchievementCard';
import { Achievement, AchievementCategory, AchievementContext, Tier } from '../types/achievement';

type Props = NativeStackScreenProps<RootStackParamList, 'Achievements'>;

const CATEGORY_ORDER: AchievementCategory[] = [
  'sessions',
  'streaks',
  'duration',
  'variety',
  'temporal',
  'backup',
  'seasonal',
];

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  sessions: 'SESSIONS',
  streaks: 'STREAKS',
  duration: 'DURATION',
  variety: 'VARIETY',
  temporal: 'TEMPORAL',
  backup: 'FEATURES',
  seasonal: 'SEASONAL',
};

export default function AchievementsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const unlocked = useAchievementStore((s) => s.unlocked);

  // Subscribe to sources for live tiered progress — use primitive selectors to avoid
  // new-object-reference infinite re-render (only tiered getValue uses stats/sessions)
  const stats = useSessionStore((s) => s.stats);
  const sessions = useSessionStore((s) => s.sessions);
  const presets = usePresetStore((s) => s.presets);
  const isSignedIn = useBackupStore((s) => s.isSignedIn);
  const lastBackupTime = useBackupStore((s) => s.lastBackupTime);
  const userEmail = useBackupStore((s) => s.userEmail);
  const settingsReminder = useSettingsStore((s) => s.reminder);
  const settingsDnd = useSettingsStore((s) => s.dndEnabled);

  const ctx: AchievementContext = useMemo(
    () => ({
      stats,
      sessions,
      presets,
      backupState: { isSignedIn, lastBackupTime, userEmail },
      settings: { reminder: settingsReminder, dndEnabled: settingsDnd },
      unlocked,
      event: { type: 'app_start' },
    }),
    [stats, sessions, presets, isSignedIn, lastBackupTime, userEmail, settingsReminder, settingsDnd, unlocked]
  );

  const all = useMemo(() => getAllAchievements(), []);

  const grouped = useMemo(() => {
    const now = Date.now();
    const map = new Map<AchievementCategory, Achievement[]>();
    for (const a of all) {
      // Hide missed seasonal achievements — window closed and never unlocked
      if (a.kind === 'single' && a.seasonalWindowEnd) {
        const isUnlocked = unlocked.get(a.id)?.has('single') ?? false;
        if (!isUnlocked && a.seasonalWindowEnd.getTime() < now) continue;
      }
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    }
    // Sort seasonal: upcoming → unlocked
    const seasonal = map.get('seasonal');
    if (seasonal) {
      seasonal.sort((a, b) => {
        const aUnlocked = unlocked.get(a.id)?.has('single') ?? false;
        const bUnlocked = unlocked.get(b.id)?.has('single') ?? false;
        const aEnd = a.kind === 'single' ? a.seasonalWindowEnd?.getTime() ?? 0 : 0;
        const bEnd = b.kind === 'single' ? b.seasonalWindowEnd?.getTime() ?? 0 : 0;
        if (!aUnlocked && !bUnlocked) return aEnd - bEnd; // upcoming: nearest first
        if (aUnlocked && !bUnlocked) return 1;            // unlocked after upcoming
        if (!aUnlocked && bUnlocked) return -1;
        return bEnd - aEnd;
      });
    }
    return map;
  }, [all, unlocked]);

  const summary = useMemo(() => {
    let total = 0;
    let unlockedCount = 0;
    for (const a of all) {
      if (a.kind === 'single') {
        total += 1;
        if (unlocked.get(a.id)?.has('single')) unlockedCount += 1;
      } else {
        total += 3;
        unlockedCount += unlocked.get(a.id)?.size ?? 0;
      }
    }
    return { total, unlockedCount };
  }, [all, unlocked]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={{ fontSize: 24, color: c.onSurface }}>←</Text>
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 20,
            fontWeight: '700',
            color: c.onBackground,
          }}
        >
          Achievements
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 16,
          padding: 16,
          borderRadius: 12,
          backgroundColor: c.surface,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '700', color: c.onBackground }}>
          {summary.unlockedCount} / {summary.total}
        </Text>
        <Text style={{ fontSize: 12, color: c.onSurface, marginTop: 2 }}>
          tiers unlocked
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped.get(cat);
          if (!items || items.length === 0) return null;
          return (
            <View key={cat} style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: c.onSurface,
                  marginBottom: 8,
                  marginLeft: 4,
                }}
              >
                {CATEGORY_LABELS[cat]}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {items.map((a) => {
                  const tiers = unlocked.get(a.id) ?? new Set<Tier>();
                  const currentValue =
                    a.kind === 'tiered' ? a.getValue(ctx) : undefined;
                  return (
                    <View key={a.id} style={{ width: '50%' }}>
                      <AchievementCard
                        achievement={a}
                        unlockedTiers={tiers}
                        currentValue={currentValue}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
