import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type {
  SQLiteBindValue,
  SQLiteDatabase,
  SQLiteRunResult,
} from 'expo-sqlite';

import { defaultCategories, defaultPaymentMethods } from '@/db/seeds';
import {
  clearTemporaryCache,
  formatStorageSize,
  getHomeDisplayPreferences,
  getQuickLogCategoryIds,
  getRecommendedShortcuts,
  getSettingsOverview,
  getStorageStats,
  resetApplicationData,
  resolveDefaultQuickLogCategoryIds,
  setHomeDisplayPreferences,
  setQuickLogCategoryIds,
} from '@/features/settings/settings-repository';

const mockRemoveCachedClaimPdfs = jest.fn();
const mockRemoveAllReceiptFiles = jest.fn();

jest.mock('@/features/claims/claim-pdf', () => ({
  removeCachedClaimPdfs: () => mockRemoveCachedClaimPdfs(),
}));
jest.mock('@/features/receipts/receipt-storage', () => ({
  removeAllReceiptFiles: () => mockRemoveAllReceiptFiles(),
}));

class ResetDatabase {
  categoryBudgets = 1;
  categorySystemKeys = new Set(['expense_food', 'custom_category']);
  claimItems = 2;
  claims = 1;
  currency = 'IDR';
  defaultWalletAccountNumber: string | null = '1234567890';
  executedSql: string[] = [];
  goalTransactions = 2;
  paymentSystemKeys = new Set(['cash', 'custom_method']);
  receipts = 1;
  savingsGoals = 1;
  settings = new Map([
    ['default_currency_code', 'IDR'],
    ['welcome_seen', 'true'],
  ]);
  transactions = 2;
  transactionShouldFail = false;

  asSQLiteDatabase() {
    return this as unknown as SQLiteDatabase;
  }

  async getFirstAsync<T>() {
    return { value: this.currency } as T;
  }

  async withExclusiveTransactionAsync(
    task: (transaction: SQLiteDatabase) => Promise<void>,
  ) {
    if (this.transactionShouldFail) throw new Error('database unavailable');
    await task(this.asSQLiteDatabase());
  }

  async execAsync(source: string) {
    this.executedSql.push(source);
    this.goalTransactions = 0;
    this.savingsGoals = 0;
    this.categoryBudgets = 0;
    this.claimItems = 0;
    this.receipts = 0;
    this.claims = 0;
    this.transactions = 0;
    if (source.includes('DELETE FROM payment_methods;')) {
      this.defaultWalletAccountNumber = null;
    }
    this.categorySystemKeys.clear();
    this.paymentSystemKeys.clear();
    this.settings.clear();
  }

  async runAsync(
    source: string,
    ...params: SQLiteBindValue[]
  ): Promise<SQLiteRunResult> {
    if (source.includes('INTO categories')) {
      this.categorySystemKeys.add(String(params[3]));
    } else if (source.includes('INTO payment_methods')) {
      this.paymentSystemKeys.add(String(params[1]));
    } else if (source.includes('INTO app_settings')) {
      this.settings.set(String(params[0]), String(params[1]));
    }
    return { changes: 1, lastInsertRowId: 0 };
  }
}

describe('settings repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the currency setting with multi-currency support', async () => {
    const database = new ResetDatabase();

    await expect(
      getSettingsOverview(database.asSQLiteDatabase()),
    ).resolves.toEqual({
      brandTheme: 'blue',
      currencyCode: 'IDR',
      currencyName: 'Indonesian Rupiah',
      language: 'id',
      quickShortcuts: [2000, 5000, 10000, 20000, 50000, 100000],
      theme: 'system',
    });

    database.currency = 'USD';
    await expect(
      getSettingsOverview(database.asSQLiteDatabase()),
    ).resolves.toEqual({
      brandTheme: 'blue',
      currencyCode: 'USD',
      currencyName: 'US Dollar',
      language: 'id',
      quickShortcuts: [2000, 5000, 10000, 20000, 50000, 100000],
      theme: 'system',
    });
  });

  it('removes user data, re-seeds defaults, and clears managed files', async () => {
    const database = new ResetDatabase();

    await resetApplicationData(database.asSQLiteDatabase());

    expect(database.savingsGoals).toBe(0);
    expect(database.goalTransactions).toBe(0);
    expect(database.categoryBudgets).toBe(0);
    expect(database.claimItems).toBe(0);
    expect(database.receipts).toBe(0);
    expect(database.claims).toBe(0);
    expect(database.transactions).toBe(0);
    expect(database.defaultWalletAccountNumber).toBeNull();
    expect(database.categorySystemKeys).toEqual(
      new Set(defaultCategories.map((category) => category.systemKey)),
    );
    expect(database.paymentSystemKeys).toEqual(
      new Set(defaultPaymentMethods.map((method) => method.systemKey)),
    );
    expect(database.settings).toEqual(
      new Map([
        ['welcome_seen', 'false'],
        ['default_currency_code', 'IDR'],
        ['language', 'id'],
      ]),
    );
    const clearSql = database.executedSql.find((source) =>
      source.includes('DELETE FROM goal_transactions'),
    );
    expect(clearSql).toContain('DELETE FROM goal_transactions');
    expect(clearSql).toContain('DELETE FROM savings_goals');
    expect(clearSql).toContain('DELETE FROM category_budgets');
    expect(clearSql).toContain('DELETE FROM claim_items');
    expect(clearSql).toContain('DELETE FROM payment_methods');
    expect(clearSql).toContain('DELETE FROM categories');
    expect(mockRemoveAllReceiptFiles).toHaveBeenCalledTimes(1);
    expect(mockRemoveCachedClaimPdfs).toHaveBeenCalledTimes(1);
  });

  it('does not remove files when the database transaction fails', async () => {
    const warningSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const database = new ResetDatabase();
    database.transactionShouldFail = true;

    await expect(
      resetApplicationData(database.asSQLiteDatabase()),
    ).rejects.toMatchObject({
      code: 'DATABASE_WRITE_FAILED',
      message: "We couldn't delete your data. Nothing was reset.",
    });
    expect(database.transactions).toBe(2);
    expect(mockRemoveAllReceiptFiles).not.toHaveBeenCalled();
    expect(mockRemoveCachedClaimPdfs).not.toHaveBeenCalled();
    warningSpy.mockRestore();
  });

  it('attempts both file cleanups and reports a partial cleanup failure', async () => {
    const database = new ResetDatabase();
    mockRemoveAllReceiptFiles.mockImplementationOnce(() => {
      throw new Error('file locked');
    });

    await expect(
      resetApplicationData(database.asSQLiteDatabase()),
    ).rejects.toMatchObject({
      code: 'FILE_OPERATION_FAILED',
      message: expect.stringContaining('records were reset'),
    });
    expect(database.transactions).toBe(0);
    expect(mockRemoveCachedClaimPdfs).toHaveBeenCalledTimes(1);
  });

  it('formats storage size correctly across units', () => {
    expect(formatStorageSize(0)).toBe('0 B');
    expect(formatStorageSize(-10)).toBe('0 B');
    expect(formatStorageSize(500)).toBe('500 B');
    expect(formatStorageSize(1024)).toBe('1.0 KB');
    expect(formatStorageSize(1536)).toBe('1.5 KB');
    expect(formatStorageSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatStorageSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('retrieves storage stats from database and filesystem', async () => {
    const database = new ResetDatabase();
    const stats = await getStorageStats(database.asSQLiteDatabase());
    expect(stats).toMatchObject({
      claimsCount: expect.any(Number),
      receiptsCount: expect.any(Number),
      transactionsCount: expect.any(Number),
    });
  });

  it('clears temporary cache without error', async () => {
    const result = await clearTemporaryCache();
    expect(result).toHaveProperty('freedBytes');
    expect(typeof result.freedBytes).toBe('number');
  });

  it('reads and writes home display preferences', async () => {
    const database = new ResetDatabase();
    await setHomeDisplayPreferences(database.asSQLiteDatabase(), {
      hideBalance: true,
      showQuickLog: false,
      showWalletChips: true,
    });

    expect(database.settings.get('home_hide_balance')).toBe('1');
    expect(database.settings.get('home_show_quick_log')).toBe('0');
    expect(database.settings.get('home_show_wallet_chips')).toBe('1');
  });

  it('resolves default quick-log categories by stable system key', () => {
    expect(
      resolveDefaultQuickLogCategoryIds([
        { id: 91, systemKey: 'expense_shopping', type: 'expense' },
        { id: 42, systemKey: 'expense_food', type: 'expense' },
        {
          id: 77,
          systemKey: 'expense_transportation',
          type: 'expense',
        },
        { id: 12, systemKey: 'income_salary', type: 'income' },
      ]),
    ).toEqual([42, 77, 91]);
  });

  it('loads quick-log defaults from database system keys instead of row IDs', async () => {
    const database = {
      getAllAsync: jest.fn(async () => [
        { id: 880, system_key: 'expense_bills', type: 'expense' },
        { id: 120, system_key: 'expense_food', type: 'expense' },
      ]),
      getFirstAsync: jest.fn(async () => null),
    } as unknown as SQLiteDatabase;

    await expect(getQuickLogCategoryIds(database)).resolves.toEqual([120, 880]);
  });

  it('migrates legacy quick-log IDs to system keys while preserving custom categories', async () => {
    let storedValue = JSON.stringify([12, 91]);
    const categories = [
      { id: 12, system_key: 'expense_food', type: 'expense' as const },
      { id: 91, system_key: null, type: 'expense' as const },
    ];
    const database = {
      getAllAsync: jest.fn(async () => categories),
      getFirstAsync: jest.fn(async () => ({ value: storedValue })),
      runAsync: jest.fn(async (_sql: string, value: unknown) => {
        storedValue = String(value);
        return { changes: 1, lastInsertRowId: 0 };
      }),
    } as unknown as SQLiteDatabase;

    await expect(getQuickLogCategoryIds(database)).resolves.toEqual([12, 91]);
    expect(JSON.parse(storedValue)).toEqual({
      category_refs: [{ system_key: 'expense_food' }, { category_id: 91 }],
      version: 2,
    });
  });

  it('replaces the legacy hardcoded default sequence with current system categories', async () => {
    let storedValue = JSON.stringify([1, 2, 3, 4, 5]);
    const database = {
      getAllAsync: jest.fn(async () => [
        { id: 1, system_key: 'wallet_transfer', type: 'expense' },
        { id: 42, system_key: 'expense_food', type: 'expense' },
        { id: 77, system_key: 'expense_transportation', type: 'expense' },
        { id: 91, system_key: 'expense_shopping', type: 'expense' },
      ]),
      getFirstAsync: jest.fn(async () => ({ value: storedValue })),
      runAsync: jest.fn(async (_sql: string, value: unknown) => {
        storedValue = String(value);
        return { changes: 1, lastInsertRowId: 0 };
      }),
    } as unknown as SQLiteDatabase;

    await expect(getQuickLogCategoryIds(database)).resolves.toEqual([
      42, 77, 91,
    ]);
    expect(JSON.parse(storedValue)).toEqual({
      category_refs: [
        { system_key: 'expense_food' },
        { system_key: 'expense_transportation' },
        { system_key: 'expense_shopping' },
      ],
      version: 2,
    });
  });

  it('resolves migrated system keys when category IDs change', async () => {
    const database = {
      getAllAsync: jest.fn(async () => [
        { id: 712, system_key: 'expense_food', type: 'expense' },
        { id: 91, system_key: null, type: 'expense' },
      ]),
      getFirstAsync: jest.fn(async () => ({
        value: JSON.stringify({
          category_refs: [{ system_key: 'expense_food' }, { category_id: 91 }],
          version: 2,
        }),
      })),
    } as unknown as SQLiteDatabase;

    await expect(getQuickLogCategoryIds(database)).resolves.toEqual([712, 91]);
  });

  it('stores system categories by key and custom categories by ID', async () => {
    let storedValue = '';
    const database = {
      getAllAsync: jest.fn(async () => [
        { id: 712, system_key: 'expense_food', type: 'expense' },
        { id: 91, system_key: null, type: 'expense' },
      ]),
      runAsync: jest.fn(async (_sql: string, value: unknown) => {
        storedValue = String(value);
        return { changes: 1, lastInsertRowId: 0 };
      }),
    } as unknown as SQLiteDatabase;

    await setQuickLogCategoryIds(database, [712, 91], 123);

    expect(JSON.parse(storedValue)).toEqual({
      category_refs: [{ system_key: 'expense_food' }, { category_id: 91 }],
      version: 2,
    });
  });

  it('falls back to the first expense categories if system keys are absent', () => {
    expect(
      resolveDefaultQuickLogCategoryIds([
        { id: 501, systemKey: null, type: 'expense' },
        { id: 502, systemKey: null, type: 'expense' },
        { id: 503, systemKey: null, type: 'income' },
      ]),
    ).toEqual([501, 502]);
  });
});
