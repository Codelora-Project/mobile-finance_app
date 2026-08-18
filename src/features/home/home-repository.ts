import type { SQLiteDatabase } from 'expo-sqlite';

import {
  listTransactions,
  type TransactionListItem,
} from '@/features/transactions/transaction-repository';
import { getTimezoneOffsetMinutes, toLocalDate } from '@/lib/dates';
import { createCodedError } from '@/lib/errors';
import type { Language } from '@/lib/i18n/translations';

const HOME_RECENT_TRANSACTION_LIMIT = 8;
const HOME_CATEGORY_LIMIT = 5;
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

export type HomePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

type CurrencySettingRow = {
  value: string;
};

type AggregateTotalsRow = {
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
  period: HomePeriod;
  startDate: string;
  endDateExclusive: string;
  periodLabel: string;
  expenseMinor: number;
  incomeMinor: number;
  netMinor: number;
  categoryTotals: readonly HomeCategoryTotal[];
  recentTransactions: readonly TransactionListItem[];
}>;

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getPeriodRange(
  period: HomePeriod,
  referenceDate: Date,
): { startDate: string; endDateExclusive: string } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const date = referenceDate.getDate();

  if (period === 'daily') {
    const cur = new Date(year, month, date);
    const next = new Date(year, month, date + 1);
    return {
      startDate: toLocalDateString(cur),
      endDateExclusive: toLocalDateString(next),
    };
  }

  if (period === 'weekly') {
    const dayOfWeek = referenceDate.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const start = new Date(year, month, date - distanceToMonday);
    const next = new Date(year, month, date - distanceToMonday + 7);
    return {
      startDate: toLocalDateString(start),
      endDateExclusive: toLocalDateString(next),
    };
  }

  if (period === 'yearly') {
    return {
      startDate: `${year}-01-01`,
      endDateExclusive: `${year + 1}-01-01`,
    };
  }

  // default 'monthly'
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 1 : month + 2;
  return {
    startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    endDateExclusive: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  };
}

export function shiftPeriodDate(
  referenceDate: Date,
  period: HomePeriod,
  delta: number,
): Date {
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth();
  const d = referenceDate.getDate();

  if (period === 'daily') {
    return new Date(y, m, d + delta);
  }
  if (period === 'weekly') {
    return new Date(y, m, d + delta * 7);
  }
  if (period === 'monthly') {
    return new Date(y, m + delta, 1);
  }
  return new Date(y + delta, 0, 1);
}

export function formatPeriodLabel(
  referenceDate: Date,
  period: HomePeriod,
  language: Language,
): string {
  const locale = language === 'id' ? 'id-ID' : 'en-US';

  if (period === 'daily') {
    const today = new Date();
    if (
      referenceDate.getFullYear() === today.getFullYear() &&
      referenceDate.getMonth() === today.getMonth() &&
      referenceDate.getDate() === today.getDate()
    ) {
      return language === 'id' ? 'Hari Ini' : 'Today';
    }
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(referenceDate);
  }

  if (period === 'weekly') {
    const { startDate, endDateExclusive } = getPeriodRange('weekly', referenceDate);
    const startObj = new Date(startDate);
    const endObj = new Date(endDateExclusive);
    endObj.setDate(endObj.getDate() - 1);
    const sFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(startObj);
    const eFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(endObj);
    return `${sFmt} - ${eFmt}`;
  }

  if (period === 'yearly') {
    return String(referenceDate.getFullYear());
  }

  // Monthly
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
  }).format(referenceDate);
}

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
  period: HomePeriod = 'monthly',
  referenceDate: Date = new Date(),
  language: Language = 'id',
  walletId?: number | null,
): Promise<HomeSummary> {
  const { startDate, endDateExclusive } = getPeriodRange(period, referenceDate);
  const periodLabel = formatPeriodLabel(referenceDate, period, language);

  const currencySetting = await database.getFirstAsync<CurrencySettingRow>(
    'SELECT value FROM app_settings WHERE key = ?',
    'default_currency_code',
  );
  const currencyCode = normalizeCurrencyCode(currencySetting);

  const totalsSql = walletId
    ? `SELECT
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END), 0)
           AS expense_minor,
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END), 0)
           AS income_minor
       FROM transactions
       WHERE local_date >= ? AND local_date < ? AND currency_code = ?
         AND (payment_method_id = ? OR transfer_to_payment_method_id = ?)`
    : `SELECT
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END), 0)
           AS expense_minor,
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END), 0)
           AS income_minor
       FROM transactions
       WHERE local_date >= ? AND local_date < ? AND currency_code = ?`;

  const totalsParams = walletId
    ? [startDate, endDateExclusive, currencyCode, walletId, walletId]
    : [startDate, endDateExclusive, currencyCode];

  const categorySql = walletId
    ? `SELECT
         c.id AS category_id,
         c.name AS category_name,
         SUM(t.amount_minor) AS amount_minor
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.type = 'expense'
         AND t.local_date >= ?
         AND t.local_date < ?
         AND t.currency_code = ?
         AND (t.payment_method_id = ? OR t.transfer_to_payment_method_id = ?)
       GROUP BY c.id, c.name
       ORDER BY amount_minor DESC, c.name COLLATE NOCASE ASC, c.id ASC
       LIMIT ?`
    : `SELECT
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
       LIMIT ?`;

  const categoryParams = walletId
    ? [startDate, endDateExclusive, currencyCode, walletId, walletId, HOME_CATEGORY_LIMIT]
    : [startDate, endDateExclusive, currencyCode, HOME_CATEGORY_LIMIT];

  const [totalsRow, categoryRows, recentPage] = await Promise.all([
    database.getFirstAsync<AggregateTotalsRow>(totalsSql, ...totalsParams),
    database.getAllAsync<CategoryTotalRow>(categorySql, ...categoryParams),
    listTransactions(database, {
      filters: walletId ? { paymentMethodId: walletId } : undefined,
      limit: HOME_RECENT_TRANSACTION_LIMIT,
    }),
  ]);

  const expenseMinor = assertAggregateAmount(
    totalsRow?.expense_minor ?? 0,
    `${period} expense`,
  );
  const incomeMinor = assertAggregateAmount(
    totalsRow?.income_minor ?? 0,
    `${period} income`,
  );
  const netMinor = incomeMinor - expenseMinor;

  return {
    categoryTotals: categoryRows.map((row) => ({
      amountMinor: assertAggregateAmount(row.amount_minor, 'category expense'),
      categoryId: row.category_id,
      categoryName: row.category_name,
    })),
    currencyCode,
    endDateExclusive,
    expenseMinor,
    incomeMinor,
    netMinor,
    period,
    periodLabel,
    recentTransactions: recentPage.items,
    startDate,
  };
}
