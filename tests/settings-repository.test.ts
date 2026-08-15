import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type {
  SQLiteBindValue,
  SQLiteDatabase,
  SQLiteRunResult,
} from 'expo-sqlite';

import { defaultCategories, defaultPaymentMethods } from '@/db/seeds';
import {
  getSettingsOverview,
  resetApplicationData,
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
  categorySystemKeys = new Set(['expense_food', 'custom_category']);
  claimItems = 2;
  claims = 1;
  currency = 'IDR';
  executedSql: string[] = [];
  paymentSystemKeys = new Set(['cash', 'custom_method']);
  receipts = 1;
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
    this.claimItems = 0;
    this.receipts = 0;
    this.claims = 0;
    this.transactions = 0;
    this.categorySystemKeys.delete('custom_category');
    this.paymentSystemKeys.delete('custom_method');
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

  it('reads the fixed IDR currency setting', async () => {
    const database = new ResetDatabase();

    await expect(
      getSettingsOverview(database.asSQLiteDatabase()),
    ).resolves.toEqual({
      currencyCode: 'IDR',
      currencyName: 'Indonesian Rupiah',
    });

    database.currency = 'USD';
    await expect(
      getSettingsOverview(database.asSQLiteDatabase()),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('removes user data, re-seeds defaults, and clears managed files', async () => {
    const database = new ResetDatabase();

    await resetApplicationData(database.asSQLiteDatabase());

    expect(database.claimItems).toBe(0);
    expect(database.receipts).toBe(0);
    expect(database.claims).toBe(0);
    expect(database.transactions).toBe(0);
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
      ]),
    );
    expect(database.executedSql[0]).toContain('DELETE FROM claim_items');
    expect(database.executedSql[0]).toContain(
      'DELETE FROM categories WHERE is_default = 0',
    );
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
});
