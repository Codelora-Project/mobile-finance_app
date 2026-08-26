import type { SQLiteDatabase } from 'expo-sqlite';

import { runSerializedDatabaseWrite } from '@/db/write-coordinator';
import { getTimezoneOffsetMinutes, toLocalDate } from '@/lib/dates';
import { createCodedError } from '@/lib/errors';

export type BudgetStatus = 'safe' | 'warning' | 'danger' | 'overbudget';

export type CategoryBudget = Readonly<{
  id: number | null;
  categoryId: number;
  categoryName: string;
  monthlyLimitMinor: number | null;
  spentMinor: number;
  remainingMinor: number | null;
  spentPercent: number | null;
  status: BudgetStatus;
  dailyAllowanceMinor: number | null;
  daysRemainingInMonth: number;
  hasBudget: boolean;
}>;

export type BudgetSummary = Readonly<{
  totalBudgetedMinor: number;
  totalSpentMinor: number;
  overallRemainingMinor: number;
  overallSpentPercent: number;
  overbudgetCategoryCount: number;
  warningCategoryCount: number;
  safeCategoryCount: number;
  totalCategoriesWithBudget: number;
}>;

type BudgetRow = {
  budget_id: number | null;
  category_id: number;
  category_name: string;
  monthly_limit_minor: number | null;
  spent_minor: number;
};

function getMonthBounds(referenceDateStr: string) {
  const [yearStr, monthStr, dayStr] = referenceDateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const currentDay = Number(dayStr);

  const monthStart = `${yearStr}-${String(month).padStart(2, '0')}-01`;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthStart = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

  // Total days in current month
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const daysRemaining = Math.max(1, lastDayOfMonth - currentDay + 1);

  return { daysRemaining, monthStart, nextMonthStart };
}

export function computeBudgetStatus(
  spentMinor: number,
  limitMinor: number,
): BudgetStatus {
  if (limitMinor <= 0) return 'safe';
  const ratio = spentMinor / limitMinor;
  if (ratio > 1) return 'overbudget';
  if (ratio >= 0.9) return 'danger';
  if (ratio >= 0.7) return 'warning';
  return 'safe';
}

export async function listCategoryBudgets(
  database: SQLiteDatabase,
  referenceDateStr?: string,
): Promise<readonly CategoryBudget[]> {
  const today =
    referenceDateStr || toLocalDate(Date.now(), getTimezoneOffsetMinutes());
  const { monthStart, nextMonthStart, daysRemaining } = getMonthBounds(today);

  const rows = await database.getAllAsync<BudgetRow>(
    `SELECT
      c.id AS category_id,
      c.name AS category_name,
      cb.id AS budget_id,
      cb.monthly_limit_minor,
      COALESCE(SUM(t.amount_minor), 0) AS spent_minor
    FROM categories c
    LEFT JOIN category_budgets cb ON cb.category_id = c.id
    LEFT JOIN transactions t ON t.category_id = c.id
      AND t.type = 'expense'
      AND t.local_date >= ?
      AND t.local_date < ?
    WHERE c.type = 'expense'
    GROUP BY c.id
    ORDER BY
      CASE WHEN cb.monthly_limit_minor IS NOT NULL THEN 0 ELSE 1 END ASC,
      spent_minor DESC,
      c.name ASC`,
    [monthStart, nextMonthStart],
  );

  return rows.map((row) => {
    const hasBudget =
      row.monthly_limit_minor !== null && row.monthly_limit_minor > 0;
    const monthlyLimit = row.monthly_limit_minor ?? 0;
    const spent = row.spent_minor;

    let remaining: number | null = null;
    let spentPercent: number | null = null;
    let status: BudgetStatus = 'safe';
    let dailyAllowance: number | null = null;

    if (hasBudget) {
      remaining = monthlyLimit - spent;
      spentPercent = Math.round((spent / monthlyLimit) * 100);
      status = computeBudgetStatus(spent, monthlyLimit);
      dailyAllowance = Math.max(0, Math.floor(remaining / daysRemaining));
    }

    return {
      id: row.budget_id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      monthlyLimitMinor: row.monthly_limit_minor,
      spentMinor: spent,
      remainingMinor: remaining,
      spentPercent,
      status,
      dailyAllowanceMinor: dailyAllowance,
      daysRemainingInMonth: daysRemaining,
      hasBudget,
    };
  });
}

export async function setCategoryBudget(
  database: SQLiteDatabase,
  categoryId: number,
  monthlyLimitMinor: number,
): Promise<void> {
  if (!Number.isSafeInteger(monthlyLimitMinor) || monthlyLimitMinor <= 0) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Batas anggaran harus lebih besar dari 0.',
    );
  }

  const category = await database.getFirstAsync<{ id: number }>(
    `SELECT id FROM categories WHERE id = ? AND type = 'expense'`,
    [categoryId],
  );
  if (!category) {
    throw createCodedError('VALIDATION_FAILED', 'Kategori tidak ditemukan.');
  }

  const now = Date.now();
  await runSerializedDatabaseWrite(database, () =>
    database.runAsync(
      `INSERT INTO category_budgets (
      category_id, monthly_limit_minor, created_at, updated_at
    ) VALUES (?, ?, ?, ?)
    ON CONFLICT (category_id) DO UPDATE SET
      monthly_limit_minor = excluded.monthly_limit_minor,
      updated_at = excluded.updated_at`,
      [categoryId, monthlyLimitMinor, now, now],
    ),
  );
}

export async function deleteCategoryBudget(
  database: SQLiteDatabase,
  categoryId: number,
): Promise<void> {
  await runSerializedDatabaseWrite(database, () =>
    database.runAsync(`DELETE FROM category_budgets WHERE category_id = ?`, [
      categoryId,
    ]),
  );
}

export async function getBudgetSummary(
  database: SQLiteDatabase,
  referenceDateStr?: string,
): Promise<BudgetSummary> {
  const budgets = await listCategoryBudgets(database, referenceDateStr);
  const budgeted = budgets.filter((b) => b.hasBudget);

  let totalBudgetedMinor = 0;
  let totalSpentMinor = 0;
  let overbudgetCategoryCount = 0;
  let warningCategoryCount = 0;
  let safeCategoryCount = 0;

  for (const item of budgeted) {
    totalBudgetedMinor += item.monthlyLimitMinor ?? 0;
    totalSpentMinor += item.spentMinor;

    if (item.status === 'overbudget' || item.status === 'danger') {
      overbudgetCategoryCount += 1;
    } else if (item.status === 'warning') {
      warningCategoryCount += 1;
    } else {
      safeCategoryCount += 1;
    }
  }

  const overallRemainingMinor = totalBudgetedMinor - totalSpentMinor;
  const overallSpentPercent =
    totalBudgetedMinor > 0
      ? Math.round((totalSpentMinor / totalBudgetedMinor) * 100)
      : 0;

  return {
    totalBudgetedMinor,
    totalSpentMinor,
    overallRemainingMinor,
    overallSpentPercent,
    overbudgetCategoryCount,
    warningCategoryCount,
    safeCategoryCount,
    totalCategoriesWithBudget: budgeted.length,
  };
}
