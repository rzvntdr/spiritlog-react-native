import React from 'react';
import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation';
import { useTheme } from '../theme/ThemeContext';
import { allThemes } from '../theme/themes';
import { useSettingsStore } from '../stores/settingsStore';
import Constants from 'expo-constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { theme, setThemeId } = useTheme();
  const c = theme.colors;

  const screenAwake = useSettingsStore((s) => s.screenAwake);
  const setScreenAwake = useSettingsStore((s) => s.setScreenAwake);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);

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

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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
        </View>

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
