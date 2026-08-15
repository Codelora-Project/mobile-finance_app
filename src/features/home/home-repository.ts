import type { SQLiteDatabase } from 'expo-sqlite';

import {
  listTransactions,
  type TransactionListItem,
} from '@/features/transactions/transaction-repository';
import { getTimezoneOffsetMinutes, toLocalDate } from '@/lib/dates';
import { createCodedError } from '@/lib/errors';

const HOME_RECENT_TRANSACTION_LIMIT = 5;
const HOME_CATEGORY_LIMIT = 5;
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

type CurrencySettingRow = {
  value: string;
};

type MonthlyTotalsRow = {
  expense_minor: number;
  income_minor: number;
};

type CategoryTotalRow = {
  category_id: number;
  category_name: string;
  amount_minor: number;
};

export type HomeCategoryTotal = Readonly<{
  categoryId: number;
  categoryName: string;
  amountMinor: number;
}>;

export type HomeSummary = Readonly<{
  currencyCode: string;
  monthStart: string;
  nextMonthStart: string;
  expenseMinor: number;
  incomeMinor: number;
  netMinor: number;
  categoryTotals: readonly HomeCategoryTotal[];
  recentTransactions: readonly TransactionListItem[];
}>;

export function getCurrentMonthRange(
  now = Date.now(),
  timezoneOffsetMinutes = getTimezoneOffsetMinutes(now),
) {
  const currentLocalDate = toLocalDate(now, timezoneOffsetMinutes);
  const year = Number(currentLocalDate.slice(0, 4));
  const month = Number(currentLocalDate.slice(5, 7));
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  return {
    monthStart: `${year}-${String(month).padStart(2, '0')}-01`,
    nextMonthStart: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  } as const;
}

function assertAggregateAmount(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      `The ${label} total is invalid.`,
    );
  }
  return value;
}

function normalizeCurrencyCode(setting: CurrencySettingRow | null) {
  const currencyCode = setting?.value.trim().toUpperCase() ?? '';
  if (!CURRENCY_CODE_PATTERN.test(currencyCode)) {
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      'The default currency setting is invalid.',
    );
  }
  return currencyCode;
}

export async function getHomeSummary(
  database: SQLiteDatabase,
  now = Date.now(),
  timezoneOffsetMinutes = getTimezoneOffsetMinutes(now),
): Promise<HomeSummary> {
  const { monthStart, nextMonthStart } = getCurrentMonthRange(
    now,
    timezoneOffsetMinutes,
  );
  const currencySetting = await database.getFirstAsync<CurrencySettingRow>(
    'SELECT value FROM app_settings WHERE key = ?',
    'default_currency_code',
  );
  const currencyCode = normalizeCurrencyCode(currencySetting);

  const [totalsRow, categoryRows, recentPage] = await Promise.all([
    database.getFirstAsync<MonthlyTotalsRow>(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END), 0)
           AS expense_minor,
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END), 0)
           AS income_minor
       FROM transactions
       WHERE local_date >= ? AND local_date < ? AND currency_code = ?`,
      monthStart,
      nextMonthStart,
      currencyCode,
    ),
    database.getAllAsync<CategoryTotalRow>(
      `SELECT
         c.id AS category_id,
         c.name AS category_name,
         SUM(t.amount_minor) AS amount_minor
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.type = 'expense'
         AND t.local_date >= ?
         AND t.local_date < ?
         AND t.currency_code = ?
       GROUP BY c.id, c.name
       ORDER BY amount_minor DESC, c.name COLLATE NOCASE ASC, c.id ASC
       LIMIT ?`,
      monthStart,
      nextMonthStart,
      currencyCode,
      HOME_CATEGORY_LIMIT,
    ),
    listTransactions(database, { limit: HOME_RECENT_TRANSACTION_LIMIT }),
  ]);

  const expenseMinor = assertAggregateAmount(
    totalsRow?.expense_minor ?? 0,
    'monthly expense',
  );
  const incomeMinor = assertAggregateAmount(
    totalsRow?.income_minor ?? 0,
    'monthly income',
  );
  const netMinor = incomeMinor - expenseMinor;

  return {
    categoryTotals: categoryRows.map((row) => ({
      amountMinor: assertAggregateAmount(row.amount_minor, 'category expense'),
      categoryId: row.category_id,
      categoryName: row.category_name,
    })),
    currencyCode,
    expenseMinor,
    incomeMinor,
    monthStart,
    netMinor,
    nextMonthStart,
    recentTransactions: recentPage.items,
  };
}
