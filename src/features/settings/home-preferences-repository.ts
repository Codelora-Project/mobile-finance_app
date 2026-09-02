import type { SQLiteDatabase } from 'expo-sqlite';

import { withIntegrityCheckedTransaction } from '@/db/transactions';
import { runSerializedDatabaseWrite } from '@/db/write-coordinator';
import { createCodedError } from '@/lib/errors';

export const DEFAULT_QUICK_LOG_SYSTEM_KEYS = [
  'expense_food',
  'expense_transportation',
  'expense_shopping',
  'expense_bills',
  'expense_entertainment',
] as const;

// Versions before the system-key preference format used this fixed sequence
// for the Reset action. Keep it only as a one-way compatibility signature.
const LEGACY_DEFAULT_QUICK_LOG_CATEGORY_IDS = [1, 2, 3, 4, 5] as const;

type QuickLogCategoryReference = Readonly<{
  id: number;
  systemKey: string | null;
  type: 'expense' | 'income';
}>;

type StoredQuickLogReference =
  Readonly<{ system_key: string }> | Readonly<{ category_id: number }>;

type StoredQuickLogPreferences = Readonly<{
  category_refs: StoredQuickLogReference[];
  version: 2;
}>;

export function resolveDefaultQuickLogCategoryIds(
  categories: readonly QuickLogCategoryReference[],
): number[] {
  const expenseCategories = categories.filter(
    (category) => category.type === 'expense',
  );
  const idsBySystemKey = new Map(
    expenseCategories
      .filter((category) => category.systemKey !== null)
      .map((category) => [category.systemKey, category.id]),
  );
  const resolved = DEFAULT_QUICK_LOG_SYSTEM_KEYS.flatMap((systemKey) => {
    const id = idsBySystemKey.get(systemKey);
    return id === undefined ? [] : [id];
  });
  return resolved.length > 0
    ? resolved
    : expenseCategories.slice(0, 5).map((category) => category.id);
}

async function getDefaultQuickLogCategoryIds(
  database: SQLiteDatabase,
): Promise<number[]> {
  const rows = await database.getAllAsync<{
    id: number;
    system_key: string | null;
    type: 'expense' | 'income';
  }>(
    `SELECT id, system_key, type
     FROM categories
     WHERE type = 'expense'
     ORDER BY is_default DESC, sort_order, name COLLATE NOCASE`,
  );
  return resolveDefaultQuickLogCategoryIds(
    rows.map((row) => ({
      id: row.id,
      systemKey: row.system_key,
      type: row.type,
    })),
  );
}

function isValidQuickLogCategoryIds(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= 8 &&
    value.every((id) => Number.isSafeInteger(id) && id > 0) &&
    new Set(value).size === value.length
  );
}

function isLegacyDefaultQuickLogSelection(categoryIds: readonly number[]) {
  return (
    categoryIds.length === LEGACY_DEFAULT_QUICK_LOG_CATEGORY_IDS.length &&
    categoryIds.every(
      (categoryId, index) =>
        categoryId === LEGACY_DEFAULT_QUICK_LOG_CATEGORY_IDS[index],
    )
  );
}

function isValidStoredQuickLogPreferences(
  value: unknown,
): value is StoredQuickLogPreferences {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('version' in value) ||
    value.version !== 2 ||
    !('category_refs' in value) ||
    !Array.isArray(value.category_refs) ||
    value.category_refs.length < 1 ||
    value.category_refs.length > 8
  ) {
    return false;
  }

  const keys = new Set<string>();
  for (const reference of value.category_refs) {
    if (typeof reference !== 'object' || reference === null) return false;
    let key: string;
    if (
      'system_key' in reference &&
      typeof reference.system_key === 'string' &&
      reference.system_key.trim().length > 0
    ) {
      key = `system:${reference.system_key}`;
    } else if (
      'category_id' in reference &&
      Number.isSafeInteger(reference.category_id) &&
      Number(reference.category_id) > 0
    ) {
      key = `custom:${reference.category_id}`;
    } else {
      return false;
    }
    if (keys.has(key)) return false;
    keys.add(key);
  }
  return true;
}

function createStoredQuickLogPreferences(
  categoryIds: readonly number[],
  categories: readonly QuickLogCategoryReference[],
): StoredQuickLogPreferences {
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );
  return {
    category_refs: categoryIds.map((categoryId) => {
      const category = categoriesById.get(categoryId);
      return category?.systemKey
        ? { system_key: category.systemKey }
        : { category_id: categoryId };
    }),
    version: 2,
  };
}

function resolveStoredQuickLogCategoryIds(
  preferences: StoredQuickLogPreferences,
  categories: readonly QuickLogCategoryReference[],
): number[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const bySystemKey = new Map(
    categories
      .filter((category) => category.systemKey !== null)
      .map((category) => [category.systemKey, category]),
  );
  const resolved: number[] = [];
  const seen = new Set<number>();
  for (const reference of preferences.category_refs) {
    const category =
      'system_key' in reference
        ? bySystemKey.get(reference.system_key)
        : byId.get(reference.category_id);
    if (category && category.type === 'expense' && !seen.has(category.id)) {
      resolved.push(category.id);
      seen.add(category.id);
    }
  }
  return resolved;
}

async function getExpenseCategoryReferences(database: SQLiteDatabase) {
  const rows = await database.getAllAsync<{
    id: number;
    system_key: string | null;
    type: 'expense' | 'income';
  }>(
    `SELECT id, system_key, type
     FROM categories
     WHERE type = 'expense'
     ORDER BY is_default DESC, sort_order, name COLLATE NOCASE`,
  );
  return rows.map((row) => ({
    id: row.id,
    systemKey: row.system_key,
    type: row.type,
  }));
}

async function writeQuickLogPreferences(
  database: SQLiteDatabase,
  preferences: StoredQuickLogPreferences,
  now = Date.now(),
) {
  await runSerializedDatabaseWrite(database, () =>
    database.runAsync(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('quick_log_category_ids', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      JSON.stringify(preferences),
      now,
    ),
  );
}

export async function getQuickLogCategoryIds(
  database: SQLiteDatabase,
): Promise<number[]> {
  const row = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'quick_log_category_ids'",
  );
  if (!row?.value) {
    return getDefaultQuickLogCategoryIds(database);
  }
  try {
    const parsed = JSON.parse(row.value);
    const categories = await getExpenseCategoryReferences(database);
    if (isValidStoredQuickLogPreferences(parsed)) {
      const resolved = resolveStoredQuickLogCategoryIds(parsed, categories);
      return resolved.length > 0
        ? resolved
        : resolveDefaultQuickLogCategoryIds(categories);
    }
    if (isValidQuickLogCategoryIds(parsed)) {
      const legacyCategoryIds = isLegacyDefaultQuickLogSelection(parsed)
        ? resolveDefaultQuickLogCategoryIds(categories)
        : parsed;
      const legacyPreferences = createStoredQuickLogPreferences(
        legacyCategoryIds,
        categories,
      );
      const resolved = resolveStoredQuickLogCategoryIds(
        legacyPreferences,
        categories,
      );
      if (resolved.length > 0) {
        try {
          await writeQuickLogPreferences(
            database,
            createStoredQuickLogPreferences(resolved, categories),
          );
        } catch (error) {
          if (__DEV__) {
            console.warn('Could not migrate quick log preferences.', error);
          }
        }
        return resolved;
      }
    }
  } catch {
    // fallback
  }
  return getDefaultQuickLogCategoryIds(database);
}

export async function setQuickLogCategoryIds(
  database: SQLiteDatabase,
  categoryIds: number[],
  now = Date.now(),
): Promise<void> {
  if (!isValidQuickLogCategoryIds(categoryIds)) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Pilih 1 sampai 8 kategori catat cepat yang berbeda.',
    );
  }
  const placeholders = categoryIds.map(() => '?').join(', ');
  const rows = await database.getAllAsync<{
    id: number;
    system_key: string | null;
    type: 'expense' | 'income';
  }>(
    `SELECT id, system_key, type
     FROM categories
     WHERE type = 'expense' AND id IN (${placeholders})`,
    ...categoryIds,
  );
  if (rows.length !== categoryIds.length) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Satu atau beberapa kategori catat cepat sudah tidak tersedia.',
    );
  }
  await writeQuickLogPreferences(
    database,
    createStoredQuickLogPreferences(
      categoryIds,
      rows.map((row) => ({
        id: row.id,
        systemKey: row.system_key,
        type: row.type,
      })),
    ),
    now,
  );
}

export type HomeDisplayPreferences = {
  hideBalance: boolean;
  showQuickLog: boolean;
  showWalletChips: boolean;
};

export async function getHomeDisplayPreferences(
  database: SQLiteDatabase,
): Promise<HomeDisplayPreferences> {
  const [walletChipsRow, quickLogRow, hideBalanceRow] = await Promise.all([
    database.getFirstAsync<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = 'home_show_wallet_chips'`,
    ),
    database.getFirstAsync<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = 'home_show_quick_log'`,
    ),
    database.getFirstAsync<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = 'home_hide_balance'`,
    ),
  ]);

  return {
    hideBalance: hideBalanceRow?.value === '1',
    showQuickLog: quickLogRow ? quickLogRow.value === '1' : true,
    showWalletChips: walletChipsRow ? walletChipsRow.value === '1' : true,
  };
}

export async function setHomeDisplayPreferences(
  database: SQLiteDatabase,
  prefs: Partial<HomeDisplayPreferences>,
  now = Date.now(),
): Promise<void> {
  await withIntegrityCheckedTransaction(database, async (transaction) => {
    if (prefs.showWalletChips !== undefined) {
      await transaction.runAsync(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        'home_show_wallet_chips',
        prefs.showWalletChips ? '1' : '0',
        now,
      );
    }
    if (prefs.showQuickLog !== undefined) {
      await transaction.runAsync(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        'home_show_quick_log',
        prefs.showQuickLog ? '1' : '0',
        now,
      );
    }
    if (prefs.hideBalance !== undefined) {
      await transaction.runAsync(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        'home_hide_balance',
        prefs.hideBalance ? '1' : '0',
        now,
      );
    }
  });
}
