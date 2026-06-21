import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Switch, TextInput, Platform, Alert, AppState, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation';
import { useTheme } from '../theme/ThemeContext';
import { allThemes } from '../theme/themes';
import { useSettingsStore } from '../stores/settingsStore';
import { useAchievementStore } from '../stores/achievementStore';
import { getAllAchievements } from '../data/achievements';
import pkg from '../../package.json';
import * as Dnd from '../../modules/dnd';
import { getDayName } from '../services/reminderService';
import { getRecentLogs, clearLogs } from '../utils/logger';
import { renderStreakText, STREAK_TEXT_PRESETS } from '../utils/streakText';
import { useSessionStore } from '../stores/sessionStore';
import { pushWidgetUpdate } from '../widget/widgetData';
import { listStreakArtStyles } from '../components/home/streak-art';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { theme, setThemeId } = useTheme();
  const c = theme.colors;

  const screenAwake = useSettingsStore((s) => s.screenAwake);
  const setScreenAwake = useSettingsStore((s) => s.setScreenAwake);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);
  const dndEnabled = useSettingsStore((s) => s.dndEnabled);
  const setDndEnabled = useSettingsStore((s) => s.setDndEnabled);
  const reminder = useSettingsStore((s) => s.reminder);
  const achievementsEnabled = useSettingsStore((s) => s.achievementsEnabled);
  const setAchievementsEnabled = useSettingsStore((s) => s.setAchievementsEnabled);
  const demoStreakOverride = useSettingsStore((s) => s.demoStreakOverride);
  const setDemoStreakOverride = useSettingsStore((s) => s.setDemoStreakOverride);
  const streakHeroText = useSettingsStore((s) => s.streakHeroText);
  const setStreakHeroText = useSettingsStore((s) => s.setStreakHeroText);
  const [streakTextInput, setStreakTextInput] = useState(streakHeroText ?? '');
  const streakArtStyle = useSettingsStore((s) => s.streakArtStyle);
  const setStreakArtStyle = useSettingsStore((s) => s.setStreakArtStyle);
  const freezeEarnRate = useSettingsStore((s) => s.freezeEarnRate);
  const setFreezeEarnRate = useSettingsStore((s) => s.setFreezeEarnRate);
  const stats = useSessionStore((s) => s.stats);

  // Changing the earn rate persists the new setting, then refreshes stats — the
  // streak service reconciles the checkpoint (sealing the old rate, applying the
  // new one going forward) on the next read. Then push the widget.
  const changeFreezeEarnRate = useCallback(async (next: number) => {
    setFreezeEarnRate(next);
    await useSessionStore.getState().loadStats();
    await pushWidgetUpdate();
  }, [setFreezeEarnRate]);

  const [dndAccessGranted, setDndAccessGranted] = useState(() =>
    Platform.OS === 'android' ? Dnd.isAccessGranted() : false
  );

  const handleDndToggle = useCallback((value: boolean) => {
    if (Platform.OS !== 'android') return;

    if (value && !Dnd.isAccessGranted()) {
      Alert.alert(
        'Permission Required',
        'SpiritLog needs Do Not Disturb access to silence notifications during meditation. You\'ll be taken to system settings to grant this.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              Dnd.requestAccess();
              const sub = AppState.addEventListener('change', (state) => {
                if (state === 'active') {
                  sub.remove();
                  const granted = Dnd.isAccessGranted();
                  setDndAccessGranted(granted);
                  if (granted) {
                    setDndEnabled(true);
                  }
                }
              });
            },
          },
        ]
      );
      return;
    }

    setDndEnabled(value);
    if (value) {
      useAchievementStore.getState().triggerCheck({ type: 'dnd_enabled' });
    }
  }, [setDndEnabled]);

  const achievementUnlocked = useAchievementStore((s) => s.unlocked);
  const achievementStats = React.useMemo(() => {
    let total = 0;
    let unlockedCount = 0;
    for (const a of getAllAchievements()) {
      if (a.kind === 'single') {
        total += 1;
        if (achievementUnlocked.get(a.id)?.has('single')) unlockedCount += 1;
      } else {
        total += 3;
        unlockedCount += achievementUnlocked.get(a.id)?.size ?? 0;
      }
    }
    return { total, unlockedCount };
  }, [achievementUnlocked]);

  const appVersion = pkg.version;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={{ fontSize: 24, color: c.onSurface }}>←</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: c.onBackground }}>
          Settings
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Theme Section */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.onSurface, marginBottom: 8, marginLeft: 4 }}>
          THEME
        </Text>
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {allThemes.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setThemeId(t.id)}
                style={{ alignItems: 'center' }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: t.colors.background,
                    borderWidth: 3,
                    borderColor: t.id === theme.id ? t.colors.primary : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: t.colors.primary,
                    }}
                  />
                </View>
                <Text style={{ fontSize: 11, color: c.onSurface }}>{t.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Session Section */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.onSurface, marginBottom: 8, marginLeft: 4 }}>
          SESSION
        </Text>
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: c.onBackground, fontSize: 14 }}>Keep Screen Awake</Text>
              <Text style={{ color: c.onSurface, fontSize: 11 }}>Prevent screen from sleeping during meditation</Text>
            </View>
            <Switch
              value={screenAwake}
              onValueChange={setScreenAwake}
              trackColor={{ false: c.surfaceVariant, true: c.primaryContainer }}
              thumbColor={screenAwake ? c.primary : c.onSurface}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 16 : 0 }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: c.onBackground, fontSize: 14 }}>Haptic Feedback</Text>
              <Text style={{ color: c.onSurface, fontSize: 11 }}>Vibrate on timer events</Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{ false: c.surfaceVariant, true: c.primaryContainer }}
              thumbColor={hapticsEnabled ? c.primary : c.onSurface}
            />
          </View>

          {Platform.OS === 'android' && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: c.onBackground, fontSize: 14 }}>Do Not Disturb</Text>
                <Text style={{ color: c.onSurface, fontSize: 11 }}>Silence notifications during meditation</Text>
              </View>
              <Switch
                value={dndEnabled}
                onValueChange={handleDndToggle}
                trackColor={{ false: c.surfaceVariant, true: c.primaryContainer }}
                thumbColor={dndEnabled ? c.primary : c.onSurface}
              />
            </View>
          )}
        </View>

        {/* Reminder Section */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.onSurface, marginBottom: 8, marginLeft: 4 }}>
          REMINDER
        </Text>
        <Pressable
          onPress={() => navigation.navigate('Reminder')}
          style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 22, marginRight: 12 }}>🔔</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.onBackground, fontSize: 14 }}>Daily Reminder</Text>
            <Text style={{ color: c.onSurface, fontSize: 11 }}>
              {reminder.enabled
                ? `${reminder.hour.toString().padStart(2, '0')}:${reminder.minute.toString().padStart(2, '0')} · ${reminder.days.map(getDayName).join(', ')}`
                : 'Off'}
            </Text>
          </View>
          <Text style={{ color: c.onSurface, fontSize: 18 }}>›</Text>
        </Pressable>

        {/* Progress Section */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.onSurface, marginBottom: 8, marginLeft: 4 }}>
          PROGRESS
        </Text>
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: achievementsEnabled ? 12 : 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: c.onBackground, fontSize: 14 }}>Achievements</Text>
              <Text style={{ color: c.onSurface, fontSize: 11 }}>Track milestones and unlock rewards</Text>
            </View>
            <Switch
              value={achievementsEnabled}
              onValueChange={setAchievementsEnabled}
              trackColor={{ false: c.surfaceVariant, true: c.primaryContainer }}
              thumbColor={achievementsEnabled ? c.primary : c.onSurface}
            />
          </View>
        </View>
        {achievementsEnabled && (
          <Pressable
            onPress={() => navigation.navigate('Achievements')}
            style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 22, marginRight: 12 }}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.onBackground, fontSize: 14 }}>View Achievements</Text>
              <Text style={{ color: c.onSurface, fontSize: 11 }}>
                {achievementStats.unlockedCount} / {achievementStats.total} unlocked
              </Text>
            </View>
            <Text style={{ color: c.onSurface, fontSize: 18 }}>›</Text>
          </Pressable>
        )}

        {/* Backup Section */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.onSurface, marginBottom: 8, marginLeft: 4 }}>
          BACKUP & SYNC
        </Text>
        <Pressable
          onPress={() => navigation.navigate('Backup')}
          style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 22, marginRight: 12 }}>☁️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.onBackground, fontSize: 14 }}>Google Drive Backup</Text>
            <Text style={{ color: c.onSurface, fontSize: 11 }}>Manage backups and restore data</Text>
          </View>
          <Text style={{ color: c.onSurface, fontSize: 18 }}>›</Text>
        </Pressable>

        {/* Streak Section */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.onSurface, marginBottom: 8, marginLeft: 4 }}>
          STREAK
        </Text>

        {/* Freeze earn rate */}
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 8 }}>
          <Text style={{ color: c.onBackground, fontSize: 14, marginBottom: 4 }}>Freeze earn rate</Text>
          <Text style={{ color: c.onSurface, fontSize: 11, marginBottom: 10 }}>
            Earn 1 freeze for every N streak days. Freezes auto-cover missed days so the streak doesn't break.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => changeFreezeEarnRate(freezeEarnRate - 1)}
              hitSlop={8}
              style={{
                width: 38, height: 38, borderRadius: 8,
                backgroundColor: c.surfaceVariant,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: c.onBackground, fontSize: 18, fontWeight: '600' }}>−</Text>
            </Pressable>
            <View style={{
              flex: 1, height: 38, borderRadius: 8,
              backgroundColor: c.surfaceVariant,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: c.onBackground, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                {freezeEarnRate} {freezeEarnRate === 1 ? 'day' : 'days'}
              </Text>
            </View>
            <Pressable
              onPress={() => changeFreezeEarnRate(freezeEarnRate + 1)}
              hitSlop={8}
              style={{
                width: 38, height: 38, borderRadius: 8,
                backgroundColor: c.surfaceVariant,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: c.onBackground, fontSize: 18, fontWeight: '600' }}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Art style picker */}
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 8 }}>
          <Text style={{ color: c.onBackground, fontSize: 14, marginBottom: 4 }}>Art style</Text>
          <Text style={{ color: c.onSurface, fontSize: 11, marginBottom: 10 }}>
            Visual rendered behind the streak number on home.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {listStreakArtStyles().map((s) => {
              const active = streakArtStyle === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setStreakArtStyle(s.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: active ? c.accent : c.surfaceVariant,
                    backgroundColor: active ? c.primaryContainer : c.surfaceVariant,
                    minWidth: 110,
                  }}
                >
                  <Text style={{
                    color: active ? c.onPrimary : c.onBackground,
                    fontSize: 14,
                    fontWeight: '600',
                  }}>
                    {s.label}
                  </Text>
                  <Text style={{
                    color: active ? c.onPrimary : c.onSurface,
                    fontSize: 11,
                    marginTop: 2,
                    opacity: active ? 0.85 : 1,
                  }}>
                    {s.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Subtitle text customization */}
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <Text style={{ color: c.onBackground, fontSize: 14, marginBottom: 4 }}>Subtitle text</Text>
          <Text style={{ color: c.onSurface, fontSize: 11, marginBottom: 10 }}>
            Shown under the streak number. Empty = default. Placeholders: {'{streak} {best} {hours} {sessions} {freezes}'}
          </Text>

          <TextInput
            value={streakTextInput}
            onChangeText={setStreakTextInput}
            onBlur={() => setStreakHeroText(streakTextInput)}
            onSubmitEditing={() => setStreakHeroText(streakTextInput)}
            placeholder="DAYS IN A ROW (default)"
            placeholderTextColor={c.onSurface}
            style={{
              backgroundColor: c.surfaceVariant,
              color: c.onBackground,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              marginBottom: 8,
            }}
          />

          {/* Live preview */}
          <View style={{
            backgroundColor: c.surfaceVariant,
            borderRadius: 8,
            padding: 12,
            marginBottom: 10,
            alignItems: 'center',
          }}>
            <Text style={{ color: c.onSurface, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
              Preview
            </Text>
            <Text style={{ color: c.onBackground, fontSize: 26, fontWeight: '300' }}>
              {demoStreakOverride ?? stats.currentStreak ?? 0}
            </Text>
            <Text style={{ color: c.onSurface, fontSize: 10, letterSpacing: 1.2 }}>
              {renderStreakText(
                streakTextInput.trim() === '' ? null : streakTextInput,
                {
                  streak: demoStreakOverride ?? stats.currentStreak ?? 0,
                  best: stats.bestStreak ?? 0,
                  totalMinutes: stats.totalMinutes ?? 0,
                  totalSessions: stats.totalSessions ?? 0,
                  freezesAvailable: stats.freezesAvailable ?? 0,
                }
              )}
            </Text>
          </View>

          {/* Preset chips */}
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {STREAK_TEXT_PRESETS.map((p) => {
              const active = (streakTextInput.trim() === '' && p.template === '') || streakTextInput === p.template;
              return (
                <Pressable
                  key={p.label}
                  onPress={() => {
                    setStreakTextInput(p.template);
                    setStreakHeroText(p.template);
                  }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: active ? c.primaryContainer : c.surfaceVariant,
                    borderRadius: 14,
                  }}
                >
                  <Text style={{
                    color: active ? c.onPrimary : c.onSurface,
                    fontSize: 12,
                    fontWeight: '600',
                  }}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* How to Use Section */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.onSurface, marginBottom: 8, marginLeft: 4 }}>
          HELP
        </Text>
        <Pressable
          onPress={() => navigation.navigate('HowToUse')}
          style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 22, marginRight: 12 }}>📖</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.onBackground, fontSize: 14 }}>How to Use</Text>
            <Text style={{ color: c.onSurface, fontSize: 11 }}>Learn how to get the most out of SpiritLog</Text>
          </View>
          <Text style={{ color: c.onSurface, fontSize: 18 }}>›</Text>
        </Pressable>

        {/* About Section */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.onSurface, marginBottom: 8, marginLeft: 4 }}>
          ABOUT
        </Text>
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: c.onBackground, marginBottom: 4 }}>
            SpiritLog
          </Text>
          <Text style={{ color: c.onSurface, fontSize: 13, marginBottom: 2 }}>
            Version {appVersion}
          </Text>
          <Text style={{ color: c.onSurface, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            A mindful meditation timer to help you build a consistent practice.
          </Text>
        </View>

        {/* Debug Section */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.onSurface, marginBottom: 8, marginLeft: 4 }}>
          DEBUG
        </Text>

        {/* Demo streak — just a toggle. Control panel lives on Home when ON. */}
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 22, marginRight: 12 }}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.onBackground, fontSize: 14 }}>Demo streak</Text>
            <Text style={{ color: c.onSurface, fontSize: 11 }}>
              {demoStreakOverride !== null
                ? `On — adjust the value from the home screen`
                : 'Off — using real streak'}
            </Text>
          </View>
          <Switch
            value={demoStreakOverride !== null}
            onValueChange={(on) => {
              setDemoStreakOverride(on ? 12 : null);
            }}
            trackColor={{ false: c.surfaceVariant, true: c.primaryContainer }}
            thumbColor={demoStreakOverride !== null ? c.primary : c.onSurface}
          />
        </View>

        <Pressable
          onPress={async () => {
            try {
              const logs = await getRecentLogs();
              await Share.share({ message: logs });
            } catch (e: any) {
              Alert.alert('Share failed', e?.message ?? 'Could not share logs');
            }
          }}
          style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 22, marginRight: 12 }}>🐛</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.onBackground, fontSize: 14 }}>Share recent logs</Text>
            <Text style={{ color: c.onSurface, fontSize: 11 }}>Persistent file (rotates at 256 KB)</Text>
          </View>
          <Text style={{ color: c.onSurface, fontSize: 18 }}>›</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Alert.alert('Clear logs?', 'Removes RAM buffer + persistent log files.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => { clearLogs().catch(() => {}); } },
            ]);
          }}
          style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 22, marginRight: 12 }}>🧹</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.onBackground, fontSize: 14 }}>Clear logs</Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
