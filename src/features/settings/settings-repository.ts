import type { SQLiteDatabase } from 'expo-sqlite';

import { seedDefaultsInTransaction } from '@/db/seeds';
import { removeCachedClaimPdfs } from '@/features/claims/claim-pdf';
import { removeAllReceiptFiles } from '@/features/receipts/receipt-storage';
import { createCodedError } from '@/lib/errors';
import type { ThemeSetting } from '@/lib/theme/theme-context';

export const DEFAULT_QUICK_SHORTCUTS = [
  2_000, 5_000, 10_000, 20_000, 50_000, 100_000,
] as const;

export const SUPPORTED_CURRENCIES = [
  { code: 'IDR', country: 'Indonesia', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'USD', country: 'United States', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', country: 'European Union', name: 'Euro', symbol: '€' },
  { code: 'SGD', country: 'Singapore', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'MYR', country: 'Malaysia', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'JPY', country: 'Japan', name: 'Japanese Yen', symbol: '¥' },
  { code: 'GBP', country: 'United Kingdom', name: 'British Pound', symbol: '£' },
  { code: 'AUD', country: 'Australia', name: 'Australian Dollar', symbol: 'A$' },
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
export type SupportedCurrencyCode = SupportedCurrency['code'];

type SettingRow = {
  value: string;
};

export type SettingsOverview = Readonly<{
  currencyCode: SupportedCurrencyCode;
  currencyName: string;
  language: 'id' | 'en';
  quickShortcuts: number[];
  theme: ThemeSetting;
}>;

export async function getSettingsOverview(
  database: SQLiteDatabase,
): Promise<SettingsOverview> {
  const currency = await database.getFirstAsync<SettingRow>(
    `SELECT value
     FROM app_settings
     WHERE key = 'default_currency_code'`,
  );

  const rawCurrency = currency?.value ?? 'IDR';
  const matchedCurrency = SUPPORTED_CURRENCIES.find((c) => c.code === rawCurrency);
  const currencyCode: SupportedCurrencyCode = matchedCurrency?.code ?? 'IDR';
  const currencyName = matchedCurrency?.name ?? 'Indonesian Rupiah';

  const [langRow, themeRow, shortcutsRow] = await Promise.all([
    database.getFirstAsync<SettingRow>(
      `SELECT value FROM app_settings WHERE key = 'language'`,
    ),
    database.getFirstAsync<SettingRow>(
      `SELECT value FROM app_settings WHERE key = 'theme'`,
    ),
    database.getFirstAsync<SettingRow>(
      `SELECT value FROM app_settings WHERE key = 'quick_shortcuts'`,
    ),
  ]);

  let quickShortcuts: number[] = [...DEFAULT_QUICK_SHORTCUTS];
  if (shortcutsRow?.value) {
    try {
      const parsed = JSON.parse(shortcutsRow.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        quickShortcuts = parsed.filter(
          (n) => typeof n === 'number' && Number.isFinite(n) && n > 0,
        );
      }
    } catch {
      quickShortcuts = [...DEFAULT_QUICK_SHORTCUTS];
    }
  }

  const rawTheme = themeRow?.value;
  const theme: ThemeSetting =
    rawTheme === 'light' || rawTheme === 'dark' || rawTheme === 'system'
      ? rawTheme
      : 'system';

  return {
    currencyCode,
    currencyName,
    language: langRow?.value === 'en' ? 'en' : 'id',
    quickShortcuts,
    theme,
  };
}

export async function setCurrencySetting(
  database: SQLiteDatabase,
  currencyCode: SupportedCurrencyCode,
) {
  const timestamp = Date.now();
  await database.runAsync(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('default_currency_code', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    currencyCode,
    timestamp,
  );
  await database.runAsync(
    `UPDATE transactions SET currency_code = ? WHERE currency_code != ?`,
    currencyCode,
    currencyCode,
  );
  await database.runAsync(
    `UPDATE claims SET currency_code = ? WHERE currency_code != ?`,
    currencyCode,
    currencyCode,
  );
}

export async function setLanguageSetting(
  database: SQLiteDatabase,
  language: 'id' | 'en',
) {
  const timestamp = Date.now();
  await database.runAsync(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('language', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    language,
    timestamp,
  );
}

export async function setThemeSetting(
  database: SQLiteDatabase,
  theme: ThemeSetting,
) {
  const timestamp = Date.now();
  await database.runAsync(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('theme', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    theme,
    timestamp,
  );
}

export async function getQuickShortcuts(
  database: SQLiteDatabase,
): Promise<number[]> {
  try {
    const row = await database.getFirstAsync<SettingRow>(
      `SELECT value FROM app_settings WHERE key = 'quick_shortcuts'`,
    );
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(
          (n) => typeof n === 'number' && Number.isFinite(n) && n > 0,
        );
      }
    }
  } catch (err) {
    if (__DEV__) console.warn('Could not read quick_shortcuts setting', err);
  }
  return [...DEFAULT_QUICK_SHORTCUTS];
}

export async function setQuickShortcutsSetting(
  database: SQLiteDatabase,
  shortcuts: number[],
) {
  const validShortcuts = shortcuts
    .filter((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  const jsonValue = JSON.stringify(validShortcuts);
  const timestamp = Date.now();

  await database.runAsync(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('quick_shortcuts', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    jsonValue,
    timestamp,
  );
}

async function resetDatabase(database: SQLiteDatabase) {
  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync(`
      DELETE FROM goal_transactions;
      DELETE FROM savings_goals;
      DELETE FROM category_budgets;
      DELETE FROM claim_items;
      DELETE FROM receipts;
      DELETE FROM claims;
      DELETE FROM transactions;
      DELETE FROM categories WHERE is_default = 0;
      DELETE FROM payment_methods WHERE is_default = 0;
      DELETE FROM app_settings;
    `);
    await seedDefaultsInTransaction(transaction);
  });
}

function removeManagedFiles() {
  const failures: unknown[] = [];
  for (const removeFiles of [removeAllReceiptFiles, removeCachedClaimPdfs]) {
    try {
      removeFiles();
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length > 0) {
    throw createCodedError(
      'FILE_OPERATION_FAILED',
      'Your records were reset, but some local files could not be removed. Try again.',
    );
  }
}

export async function resetApplicationData(database: SQLiteDatabase) {
  try {
    await resetDatabase(database);
  } catch (error) {
    if (__DEV__) console.warn('Database reset failed.', error);
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      "We couldn't delete your data. Nothing was reset.",
    );
  }

  removeManagedFiles();
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
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((id) => Number.isInteger(id))) {
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
    `INSERT INTO app_settings (key, value, created_at, updated_at)
     VALUES ('quick_log_category_ids', ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    value,
    now,
    now,
  );
}
