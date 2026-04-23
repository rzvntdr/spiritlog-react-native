import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Switch, Platform, Alert, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation';
import { useTheme } from '../theme/ThemeContext';
import { allThemes } from '../theme/themes';
import { useSettingsStore } from '../stores/settingsStore';
import { useAchievementStore } from '../stores/achievementStore';
import { getAllAchievements } from '../data/achievements';
import Constants from 'expo-constants';
import * as Dnd from '../../modules/dnd';
import { getDayName } from '../services/reminderService';

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

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

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
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, alignItems: 'center' }}>
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
      </ScrollView>
    </SafeAreaView>
  );
}
