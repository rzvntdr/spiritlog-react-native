import './global.css';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useSettingsStore } from './src/stores/settingsStore';
import { useSessionStore } from './src/stores/sessionStore';
import { usePresetStore } from './src/stores/presetStore';
import { useBackupStore } from './src/stores/backupStore';
import { useAchievementStore } from './src/stores/achievementStore';
import { requestNotificationPermissions } from './src/services/notificationService';
import AppNavigator from './src/navigation/navigation';

function AppContent() {
  const { theme } = useTheme();

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const isLoaded = useSettingsStore((s) => s.isLoaded);

  useEffect(() => {
    (async () => {
      await loadSettings();
      requestNotificationPermissions();

      // Load data for achievement context, then trigger retroactive checks
      await Promise.all([
        useSessionStore.getState().loadSessions(),
        useSessionStore.getState().loadStats(),
        usePresetStore.getState().loadPresets(),
        useBackupStore.getState().loadPersistedState(),
        useBackupStore.getState().signInSilently().catch(() => {}),
        useAchievementStore.getState().loadUnlocked(),
      ]);
      await useAchievementStore.getState().triggerCheck({ type: 'app_start' });
    })();
  }, [loadSettings]);

  if (!isLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
