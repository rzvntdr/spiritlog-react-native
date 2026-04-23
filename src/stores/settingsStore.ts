import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_REMINDER_TITLE = 'Time to Meditate';
export const DEFAULT_REMINDER_BODY = 'Take a moment to breathe and find your calm.';

export interface ReminderConfig {
  enabled: boolean;
  hour: number;
  minute: number;
  days: number[]; // 1=Sun, 2=Mon, ..., 7=Sat
  title: string;
  body: string;
}

interface SettingsState {
  themeId: string;
  screenAwake: boolean;
  hapticsEnabled: boolean;
  autoBackupAfterSession: boolean;
  dndEnabled: boolean;
  reminder: ReminderConfig;
  achievementsEnabled: boolean;
  isLoaded: boolean;

  // Actions
  setThemeId: (id: string) => void;
  setScreenAwake: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  setAutoBackupAfterSession: (value: boolean) => void;
  setDndEnabled: (value: boolean) => void;
  setReminder: (config: ReminderConfig) => void;
  setAchievementsEnabled: (value: boolean) => void;
  loadSettings: () => Promise<void>;
}

const SETTINGS_KEY = '@spiritlog_settings';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  themeId: 'ocean',
  screenAwake: true,
  hapticsEnabled: true,
  autoBackupAfterSession: false,
  dndEnabled: false,
  reminder: { enabled: false, hour: 8, minute: 0, days: [2, 3, 4, 5, 6, 7, 1], title: DEFAULT_REMINDER_TITLE, body: DEFAULT_REMINDER_BODY },
  achievementsEnabled: true,
  isLoaded: false,

  setThemeId: (id) => {
    set({ themeId: id });
    persistSettings(get());
  },

  setScreenAwake: (value) => {
    set({ screenAwake: value });
    persistSettings(get());
  },

  setHapticsEnabled: (value) => {
    set({ hapticsEnabled: value });
    persistSettings(get());
  },

  setAutoBackupAfterSession: (value) => {
    set({ autoBackupAfterSession: value });
    persistSettings(get());
  },

  setDndEnabled: (value) => {
    set({ dndEnabled: value });
    persistSettings(get());
  },

  setReminder: (config) => {
    set({ reminder: config });
    persistSettings(get());
  },

  setAchievementsEnabled: (value) => {
    set({ achievementsEnabled: value });
    persistSettings(get());
  },

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          themeId: parsed.themeId ?? 'ocean',
          screenAwake: parsed.screenAwake ?? true,
          hapticsEnabled: parsed.hapticsEnabled ?? true,
          autoBackupAfterSession: parsed.autoBackupAfterSession ?? false,
          dndEnabled: parsed.dndEnabled ?? false,
          reminder: parsed.reminder ?? { enabled: false, hour: 8, minute: 0, days: [2, 3, 4, 5, 6, 7, 1], title: DEFAULT_REMINDER_TITLE, body: DEFAULT_REMINDER_BODY },
          achievementsEnabled: parsed.achievementsEnabled ?? true,
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },
}));

function persistSettings(state: SettingsState) {
  const data = {
    themeId: state.themeId,
    screenAwake: state.screenAwake,
    hapticsEnabled: state.hapticsEnabled,
    autoBackupAfterSession: state.autoBackupAfterSession,
    dndEnabled: state.dndEnabled,
    reminder: state.reminder,
    achievementsEnabled: state.achievementsEnabled,
  };
  AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}
