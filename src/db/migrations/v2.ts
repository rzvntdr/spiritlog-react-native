import * as SQLite from 'expo-sqlite';

export async function v2Migration(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS achievements (
      id            TEXT NOT NULL,
      tier          TEXT NOT NULL DEFAULT 'single',
      unlocked_at   INTEGER NOT NULL,
      PRIMARY KEY (id, tier)
    );
  `);
}
