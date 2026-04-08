import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation';
import { useTheme } from '../theme/ThemeContext';
import { useBackupStore } from '../stores/backupStore';
import { usePresetStore } from '../stores/presetStore';
import { useSessionStore } from '../stores/sessionStore';
import { isGoogleSignInAvailable } from '../services/googleAuthService';

type Props = NativeStackScreenProps<RootStackParamList, 'Backup'>;

export default function BackupScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const isSignedIn = useBackupStore((s) => s.isSignedIn);
  const userEmail = useBackupStore((s) => s.userEmail);
  const userName = useBackupStore((s) => s.userName);
  const isBackingUp = useBackupStore((s) => s.isBackingUp);
  const isRestoring = useBackupStore((s) => s.isRestoring);
  const lastBackupTime = useBackupStore((s) => s.lastBackupTime);
  const signIn = useBackupStore((s) => s.signIn);
  const signInSilently = useBackupStore((s) => s.signInSilently);
  const signOut = useBackupStore((s) => s.signOut);
  const backupToDrive = useBackupStore((s) => s.backupToDrive);
  const restoreFromDrive = useBackupStore((s) => s.restoreFromDrive);
  const loadPersistedState = useBackupStore((s) => s.loadPersistedState);

  const loadPresets = usePresetStore((s) => s.loadPresets);
  const loadSessions = useSessionStore((s) => s.loadSessions);

  // Auto backup toggles (stored locally for now)
  const [autoAfterSession, setAutoAfterSession] = useState(false);
  const [autoDaily, setAutoDaily] = useState(false);

  useEffect(() => {
    loadPersistedState();
    signInSilently();
  }, []);

  const googleAvailable = isGoogleSignInAvailable();

  const handleSignIn = async () => {
    if (!googleAvailable) {
      Alert.alert(
        'Dev Build Required',
        'Google Sign-In requires a custom dev build. Run `npx expo run:android` to enable this feature.',
      );
      return;
    }
    try {
      await signIn();
    } catch (e: any) {
      Alert.alert('Sign-In Failed', e.message || 'Could not sign in with Google.');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'You can sign back in anytime to resume backups.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleBackupNow = async () => {
    try {
      const { sizeKb } = await backupToDrive();
      Alert.alert('Backup Complete', `Your data (${sizeKb} KB) has been saved to Google Drive.`);
    } catch (e: any) {
      Alert.alert('Backup Failed', e.message || 'An error occurred while backing up.');
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore from Backup',
      'This will replace all your local data with the backup from Google Drive. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await restoreFromDrive();
              if (!result) {
                Alert.alert('No Backup Found', 'No backup was found on Google Drive.');
                return;
              }
              // Reload stores after restore
              await loadPresets();
              await loadSessions();
              Alert.alert(
                'Restore Complete',
                `Restored ${result.presetCount} presets and ${result.sessionCount} sessions.`
              );
            } catch (e: any) {
              Alert.alert('Restore Failed', e.message || 'An error occurred while restoring.');
            }
          },
        },
      ]
    );
  };

  const formatBackupTime = (timestamp: number): string => {
    const d = new Date(timestamp);
    return d.toLocaleString();
  };

  const isBusy = isBackingUp || isRestoring;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={{ fontSize: 24, color: c.onSurface }}>←</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: c.onBackground }}>
          Backup & Sync
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: 16 }}>
        {/* Account Card */}
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          {isSignedIn ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: c.primaryContainer,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                <Text style={{ color: c.onPrimary, fontWeight: '700', fontSize: 18 }}>
                  {userEmail?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.accent, fontWeight: '600', fontSize: 13 }}>Connected</Text>
                <Text style={{ color: c.onBackground, fontSize: 14 }}>{userName ?? userEmail}</Text>
                {userName && <Text style={{ color: c.onSurface, fontSize: 11 }}>{userEmail}</Text>}
              </View>
              <Pressable
                onPress={handleSignOut}
                style={{ backgroundColor: c.surfaceVariant, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
              >
                <Text style={{ color: c.onSurface, fontWeight: '600', fontSize: 13 }}>Sign Out</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: c.onSurface, marginBottom: 12 }}>Sign in to backup your data</Text>
              <Pressable
                onPress={handleSignIn}
                style={{ backgroundColor: c.primaryContainer, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12 }}
              >
                <Text style={{ color: c.onPrimary, fontWeight: '600' }}>Sign in with Google</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Backup Action Card */}
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>☁️</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: c.onBackground, marginBottom: 4 }}>
            Backup Your Data
          </Text>
          <Text style={{ color: c.onSurface, marginBottom: 16, textAlign: 'center' }}>
            Keep your meditation journey safe
          </Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={handleBackupNow}
              disabled={isBusy || !isSignedIn}
              style={{
                backgroundColor: c.primaryContainer,
                borderRadius: 24,
                paddingHorizontal: 20,
                paddingVertical: 12,
                opacity: isBusy || !isSignedIn ? 0.5 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {isBackingUp && <ActivityIndicator size="small" color={c.onPrimary} />}
              <Text style={{ color: c.onPrimary, fontWeight: '600' }}>
                {isBackingUp ? 'Backing up...' : 'Backup Now'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleRestore}
              disabled={isBusy || !isSignedIn}
              style={{
                backgroundColor: c.surfaceVariant,
                borderRadius: 24,
                paddingHorizontal: 20,
                paddingVertical: 12,
                opacity: isBusy || !isSignedIn ? 0.5 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {isRestoring && <ActivityIndicator size="small" color={c.onSurface} />}
              <Text style={{ color: c.onSurface, fontWeight: '600' }}>
                {isRestoring ? 'Restoring...' : 'Restore'}
              </Text>
            </Pressable>
          </View>

          {lastBackupTime && (
            <Text style={{ color: c.onSurface, fontSize: 11, marginTop: 10 }}>
              Last backup: {formatBackupTime(lastBackupTime)}
            </Text>
          )}
          {!isSignedIn && (
            <Text style={{ color: c.onSurface, fontSize: 11, marginTop: 10 }}>
              Sign in to enable backup
            </Text>
          )}
        </View>

        {/* Auto Backup Settings */}
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: c.onBackground, marginBottom: 16 }}>
            Auto Backup Settings
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View>
              <Text style={{ color: c.onBackground, fontSize: 14 }}>After Each Session</Text>
              <Text style={{ color: c.onSurface, fontSize: 11 }}>Automatically backup after meditation</Text>
            </View>
            <Switch
              value={autoAfterSession}
              onValueChange={setAutoAfterSession}
              trackColor={{ false: c.surfaceVariant, true: c.primaryContainer }}
              thumbColor={autoAfterSession ? c.primary : c.onSurface}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: c.onBackground, fontSize: 14 }}>Daily Backup</Text>
              <Text style={{ color: c.onSurface, fontSize: 11 }}>Backup once every day</Text>
            </View>
            <Switch
              value={autoDaily}
              onValueChange={setAutoDaily}
              trackColor={{ false: c.surfaceVariant, true: c.primaryContainer }}
              thumbColor={autoDaily ? c.primary : c.onSurface}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
