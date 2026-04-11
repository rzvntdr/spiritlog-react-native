import * as SQLite from 'expo-sqlite';
import { v1Migration } from './migrations/v1';

const DB_NAME = 'spiritlog.db';
const CURRENT_VERSION = 1;

let db: SQLite.SQLiteDatabase | null = null;
let openingPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    try {
      await db.getFirstAsync('SELECT 1');
      return db;
    } catch {
      db = null;
    }
  }
  // Prevent multiple concurrent re-opens
  if (openingPromise) return openingPromise;
  openingPromise = (async () => {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await runMigrations(db);
    openingPromise = null;
    return db;
  })();
  return openingPromise;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  const result = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < 1) {
    await v1Migration(database);
    await database.execAsync(`PRAGMA user_version = ${CURRENT_VERSION}`);
  }
}
