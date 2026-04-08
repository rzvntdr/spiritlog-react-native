import { getDatabase } from '../db/database';
import { getAllPresets, insertPreset, getPresetCount } from '../db/presetRepository';
import { getAllSessions, insertSession } from '../db/sessionRepository';
import { PresetTimer } from '../types/preset';
import { MeditationSession } from '../types/session';

interface BackupData {
  version: number;
  exportedAt: number;
  presets: PresetTimer[];
  sessions: MeditationSession[];
}

/**
 * Export all data as a JSON string for backup.
 */
export async function exportBackupData(): Promise<string> {
  const presets = await getAllPresets();
  const sessions = await getAllSessions();

  const backup: BackupData = {
    version: 1,
    exportedAt: Date.now(),
    presets,
    sessions,
  };

  return JSON.stringify(backup);
}

/**
 * Import backup data, replacing all local data.
 */
export async function importBackupData(jsonString: string): Promise<{ presetCount: number; sessionCount: number }> {
  const backup: BackupData = JSON.parse(jsonString);

  if (!backup.version || !backup.presets || !backup.sessions) {
    throw new Error('Invalid backup format');
  }

  const db = await getDatabase();

  // Clear existing data
  await db.execAsync('DELETE FROM presets');
  await db.execAsync('DELETE FROM sessions');

  // Insert presets
  for (const preset of backup.presets) {
    await insertPreset(preset);
  }

  // Insert sessions
  for (const session of backup.sessions) {
    await insertSession(session);
  }

  return { presetCount: backup.presets.length, sessionCount: backup.sessions.length };
}

/**
 * Get a filename for the backup.
 */
export function getBackupFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `spiritlog_backup_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}
