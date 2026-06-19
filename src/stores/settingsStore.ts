import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_REMINDER_TITLE = 'Time to Meditate';
export const DEFAULT_REMINDER_BODY = 'Take a moment to breathe and find your calm.';

/**
 * Visual tuning for the 'plant' streak art. Set once (dev builds expose
 * sliders; release builds keep whatever shipped/was first generated —
 * there is intentionally NO release UI to change these afterwards).
 */
export interface PlantTuning {
  /** 0..1 foliage density. */
  density: number;
  /** Multiplier on leaf size. */
  leafScale: number;
  /** Multiplier on branch thickness. */
  thickness: number;
  /** 0..1 how many branches the skeleton grows. */
  branchiness: number;
  /** 0..1 crown width. */
  crownSpread: number;
}

export const DEFAULT_PLANT_TUNING: PlantTuning = {
  density: 0.5,
  leafScale: 1,
  thickness: 1,
  branchiness: 0.5,
  crownSpread: 0.5,
};

export type PlantAlgorithmSetting = 'colony' | 'lsystem';
export type PlantFormSetting = 'auto' | 'tall' | 'broad';

/**
 * TRANSIENT plant draft used by the debug tuning panel: the sliders edit this,
 * the hero/preview renders it while it exists, and it is NEVER persisted.
 * The explicit "save/override" button commits it into the persisted fields
 * (plantSeed/plantAlgorithm/plantForm/plantTuning); dismissing the panel
 * discards it and the plant falls back to the saved config.
 */
export interface PlantDraft {
  seed: number;
  algorithm: PlantAlgorithmSetting;
  form: PlantFormSetting;
  tuning: PlantTuning;
}

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
  /** Seed of the user's plant (null until first assigned — then stable). */
  plantSeed: number | null;
  /** Skeleton algorithm for the plant art. */
  plantAlgorithm: PlantAlgorithmSetting;
  /** L-system silhouette ('auto' = let the seed decide). */
  plantForm: PlantFormSetting;
  /** Design knobs for the plant art. */
  plantTuning: PlantTuning;
  /** Transient debugger draft (not persisted) — see PlantDraft. */
  plantDraft: PlantDraft | null;
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
  setPlantSeed: (value: number) => void;
  setPlantAlgorithm: (value: PlantAlgorithmSetting) => void;
  setPlantForm: (value: PlantFormSetting) => void;
  setPlantTuning: (value: Partial<PlantTuning>) => void;
  /** Patch the transient draft (created from the saved config on first touch). */
  setPlantDraft: (patch: Partial<Omit<PlantDraft, 'tuning'>> & { tuning?: Partial<PlantTuning> }) => void;
  clearPlantDraft: () => void;
  /** Commit the draft into the persisted plant config ("override"). */
  commitPlantDraft: () => void;
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
  plantSeed: null,
  plantAlgorithm: 'lsystem',
  plantForm: 'auto',
  plantTuning: DEFAULT_PLANT_TUNING,
  plantDraft: null,
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

  setPlantSeed: (value) => {
    set({ plantSeed: value >>> 0 });
    persistSettings(get());
  },

  setPlantAlgorithm: (value) => {
    set({ plantAlgorithm: value });
    persistSettings(get());
  },

  setPlantForm: (value) => {
    set({ plantForm: value });
    persistSettings(get());
  },

  setPlantTuning: (value) => {
    set({ plantTuning: { ...get().plantTuning, ...value } });
    persistSettings(get());
  },

  setPlantDraft: (patch) => {
    const st = get();
    const base: PlantDraft = st.plantDraft ?? {
      seed: st.plantSeed ?? 1337,
      algorithm: st.plantAlgorithm,
      form: st.plantForm,
      tuning: st.plantTuning,
    };
    set({
      plantDraft: {
        ...base,
        ...patch,
        tuning: { ...base.tuning, ...(patch.tuning ?? {}) },
      },
    });
    // intentionally NOT persisted — drafts die with the session/panel
  },

  clearPlantDraft: () => set({ plantDraft: null }),

  commitPlantDraft: () => {
    const draft = get().plantDraft;
    if (!draft) return;
    set({
      plantSeed: draft.seed >>> 0,
      plantAlgorithm: draft.algorithm,
      plantForm: draft.form,
      plantTuning: draft.tuning,
      plantDraft: null,
    });
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
          plantSeed: typeof parsed.plantSeed === 'number' ? parsed.plantSeed : null,
          plantAlgorithm: parsed.plantAlgorithm === 'colony' ? 'colony' : 'lsystem',
          plantForm: ['tall', 'broad'].includes(parsed.plantForm) ? parsed.plantForm : 'auto',
          plantTuning: { ...DEFAULT_PLANT_TUNING, ...(parsed.plantTuning ?? {}) },
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
    plantSeed: state.plantSeed,
    plantAlgorithm: state.plantAlgorithm,
    plantForm: state.plantForm,
    plantTuning: state.plantTuning,
  };
  AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}
