import { describe, expect, it } from '@jest/globals';
import type {
  SQLiteBindValue,
  SQLiteDatabase,
  SQLiteRunResult,
} from 'expo-sqlite';

import { setCurrencySetting } from '@/features/settings/settings-repository';
import { formatMoney } from '@/lib/money';

class CurrencySettingDatabase {
  currency = 'IDR';
  transactionCurrency = 'IDR';
  readonly values = new Map<string, number>([
    ['transactions.amount_minor', 100_000],
    ['transactions.transfer_fee_minor', 2_500],
    ['receipts.subtotal_minor', 50_000],
    ['receipts.tax_minor', 5_000],
    ['payment_methods.initial_balance_minor', 1_000_000],
    ['category_budgets.monthly_limit_minor', 250_000],
    ['savings_goals.target_amount_minor', 500_000],
    ['savings_goals.current_amount_minor', 100_000],
    ['goal_transactions.amount_minor', 100_000],
  ]);

  asSQLiteDatabase() {
    return this as unknown as SQLiteDatabase;
  }

  async withExclusiveTransactionAsync(
    task: (transaction: SQLiteDatabase) => Promise<void>,
  ) {
    await task(this.asSQLiteDatabase());
  }

  async getAllAsync<T>(source: string) {
    if (this.normalizeSql(source) === 'PRAGMA foreign_key_check') {
      return [] as T[];
    }
    throw new Error(`Unsupported getAllAsync SQL: ${source}`);
  }

  async getFirstAsync<T>(source: string, ...params: SQLiteBindValue[]) {
    const sql = this.normalizeSql(source);
    if (sql.includes("FROM app_settings WHERE key = 'default_currency_code'")) {
      return { value: this.currency } as T;
    }
    if (sql.includes('FROM transactions WHERE currency_code != ?')) {
      return (this.transactionCurrency === params[0] ? null : { id: 1 }) as T;
    }

    const maximum = sql.match(
      /SELECT MAX\(ABS\((\w+)\)\) AS max_abs FROM (\w+)/,
    );
    if (maximum) {
      return {
        max_abs: this.values.get(`${maximum[2]}.${maximum[1]}`) ?? null,
      } as T;
    }

    const incompatible = sql.match(
      /SELECT COUNT\(\*\) AS incompatible_count FROM (\w+) WHERE (\w+)/,
    );
    if (incompatible) {
      const value = this.values.get(`${incompatible[1]}.${incompatible[2]}`);
      const divisor = Number(params[0]);
      return {
        incompatible_count:
          value !== undefined && value % divisor !== 0 ? 1 : 0,
      } as T;
    }

    throw new Error(`Unsupported getFirstAsync SQL: ${sql}`);
  }

  async runAsync(
    source: string,
    ...params: SQLiteBindValue[]
  ): Promise<SQLiteRunResult> {
    const sql = this.normalizeSql(source);
    if (sql.startsWith('UPDATE transactions SET currency_code')) {
      this.transactionCurrency = String(params[0]);
      return { changes: 1, lastInsertRowId: 0 };
    }
    if (sql.startsWith('INSERT INTO app_settings')) {
      this.currency = String(params[0]);
      return { changes: 1, lastInsertRowId: 0 };
    }

    const table = sql.match(/^UPDATE (\w+) SET /)?.[1];
    if (table) {
      const assignments = Array.from(
        sql.matchAll(/(\w+_minor) = \1 ([*/]) \?/g),
      );
      assignments.forEach((assignment, index) => {
        const key = `${table}.${assignment[1]}`;
        const value = this.values.get(key);
        if (value === undefined) return;
        const factor = Number(params[index]);
        this.values.set(
          key,
          assignment[2] === '*' ? value * factor : value / factor,
        );
      });
      return { changes: 1, lastInsertRowId: 0 };
    }

    throw new Error(`Unsupported runAsync SQL: ${sql}`);
  }

  private normalizeSql(source: string) {
    return source.replace(/\s+/g, ' ').trim();
  }
}

describe('global currency setting', () => {
  it('keeps every displayed nominal value unchanged when switching IDR to USD', async () => {
    const database = new CurrencySettingDatabase();

    await setCurrencySetting(database.asSQLiteDatabase(), 'USD');

    expect(database.currency).toBe('USD');
    expect(database.transactionCurrency).toBe('USD');
    expect(database.values.get('transactions.amount_minor')).toBe(10_000_000);
    expect(database.values.get('transactions.transfer_fee_minor')).toBe(
      250_000,
    );
    expect(database.values.get('payment_methods.initial_balance_minor')).toBe(
      100_000_000,
    );
    expect(database.values.get('category_budgets.monthly_limit_minor')).toBe(
      25_000_000,
    );
    expect(database.values.get('savings_goals.target_amount_minor')).toBe(
      50_000_000,
    );
    expect(
      formatMoney(
        database.values.get('transactions.amount_minor')!,
        'USD',
        'en-US',
      ),
    ).toBe('$100,000.00');
  });

  it('rejects a zero-fraction currency when exact nominal preservation is impossible', async () => {
    const database = new CurrencySettingDatabase();
    database.currency = 'USD';
    database.transactionCurrency = 'USD';
    database.values.set('transactions.amount_minor', 1_250);

    await expect(
      setCurrencySetting(database.asSQLiteDatabase(), 'IDR'),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      message: expect.stringContaining('without rounding'),
    });
    expect(database.currency).toBe('USD');
    expect(database.values.get('transactions.amount_minor')).toBe(1_250);
  });
});
