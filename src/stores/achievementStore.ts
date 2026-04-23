import { create } from 'zustand';
import {
  EventType,
  Tier,
  UnlockedRecord,
} from '../types/achievement';
import * as repo from '../db/achievementRepository';
import { checkAndUnlock } from '../services/achievementService';
import { useSettingsStore } from './settingsStore';

interface AchievementState {
  unlocked: Map<string, Set<Tier>>;
  unlockedAt: Map<string, Map<Tier, number>>;
  toastQueue: UnlockedRecord[];
  isLoaded: boolean;

  loadUnlocked: () => Promise<void>;
  triggerCheck: (event: { type: EventType; data?: unknown }) => Promise<void>;
  dismissToast: () => void;
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  unlocked: new Map(),
  unlockedAt: new Map(),
  toastQueue: [],
  isLoaded: false,

  loadUnlocked: async () => {
    const records = await repo.getAllUnlocked();
    const unlocked = new Map<string, Set<Tier>>();
    const unlockedAt = new Map<string, Map<Tier, number>>();
    for (const r of records) {
      if (!unlocked.has(r.id)) unlocked.set(r.id, new Set());
      unlocked.get(r.id)!.add(r.tier);
      if (!unlockedAt.has(r.id)) unlockedAt.set(r.id, new Map());
      unlockedAt.get(r.id)!.set(r.tier, r.unlockedAt);
    }
    set({ unlocked, unlockedAt, isLoaded: true });
  },

  triggerCheck: async (event) => {
    if (!useSettingsStore.getState().achievementsEnabled) return;
    const current = get().unlocked;
    const newUnlocks = await checkAndUnlock(event, current);
    if (newUnlocks.length === 0) return;

    const unlocked = new Map(current);
    const unlockedAt = new Map(get().unlockedAt);
    for (const rec of newUnlocks) {
      if (!unlocked.has(rec.id)) unlocked.set(rec.id, new Set());
      unlocked.get(rec.id)!.add(rec.tier);
      if (!unlockedAt.has(rec.id)) unlockedAt.set(rec.id, new Map());
      unlockedAt.get(rec.id)!.set(rec.tier, rec.unlockedAt);
    }
    set({
      unlocked,
      unlockedAt,
      toastQueue: [...get().toastQueue, ...newUnlocks],
    });
  },

  dismissToast: () => {
    const [, ...rest] = get().toastQueue;
    set({ toastQueue: rest });
  },
}));
