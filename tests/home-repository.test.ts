import { describe, expect, it } from '@jest/globals';
import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import {
  getCurrentMonthRange,
  getHomeSummary,
} from '@/features/home/home-repository';

type FakeTransaction = {
  id: number;
  type: 'expense' | 'income';
  amountMinor: number;
  currencyCode: string;
  categoryId: number;
  categoryName: string;
  counterparty: string | null;
  occurredAt: number;
  localDate: string;
};

class HomeDatabase {
  readonly calls: Array<{
    method: 'first' | 'all';
    parameters: readonly SQLiteBindValue[];
    sql: string;
  }> = [];
  currencyCode: string | null = 'IDR';
  readonly transactions: readonly FakeTransaction[] = [
    {
      amountMinor: 35_000,
      categoryId: 1,
      categoryName: 'Food & Drink',
      counterparty: 'Coffee Shop',
      currencyCode: 'IDR',
      id: 1,
      localDate: '2026-08-15',
      occurredAt: 700,
      type: 'expense',
    },
    {
      amountMinor: 15_000,
      categoryId: 2,
      categoryName: 'Transportation',
      counterparty: null,
      currencyCode: 'IDR',
      id: 2,
      localDate: '2026-08-14',
      occurredAt: 600,
      type: 'expense',
    },
    {
      amountMinor: 100_000,
      categoryId: 3,
      categoryName: 'Salary',
      counterparty: 'Employer',
      currencyCode: 'IDR',
      id: 3,
      localDate: '2026-08-01',
      occurredAt: 500,
      type: 'income',
    },
    {
      amountMinor: 20_000,
      categoryId: 1,
      categoryName: 'Food & Drink',
      counterparty: 'USD Cafe',
      currencyCode: 'USD',
      id: 4,
      localDate: '2026-08-10',
      occurredAt: 400,
      type: 'expense',
    },
    {
      amountMinor: 90_000,
      categoryId: 1,
      categoryName: 'Food & Drink',
      counterparty: 'Old Cafe',
      currencyCode: 'IDR',
      id: 5,
      localDate: '2026-07-31',
      occurredAt: 300,
      type: 'expense',
    },
    {
      amountMinor: 5_000,
      categoryId: 2,
      categoryName: 'Transportation',
      counterparty: 'Parking',
      currencyCode: 'IDR',
      id: 6,
      localDate: '2026-07-30',
      occurredAt: 200,
      type: 'expense',
    },
  ];

  asSQLiteDatabase() {
    return this as unknown as SQLiteDatabase;
  }

  async getFirstAsync<T>(source: string, ...params: SQLiteBindValue[]) {
    const sql = this.normalizeSql(source);
    this.calls.push({ method: 'first', parameters: params, sql });

    if (sql === 'SELECT value FROM app_settings WHERE key = ?') {
      return (this.currencyCode ? { value: this.currencyCode } : null) as T;
    }

    if (sql.includes('AS expense_minor') && sql.includes('FROM transactions')) {
      const [monthStart, nextMonthStart, currencyCode] = params.map(String);
      const inScope = this.transactions.filter(
        (transaction) =>
          transaction.localDate >= monthStart &&
          transaction.localDate < nextMonthStart &&
          transaction.currencyCode === currencyCode,
      );
      return {
        expense_minor: inScope
          .filter((transaction) => transaction.type === 'expense')
          .reduce((total, transaction) => total + transaction.amountMinor, 0),
        income_minor: inScope
          .filter((transaction) => transaction.type === 'income')
          .reduce((total, transaction) => total + transaction.amountMinor, 0),
      } as T;
    }

    throw new Error(`Unsupported getFirstAsync SQL: ${sql}`);
  }

  async getAllAsync<T>(source: string, ...params: SQLiteBindValue[]) {
    const sql = this.normalizeSql(source);
    this.calls.push({ method: 'all', parameters: params, sql });

    if (sql.includes('GROUP BY c.id, c.name')) {
      const [monthStart, nextMonthStart, currencyCode] = params.map(String);
      const limit = Number(params[3]);
      const totals = new Map<
        number,
        { categoryName: string; amountMinor: number }
      >();
      for (const transaction of this.transactions) {
        if (
          transaction.type !== 'expense' ||
          transaction.localDate < monthStart ||
          transaction.localDate >= nextMonthStart ||
          transaction.currencyCode !== currencyCode
        ) {
          continue;
        }
        const current = totals.get(transaction.categoryId);
        totals.set(transaction.categoryId, {
          amountMinor: (current?.amountMinor ?? 0) + transaction.amountMinor,
          categoryName: transaction.categoryName,
        });
      }
      return [...totals.entries()]
        .map(([categoryId, total]) => ({
          amount_minor: total.amountMinor,
          category_id: categoryId,
          category_name: total.categoryName,
        }))
        .sort(
          (left, right) =>
            right.amount_minor - left.amount_minor ||
            left.category_name.localeCompare(right.category_name),
        )
        .slice(0, limit) as T[];
    }

    if (sql.includes('ORDER BY t.occurred_at DESC, t.id DESC')) {
      const limit = Number(params.at(-2));
      const offset = Number(params.at(-1));
      return [...this.transactions]
        .sort(
          (left, right) =>
            right.occurredAt - left.occurredAt || right.id - left.id,
        )
        .slice(offset, offset + limit)
        .map((transaction) => ({
          amount_minor: transaction.amountMinor,
          category_name: transaction.categoryName,
          counterparty: transaction.counterparty,
          currency_code: transaction.currencyCode,
          has_receipt: 0,
          id: transaction.id,
          is_reimbursable: 0,
          local_date: transaction.localDate,
          occurred_at: transaction.occurredAt,
          timezone_offset_minutes: 420,
          type: transaction.type,
        })) as T[];
    }

    throw new Error(`Unsupported getAllAsync SQL: ${sql}`);
  }

  private normalizeSql(source: string) {
    return source.replace(/\s+/g, ' ').trim();
  }
}

describe('home repository', () => {
  it('aggregates the current local month and returns only five recent rows', async () => {
    const database = new HomeDatabase();
    const now = Date.UTC(2026, 7, 15, 5, 0, 0);

    const summary = await getHomeSummary(database.asSQLiteDatabase(), 'monthly', new Date(2026, 7, 15), 'id');

    expect(summary).toMatchObject({
      categoryTotals: [
        {
          amountMinor: 35_000,
          categoryId: 1,
          categoryName: 'Food & Drink',
        },
        {
          amountMinor: 15_000,
          categoryId: 2,
          categoryName: 'Transportation',
        },
      ],
      currencyCode: 'IDR',
      expenseMinor: 50_000,
      incomeMinor: 100_000,
      startDate: '2026-08-01',
      endDateExclusive: '2026-09-01',
      period: 'monthly',
      netMinor: 50_000,
      
    });
    expect(summary.recentTransactions).toHaveLength(6);
    expect(summary.recentTransactions.map(({ id }) => id)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);

    const totalsCall = database.calls.find((call) =>
      call.sql.includes('AS expense_minor'),
    );
    expect(totalsCall?.sql).toContain('COALESCE(SUM');
    expect(totalsCall?.parameters).toEqual(['2026-08-01', '2026-09-01', 'IDR']);

    const categoryCall = database.calls.find((call) =>
      call.sql.includes('GROUP BY c.id, c.name'),
    );
    expect(categoryCall?.sql).toContain('ORDER BY amount_minor DESC');
    expect(categoryCall?.parameters).toEqual([
      '2026-08-01',
      '2026-09-01',
      'IDR',
      5,
    ]);

    const recentCall = database.calls.find((call) =>
      call.sql.includes('ORDER BY t.occurred_at DESC, t.id DESC'),
    );
    expect(recentCall?.parameters).toEqual([9, 0]);
  });

  it('rolls December into the next year and rejects a missing currency setting', async () => {
    expect(getCurrentMonthRange(Date.UTC(2026, 11, 15, 0, 0, 0), 420)).toEqual({
      monthStart: '2026-12-01',
      nextMonthStart: '2027-01-01',
    });

    const database = new HomeDatabase();
    database.currencyCode = null;
    await expect(
      getHomeSummary(database.asSQLiteDatabase(), 'monthly', new Date(2026, 7, 15), 'id'),
    ).rejects.toMatchObject({
      code: 'DATABASE_WRITE_FAILED',
      message: 'The default currency setting is invalid.',
    });
  });
});
