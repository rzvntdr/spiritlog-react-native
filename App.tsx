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
import { createLogger, installGlobalErrorHandlers } from './src/utils/logger';
import { pushWidgetUpdate } from './src/widget/widgetData';

installGlobalErrorHandlers();
const log = createLogger('app');

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
      log.info('boot: start');
      try {
        await loadSettings();
        log.debug('boot: settings loaded');
        requestNotificationPermissions();

        await Promise.all([
          useSessionStore.getState().loadSessions(),
          useSessionStore.getState().loadStats(),
          useSessionStore.getState().loadLastShownStreakState(),
          usePresetStore.getState().loadPresets(),
          useBackupStore.getState().loadPersistedState(),
          useBackupStore.getState().signInSilently().catch((e) => {
            log.warn('boot: signInSilently failed', e);
          }),
          useAchievementStore.getState().loadUnlocked(),
        ]);
        log.debug('boot: stores loaded');
        await useAchievementStore.getState().triggerCheck({ type: 'app_start' });
        pushWidgetUpdate();
        log.info('boot: complete');
      } catch (e) {
        log.error('boot: failed', e);
      }
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
