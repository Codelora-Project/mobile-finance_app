import { describe, expect, it } from '@jest/globals';
import type {
  SQLiteBindValue,
  SQLiteDatabase,
  SQLiteRunResult,
} from 'expo-sqlite';

import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  TRANSACTION_PAGE_SIZE,
  updateTransaction,
  type SaveTransactionInput,
} from '@/features/transactions/transaction-repository';
import { getTimezoneOffsetMinutes, toLocalDate } from '@/lib/dates';

type StoredTransaction = {
  id: number;
  type: 'expense' | 'income';
  amountMinor: number;
  currencyCode: string;
  categoryId: number;
  paymentMethodId: number | null;
  counterparty: string | null;
  note: string | null;
  occurredAt: number;
  timezoneOffsetMinutes: number;
  localDate: string;
  isReimbursable: number;
  createdAt: number;
  updatedAt: number;
};

type StoredReceipt = {
  id: number;
  transactionId: number;
  storageKey: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  ocrStatus: 'not_processed' | 'processed' | 'partial' | 'failed';
  ocrRawText: string | null;
  subtotalMinor: number | null;
  taxMinor: number | null;
  createdAt: number;
  updatedAt: number;
};

class TransactionDatabase {
  readonly categories = [
    { id: 1, name: 'Food & Drink', type: 'expense' as const },
    { id: 2, name: 'Salary', type: 'income' as const },
  ];
  readonly paymentMethods = [{ id: 10, name: 'Cash' }];
  readonly transactions: StoredTransaction[] = [];
  readonly receipts: StoredReceipt[] = [];
  private nextTransactionId = 100;
  private nextReceiptId = 200;

  asSQLiteDatabase() {
    return this as unknown as SQLiteDatabase;
  }

  async withExclusiveTransactionAsync(
    task: (transaction: SQLiteDatabase) => Promise<void>,
  ) {
    await task(this.asSQLiteDatabase());
  }

  async getFirstAsync<T>(source: string, ...params: SQLiteBindValue[]) {
    const sql = this.normalizeSql(source);
    let row: unknown = null;

    if (sql === 'SELECT id, type FROM categories WHERE id = ?') {
      row =
        this.categories.find((category) => category.id === params[0]) ?? null;
    } else if (sql === 'SELECT id FROM payment_methods WHERE id = ?') {
      const paymentMethod = this.paymentMethods.find(
        (method) => method.id === params[0],
      );
      row = paymentMethod ? { id: paymentMethod.id } : null;
    } else if (sql === 'SELECT id FROM transactions WHERE id = ?') {
      const transaction = this.transactions.find(
        (candidate) => candidate.id === params[0],
      );
      row = transaction ? { id: transaction.id } : null;
    } else if (sql === 'SELECT id FROM receipts WHERE transaction_id = ?') {
      const receipt = this.receipts.find(
        (candidate) => candidate.transactionId === params[0],
      );
      row = receipt ? { id: receipt.id } : null;
    } else if (
      sql.includes('FROM transactions t') &&
      sql.includes('t.id = ?')
    ) {
      const transaction = this.transactions.find(
        (candidate) => candidate.id === params[0],
      );
      if (transaction) {
        const category = this.categories.find(
          (candidate) => candidate.id === transaction.categoryId,
        );
        const paymentMethod = this.paymentMethods.find(
          (candidate) => candidate.id === transaction.paymentMethodId,
        );
        const receipt = this.receipts.find(
          (candidate) => candidate.transactionId === transaction.id,
        );
        row = {
          amount_minor: transaction.amountMinor,
          category_id: transaction.categoryId,
          category_name: category?.name ?? '',
          counterparty: transaction.counterparty,
          created_at: transaction.createdAt,
          currency_code: transaction.currencyCode,
          id: transaction.id,
          is_reimbursable: transaction.isReimbursable,
          local_date: transaction.localDate,
          note: transaction.note,
          occurred_at: transaction.occurredAt,
          payment_method_id: transaction.paymentMethodId,
          payment_method_name: paymentMethod?.name ?? null,
          receipt_id: receipt?.id ?? null,
          receipt_mime_type: receipt?.mimeType ?? null,
          receipt_ocr_status: receipt?.ocrStatus ?? null,
          receipt_ocr_raw_text: receipt?.ocrRawText ?? null,
          receipt_storage_key: receipt?.storageKey ?? null,
          receipt_subtotal_minor: receipt?.subtotalMinor ?? null,
          receipt_tax_minor: receipt?.taxMinor ?? null,
          timezone_offset_minutes: transaction.timezoneOffsetMinutes,
          type: transaction.type,
          updated_at: transaction.updatedAt,
        };
      }
    } else {
      throw new Error(`Unsupported getFirstAsync SQL: ${sql}`);
    }

    return row as T | null;
  }

  async runAsync(
    source: string,
    ...params: SQLiteBindValue[]
  ): Promise<SQLiteRunResult> {
    const sql = this.normalizeSql(source);

    if (sql.startsWith('INSERT INTO transactions')) {
      const id = this.nextTransactionId++;
      this.transactions.push({
        amountMinor: Number(params[1]),
        categoryId: Number(params[3]),
        counterparty: params[5] == null ? null : String(params[5]),
        createdAt: Number(params[11]),
        currencyCode: String(params[2]),
        id,
        isReimbursable: Number(params[10]),
        localDate: String(params[9]),
        note: params[6] == null ? null : String(params[6]),
        occurredAt: Number(params[7]),
        paymentMethodId: params[4] == null ? null : Number(params[4]),
        timezoneOffsetMinutes: Number(params[8]),
        type: params[0] as 'expense' | 'income',
        updatedAt: Number(params[12]),
      });
      return { changes: 1, lastInsertRowId: id };
    }

    if (sql.startsWith('INSERT INTO receipts')) {
      const id = this.nextReceiptId++;
      this.receipts.push({
        createdAt: Number(params[7]),
        id,
        mimeType: params[2] as StoredReceipt['mimeType'],
        ocrRawText: params[4] == null ? null : String(params[4]),
        ocrStatus: params[3] as StoredReceipt['ocrStatus'],
        storageKey: String(params[1]),
        subtotalMinor: params[5] == null ? null : Number(params[5]),
        taxMinor: params[6] == null ? null : Number(params[6]),
        transactionId: Number(params[0]),
        updatedAt: Number(params[8]),
      });
      return { changes: 1, lastInsertRowId: id };
    }

    if (sql.startsWith('UPDATE transactions SET type = ?')) {
      const transaction = this.transactions.find(
        (candidate) => candidate.id === params[12],
      );
      if (transaction) {
        Object.assign(transaction, {
          amountMinor: Number(params[1]),
          categoryId: Number(params[3]),
          counterparty: params[5] == null ? null : String(params[5]),
          currencyCode: String(params[2]),
          isReimbursable: Number(params[10]),
          localDate: String(params[9]),
          note: params[6] == null ? null : String(params[6]),
          occurredAt: Number(params[7]),
          paymentMethodId: params[4] == null ? null : Number(params[4]),
          timezoneOffsetMinutes: Number(params[8]),
          type: params[0] as 'expense' | 'income',
          updatedAt: Number(params[11]),
        });
      }
      return { changes: transaction ? 1 : 0, lastInsertRowId: 0 };
    }

    if (sql.startsWith('UPDATE receipts SET storage_key = ?')) {
      const receipt = this.receipts.find(
        (candidate) => candidate.transactionId === params[7],
      );
      if (receipt) {
        receipt.storageKey = String(params[0]);
        receipt.mimeType = params[1] as StoredReceipt['mimeType'];
        receipt.ocrStatus = params[2] as StoredReceipt['ocrStatus'];
        receipt.ocrRawText = params[3] == null ? null : String(params[3]);
        receipt.subtotalMinor = params[4] == null ? null : Number(params[4]);
        receipt.taxMinor = params[5] == null ? null : Number(params[5]);
        receipt.updatedAt = Number(params[6]);
      }
      return { changes: receipt ? 1 : 0, lastInsertRowId: 0 };
    }

    if (sql === 'DELETE FROM receipts WHERE transaction_id = ?') {
      const index = this.receipts.findIndex(
        (receipt) => receipt.transactionId === params[0],
      );
      if (index >= 0) {
        this.receipts.splice(index, 1);
      }
      return { changes: index >= 0 ? 1 : 0, lastInsertRowId: 0 };
    }

    if (sql === 'DELETE FROM transactions WHERE id = ?') {
      const index = this.transactions.findIndex(
        (transaction) => transaction.id === params[0],
      );
      if (index >= 0) {
        this.transactions.splice(index, 1);
      }
      return { changes: index >= 0 ? 1 : 0, lastInsertRowId: 0 };
    }

    throw new Error(`Unsupported runAsync SQL: ${sql}`);
  }

  private normalizeSql(source: string) {
    return source.replace(/\s+/g, ' ').trim();
  }
}

class TransactionListDatabase {
  readonly calls: Array<{
    parameters: readonly SQLiteBindValue[];
    sql: string;
  }> = [];
  readonly rows = Array.from({ length: 120 }, (_, index) => ({
    amount_minor: 120_000 - index,
    category_name: index % 2 === 0 ? 'Food & Drink' : 'Salary',
    counterparty: index % 2 === 0 ? `Merchant ${index}` : `Source ${index}`,
    currency_code: 'IDR',
    has_receipt: index % 3 === 0 ? 1 : 0,
    id: 120 - index,
    is_reimbursable: index % 4 === 0 ? 1 : 0,
    local_date: index < 60 ? '2026-08-15' : '2026-08-14',
    occurred_at: 2_000_000 - index,
    timezone_offset_minutes: 420,
    type: index % 2 === 0 ? ('expense' as const) : ('income' as const),
  }));

  asSQLiteDatabase() {
    return this as unknown as SQLiteDatabase;
  }

  async getAllAsync<T>(source: string, ...params: SQLiteBindValue[]) {
    this.calls.push({ parameters: params, sql: source });
    const limit = Number(params.at(-2));
    const offset = Number(params.at(-1));
    return this.rows.slice(offset, offset + limit) as T[];
  }
}

function validInput(
  overrides: Partial<SaveTransactionInput> = {},
): SaveTransactionInput {
  const occurredAt = Date.now() - 60_000;
  const timezoneOffsetMinutes = getTimezoneOffsetMinutes(occurredAt);
  return {
    amountMinor: 35_000,
    categoryId: 1,
    counterparty: '  Coffee   Shop ',
    currencyCode: 'IDR',
    isReimbursable: true,
    localDate: toLocalDate(occurredAt, timezoneOffsetMinutes),
    note: ' Client meeting ',
    occurredAt,
    paymentMethodId: 10,
    receipt: {
      mimeType: 'image/jpeg',
      sourceImageUri: 'file:///cache/receipt.jpg',
    },
    timezoneOffsetMinutes,
    type: 'expense',
    ...overrides,
  };
}

describe('manual transaction repository', () => {
  it('saves an expense atomically with a manual not_processed receipt', async () => {
    const database = new TransactionDatabase();
    const saved = await createTransaction(
      database.asSQLiteDatabase(),
      validInput(),
    );

    expect(saved).toMatchObject({
      amountMinor: 35_000,
      categoryName: 'Food & Drink',
      counterparty: 'Coffee Shop',
      isReimbursable: true,
      note: 'Client meeting',
      paymentMethodName: 'Cash',
      type: 'expense',
    });
    expect(saved.receipt).toMatchObject({
      mimeType: 'image/jpeg',
      ocrStatus: 'not_processed',
      storageKey: 'file:///cache/receipt.jpg',
    });
  });

  it('saves valid income and blocks expense-only flags', async () => {
    const database = new TransactionDatabase();
    const incomeInput = validInput({
      categoryId: 2,
      isReimbursable: false,
      receipt: null,
      type: 'income',
    });

    await expect(
      createTransaction(database.asSQLiteDatabase(), incomeInput),
    ).resolves.toMatchObject({ isReimbursable: false, type: 'income' });

    await expect(
      createTransaction(database.asSQLiteDatabase(), {
        ...incomeInput,
        isReimbursable: true,
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'Income cannot be reimbursable.',
    });
    await expect(
      createTransaction(database.asSQLiteDatabase(), {
        ...incomeInput,
        receipt: {
          mimeType: 'image/png',
          sourceImageUri: 'file:///cache/income.png',
        },
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'Income cannot have a receipt.',
    });
  });

  it('persists parsed OCR metadata with the receipt', async () => {
    const database = new TransactionDatabase();
    const saved = await createTransaction(
      database.asSQLiteDatabase(),
      validInput({
        receipt: {
          mimeType: 'image/png',
          ocrRawText: 'SHOP\nSUBTOTAL 30.000\nPPN 3.000\nTOTAL 33.000',
          ocrStatus: 'processed',
          sourceImageUri: 'file:///cache/ocr.png',
          subtotalMinor: 30_000,
          taxMinor: 3_000,
        },
      }),
    );

    expect(saved.receipt).toMatchObject({
      ocrRawText: 'SHOP\nSUBTOTAL 30.000\nPPN 3.000\nTOTAL 33.000',
      ocrStatus: 'processed',
      subtotalMinor: 30_000,
      taxMinor: 3_000,
    });
  });

  it('rejects invalid amount, category, and future date', async () => {
    const database = new TransactionDatabase();

    await expect(
      createTransaction(
        database.asSQLiteDatabase(),
        validInput({ amountMinor: 0 }),
      ),
    ).rejects.toMatchObject({ message: 'Enter an amount.' });
    await expect(
      createTransaction(
        database.asSQLiteDatabase(),
        validInput({ categoryId: 0 }),
      ),
    ).rejects.toMatchObject({ message: 'Choose a category.' });
    await expect(
      createTransaction(
        database.asSQLiteDatabase(),
        validInput({ categoryId: 2 }),
      ),
    ).rejects.toMatchObject({ message: 'Choose an expense category.' });

    const occurredAt = Date.now() + 60_000;
    const timezoneOffsetMinutes = getTimezoneOffsetMinutes(occurredAt);
    await expect(
      createTransaction(
        database.asSQLiteDatabase(),
        validInput({
          localDate: toLocalDate(occurredAt, timezoneOffsetMinutes),
          occurredAt,
          timezoneOffsetMinutes,
        }),
      ),
    ).rejects.toMatchObject({
      message: 'Transaction date cannot be in the future.',
    });
  });

  it('loads persisted data, edits it, removes its receipt, and deletes it', async () => {
    const database = new TransactionDatabase();
    const created = await createTransaction(
      database.asSQLiteDatabase(),
      validInput(),
    );

    await expect(
      getTransaction(database.asSQLiteDatabase(), created.id),
    ).resolves.toMatchObject({
      id: created.id,
      receipt: { ocrStatus: 'not_processed' },
    });

    const updated = await updateTransaction(
      database.asSQLiteDatabase(),
      created.id,
      validInput({ amountMinor: 42_000, isReimbursable: false, receipt: null }),
    );
    expect(updated).toMatchObject({
      amountMinor: 42_000,
      isReimbursable: false,
      receipt: null,
    });

    await deleteTransaction(database.asSQLiteDatabase(), created.id);
    await expect(
      getTransaction(database.asSQLiteDatabase(), created.id),
    ).resolves.toBeNull();
    expect(database.receipts).toHaveLength(0);
  });
});

describe('transaction history repository', () => {
  it('uses a single newest-first JOIN query and paginates 100+ rows', async () => {
    const database = new TransactionListDatabase();

    const first = await listTransactions(database.asSQLiteDatabase());
    const second = await listTransactions(database.asSQLiteDatabase(), {
      offset: first.nextOffset,
    });
    const third = await listTransactions(database.asSQLiteDatabase(), {
      offset: second.nextOffset,
    });

    expect(first.items).toHaveLength(TRANSACTION_PAGE_SIZE);
    expect(second.items).toHaveLength(TRANSACTION_PAGE_SIZE);
    expect(third.items).toHaveLength(20);
    expect(first.hasMore).toBe(true);
    expect(second.hasMore).toBe(true);
    expect(third.hasMore).toBe(false);
    expect([...first.items, ...second.items, ...third.items]).toHaveLength(120);
    expect(first.items[0]?.id).toBe(120);
    expect(third.items.at(-1)?.id).toBe(1);

    expect(database.calls).toHaveLength(3);
    expect(database.calls[0]?.sql).toContain(
      'ORDER BY t.occurred_at DESC, t.id DESC',
    );
    expect(database.calls[0]?.sql).toContain(
      'JOIN categories c ON c.id = t.category_id',
    );
    expect(database.calls[0]?.sql).toContain(
      'LEFT JOIN receipts r ON r.transaction_id = t.id',
    );
    expect(database.calls[0]?.parameters).toEqual([51, 0]);
    expect(database.calls[1]?.parameters).toEqual([51, 50]);
    expect(database.calls[2]?.parameters).toEqual([51, 100]);
  });

  it('searches merchant, note, and category and applies every MVP filter', async () => {
    const database = new TransactionListDatabase();

    await listTransactions(database.asSQLiteDatabase(), {
      filters: {
        categoryId: 2,
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
        hasReceipt: true,
        isReimbursable: true,
        paymentMethodId: 10,
        type: 'expense',
      },
      search: '  Coffee  ',
    });

    const call = database.calls[0];
    expect(call?.sql).toContain('t.counterparty LIKE ?');
    expect(call?.sql).toContain('t.note LIKE ?');
    expect(call?.sql).toContain('c.name LIKE ?');
    expect(call?.sql).toContain('t.type = ?');
    expect(call?.sql).toContain('t.category_id = ?');
    expect(call?.sql).toContain('t.local_date >= ?');
    expect(call?.sql).toContain('t.local_date <= ?');
    expect(call?.sql).toContain('t.payment_method_id = ?');
    expect(call?.sql).toContain('t.is_reimbursable = ?');
    expect(call?.sql).toContain('r.id IS NOT NULL');
    expect(call?.parameters).toEqual([
      '%Coffee%',
      '%Coffee%',
      '%Coffee%',
      'expense',
      2,
      '2026-08-01',
      '2026-08-31',
      10,
      1,
      51,
      0,
    ]);
  });

  it('rejects invalid page and date-range filters', async () => {
    const database = new TransactionListDatabase();

    await expect(
      listTransactions(database.asSQLiteDatabase(), { offset: -1 }),
    ).rejects.toMatchObject({ message: 'Page offset is invalid.' });
    await expect(
      listTransactions(database.asSQLiteDatabase(), {
        filters: { dateFrom: '2026-09-01', dateTo: '2026-08-01' },
      }),
    ).rejects.toMatchObject({
      message: 'Start date must be on or before end date.',
    });
  });
});
