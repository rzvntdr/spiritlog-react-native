import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MeditationSession } from '../types/session';
import * as repo from '../db/sessionRepository';
import { createLogger } from '../utils/logger';
import { useSettingsStore } from './settingsStore';

const log = createLogger('sessionStore');

const LAST_SHOWN_KEY = '@spiritlog_last_streak_state';

/** Snapshot of what the Home StreakHero last rendered. Compared on Home mount
 *  to decide whether to animate the diff. Persisted across app restarts. */
export interface LastShownStreakState {
  streak: number;
  freezesAvailable: number;
  lastSessionDayMs: number | null;
  ts: number; // when this snapshot was written
}

interface SessionStats {
  totalSessions: number;
  totalMinutes: number;
  thisWeek: number;
  avgDuration: number;
  currentStreak: number;
  bestStreak: number;
  longestSession: number;
  /** Q2 freezes earned and available right now. Simple formula: 1 per 7 streak days, cap 2. */
  freezesAvailable: number;
}

interface SessionState {
  sessions: MeditationSession[];
  stats: SessionStats;
  isLoaded: boolean;
  /** Last state shown on the StreakHero (persisted in AsyncStorage). null if never shown. */
  lastShownStreakState: LastShownStreakState | null;

  // Actions
  loadSessions: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadLastShownStreakState: () => Promise<void>;
  setLastShownStreakState: (next: LastShownStreakState) => Promise<void>;
  insertSession: (session: MeditationSession) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
}

const emptyStats: SessionStats = {
  totalSessions: 0,
  totalMinutes: 0,
  thisWeek: 0,
  avgDuration: 0,
  currentStreak: 0,
  bestStreak: 0,
  longestSession: 0,
  freezesAvailable: 0,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  stats: emptyStats,
  isLoaded: false,
  lastShownStreakState: null,

  loadSessions: async () => {
    try {
      const sessions = await repo.getAllSessions();
      log.debug('loadSessions', { count: sessions.length });
      set({ sessions, isLoaded: true });
    } catch (e) {
      log.error('loadSessions failed', e);
      set({ isLoaded: true });
    }
  },

  loadStats: async () => {
    try {
      const rate = useSettingsStore.getState().freezeEarnRate;
      const [totalSessions, totalMinutes, thisWeek, avgDuration, longestSession, streakState] =
        await Promise.all([
          repo.getTotalSessionCount(),
          repo.getTotalMeditationMinutes(),
          repo.getSessionsCountThisWeek(),
          repo.getAverageSessionDuration(),
          repo.getLongestSession(),
          repo.getStreakState(rate),
        ]);
      log.debug('loadStats', {
        totalSessions,
        currentStreak: streakState.streak,
        bestStreak: streakState.best,
        freezesAvailable: streakState.freezesAvailable,
      });
      set({
        stats: {
          totalSessions,
          totalMinutes,
          thisWeek,
          avgDuration,
          currentStreak: streakState.streak,
          bestStreak: streakState.best,
          longestSession,
          freezesAvailable: streakState.freezesAvailable,
        },
      });
    } catch (e) {
      log.error('loadStats failed', e);
    }
  },

  loadLastShownStreakState: async () => {
    try {
      const raw = await AsyncStorage.getItem(LAST_SHOWN_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LastShownStreakState;
        set({ lastShownStreakState: parsed });
      }
    } catch (e) {
      log.warn('loadLastShownStreakState failed', e);
    }
  },

  setLastShownStreakState: async (next) => {
    set({ lastShownStreakState: next });
    try {
      await AsyncStorage.setItem(LAST_SHOWN_KEY, JSON.stringify(next));
    } catch (e) {
      log.warn('setLastShownStreakState persist failed', e);
    }
  },

  insertSession: async (session) => {
    try {
      log.info('insertSession', { id: session.id, duration: session.duration, presetId: session.presetId });
      await repo.insertSession(session);
      const sessions = await repo.getAllSessions();
      const rate = useSettingsStore.getState().freezeEarnRate;
      const [totalSessions, totalMinutes, thisWeek, avgDuration, longestSession, streakState] =
        await Promise.all([
          repo.getTotalSessionCount(),
          repo.getTotalMeditationMinutes(),
          repo.getSessionsCountThisWeek(),
          repo.getAverageSessionDuration(),
          repo.getLongestSession(),
          repo.getStreakState(rate),
        ]);
      set({
        sessions,
        stats: {
          totalSessions,
          totalMinutes,
          thisWeek,
          avgDuration,
          currentStreak: streakState.streak,
          bestStreak: streakState.best,
          longestSession,
          freezesAvailable: streakState.freezesAvailable,
        },
      });
    } catch (e) {
      log.error('insertSession failed', { id: session.id }, e);
      throw e; // propagate so caller can show Save Error
    }
  },

  deleteSession: async (id) => {
    try {
      log.info('deleteSession', { id });
      await repo.deleteSession(id);
      const sessions = await repo.getAllSessions();
      set({ sessions });
    } catch (e) {
      log.error('deleteSession failed', { id }, e);
    }
  },
}));
