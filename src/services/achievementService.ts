import {
  AchievementContext,
  EventType,
  Tier,
  UnlockedRecord,
} from '../types/achievement';
import { getAllAchievements } from '../data/achievements';
import * as repo from '../db/achievementRepository';
import { useSessionStore } from '../stores/sessionStore';
import { useBackupStore } from '../stores/backupStore';
import { useSettingsStore } from '../stores/settingsStore';
import { usePresetStore } from '../stores/presetStore';

export async function buildContext(
  event: { type: EventType; data?: unknown },
  unlocked: Map<string, Set<Tier>>
): Promise<AchievementContext> {
  const sessionState = useSessionStore.getState();
  const backupState = useBackupStore.getState();
  const settingsState = useSettingsStore.getState();
  const presetState = usePresetStore.getState();

  return {
    stats: sessionState.stats,
    sessions: sessionState.sessions,
    presets: presetState.presets,
    backupState: {
      isSignedIn: backupState.isSignedIn,
      lastBackupTime: backupState.lastBackupTime,
      userEmail: backupState.userEmail,
    },
    settings: {
      reminder: settingsState.reminder,
      dndEnabled: settingsState.dndEnabled,
    },
    unlocked,
    event,
  };
}

export async function checkAndUnlock(
  event: { type: EventType; data?: unknown },
  unlocked: Map<string, Set<Tier>>
): Promise<UnlockedRecord[]> {
  const ctx = await buildContext(event, unlocked);
  const newUnlocks: UnlockedRecord[] = [];
  const now = Date.now();

  for (const achievement of getAllAchievements()) {
    if (!achievement.triggers.includes(event.type)) continue;

    if (achievement.kind === 'single') {
      if (unlocked.get(achievement.id)?.has('single')) continue;
      // Skip expired seasonal achievements (missed window)
      if (
        achievement.seasonalWindowEnd &&
        achievement.seasonalWindowEnd.getTime() < now
      ) {
        continue;
      }
      if (achievement.check(ctx)) {
        newUnlocks.push({ id: achievement.id, tier: 'single', unlockedAt: now });
      }
    } else {
      const value = achievement.getValue(ctx);
      const already = unlocked.get(achievement.id) ?? new Set<Tier>();
      for (const tier of ['bronze', 'silver', 'gold'] as const) {
        if (already.has(tier)) continue;
        if (value >= achievement.tiers[tier]) {
          newUnlocks.push({ id: achievement.id, tier, unlockedAt: now });
        }
      }
    }
  }

  for (const rec of newUnlocks) {
    await repo.insertUnlock(rec);
  }
  return newUnlocks;
}
