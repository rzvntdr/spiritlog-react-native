import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Switch, Alert, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { RootStackParamList } from '../navigation/navigation';
import { useTheme } from '../theme/ThemeContext';
import { useSettingsStore, ReminderConfig, DEFAULT_REMINDER_TITLE, DEFAULT_REMINDER_BODY } from '../stores/settingsStore';
import { scheduleReminders, cancelAllReminders, getDayName } from '../services/reminderService';
import { requestNotificationPermissions } from '../services/notificationService';
import { useAchievementStore } from '../stores/achievementStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Reminder'>;

const ALL_DAYS = [2, 3, 4, 5, 6, 7, 1]; // Mon–Sun

export default function ReminderScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const reminder = useSettingsStore((s) => s.reminder);
  const setReminder = useSettingsStore((s) => s.setReminder);

  const [enabled, setEnabled] = useState(reminder.enabled);
  const [hour, setHour] = useState(reminder.hour);
  const [minute, setMinute] = useState(reminder.minute);
  const [days, setDays] = useState<number[]>(reminder.days);
  const [title, setTitle] = useState(reminder.title ?? DEFAULT_REMINDER_TITLE);
  const [body, setBody] = useState(reminder.body ?? DEFAULT_REMINDER_BODY);
  const [showPicker, setShowPicker] = useState(false);

  const dirty =
    enabled !== reminder.enabled ||
    hour !== reminder.hour ||
    minute !== reminder.minute ||
    title !== (reminder.title ?? DEFAULT_REMINDER_TITLE) ||
    body !== (reminder.body ?? DEFAULT_REMINDER_BODY) ||
    JSON.stringify(days) !== JSON.stringify(reminder.days);

  const save = async () => {
    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert('Notifications Disabled', 'Please enable notifications in system settings to receive reminders.');
        return;
      }
    }

    const config: ReminderConfig = { enabled, hour, minute, days, title: title.trim() || DEFAULT_REMINDER_TITLE, body: body.trim() || DEFAULT_REMINDER_BODY };
    setReminder(config);

    if (enabled && days.length > 0) {
      await scheduleReminders(config);
      useAchievementStore.getState().triggerCheck({ type: 'reminder_enabled' });
    } else {
      await cancelAllReminders();
    }

    navigation.goBack();
  };

  const toggleDay = (day: number) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const onTimeChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (date) {
      setHour(date.getHours());
      setMinute(date.getMinutes());
    }
  };

  const timeDate = new Date();
  timeDate.setHours(hour, minute, 0, 0);

  const formatTime = (h: number, m: number) => {
    const hh = h.toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={{ fontSize: 24, color: c.onSurface }}>←</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: c.onBackground }}>
          Reminder
        </Text>
        <Pressable onPress={save} hitSlop={8} disabled={!dirty}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: dirty ? c.primary : c.surfaceVariant }}>
            Save
          </Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Enable toggle */}
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: c.onBackground, fontSize: 16, fontWeight: '600' }}>Daily Reminder</Text>
              <Text style={{ color: c.onSurface, fontSize: 12 }}>Get notified to meditate</Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: c.surfaceVariant, true: c.primaryContainer }}
              thumbColor={enabled ? c.primary : c.onSurface}
            />
          </View>
        </View>

        {/* Time picker */}
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 16, opacity: enabled ? 1 : 0.4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.onSurface, marginBottom: 12 }}>TIME</Text>
          <Pressable
            onPress={() => enabled && setShowPicker(true)}
            style={{
              backgroundColor: c.surfaceVariant,
              borderRadius: 10,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: '700', color: c.onBackground, fontVariant: ['tabular-nums'] }}>
              {formatTime(hour, minute)}
            </Text>
          </Pressable>
        </View>

        {showPicker && (
          <DateTimePicker
            value={timeDate}
            mode="time"
            is24Hour
            onChange={onTimeChange}
          />
        )}

        {/* Day selector */}
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, opacity: enabled ? 1 : 0.4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.onSurface, marginBottom: 12 }}>REPEAT ON</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {ALL_DAYS.map((day) => {
              const selected = days.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => enabled && toggleDay(day)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: selected ? c.primaryContainer : c.surfaceVariant,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? c.onPrimary : c.onSurface }}>
                    {getDayName(day)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Message */}
        <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginTop: 16, opacity: enabled ? 1 : 0.4 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.onSurface, marginBottom: 12 }}>MESSAGE</Text>
          <Text style={{ fontSize: 12, color: c.onSurface, marginBottom: 4 }}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            editable={enabled}
            placeholder={DEFAULT_REMINDER_TITLE}
            placeholderTextColor={c.surfaceVariant}
            style={{
              backgroundColor: c.surfaceVariant,
              borderRadius: 8,
              padding: 12,
              color: c.onBackground,
              fontSize: 15,
              marginBottom: 12,
            }}
          />
          <Text style={{ fontSize: 12, color: c.onSurface, marginBottom: 4 }}>Body</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            editable={enabled}
            placeholder={DEFAULT_REMINDER_BODY}
            placeholderTextColor={c.surfaceVariant}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: c.surfaceVariant,
              borderRadius: 8,
              padding: 12,
              color: c.onBackground,
              fontSize: 15,
              textAlignVertical: 'top',
              minHeight: 72,
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
