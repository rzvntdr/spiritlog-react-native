import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import TimerScreen from '../screens/TimerScreen';
import CreatePresetScreen from '../screens/CreatePresetScreen';
import JourneyScreen from '../screens/JourneyScreen';
import BackupScreen from '../screens/BackupScreen';
import HowToUseScreen from '../screens/HowToUseScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ReminderScreen from '../screens/ReminderScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import AchievementToast from '../components/achievement/AchievementToast';

export type RootStackParamList = {
  Home: undefined;
  Timer: { presetId: string };
  CreatePreset: undefined;
  EditPreset: { presetId: string };
  Journey: undefined;
  Settings: undefined;
  Backup: undefined;
  HowToUse: undefined;
  Reminder: undefined;
  Achievements: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { theme } = useTheme();

  return (
    <NavigationContainer
      theme={{
        dark: theme.isDark,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.onBackground,
          border: theme.colors.surfaceVariant,
          notification: theme.colors.accent,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Timer" component={TimerScreen} />
        <Stack.Screen
          name="CreatePreset"
          component={CreatePresetScreen}
          options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
        />
        <Stack.Screen
          name="EditPreset"
          component={CreatePresetScreen}
          options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
        />
        <Stack.Screen name="Journey" component={JourneyScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Backup" component={BackupScreen} />
        <Stack.Screen name="HowToUse" component={HowToUseScreen} />
        <Stack.Screen name="Reminder" component={ReminderScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
      </Stack.Navigator>
      <AchievementToast />
    </NavigationContainer>
  );
}
