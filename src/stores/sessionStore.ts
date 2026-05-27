import { create } from 'zustand';
import { MeditationSession } from '../types/session';
import * as repo from '../db/sessionRepository';
import { createLogger } from '../utils/logger';

const log = createLogger('sessionStore');

interface SessionStats {
  totalSessions: number;
  totalMinutes: number;
  thisWeek: number;
  avgDuration: number;
  currentStreak: number;
  bestStreak: number;
  longestSession: number;
  freezesAvailable: number; // TODO: implement Q2 freeze logic; 0 until then
}

interface SessionState {
  sessions: MeditationSession[];
  stats: SessionStats;
  isLoaded: boolean;

  // Actions
  loadSessions: () => Promise<void>;
  loadStats: () => Promise<void>;
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

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  stats: emptyStats,
  isLoaded: false,

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
      const [totalSessions, totalMinutes, thisWeek, avgDuration, currentStreak, bestStreak, longestSession] =
        await Promise.all([
          repo.getTotalSessionCount(),
          repo.getTotalMeditationMinutes(),
          repo.getSessionsCountThisWeek(),
          repo.getAverageSessionDuration(),
          repo.getCurrentStreak(),
          repo.getBestStreak(),
          repo.getLongestSession(),
        ]);
      log.debug('loadStats', { totalSessions, currentStreak, bestStreak });
      set({
        stats: { totalSessions, totalMinutes, thisWeek, avgDuration, currentStreak, bestStreak, longestSession, freezesAvailable: 0 },
      });
    } catch (e) {
      log.error('loadStats failed', e);
    }
  },

  insertSession: async (session) => {
    try {
      log.info('insertSession', { id: session.id, duration: session.duration, presetId: session.presetId });
      await repo.insertSession(session);
      const sessions = await repo.getAllSessions();
      const [totalSessions, totalMinutes, thisWeek, avgDuration, currentStreak, bestStreak, longestSession] =
        await Promise.all([
          repo.getTotalSessionCount(),
          repo.getTotalMeditationMinutes(),
          repo.getSessionsCountThisWeek(),
          repo.getAverageSessionDuration(),
          repo.getCurrentStreak(),
          repo.getBestStreak(),
          repo.getLongestSession(),
        ]);
      set({
        sessions,
        stats: { totalSessions, totalMinutes, thisWeek, avgDuration, currentStreak, bestStreak, longestSession, freezesAvailable: 0 },
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
