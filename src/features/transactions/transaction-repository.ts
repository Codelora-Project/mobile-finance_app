import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import {
  supportedReceiptMimeTypes,
  type ReceiptMimeType,
} from '@/features/receipts/receipt-types';
import { isLocalDate, toLocalDate } from '@/lib/dates';
import { createCodedError } from '@/lib/errors';
import { assertMoney } from '@/lib/money';
import { normalizeOptionalText } from '@/lib/strings';

export type TransactionType = 'expense' | 'income';

export type TransactionReceipt = Readonly<{
  id: number;
  storageKey: string;
  mimeType: ReceiptMimeType;
  ocrStatus: 'not_processed' | 'processed' | 'partial' | 'failed';
}>;

export type Transaction = Readonly<{
  id: number;
  type: TransactionType;
  amountMinor: number;
  currencyCode: string;
  categoryId: number;
  categoryName: string;
  paymentMethodId: number | null;
  paymentMethodName: string | null;
  counterparty: string | null;
  note: string | null;
  occurredAt: number;
  timezoneOffsetMinutes: number;
  localDate: string;
  isReimbursable: boolean;
  receipt: TransactionReceipt | null;
  createdAt: number;
  updatedAt: number;
}>;

export type SaveTransactionInput = Readonly<{
  type: TransactionType;
  amountMinor: number;
  currencyCode: string;
  categoryId: number;
  paymentMethodId: number | null;
  counterparty: string | null;
  note: string | null;
  occurredAt: number;
  timezoneOffsetMinutes: number;
  localDate: string;
  isReimbursable: boolean;
  receipt: Readonly<{
    sourceImageUri: string;
    mimeType: ReceiptMimeType;
  }> | null;
}>;

export const TRANSACTION_PAGE_SIZE = 50;

export type TransactionFilters = Readonly<{
  type?: TransactionType;
  categoryId?: number;
  dateFrom?: string;
  dateTo?: string;
  paymentMethodId?: number;
  isReimbursable?: boolean;
  hasReceipt?: boolean;
}>;

export type TransactionListItem = Readonly<{
  id: number;
  type: TransactionType;
  amountMinor: number;
  currencyCode: string;
  categoryName: string;
  counterparty: string | null;
  occurredAt: number;
  timezoneOffsetMinutes: number;
  localDate: string;
  isReimbursable: boolean;
  hasReceipt: boolean;
}>;

export type ListTransactionsInput = Readonly<{
  search?: string;
  filters?: TransactionFilters;
  limit?: number;
  offset?: number;
}>;

export type TransactionPage = Readonly<{
  items: readonly TransactionListItem[];
  hasMore: boolean;
  nextOffset: number;
}>;

type TransactionRow = {
  id: number;
  type: TransactionType;
  amount_minor: number;
  currency_code: string;
  category_id: number;
  category_name: string;
  payment_method_id: number | null;
  payment_method_name: string | null;
  counterparty: string | null;
  note: string | null;
  occurred_at: number;
  timezone_offset_minutes: number;
  local_date: string;
  is_reimbursable: number;
  receipt_id: number | null;
  receipt_storage_key: string | null;
  receipt_mime_type: ReceiptMimeType | null;
  receipt_ocr_status: TransactionReceipt['ocrStatus'] | null;
  created_at: number;
  updated_at: number;
};

type TransactionListRow = {
  id: number;
  type: TransactionType;
  amount_minor: number;
  currency_code: string;
  category_name: string;
  counterparty: string | null;
  occurred_at: number;
  timezone_offset_minutes: number;
  local_date: string;
  is_reimbursable: number;
  has_receipt: number;
};

const TRANSACTION_SELECT = `
  SELECT
    t.id,
    t.type,
    t.amount_minor,
    t.currency_code,
    t.category_id,
    c.name AS category_name,
    t.payment_method_id,
    pm.name AS payment_method_name,
    t.counterparty,
    t.note,
    t.occurred_at,
    t.timezone_offset_minutes,
    t.local_date,
    t.is_reimbursable,
    r.id AS receipt_id,
    r.storage_key AS receipt_storage_key,
    r.mime_type AS receipt_mime_type,
    r.ocr_status AS receipt_ocr_status,
    t.created_at,
    t.updated_at
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
  LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
  LEFT JOIN receipts r ON r.transaction_id = t.id
`;

const TRANSACTION_LIST_SELECT = `
  SELECT
    t.id,
    t.type,
    t.amount_minor,
    t.currency_code,
    c.name AS category_name,
    t.counterparty,
    t.occurred_at,
    t.timezone_offset_minutes,
    t.local_date,
    t.is_reimbursable,
    CASE WHEN r.id IS NULL THEN 0 ELSE 1 END AS has_receipt
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
  LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
  LEFT JOIN receipts r ON r.transaction_id = t.id
`;

function mapTransaction(row: TransactionRow): Transaction {
  const hasReceipt =
    row.receipt_id !== null &&
    row.receipt_storage_key !== null &&
    row.receipt_mime_type !== null &&
    row.receipt_ocr_status !== null;

  return {
    amountMinor: row.amount_minor,
    categoryId: row.category_id,
    categoryName: row.category_name,
    counterparty: row.counterparty,
    createdAt: row.created_at,
    currencyCode: row.currency_code,
    id: row.id,
    isReimbursable: row.is_reimbursable === 1,
    localDate: row.local_date,
    note: row.note,
    occurredAt: row.occurred_at,
    paymentMethodId: row.payment_method_id,
    paymentMethodName: row.payment_method_name,
    receipt: hasReceipt
      ? {
          id: row.receipt_id as number,
          mimeType: row.receipt_mime_type as ReceiptMimeType,
          ocrStatus: row.receipt_ocr_status as TransactionReceipt['ocrStatus'],
          storageKey: row.receipt_storage_key as string,
        }
      : null,
    timezoneOffsetMinutes: row.timezone_offset_minutes,
    type: row.type,
    updatedAt: row.updated_at,
  };
}

function mapTransactionListItem(row: TransactionListRow): TransactionListItem {
  return {
    amountMinor: row.amount_minor,
    categoryName: row.category_name,
    counterparty: row.counterparty,
    currencyCode: row.currency_code,
    hasReceipt: row.has_receipt === 1,
    id: row.id,
    isReimbursable: row.is_reimbursable === 1,
    localDate: row.local_date,
    occurredAt: row.occurred_at,
    timezoneOffsetMinutes: row.timezone_offset_minutes,
    type: row.type,
  };
}

function requirePositiveId(value: number | undefined, label: string) {
  if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
    throw createCodedError('VALIDATION_FAILED', `Choose a valid ${label}.`);
  }
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function buildTransactionListQuery(input: ListTransactionsInput) {
  const filters = input.filters ?? {};
  const limit = input.limit ?? TRANSACTION_PAGE_SIZE;
  const offset = input.offset ?? 0;
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 100) {
    throw createCodedError('VALIDATION_FAILED', 'Page size is invalid.');
  }
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw createCodedError('VALIDATION_FAILED', 'Page offset is invalid.');
  }
  if (
    filters.type !== undefined &&
    filters.type !== 'expense' &&
    filters.type !== 'income'
  ) {
    throw createCodedError('VALIDATION_FAILED', 'Transaction type is invalid.');
  }
  requirePositiveId(filters.categoryId, 'category');
  requirePositiveId(filters.paymentMethodId, 'payment method');
  if (filters.dateFrom !== undefined && !isLocalDate(filters.dateFrom)) {
    throw createCodedError('VALIDATION_FAILED', 'Start date is invalid.');
  }
  if (filters.dateTo !== undefined && !isLocalDate(filters.dateTo)) {
    throw createCodedError('VALIDATION_FAILED', 'End date is invalid.');
  }
  if (
    filters.dateFrom !== undefined &&
    filters.dateTo !== undefined &&
    filters.dateFrom > filters.dateTo
  ) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Start date must be on or before end date.',
    );
  }

  const where: string[] = [];
  const parameters: SQLiteBindValue[] = [];
  const search = input.search?.normalize('NFC').trim() ?? '';
  if (search) {
    const pattern = `%${escapeLikePattern(search)}%`;
    where.push(`(
      t.counterparty LIKE ? ESCAPE '\\' COLLATE NOCASE OR
      t.note LIKE ? ESCAPE '\\' COLLATE NOCASE OR
      c.name LIKE ? ESCAPE '\\' COLLATE NOCASE
    )`);
    parameters.push(pattern, pattern, pattern);
  }
  if (filters.type !== undefined) {
    where.push('t.type = ?');
    parameters.push(filters.type);
  }
  if (filters.categoryId !== undefined) {
    where.push('t.category_id = ?');
    parameters.push(filters.categoryId);
  }
  if (filters.dateFrom !== undefined) {
    where.push('t.local_date >= ?');
    parameters.push(filters.dateFrom);
  }
  if (filters.dateTo !== undefined) {
    where.push('t.local_date <= ?');
    parameters.push(filters.dateTo);
  }
  if (filters.paymentMethodId !== undefined) {
    where.push('t.payment_method_id = ?');
    parameters.push(filters.paymentMethodId);
  }
  if (filters.isReimbursable !== undefined) {
    where.push('t.is_reimbursable = ?');
    parameters.push(filters.isReimbursable ? 1 : 0);
  }
  if (filters.hasReceipt !== undefined) {
    where.push(filters.hasReceipt ? 'r.id IS NOT NULL' : 'r.id IS NULL');
  }

  return {
    limit,
    offset,
    parameters,
    sql: `${TRANSACTION_LIST_SELECT}
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY t.occurred_at DESC, t.id DESC
      LIMIT ? OFFSET ?`,
  };
}

function normalizeNote(value: string | null) {
  const note = value?.normalize('NFC').trim() ?? '';
  if (Array.from(note).length > 500) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Note must be 500 characters or fewer.',
    );
  }
  return note.length > 0 ? note : null;
}

function normalizeReceipt(input: SaveTransactionInput['receipt']) {
  if (!input) {
    return null;
  }

  const sourceImageUri = input.sourceImageUri.trim();
  if (!sourceImageUri) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'The receipt image is unavailable.',
    );
  }
  if (
    !supportedReceiptMimeTypes.some((mimeType) => mimeType === input.mimeType)
  ) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Choose a JPEG, PNG, or WEBP receipt image.',
    );
  }
  return { mimeType: input.mimeType, sourceImageUri };
}

function normalizeInput(input: SaveTransactionInput, now: number) {
  if (input.type !== 'expense' && input.type !== 'income') {
    throw createCodedError('VALIDATION_FAILED', 'Choose a transaction type.');
  }
  try {
    assertMoney(input.amountMinor);
  } catch {
    throw createCodedError('VALIDATION_FAILED', 'Enter an amount.');
  }
  if (!Number.isSafeInteger(input.categoryId) || input.categoryId <= 0) {
    throw createCodedError('VALIDATION_FAILED', 'Choose a category.');
  }
  if (
    input.paymentMethodId !== null &&
    (!Number.isSafeInteger(input.paymentMethodId) || input.paymentMethodId <= 0)
  ) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Choose a valid payment method.',
    );
  }

  const currencyCode = input.currencyCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw createCodedError('VALIDATION_FAILED', 'Currency is invalid.');
  }
  if (
    !Number.isSafeInteger(input.occurredAt) ||
    !Number.isInteger(input.timezoneOffsetMinutes) ||
    !isLocalDate(input.localDate) ||
    toLocalDate(input.occurredAt, input.timezoneOffsetMinutes) !==
      input.localDate
  ) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Enter a valid transaction date and time.',
    );
  }
  if (input.occurredAt > now) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Transaction date cannot be in the future.',
    );
  }

  const receipt = normalizeReceipt(input.receipt);
  if (input.type === 'income' && input.isReimbursable) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Income cannot be reimbursable.',
    );
  }
  if (input.type === 'income' && receipt) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Income cannot have a receipt.',
    );
  }

  return {
    ...input,
    counterparty: normalizeOptionalText(input.counterparty ?? ''),
    currencyCode,
    isReimbursable: input.type === 'expense' && input.isReimbursable,
    note: normalizeNote(input.note),
    receipt,
  };
}

async function validateReferences(
  database: SQLiteDatabase,
  input: ReturnType<typeof normalizeInput>,
) {
  const category = await database.getFirstAsync<{
    id: number;
    type: TransactionType;
  }>('SELECT id, type FROM categories WHERE id = ?', input.categoryId);
  if (!category || category.type !== input.type) {
    throw createCodedError(
      'VALIDATION_FAILED',
      `Choose an ${input.type} category.`,
    );
  }

  if (input.paymentMethodId !== null) {
    const paymentMethod = await database.getFirstAsync<{ id: number }>(
      'SELECT id FROM payment_methods WHERE id = ?',
      input.paymentMethodId,
    );
    if (!paymentMethod) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Payment method no longer exists.',
      );
    }
  }
}

async function writeReceipt(
  database: SQLiteDatabase,
  transactionId: number,
  receipt: ReturnType<typeof normalizeReceipt>,
  timestamp: number,
) {
  if (!receipt) {
    await database.runAsync(
      'DELETE FROM receipts WHERE transaction_id = ?',
      transactionId,
    );
    return;
  }

  const existingReceipt = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM receipts WHERE transaction_id = ?',
    transactionId,
  );
  if (existingReceipt) {
    await database.runAsync(
      `UPDATE receipts
       SET storage_key = ?, mime_type = ?, ocr_status = 'not_processed',
           ocr_raw_text = NULL, subtotal_minor = NULL, tax_minor = NULL,
           updated_at = ?
       WHERE transaction_id = ?`,
      receipt.sourceImageUri,
      receipt.mimeType,
      timestamp,
      transactionId,
    );
    return;
  }

  await database.runAsync(
    `INSERT INTO receipts (
      transaction_id,
      storage_key,
      mime_type,
      ocr_status,
      ocr_raw_text,
      subtotal_minor,
      tax_minor,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, 'not_processed', NULL, NULL, NULL, ?, ?)`,
    transactionId,
    receipt.sourceImageUri,
    receipt.mimeType,
    timestamp,
    timestamp,
  );
}

export async function getTransaction(database: SQLiteDatabase, id: number) {
  const row = await database.getFirstAsync<TransactionRow>(
    `${TRANSACTION_SELECT} WHERE t.id = ?`,
    id,
  );
  return row ? mapTransaction(row) : null;
}

export async function listTransactions(
  database: SQLiteDatabase,
  input: ListTransactionsInput = {},
): Promise<TransactionPage> {
  const query = buildTransactionListQuery(input);
  const rows = await database.getAllAsync<TransactionListRow>(
    query.sql,
    ...query.parameters,
    query.limit + 1,
    query.offset,
  );
  const hasMore = rows.length > query.limit;
  const items = rows.slice(0, query.limit).map(mapTransactionListItem);
  return {
    hasMore,
    items,
    nextOffset: query.offset + items.length,
  };
}

export async function createTransaction(
  database: SQLiteDatabase,
  input: SaveTransactionInput,
  now = Date.now(),
) {
  const normalized = normalizeInput(input, now);
  let createdId: number | null = null;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await validateReferences(transaction, normalized);
    const timestamp = Date.now();
    const result = await transaction.runAsync(
      `INSERT INTO transactions (
        type,
        amount_minor,
        currency_code,
        category_id,
        payment_method_id,
        counterparty,
        note,
        occurred_at,
        timezone_offset_minutes,
        local_date,
        is_reimbursable,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      normalized.type,
      normalized.amountMinor,
      normalized.currencyCode,
      normalized.categoryId,
      normalized.paymentMethodId,
      normalized.counterparty,
      normalized.note,
      normalized.occurredAt,
      normalized.timezoneOffsetMinutes,
      normalized.localDate,
      normalized.isReimbursable ? 1 : 0,
      timestamp,
      timestamp,
    );
    createdId = result.lastInsertRowId;
    await writeReceipt(
      transaction,
      result.lastInsertRowId,
      normalized.receipt,
      timestamp,
    );
  });

  const saved =
    createdId === null ? null : await getTransaction(database, createdId);
  if (!saved) {
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      'The transaction could not be loaded after saving.',
    );
  }
  return saved;
}

export async function updateTransaction(
  database: SQLiteDatabase,
  id: number,
  input: SaveTransactionInput,
  now = Date.now(),
) {
  const normalized = normalizeInput(input, now);

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const existing = await transaction.getFirstAsync<{ id: number }>(
      'SELECT id FROM transactions WHERE id = ?',
      id,
    );
    if (!existing) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Transaction no longer exists.',
      );
    }
    await validateReferences(transaction, normalized);
    const timestamp = Date.now();
    await transaction.runAsync(
      `UPDATE transactions
       SET type = ?, amount_minor = ?, currency_code = ?, category_id = ?,
           payment_method_id = ?, counterparty = ?, note = ?, occurred_at = ?,
           timezone_offset_minutes = ?, local_date = ?, is_reimbursable = ?,
           updated_at = ?
       WHERE id = ?`,
      normalized.type,
      normalized.amountMinor,
      normalized.currencyCode,
      normalized.categoryId,
      normalized.paymentMethodId,
      normalized.counterparty,
      normalized.note,
      normalized.occurredAt,
      normalized.timezoneOffsetMinutes,
      normalized.localDate,
      normalized.isReimbursable ? 1 : 0,
      timestamp,
      id,
    );
    await writeReceipt(transaction, id, normalized.receipt, timestamp);
  });

  const saved = await getTransaction(database, id);
  if (!saved) {
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      'The transaction could not be loaded after saving.',
    );
  }
  return saved;
}

export async function deleteTransaction(database: SQLiteDatabase, id: number) {
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const existing = await transaction.getFirstAsync<{ id: number }>(
      'SELECT id FROM transactions WHERE id = ?',
      id,
    );
    if (!existing) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Transaction no longer exists.',
      );
    }

    // Foreign-key enforcement is connection-scoped in SQLite. Delete the
    // dependent row explicitly so an exclusive transaction connection cannot
    // leave an orphan if its PRAGMA foreign_keys setting differs.
    await transaction.runAsync(
      'DELETE FROM receipts WHERE transaction_id = ?',
      id,
    );
    const result = await transaction.runAsync(
      'DELETE FROM transactions WHERE id = ?',
      id,
    );
    if (result.changes === 0) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Transaction no longer exists.',
      );
    }
  });
}
