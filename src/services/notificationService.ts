import { Platform } from 'react-native';

let Notifications: typeof import('expo-notifications') | null = null;

try {
  Notifications = require('expo-notifications');
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  console.warn('expo-notifications not available');
}

const MEDITATION_NOTIFICATION_ID = 'meditation-complete';

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleMeditationComplete(remainingMs: number): Promise<void> {
  if (!Notifications) return;
  await cancelMeditationNotification();
  if (remainingMs <= 0) return;

  const seconds = Math.max(Math.round(remainingMs / 1000), 1);

  await Notifications.scheduleNotificationAsync({
    identifier: MEDITATION_NOTIFICATION_ID,
    content: {
      title: 'Meditation Complete',
      body: 'Your meditation session has finished. Tap to save your session.',
      sound: true,
      ...(Platform.OS === 'android' && {
        priority: Notifications.AndroidNotificationPriority.HIGH,
      }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
  });
}

export async function cancelMeditationNotification(): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(MEDITATION_NOTIFICATION_ID);
}

export async function showOngoingMeditationNotification(presetName: string): Promise<void> {
  if (!Notifications || Platform.OS !== 'android') return;

  await Notifications.scheduleNotificationAsync({
    identifier: 'meditation-ongoing',
    content: {
      title: 'Meditating',
      body: presetName,
      sticky: true,
      ...(Platform.OS === 'android' && {
        priority: Notifications.AndroidNotificationPriority.LOW,
      }),
    },
    trigger: null,
  });
}

export async function dismissOngoingNotification(): Promise<void> {
  if (!Notifications) return;
  await Notifications.dismissNotificationAsync('meditation-ongoing');
}
