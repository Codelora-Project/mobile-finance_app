import type { SQLiteDatabase } from 'expo-sqlite';

import { withIntegrityCheckedTransaction } from '@/db/transactions';
import { createCodedError } from '@/lib/errors';
import { getCurrencyFractionDigits } from '@/lib/money';
import type { ThemeSetting } from '@/lib/theme/theme-context';
import type { BrandTheme } from '@/theme/colors';

export const DEFAULT_QUICK_SHORTCUTS = [
  2_000, 5_000, 10_000, 20_000, 50_000, 100_000,
] as const;

export const SUPPORTED_CURRENCIES = [
  {
    code: 'IDR',
    country: 'Indonesia',
    flag: '🇮🇩',
    name: 'Indonesian Rupiah',
    symbol: 'Rp',
  },
  {
    code: 'USD',
    country: 'United States',
    flag: '🇺🇸',
    name: 'US Dollar',
    symbol: '$',
  },
  {
    code: 'EUR',
    country: 'European Union',
    flag: '🇪🇺',
    name: 'Euro',
    symbol: '€',
  },
  {
    code: 'SGD',
    country: 'Singapore',
    flag: '🇸🇬',
    name: 'Singapore Dollar',
    symbol: 'S$',
  },
  {
    code: 'MYR',
    country: 'Malaysia',
    flag: '🇲🇾',
    name: 'Malaysian Ringgit',
    symbol: 'RM',
  },
  {
    code: 'JPY',
    country: 'Japan',
    flag: '🇯🇵',
    name: 'Japanese Yen',
    symbol: '¥',
  },
  {
    code: 'GBP',
    country: 'United Kingdom',
    flag: '🇬🇧',
    name: 'British Pound',
    symbol: '£',
  },
  {
    code: 'AUD',
    country: 'Australia',
    flag: '🇦🇺',
    name: 'Australian Dollar',
    symbol: 'A$',
  },
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

const MONEY_TABLES = [
  {
    columns: ['amount_minor', 'transfer_fee_minor'],
    table: 'transactions',
    updatesTimestamp: true,
  },
  {
    columns: ['subtotal_minor', 'tax_minor'],
    table: 'receipts',
    updatesTimestamp: true,
  },
  {
    columns: ['initial_balance_minor'],
    table: 'payment_methods',
    updatesTimestamp: true,
  },
  {
    columns: ['monthly_limit_minor'],
    table: 'category_budgets',
    updatesTimestamp: true,
  },
  {
    columns: ['target_amount_minor', 'current_amount_minor'],
    table: 'savings_goals',
    updatesTimestamp: true,
  },
  {
    columns: ['amount_minor'],
    table: 'goal_transactions',
    updatesTimestamp: false,
  },
] as const;

async function validateMoneyRescale(
  database: SQLiteDatabase,
  multiplier: number,
  divisor: number,
) {
  for (const table of MONEY_TABLES) {
    for (const column of table.columns) {
      if (multiplier > 1) {
        const row = await database.getFirstAsync<{ max_abs: number | null }>(
          `SELECT MAX(ABS(${column})) AS max_abs FROM ${table.table} WHERE ${column} IS NOT NULL`,
        );
        if (
          row?.max_abs !== null &&
          row?.max_abs !== undefined &&
          row.max_abs > Math.floor(Number.MAX_SAFE_INTEGER / multiplier)
        ) {
          throw createCodedError(
            'VALIDATION_FAILED',
            'Currency cannot be changed because an amount would exceed the safe storage limit.',
          );
        }
      }

      if (divisor > 1) {
        const row = await database.getFirstAsync<{
          incompatible_count: number;
        }>(
          `SELECT COUNT(*) AS incompatible_count FROM ${table.table} WHERE ${column} IS NOT NULL AND ${column} % ? != 0`,
          divisor,
        );
        if ((row?.incompatible_count ?? 0) > 0) {
          throw createCodedError(
            'VALIDATION_FAILED',
            'Currency cannot be changed without rounding one or more existing amounts.',
          );
        }
      }
    }
  }
}

async function rescaleStoredMoney(
  database: SQLiteDatabase,
  multiplier: number,
  divisor: number,
  timestamp: number,
) {
  if (multiplier === 1 && divisor === 1) return;

  const operator = multiplier > 1 ? '*' : '/';
  const factor = multiplier > 1 ? multiplier : divisor;
  for (const table of MONEY_TABLES) {
    const assignments = table.columns.map(
      (column) => `${column} = ${column} ${operator} ?`,
    );
    const params: number[] = table.columns.map(() => factor);
    if (table.updatesTimestamp) {
      assignments.push('updated_at = ?');
      params.push(timestamp);
    }
    await database.runAsync(
      `UPDATE ${table.table} SET ${assignments.join(', ')}`,
      ...params,
    );
  }
}

export type SettingsOverview = Readonly<{
  brandTheme: BrandTheme;
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
  const matchedCurrency = SUPPORTED_CURRENCIES.find(
    (c) => c.code === rawCurrency,
  );
  const currencyCode: SupportedCurrencyCode = matchedCurrency?.code ?? 'IDR';
  const currencyName = matchedCurrency?.name ?? 'Indonesian Rupiah';

  const [langRow, themeRow, shortcutsRow, brandRow] = await Promise.all([
    database.getFirstAsync<SettingRow>(
      `SELECT value FROM app_settings WHERE key = 'language'`,
    ),
    database.getFirstAsync<SettingRow>(
      `SELECT value FROM app_settings WHERE key = 'theme'`,
    ),
    database.getFirstAsync<SettingRow>(
      `SELECT value FROM app_settings WHERE key = 'quick_shortcuts'`,
    ),
    database.getFirstAsync<SettingRow>(
      `SELECT value FROM app_settings WHERE key = 'brand_theme'`,
    ),
  ]);

  const brandTheme: BrandTheme =
    brandRow?.value === 'emerald' ||
    brandRow?.value === 'indigo' ||
    brandRow?.value === 'violet' ||
    brandRow?.value === 'amber' ||
    brandRow?.value === 'slate'
      ? brandRow.value
      : 'blue';

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
    brandTheme,
    currencyCode,
    currencyName,
    language: langRow?.value === 'en' ? 'en' : 'id',
    quickShortcuts,
    theme,
  };
}

export async function setBrandThemeSetting(
  database: SQLiteDatabase,
  brandTheme: BrandTheme,
) {
  const timestamp = Date.now();
  await database.runAsync(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('brand_theme', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    brandTheme,
    timestamp,
  );
}

export async function setCurrencySetting(
  database: SQLiteDatabase,
  currencyCode: SupportedCurrencyCode,
) {
  const timestamp = Date.now();
  await withIntegrityCheckedTransaction(database, async (transaction) => {
    const currentSetting = await transaction.getFirstAsync<SettingRow>(
      `SELECT value FROM app_settings WHERE key = 'default_currency_code'`,
    );
    const currentCurrency = SUPPORTED_CURRENCIES.find(
      (currency) => currency.code === currentSetting?.value,
    )?.code;
    const sourceCurrency = currentCurrency ?? 'IDR';
    if (sourceCurrency === currencyCode) return;

    const mixedCurrency = await transaction.getFirstAsync<{ id: number }>(
      `SELECT id FROM transactions WHERE currency_code != ? LIMIT 1`,
      sourceCurrency,
    );
    if (mixedCurrency) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Currency cannot be changed while transactions contain mixed currency codes.',
      );
    }

    const sourceDigits = getCurrencyFractionDigits(sourceCurrency);
    const targetDigits = getCurrencyFractionDigits(currencyCode);
    const digitDelta = targetDigits - sourceDigits;
    const multiplier = digitDelta > 0 ? 10 ** digitDelta : 1;
    const divisor = digitDelta < 0 ? 10 ** Math.abs(digitDelta) : 1;

    await validateMoneyRescale(transaction, multiplier, divisor);
    await rescaleStoredMoney(transaction, multiplier, divisor, timestamp);
    await transaction.runAsync(
      `UPDATE transactions SET currency_code = ?, updated_at = ? WHERE currency_code != ?`,
      currencyCode,
      timestamp,
      currencyCode,
    );
    await transaction.runAsync(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('default_currency_code', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      currencyCode,
      timestamp,
    );
  });
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
