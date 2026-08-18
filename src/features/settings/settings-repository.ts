import { Directory, File, Paths } from 'expo-file-system';
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
  { code: 'IDR', country: 'Indonesia', flag: '🇮🇩', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'USD', country: 'United States', flag: '🇺🇸', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', country: 'European Union', flag: '🇪🇺', name: 'Euro', symbol: '€' },
  { code: 'SGD', country: 'Singapore', flag: '🇸🇬', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'MYR', country: 'Malaysia', flag: '🇲🇾', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'JPY', country: 'Japan', flag: '🇯🇵', name: 'Japanese Yen', symbol: '¥' },
  { code: 'GBP', country: 'United Kingdom', flag: '🇬🇧', name: 'British Pound', symbol: '£' },
  { code: 'AUD', country: 'Australia', flag: '🇦🇺', name: 'Australian Dollar', symbol: 'A$' },
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
export type SupportedCurrencyCode = SupportedCurrency['code'];

export const RECOMMENDED_SHORTCUTS_BY_CURRENCY: Record<
  SupportedCurrencyCode,
  readonly number[]
> = {
  AUD: [1, 2, 5, 10, 20, 50],
  EUR: [1, 2, 5, 10, 20, 50],
  GBP: [1, 2, 5, 10, 20, 50],
  IDR: [2_000, 5_000, 10_000, 20_000, 50_000, 100_000],
  JPY: [100, 200, 500, 1_000, 2_000, 5_000],
  MYR: [1, 5, 10, 20, 50, 100],
  SGD: [1, 2, 5, 10, 20, 50],
  USD: [1, 2, 5, 10, 20, 50],
};

export function getRecommendedShortcuts(
  currencyCode: SupportedCurrencyCode,
): number[] {
  return [
    ...(RECOMMENDED_SHORTCUTS_BY_CURRENCY[currencyCode] ??
      DEFAULT_QUICK_SHORTCUTS),
  ];
}

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

export type StorageStats = Readonly<{
  transactionsCount: number;
  receiptsCount: number;
  receiptsSizeBytes: number;
  claimsCount: number;
  cacheSizeBytes: number;
}>;

export async function getStorageStats(
  database: SQLiteDatabase,
): Promise<StorageStats> {
  const [txRes, receiptsRes, claimsRes] = await Promise.all([
    database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions;',
    ),
    database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM receipts;',
    ),
    database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM claims;',
    ),
  ]);

  let receiptsSizeBytes = 0;
  let receiptsCount = receiptsRes?.count ?? 0;
  try {
    const receiptDir = new Directory(Paths.document, 'receipts');
    if (receiptDir.exists) {
      const items = receiptDir.list();
      let calculatedBytes = 0;
      for (const item of items) {
        if (item instanceof File && item.exists) {
          calculatedBytes += item.size || 0;
        }
      }
      receiptsSizeBytes = calculatedBytes;
    }
  } catch {
    // Fallback if filesystem access fails
  }

  let cacheSizeBytes = 0;
  try {
    const exportsDir = new Directory(Paths.cache, 'exports');
    if (exportsDir.exists) {
      const items = exportsDir.list();
      for (const item of items) {
        if (item instanceof File && item.exists) {
          cacheSizeBytes += item.size || 0;
        }
      }
    }
  } catch {
    // Fallback if cache access fails
  }

  return {
    cacheSizeBytes,
    claimsCount: claimsRes?.count ?? 0,
    receiptsCount,
    receiptsSizeBytes,
    transactionsCount: txRes?.count ?? 0,
  };
}

export async function clearTemporaryCache(): Promise<{ freedBytes: number }> {
  let freedBytes = 0;
  try {
    const exportsDir = new Directory(Paths.cache, 'exports');
    if (exportsDir.exists) {
      const items = exportsDir.list();
      for (const item of items) {
        if (item instanceof File && item.exists) {
          freedBytes += item.size || 0;
        }
      }
      exportsDir.delete();
    }
  } catch (err) {
    if (__DEV__) console.warn('Cache clearing error:', err);
  }
  return { freedBytes };
}

export function formatStorageSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
