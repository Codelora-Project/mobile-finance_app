import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getAnalyticsData } from '@/features/analytics/analytics-repository';

const getAllAsync = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const getFirstAsync = jest.fn<(...args: unknown[]) => Promise<unknown>>();
let database: SQLiteDatabase;

beforeEach(() => {
  jest.clearAllMocks();
  database = {
    getAllAsync,
    getFirstAsync,
  } as unknown as SQLiteDatabase;
});

describe('analytics repository', () => {
  it('calculates category breakdown percentages and weekly comparisons', async () => {
    // 1. Category Breakdown Mock
    getAllAsync.mockResolvedValueOnce([
      {
        amount_minor: 600_000,
        category_id: 1,
        category_name: 'Food & Drink',
        tx_count: 5,
      },
      {
        amount_minor: 400_000,
        category_id: 2,
        category_name: 'Transport',
        tx_count: 3,
      },
    ]);

    // 2. Income query
    getFirstAsync.mockResolvedValueOnce({ total_income: 3_000_000 });

    // 3. Weekly daily expenses mock
    getAllAsync.mockResolvedValueOnce([
      { amount_minor: 100_000, local_date: '2026-08-16' },
      { amount_minor: 50_000, local_date: '2026-08-15' },
    ]);

    // 4. Monthly cash flow mock
    getAllAsync.mockResolvedValueOnce([
      { amount_minor: 3_000_000, month_str: '2026-08', type: 'income' },
      { amount_minor: 1_000_000, month_str: '2026-08', type: 'expense' },
    ]);

    const data = await getAnalyticsData(database, '2026-08-16');

    expect(data.totalExpenseMinor).toBe(1_000_000);
    expect(data.totalIncomeMinor).toBe(3_000_000);
    expect(data.totalTransactionsCount).toBe(8);
    expect(data.topExpenseCategory?.categoryName).toBe('Food & Drink');
    expect(data.topExpenseCategory?.percentage).toBe(60);

    expect(data.categoryBreakdown.length).toBe(2);
    expect(data.categoryBreakdown[1]?.categoryName).toBe('Transport');
    expect(data.categoryBreakdown[1]?.percentage).toBe(40);

    expect(data.weeklyComparison.dailyBreakdown.length).toBe(7);
    expect(data.monthlyCashFlow.length).toBe(4);
  });
});
