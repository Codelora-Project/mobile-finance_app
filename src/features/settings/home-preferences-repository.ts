import type { SQLiteDatabase } from 'expo-sqlite';

import { withIntegrityCheckedTransaction } from '@/db/transactions';
import { runSerializedDatabaseWrite } from '@/db/write-coordinator';
import { createCodedError } from '@/lib/errors';

function isValidQuickLogCategoryIds(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= 8 &&
    value.every((id) => Number.isSafeInteger(id) && id > 0) &&
    new Set(value).size === value.length
  );
}

export async function getQuickLogCategoryIds(
  database: SQLiteDatabase,
): Promise<number[]> {
  const row = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'quick_log_category_ids'",
  );
  if (!row?.value) {
    return [1, 2, 3, 4, 5];
  }
  try {
    const parsed = JSON.parse(row.value);
    if (isValidQuickLogCategoryIds(parsed)) {
      return parsed;
    }
  } catch {
    // fallback
  }
  return [1, 2, 3, 4, 5];
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
  const existing = await database.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total
     FROM categories
     WHERE type = 'expense' AND id IN (${placeholders})`,
    ...categoryIds,
  );
  if (existing?.total !== categoryIds.length) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Satu atau beberapa kategori catat cepat sudah tidak tersedia.',
    );
  }
  const value = JSON.stringify(categoryIds);
  await runSerializedDatabaseWrite(database, () =>
    database.runAsync(
      `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('quick_log_category_ids', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      value,
      now,
    ),
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
