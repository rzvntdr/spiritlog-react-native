import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  themeId: string;
  screenAwake: boolean;
  hapticsEnabled: boolean;
  isLoaded: boolean;

  // Actions
  setThemeId: (id: string) => void;
  setScreenAwake: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  loadSettings: () => Promise<void>;
}

const SETTINGS_KEY = '@spiritlog_settings';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  themeId: 'ocean',
  screenAwake: true,
  hapticsEnabled: true,
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

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          themeId: parsed.themeId ?? 'ocean',
          screenAwake: parsed.screenAwake ?? true,
          hapticsEnabled: parsed.hapticsEnabled ?? true,
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
  };
  AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}
