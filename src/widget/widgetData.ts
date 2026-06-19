import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { Platform } from 'react-native';
import { useSessionStore } from '../stores/sessionStore';
import {
  DEFAULT_PLANT_TUNING,
  PlantAlgorithmSetting,
  PlantFormSetting,
  PlantTuning,
  useSettingsStore,
} from '../stores/settingsStore';
import { renderStreakText } from '../utils/streakText';
import { createLogger } from '../utils/logger';
import { StreakWidget } from './StreakWidgetView';

const log = createLogger('widget');

export const WIDGET_NAME = 'StreakWidget';
const WIDGET_DATA_KEY = '@spiritlog_widget_data';

export interface WidgetPayload {
  streak: number;
  freezes: number;
  subtitle: string;
  /** Plant identity + tuning so the headless widget renders YOUR plant. */
  plantSeed: number;
  plantAlgorithm: PlantAlgorithmSetting;
  plantForm: PlantFormSetting;
  plantTuning: PlantTuning;
}

const DEFAULT_PAYLOAD: WidgetPayload = {
  streak: 0,
  freezes: 0,
  subtitle: 'DAYS IN A ROW',
  plantSeed: 1337,
  plantAlgorithm: 'lsystem',
  plantForm: 'auto',
  plantTuning: DEFAULT_PLANT_TUNING,
};

/** Build the widget payload from current app state. Honors demo overrides so
 *  develop mode pushes the demo number to the widget too. */
export function computeWidgetPayload(): WidgetPayload {
  const stats = useSessionStore.getState().stats;
  const s = useSettingsStore.getState();
  const rate = Math.max(1, s.freezeEarnRate);
  const demoActive = s.demoStreakOverride !== null;

  const streak = demoActive ? (s.demoStreakOverride as number) : (stats.currentStreak ?? 0);
  const freezes = demoActive
    ? (s.demoFreezeOverride ?? Math.floor((s.demoStreakOverride as number) / rate))
    : (stats.freezesAvailable ?? 0);

  const subtitle = renderStreakText(s.streakHeroText, {
    streak,
    best: stats.bestStreak ?? 0,
    totalMinutes: stats.totalMinutes ?? 0,
    totalSessions: stats.totalSessions ?? 0,
    freezesAvailable: freezes,
  });

  return {
    streak,
    freezes,
    subtitle,
    plantSeed: s.plantSeed ?? DEFAULT_PAYLOAD.plantSeed,
    plantAlgorithm: s.plantAlgorithm,
    plantForm: s.plantForm,
    plantTuning: s.plantTuning,
  };
}

export async function saveWidgetData(payload: WidgetPayload): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(payload));
  } catch (e) {
    log.warn('saveWidgetData failed', e);
  }
}

export async function loadWidgetData(): Promise<WidgetPayload> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (raw) return { ...DEFAULT_PAYLOAD, ...(JSON.parse(raw) as WidgetPayload) };
  } catch (e) {
    log.warn('loadWidgetData failed', e);
  }
  return DEFAULT_PAYLOAD;
}

/** Persist the current state and re-render any placed widgets. No-op on iOS. */
export async function pushWidgetUpdate(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const payload = computeWidgetPayload();
  await saveWidgetData(payload);
  try {
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => StreakWidget(payload),
      widgetNotFound: () => {},
    });
    log.debug('pushWidgetUpdate', payload);
  } catch (e) {
    log.warn('requestWidgetUpdate failed', e);
  }
}
