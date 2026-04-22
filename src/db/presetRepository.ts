import { getDatabase } from './database';
import { PresetTimer, PresetElement } from '../types/preset';

interface PresetRow {
  id: string;
  name: string;
  description: string;
  durations: string; // JSON column — stores PresetElement[] (or old DurationConfig[] for migration)
  is_favorite: number;
  sort_order: number;
  last_used: number;
  created_at: number;
}

function normalizeElements(raw: any[]): PresetElement[] {
  if (raw.length === 0) return [];

  // New format: already has 'kind' discriminator
  if (raw[0].kind) return raw as PresetElement[];

  // Old format: DurationConfig[] with startSound/endSound — expand to flat elements
  const elements: PresetElement[] = [];
  for (const d of raw) {
    const startSound = d.startSound;
    const endSound = d.endSound;

    if (typeof startSound === 'number') {
      elements.push({ kind: 'sound', soundId: startSound, name: `Start ${d.name}` });
    }

    elements.push({
      kind: 'duration',
      type: d.type,
      durationMillis: d.durationMillis,
      name: d.name,
      soundConfigs: d.soundConfigs ?? [],
    });

    if (typeof endSound === 'number') {
      elements.push({ kind: 'sound', soundId: endSound, name: `End ${d.name}` });
    }
  }
  return elements;
}

function rowToPreset(row: PresetRow): PresetTimer {
  const parsed = JSON.parse(row.durations) as any[];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    elements: normalizeElements(parsed),
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
      JSON.stringify(preset.elements),
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
      JSON.stringify(preset.elements),
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
