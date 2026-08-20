import type { SQLiteDatabase } from 'expo-sqlite';

import type { SystemCategoryDefinition } from '@/domain/system-categories';

type SystemCategoryRow = {
  id: number;
  system_key: string | null;
};

/**
 * Returns the stable category used by internal transaction flows.
 * Older databases may already contain the default name without a system key,
 * so adopt that row before creating a duplicate.
 */
export async function ensureSystemCategory(
  database: SQLiteDatabase,
  definition: SystemCategoryDefinition,
  now = Date.now(),
) {
  const existingByKey = await database.getFirstAsync<SystemCategoryRow>(
    'SELECT id, system_key FROM categories WHERE system_key = ? LIMIT 1',
    definition.systemKey,
  );
  if (existingByKey) return existingByKey.id;

  const existingByName = await database.getFirstAsync<SystemCategoryRow>(
    'SELECT id, system_key FROM categories WHERE type = ? AND name = ? LIMIT 1',
    definition.type,
    definition.defaultName,
  );
  if (existingByName) {
    await database.runAsync(
      `UPDATE categories
       SET system_key = ?, icon_key = COALESCE(icon_key, ?),
           is_default = 1, updated_at = ?
       WHERE id = ?`,
      definition.systemKey,
      definition.iconKey,
      now,
      existingByName.id,
    );
    return existingByName.id;
  }

  const result = await database.runAsync(
    `INSERT INTO categories (
       name, type, icon_key, system_key, is_default, is_fallback,
       sort_order, created_at, updated_at
     ) VALUES (?, ?, ?, ?, 1, 0, ?, ?, ?)`,
    definition.defaultName,
    definition.type,
    definition.iconKey,
    definition.systemKey,
    definition.sortOrder,
    now,
    now,
  );
  return result.lastInsertRowId;
}
