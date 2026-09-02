import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createBackupPayload,
  exportTransactionsCsvFile,
  restoreBackupData,
} from '@/features/backup/backup-service';
import type { BackupPayload } from '@/features/backup/backup-types';

const mockReadReceiptBase64 = jest.fn<() => Promise<string | null>>();
const mockRemoveReceiptFile = jest.fn();
const mockWriteReceiptBase64ToStorage = jest.fn<() => Promise<string>>();

jest.mock('@/features/receipts/receipt-storage', () => ({
  readReceiptBase64: () => mockReadReceiptBase64(),
  removeReceiptFile: (...args: unknown[]) => mockRemoveReceiptFile(...args),
  writeReceiptBase64ToStorage: () => mockWriteReceiptBase64ToStorage(),
}));

function emptyBackupPayload(version: 1 | 2 = 2): BackupPayload {
  return {
    app_identifier: 'keuanganku_app',
    app_version: '1.0.0',
    data: {
      app_settings: [],
      categories: [],
      category_budgets: [],
      claim_items: [],
      claims: [],
      goal_transactions: [],
      payment_methods: [],
      receipts: [],
      savings_goals: [],
      transactions: [],
    },
    exported_at: '2026-08-24T00:00:00.000Z',
    summary: {
      budgets_count: 0,
      categories_count: 0,
      claims_count: 0,
      goals_count: 0,
      payment_methods_count: 0,
      transactions_count: 0,
    },
    version,
  };
}

describe('Backup Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadReceiptBase64.mockResolvedValue('AAAA');
    mockWriteReceiptBase64ToStorage.mockResolvedValue('receipts/restored.jpg');
  });

  it('creates a valid BackupPayload structure with summary counts', async () => {
    const mockDb = {
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes('FROM categories')) {
          return [{ id: 1, name: 'Food', type: 'expense', sort_order: 1 }];
        }
        if (sql.includes('FROM payment_methods')) {
          return [
            {
              id: 1,
              name: 'Cash',
              sort_order: 1,
              initial_balance_minor: 500_000,
              account_type: 'cash',
              include_in_cashflow: 1,
              is_archived: 0,
            },
          ];
        }
        if (sql.includes('FROM transactions')) {
          return [
            {
              id: 101,
              type: 'transfer',
              amount_minor: 50_000,
              category_id: 1,
              transfer_to_payment_method_id: 2,
              transfer_fee_minor: 2_500,
            },
          ];
        }
        return [];
      }),
    } as unknown as SQLiteDatabase;

    const payload = await createBackupPayload(mockDb);

    expect(payload.app_identifier).toBe('keuanganku_app');
    expect(payload.version).toBe(2);
    expect(payload.summary.categories_count).toBe(1);
    expect(payload.summary.payment_methods_count).toBe(1);
    expect(payload.summary.transactions_count).toBe(1);
    expect(payload.data.categories).toHaveLength(1);
    expect(payload.data.transactions).toHaveLength(1);
    expect(payload.data.payment_methods[0]).toMatchObject({
      account_type: 'cash',
      initial_balance_minor: 500_000,
    });
    expect(payload.data.transactions[0]).toMatchObject({
      transfer_fee_minor: 2_500,
      transfer_to_payment_method_id: 2,
      type: 'transfer',
    });
  });

  it('restores backup data atomically inside SQLite transaction', async () => {
    const executedSql: string[] = [];
    const runAsyncCalls: Array<{ sql: string; params?: unknown[] }> = [];

    const mockDb = {
      getAllAsync: jest.fn(async () => []),
      execAsync: jest.fn(async (sql: string) => {
        executedSql.push(sql);
      }),
      runAsync: jest.fn(async (sql: string, params?: unknown[]) => {
        runAsyncCalls.push({ sql, params });
      }),
      withExclusiveTransactionAsync: jest.fn(
        async (task: (database: SQLiteDatabase) => Promise<void>) => {
          await task(mockDb as unknown as SQLiteDatabase);
        },
      ),
    } as unknown as SQLiteDatabase;

    const mockPayload: BackupPayload = {
      app_identifier: 'personal_finance_app',
      version: 1,
      exported_at: '2026-08-17T00:00:00Z',
      app_version: '1.0.0',
      summary: {
        transactions_count: 1,
        categories_count: 1,
        payment_methods_count: 1,
        goals_count: 0,
        claims_count: 0,
        budgets_count: 0,
      },
      data: {
        categories: [
          {
            id: 1,
            name: 'Food',
            type: 'expense',
            icon_key: 'food',
            system_key: 'expense_food',
            is_default: 1,
            is_fallback: 0,
            sort_order: 1,
            created_at: 1000,
            updated_at: 1000,
          },
        ],
        payment_methods: [
          {
            id: 1,
            name: 'Cash',
            system_key: 'cash',
            is_default: 1,
            is_fallback: 0,
            sort_order: 1,
            created_at: 1000,
            updated_at: 1000,
          },
        ],
        transactions: [
          {
            id: 101,
            type: 'expense',
            amount_minor: 25000,
            currency_code: 'IDR',
            category_id: 1,
            payment_method_id: 1,
            counterparty: 'Warung Nasi',
            note: 'Makan siang, enak',
            occurred_at: 2000,
            timezone_offset_minutes: 420,
            local_date: '2026-08-17',
            is_reimbursable: 0,
            created_at: 2000,
            updated_at: 2000,
          },
        ],
        receipts: [],
        claims: [],
        claim_items: [],
        app_settings: [],
        savings_goals: [],
        goal_transactions: [],
        category_budgets: [],
      },
    };

    const result = await restoreBackupData(mockDb, mockPayload);

    expect(result.stats.categoriesCount).toBe(1);
    expect(result.stats.paymentMethodsCount).toBe(1);
    expect(result.stats.transactionsCount).toBe(1);

    // Verify deletion of tables occurred first
    expect(mockDb.execAsync).toHaveBeenCalled();
    expect(mockDb.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    // Verify inserts occurred for categories, payment methods, and transactions
    expect(runAsyncCalls.length).toBe(3);
    expect(runAsyncCalls[1].params).toEqual(
      expect.arrayContaining(['cash', '#2563EB', 'wallet']),
    );
    expect(runAsyncCalls[2].params).toHaveLength(18);
  });

  it('fails backup creation when a referenced receipt image is missing', async () => {
    mockReadReceiptBase64.mockResolvedValueOnce(null);
    const mockDb = {
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes('FROM receipts')) {
          return [
            {
              created_at: 1,
              id: 1,
              mime_type: 'image/jpeg',
              ocr_raw_text: null,
              ocr_status: 'not_processed',
              storage_key: 'receipts/missing.jpg',
              subtotal_minor: null,
              tax_minor: null,
              transaction_id: 1,
              updated_at: 1,
            },
          ];
        }
        return [];
      }),
    } as unknown as SQLiteDatabase;

    await expect(createBackupPayload(mockDb)).rejects.toMatchObject({
      code: 'FILE_OPERATION_FAILED',
      message: expect.stringContaining('receipt image is missing'),
    });
  });

  it('removes already staged receipt files when a later receipt fails', async () => {
    mockWriteReceiptBase64ToStorage
      .mockResolvedValueOnce('receipts/first.jpg')
      .mockRejectedValueOnce(new Error('storage full'));
    const payload = emptyBackupPayload(2);
    payload.data.receipts.push(
      {
        created_at: 1,
        file_base64: 'AAAA',
        id: 1,
        mime_type: 'image/jpeg',
        ocr_raw_text: null,
        ocr_status: 'not_processed',
        storage_key: 'receipts/original-one.jpg',
        subtotal_minor: null,
        tax_minor: null,
        transaction_id: 1,
        updated_at: 1,
      },
      {
        created_at: 1,
        file_base64: 'BBBB',
        id: 2,
        mime_type: 'image/jpeg',
        ocr_raw_text: null,
        ocr_status: 'not_processed',
        storage_key: 'receipts/original-two.jpg',
        subtotal_minor: null,
        tax_minor: null,
        transaction_id: 2,
        updated_at: 1,
      },
    );
    const mockDb = {
      getAllAsync: jest.fn(async () => []),
    } as unknown as SQLiteDatabase;

    await expect(restoreBackupData(mockDb, payload)).rejects.toThrow(
      'storage full',
    );
    expect(mockRemoveReceiptFile).toHaveBeenCalledTimes(1);
    expect(mockRemoveReceiptFile).toHaveBeenCalledWith('receipts/first.jpg');
  });

  it('generates CSV with proper UTF-8 BOM and headers', async () => {
    const mockDb = {
      getAllAsync: jest.fn(async () => [
        {
          id: 1,
          type: 'expense',
          amount_minor: 15000,
          currency_code: 'IDR',
          category_name: 'Transport',
          payment_method_name: 'Gopay',
          counterparty: 'Gojek',
          note: 'Pergi kantor, hujan',
          local_date: '2026-08-17',
          occurred_at: 10000,
          is_reimbursable: 1,
          claim_title: 'Transportasi Kantor',
          claim_status: 'draft',
        },
      ]),
    } as unknown as SQLiteDatabase;

    const result = await exportTransactionsCsvFile(mockDb);
    expect(result.count).toBe(1);
    expect(result.fileName).toMatch(/^laporan_transaksi_\d+_\d+\.csv$/);
  });

  it('does not create a temporary CSV when there are no transactions', async () => {
    const mockDb = {
      getAllAsync: jest.fn(async () => []),
    } as unknown as SQLiteDatabase;

    await expect(exportTransactionsCsvFile(mockDb)).resolves.toMatchObject({
      count: 0,
      uri: '',
    });
  });

  it('exports CSV filtered by this_month scope', async () => {
    const mockDb = {
      getAllAsync: jest.fn(async () => [
        {
          amount_minor: 25000,
          category_name: 'Food',
          claim_status: null,
          claim_title: null,
          counterparty: null,
          currency_code: 'IDR',
          id: 2,
          is_reimbursable: 0,
          local_date: '2026-08-18',
          note: null,
          occurred_at: 20000,
          payment_method_name: 'Cash',
          type: 'expense',
        },
      ]),
    } as unknown as SQLiteDatabase;

    const result = await exportTransactionsCsvFile(mockDb, {
      language: 'en',
      scope: 'this_month',
    });
    expect(result.count).toBe(1);
    expect(result.fileName).toMatch(/^laporan_transaksi_\d{4}_\d{2}\.csv$/);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE t.local_date >='),
      expect.any(String),
      expect.any(String),
    );
  });
});
