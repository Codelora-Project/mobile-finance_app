import type { SQLiteDatabase } from 'expo-sqlite';

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
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every((id) => Number.isInteger(id))
    ) {
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
  const value = JSON.stringify(categoryIds);
  await database.runAsync(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('quick_log_category_ids', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    value,
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
  const queries: Promise<unknown>[] = [];
  if (prefs.showWalletChips !== undefined) {
    queries.push(
      database.runAsync(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        'home_show_wallet_chips',
        prefs.showWalletChips ? '1' : '0',
        now,
      ),
    );
  }
  if (prefs.showQuickLog !== undefined) {
    queries.push(
      database.runAsync(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        'home_show_quick_log',
        prefs.showQuickLog ? '1' : '0',
        now,
      ),
    );
  }
  if (prefs.hideBalance !== undefined) {
    queries.push(
      database.runAsync(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        'home_hide_balance',
        prefs.hideBalance ? '1' : '0',
        now,
      ),
    );
  }
  await Promise.all(queries);
}
