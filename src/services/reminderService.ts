import { Platform } from 'react-native';
import { ReminderConfig } from '../stores/settingsStore';

let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // not available
}

const REMINDER_PREFIX = 'meditation-reminder-';

const DAY_NAMES = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getDayName(day: number): string {
  return DAY_NAMES[day] ?? '';
}

export async function scheduleReminders(config: ReminderConfig): Promise<void> {
  await cancelAllReminders();
  if (!Notifications || !config.enabled || config.days.length === 0) return;

  for (const weekday of config.days) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${REMINDER_PREFIX}${weekday}`,
      content: {
        title: config.title,
        body: config.body,
        sound: true,
        ...(Platform.OS === 'android' && {
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: config.hour,
        minute: config.minute,
      },
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith(REMINDER_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}
