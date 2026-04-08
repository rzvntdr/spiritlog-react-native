import { create } from 'zustand';
import { MeditationSession } from '../types/session';
import * as repo from '../db/sessionRepository';

interface SessionStats {
  totalSessions: number;
  totalMinutes: number;
  thisWeek: number;
  avgDuration: number;
  currentStreak: number;
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
};

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  stats: emptyStats,
  isLoaded: false,

  loadSessions: async () => {
    const sessions = await repo.getAllSessions();
    set({ sessions, isLoaded: true });
  },

  loadStats: async () => {
    const [totalSessions, totalMinutes, thisWeek, avgDuration, currentStreak] =
      await Promise.all([
        repo.getTotalSessionCount(),
        repo.getTotalMeditationMinutes(),
        repo.getSessionsCountThisWeek(),
        repo.getAverageSessionDuration(),
        repo.getCurrentStreak(),
      ]);
    set({
      stats: { totalSessions, totalMinutes, thisWeek, avgDuration, currentStreak },
    });
  },

  insertSession: async (session) => {
    await repo.insertSession(session);
    // Refresh both lists and stats
    const sessions = await repo.getAllSessions();
    const [totalSessions, totalMinutes, thisWeek, avgDuration, currentStreak] =
      await Promise.all([
        repo.getTotalSessionCount(),
        repo.getTotalMeditationMinutes(),
        repo.getSessionsCountThisWeek(),
        repo.getAverageSessionDuration(),
        repo.getCurrentStreak(),
      ]);
    set({
      sessions,
      stats: { totalSessions, totalMinutes, thisWeek, avgDuration, currentStreak },
    });
  },

  deleteSession: async (id) => {
    await repo.deleteSession(id);
    const sessions = await repo.getAllSessions();
    set({ sessions });
  },
}));
