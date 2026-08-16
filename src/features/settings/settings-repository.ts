import type { SQLiteDatabase } from 'expo-sqlite';

import { seedDefaultsInTransaction } from '@/db/seeds';
import { removeCachedClaimPdfs } from '@/features/claims/claim-pdf';
import { removeAllReceiptFiles } from '@/features/receipts/receipt-storage';
import { createCodedError } from '@/lib/errors';
import type { ThemeSetting } from '@/lib/theme/theme-context';

export const DEFAULT_QUICK_SHORTCUTS = [
  2_000, 5_000, 10_000, 20_000, 50_000, 100_000,
] as const;

type SettingRow = {
  value: string;
};

export type SettingsOverview = Readonly<{
  currencyCode: 'IDR';
  currencyName: 'Indonesian Rupiah';
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

  if (currency?.value !== 'IDR') {
    throw createCodedError(
      'VALIDATION_FAILED',
      'The default currency setting is invalid.',
    );
  }

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
    currencyCode: 'IDR',
    currencyName: 'Indonesian Rupiah',
    language: langRow?.value === 'en' ? 'en' : 'id',
    quickShortcuts,
    theme,
  };
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
