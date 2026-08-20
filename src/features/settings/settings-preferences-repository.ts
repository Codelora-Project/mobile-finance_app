import type { SQLiteDatabase } from 'expo-sqlite';

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
