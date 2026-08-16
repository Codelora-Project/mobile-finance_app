import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  computeBudgetStatus,
  deleteCategoryBudget,
  getBudgetSummary,
  listCategoryBudgets,
  setCategoryBudget,
} from '@/features/budgets/budget-repository';

const getAllAsync = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const getFirstAsync = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const runAsync = jest.fn<(...args: unknown[]) => Promise<unknown>>();
let database: SQLiteDatabase;

beforeEach(() => {
  jest.clearAllMocks();
  database = {
    getAllAsync,
    getFirstAsync,
    runAsync,
  } as unknown as SQLiteDatabase;
  runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 1 });
});

describe('budget repository', () => {
  it('computes correct budget statuses based on percentage', () => {
    expect(computeBudgetStatus(500_000, 1_000_000)).toBe('safe'); // 50%
    expect(computeBudgetStatus(750_000, 1_000_000)).toBe('warning'); // 75%
    expect(computeBudgetStatus(950_000, 1_000_000)).toBe('danger'); // 95%
    expect(computeBudgetStatus(1_200_000, 1_000_000)).toBe('overbudget'); // 120%
  });

  it('lists category budgets with remaining amount and daily allowance', async () => {
    getAllAsync.mockResolvedValueOnce([
      {
        budget_id: 1,
        category_id: 1,
        category_name: 'Food & Drink',
        monthly_limit_minor: 1_500_000,
        spent_minor: 600_000,
      },
      {
        budget_id: null,
        category_id: 2,
        category_name: 'Transportation',
        monthly_limit_minor: null,
        spent_minor: 200_000,
      },
    ]);

    // Reference date: 2026-08-16 (16 days remaining out of 31 days in Aug: 31 - 16 + 1 = 16 days)
    const budgets = await listCategoryBudgets(database, '2026-08-16');
    expect(budgets.length).toBe(2);

    const food = budgets[0]!;
    expect(food.hasBudget).toBe(true);
    expect(food.monthlyLimitMinor).toBe(1_500_000);
    expect(food.spentMinor).toBe(600_000);
    expect(food.remainingMinor).toBe(900_000);
    expect(food.spentPercent).toBe(40);
    expect(food.status).toBe('safe');
    // 900,000 / 16 days = 56,250 / day
    expect(food.dailyAllowanceMinor).toBe(56_250);

    const transport = budgets[1]!;
    expect(transport.hasBudget).toBe(false);
    expect(transport.dailyAllowanceMinor).toBeNull();
  });

  it('validates and sets category budget limit', async () => {
    getFirstAsync.mockResolvedValueOnce({ id: 1 });

    await setCategoryBudget(database, 1, 2_000_000);
    expect(runAsync).toHaveBeenCalled();

    await expect(setCategoryBudget(database, 1, 0)).rejects.toThrow(
      'Batas anggaran harus lebih besar dari 0.',
    );
  });

  it('deletes category budget', async () => {
    await deleteCategoryBudget(database, 1);
    expect(runAsync).toHaveBeenCalledWith(
      'DELETE FROM category_budgets WHERE category_id = ?',
      [1],
    );
  });

  it('calculates overall budget summary', async () => {
    getAllAsync.mockResolvedValueOnce([
      {
        budget_id: 1,
        category_id: 1,
        category_name: 'Food',
        monthly_limit_minor: 1_000_000,
        spent_minor: 800_000, // warning (80%)
      },
      {
        budget_id: 2,
        category_id: 2,
        category_name: 'Shopping',
        monthly_limit_minor: 500_000,
        spent_minor: 600_000, // overbudget (120%)
      },
    ]);

    const summary = await getBudgetSummary(database, '2026-08-16');
    expect(summary.totalBudgetedMinor).toBe(1_500_000);
    expect(summary.totalSpentMinor).toBe(1_400_000);
    expect(summary.overallRemainingMinor).toBe(100_000);
    expect(summary.overallSpentPercent).toBe(93);
    expect(summary.overbudgetCategoryCount).toBe(1);
    expect(summary.warningCategoryCount).toBe(1);
    expect(summary.totalCategoriesWithBudget).toBe(2);
  });
});
