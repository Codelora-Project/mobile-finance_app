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
  getRecommendedShortcuts,
  getSettingsOverview,
  getStorageStats,
  resetApplicationData,
  setHomeDisplayPreferences,
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
});
