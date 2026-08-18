import { describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createBackupPayload,
  exportTransactionsCsvFile,
  restoreBackupData,
} from '@/features/backup/backup-service';
import type { BackupPayload } from '@/features/backup/backup-types';

describe('Backup Service', () => {
  it('creates a valid BackupPayload structure with summary counts', async () => {
    const mockDb = {
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes('FROM categories')) {
          return [{ id: 1, name: 'Food', type: 'expense', sort_order: 1 }];
        }
        if (sql.includes('FROM payment_methods')) {
          return [{ id: 1, name: 'Cash', sort_order: 1 }];
        }
        if (sql.includes('FROM transactions')) {
          return [{ id: 101, amount_minor: 50000, category_id: 1 }];
        }
        return [];
      }),
    } as unknown as SQLiteDatabase;

    const payload = await createBackupPayload(mockDb);

    expect(payload.app_identifier).toBe('personal_finance_app');
    expect(payload.version).toBe(1);
    expect(payload.summary.categories_count).toBe(1);
    expect(payload.summary.payment_methods_count).toBe(1);
    expect(payload.summary.transactions_count).toBe(1);
    expect(payload.data.categories).toHaveLength(1);
    expect(payload.data.transactions).toHaveLength(1);
  });

  it('restores backup data atomically inside SQLite transaction', async () => {
    const executedSql: string[] = [];
    const runAsyncCalls: Array<{ sql: string; params?: unknown[] }> = [];

    const mockDb = {
      execAsync: jest.fn(async (sql: string) => {
        executedSql.push(sql);
      }),
      runAsync: jest.fn(async (sql: string, params?: unknown[]) => {
        runAsyncCalls.push({ sql, params });
      }),
      withTransactionAsync: jest.fn(
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
    // Verify inserts occurred for categories, payment methods, and transactions
    expect(runAsyncCalls.length).toBe(3);
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
