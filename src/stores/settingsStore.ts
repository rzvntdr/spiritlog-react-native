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
  ambientVolume: number;
  /** Debug-only: when set, HomeScreen's StreakHero uses this value instead of the real streak. */
  demoStreakOverride: number | null;
  /** Debug-only: when set (and demo active), overrides the freeze count shown. null = derive from streak. */
  demoFreezeOverride: number | null;
  /** Custom template for the StreakHero subtitle. null = default ("DAYS IN A ROW"). Supports {streak} {best} {hours} {sessions}. */
  streakHeroText: string | null;
  /** Visual style for the StreakHero card. 'classic' = glow circles + sparkles. 'plant' = SVG plant that grows with the tier. */
  streakArtStyle: 'classic' | 'plant';
  /** Q2: number of consecutive streak days required to earn 1 freeze. Default 10. */
  freezeEarnRate: number;
  /** Which Lottie celebration theme plays on streak/freeze increments. */
  celebrationAssetId: string;
  isLoaded: boolean;

  // Actions
  setThemeId: (id: string) => void;
  setScreenAwake: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  setAutoBackupAfterSession: (value: boolean) => void;
  setDndEnabled: (value: boolean) => void;
  setReminder: (config: ReminderConfig) => void;
  setAchievementsEnabled: (value: boolean) => void;
  setAmbientVolume: (value: number) => void;
  setDemoStreakOverride: (value: number | null) => void;
  setDemoFreezeOverride: (value: number | null) => void;
  setStreakHeroText: (value: string | null) => void;
  setStreakArtStyle: (value: 'classic' | 'plant') => void;
  setFreezeEarnRate: (value: number) => void;
  setCelebrationAssetId: (value: string) => void;
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
  ambientVolume: 0.5,
  demoStreakOverride: null,
  demoFreezeOverride: null,
  streakHeroText: null,
  streakArtStyle: 'classic',
  freezeEarnRate: 10,
  celebrationAssetId: 'burst',
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

  setAmbientVolume: (value) => {
    set({ ambientVolume: value });
    persistSettings(get());
  },

  setDemoStreakOverride: (value) => {
    set({ demoStreakOverride: value });
    persistSettings(get());
  },

  setDemoFreezeOverride: (value) => {
    set({ demoFreezeOverride: value === null ? null : Math.max(0, Math.floor(value)) });
    persistSettings(get());
  },

  setStreakHeroText: (value) => {
    const trimmed = value === null ? null : value.trim();
    set({ streakHeroText: trimmed && trimmed.length > 0 ? trimmed : null });
    persistSettings(get());
  },

  setStreakArtStyle: (value) => {
    set({ streakArtStyle: value });
    persistSettings(get());
  },

  setFreezeEarnRate: (value) => {
    const clamped = Math.max(1, Math.min(30, Math.floor(value)));
    set({ freezeEarnRate: clamped });
    persistSettings(get());
  },

  setCelebrationAssetId: (value) => {
    set({ celebrationAssetId: value });
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
          ambientVolume: parsed.ambientVolume ?? 0.5,
          demoStreakOverride: parsed.demoStreakOverride ?? null,
          demoFreezeOverride: parsed.demoFreezeOverride ?? null,
          streakHeroText: parsed.streakHeroText ?? null,
          streakArtStyle: parsed.streakArtStyle ?? 'classic',
          freezeEarnRate: typeof parsed.freezeEarnRate === 'number' ? parsed.freezeEarnRate : 10,
          celebrationAssetId: parsed.celebrationAssetId ?? 'burst',
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
    ambientVolume: state.ambientVolume,
    demoStreakOverride: state.demoStreakOverride,
    demoFreezeOverride: state.demoFreezeOverride,
    streakHeroText: state.streakHeroText,
    streakArtStyle: state.streakArtStyle,
    freezeEarnRate: state.freezeEarnRate,
    celebrationAssetId: state.celebrationAssetId,
  };
  AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}
