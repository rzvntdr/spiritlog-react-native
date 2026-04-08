import * as SQLite from 'expo-sqlite';

export async function v1Migration(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS presets (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      durations     TEXT NOT NULL,
      is_favorite   INTEGER NOT NULL DEFAULT 0,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      last_used     INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id            TEXT PRIMARY KEY,
      duration      INTEGER NOT NULL,
      date          INTEGER NOT NULL,
      preset_id     TEXT,
      notes         TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
    CREATE INDEX IF NOT EXISTS idx_presets_favorite ON presets(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_presets_sort ON presets(sort_order);
  `);
}
