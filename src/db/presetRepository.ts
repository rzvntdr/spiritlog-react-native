import { getDatabase } from './database';
import { PresetTimer, DurationConfig } from '../types/preset';

interface PresetRow {
  id: string;
  name: string;
  description: string;
  durations: string;
  is_favorite: number;
  sort_order: number;
  last_used: number;
  created_at: number;
}

function rowToPreset(row: PresetRow): PresetTimer {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    durations: JSON.parse(row.durations) as DurationConfig[],
    isFavorite: row.is_favorite === 1,
    sortOrder: row.sort_order,
    lastUsed: row.last_used,
    createdAt: row.created_at,
  };
}

export async function getAllPresets(): Promise<PresetTimer[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PresetRow>(
    'SELECT * FROM presets ORDER BY is_favorite DESC, sort_order ASC, created_at DESC'
  );
  return rows.map(rowToPreset);
}

export async function getPresetById(id: string): Promise<PresetTimer | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PresetRow>(
    'SELECT * FROM presets WHERE id = ?',
    [id]
  );
  return row ? rowToPreset(row) : null;
}

export async function insertPreset(preset: PresetTimer): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO presets (id, name, description, durations, is_favorite, sort_order, last_used, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      preset.id,
      preset.name,
      preset.description,
      JSON.stringify(preset.durations),
      preset.isFavorite ? 1 : 0,
      preset.sortOrder,
      preset.lastUsed,
      preset.createdAt,
    ]
  );
}

export async function updatePreset(preset: PresetTimer): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE presets SET name = ?, description = ?, durations = ?, is_favorite = ?, sort_order = ?, last_used = ?
     WHERE id = ?`,
    [
      preset.name,
      preset.description,
      JSON.stringify(preset.durations),
      preset.isFavorite ? 1 : 0,
      preset.sortOrder,
      preset.lastUsed,
      preset.id,
    ]
  );
}

export async function deletePreset(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM presets WHERE id = ?', [id]);
}

export async function toggleFavorite(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE presets SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?',
    [id]
  );
}

export async function updatePresetOrder(id: string, sortOrder: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE presets SET sort_order = ? WHERE id = ?', [sortOrder, id]);
}

export async function updateLastUsed(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE presets SET last_used = ? WHERE id = ?', [Date.now(), id]);
}

export async function getPresetCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM presets');
  return result?.count ?? 0;
}
