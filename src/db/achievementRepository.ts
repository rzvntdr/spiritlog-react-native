import { getDatabase } from './database';
import { Tier, UnlockedRecord } from '../types/achievement';

interface AchievementRow {
  id: string;
  tier: string;
  unlocked_at: number;
}

export async function getAllUnlocked(): Promise<UnlockedRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AchievementRow>(
    'SELECT id, tier, unlocked_at FROM achievements'
  );
  return rows.map((r) => ({
    id: r.id,
    tier: r.tier as Tier,
    unlockedAt: r.unlocked_at,
  }));
}

export async function insertUnlock(record: UnlockedRecord): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR IGNORE INTO achievements (id, tier, unlocked_at) VALUES (?, ?, ?)',
    [record.id, record.tier, record.unlockedAt]
  );
}

export async function deleteAll(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM achievements');
}
