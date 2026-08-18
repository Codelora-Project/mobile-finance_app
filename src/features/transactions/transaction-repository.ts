import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import {
  recalculateAutoClaimPeriod,
  type ClaimStatus,
} from '@/features/claims/claim-repository';
import {
  supportedReceiptMimeTypes,
  type ReceiptMimeType,
} from '@/features/receipts/receipt-types';
import {
  copyReceiptToStorage,
  isReceiptStorageKey,
  receiptFileExists,
  removeReceiptFile,
} from '@/features/receipts/receipt-storage';
import { isLocalDate, toLocalDate } from '@/lib/dates';
import { createCodedError } from '@/lib/errors';
import { assertMoney } from '@/lib/money';
import { normalizeOptionalText } from '@/lib/strings';

export type TransactionType = 'expense' | 'income' | 'transfer';

export type TransactionClaimMembership = Readonly<{
  claimId: number;
  claimTitle: string;
  claimStatus: ClaimStatus;
}>;

export type TransactionReceipt = Readonly<{
  id: number;
  storageKey: string;
  mimeType: ReceiptMimeType;
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
  transferToPaymentMethodId: number | null;
  transferToPaymentMethodName: string | null;
  transferFeeMinor: number;
  transferFeeCategoryId: number | null;
  transferFeeCategoryName: string | null;
  transferFeeNote: string | null;
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
  transferToPaymentMethodId?: number | null;
  transferFeeMinor?: number;
  transferFeeCategoryId?: number | null;
  transferFeeNote?: string | null;
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
  minAmountMinor?: number;
  maxAmountMinor?: number;
  isNonCash?: boolean;
}>;

export type TransactionListItem = Readonly<{
  id: number;
  type: TransactionType;
  amountMinor: number;
  currencyCode: string;
  categoryName: string;
  paymentMethodName?: string | null;
  transferToPaymentMethodName?: string | null;
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
  transfer_to_payment_method_id: number | null;
  transfer_to_payment_method_name: string | null;
  transfer_fee_minor: number | null;
  transfer_fee_category_id: number | null;
  transfer_fee_category_name: string | null;
  transfer_fee_note: string | null;
  counterparty: string | null;
  note: string | null;
  occurred_at: number;
  timezone_offset_minutes: number;
  local_date: string;
  is_reimbursable: number;
  receipt_id: number | null;
  receipt_storage_key: string | null;
  receipt_mime_type: ReceiptMimeType | null;
  receipt_ocr_status: string | null;
  receipt_ocr_raw_text: string | null;
  receipt_subtotal_minor: number | null;
  receipt_tax_minor: number | null;
  created_at: number;
  updated_at: number;
};

type TransactionListRow = {
  id: number;
  type: TransactionType;
  amount_minor: number;
  currency_code: string;
  category_name: string;
  payment_method_name: string | null;
  transfer_to_payment_method_name: string | null;
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
    t.transfer_to_payment_method_id,
    tpm.name AS transfer_to_payment_method_name,
    t.transfer_fee_minor,
    t.transfer_fee_category_id,
    tfc.name AS transfer_fee_category_name,
    t.transfer_fee_note,
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
    r.ocr_raw_text AS receipt_ocr_raw_text,
    r.subtotal_minor AS receipt_subtotal_minor,
    r.tax_minor AS receipt_tax_minor,
    t.created_at,
    t.updated_at
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
  LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
  LEFT JOIN payment_methods tpm ON tpm.id = t.transfer_to_payment_method_id
  LEFT JOIN categories tfc ON tfc.id = t.transfer_fee_category_id
  LEFT JOIN receipts r ON r.transaction_id = t.id
`;

const TRANSACTION_LIST_SELECT = `
  SELECT
    t.id,
    t.type,
    t.amount_minor,
    t.currency_code,
    c.name AS category_name,
    pm.name AS payment_method_name,
    tpm.name AS transfer_to_payment_method_name,
    t.counterparty,
    t.occurred_at,
    t.timezone_offset_minutes,
    t.local_date,
    t.is_reimbursable,
    CASE WHEN r.id IS NULL THEN 0 ELSE 1 END AS has_receipt
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
  LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
  LEFT JOIN payment_methods tpm ON tpm.id = t.transfer_to_payment_method_id
  LEFT JOIN receipts r ON r.transaction_id = t.id
`;

function mapTransaction(row: TransactionRow): Transaction {
  const hasReceipt =
    row.receipt_id !== null &&
    row.receipt_storage_key !== null &&
    row.receipt_mime_type !== null;

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
    transferToPaymentMethodId: row.transfer_to_payment_method_id,
    transferToPaymentMethodName: row.transfer_to_payment_method_name,
    transferFeeMinor: row.transfer_fee_minor ?? 0,
    transferFeeCategoryId: row.transfer_fee_category_id,
    transferFeeCategoryName: row.transfer_fee_category_name,
    transferFeeNote: row.transfer_fee_note,
    receipt: hasReceipt
      ? {
          id: row.receipt_id as number,
          mimeType: row.receipt_mime_type as ReceiptMimeType,
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
    paymentMethodName: row.payment_method_name,
    transferToPaymentMethodName: row.transfer_to_payment_method_name,
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
  if (filters.minAmountMinor !== undefined) {
    if (!Number.isSafeInteger(filters.minAmountMinor) || filters.minAmountMinor < 0) {
      throw createCodedError('VALIDATION_FAILED', 'Minimum amount is invalid.');
    }
    where.push('t.amount_minor >= ?');
    parameters.push(filters.minAmountMinor);
  }
  if (filters.maxAmountMinor !== undefined) {
    if (!Number.isSafeInteger(filters.maxAmountMinor) || filters.maxAmountMinor < 0) {
      throw createCodedError('VALIDATION_FAILED', 'Maximum amount is invalid.');
    }
    where.push('t.amount_minor <= ?');
    parameters.push(filters.maxAmountMinor);
  }
  if (filters.isNonCash !== undefined) {
    if (filters.isNonCash) {
      where.push("(pm.system_key != 'cash' AND pm.name != 'Cash' AND pm.name != 'Tunai' AND pm.id IS NOT NULL)");
    } else {
      where.push("(pm.system_key = 'cash' OR pm.name = 'Cash' OR pm.name = 'Tunai')");
    }
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
  return {
    mimeType: input.mimeType,
    sourceImageUri,
  };
}

function normalizeInput(input: SaveTransactionInput, now: number) {
  if (
    input.type !== 'expense' &&
    input.type !== 'income' &&
    input.type !== 'transfer'
  ) {
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
    throw createCodedError('VALIDATION_FAILED', 'Choose a payment method.');
  }
  if (input.type === 'transfer') {
    if (
      !input.transferToPaymentMethodId ||
      !Number.isSafeInteger(input.transferToPaymentMethodId) ||
      input.transferToPaymentMethodId <= 0
    ) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Choose a destination wallet.',
      );
    }
    if (input.transferToPaymentMethodId === input.paymentMethodId) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Source and destination wallet cannot be the same.',
      );
    }
  }
  if (!Number.isSafeInteger(input.occurredAt)) {
    throw createCodedError('VALIDATION_FAILED', 'Enter a valid date.');
  }
  if (input.occurredAt > now) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Transaction date cannot be in the future.',
    );
  }
  if (!Number.isInteger(input.timezoneOffsetMinutes)) {
    throw createCodedError('VALIDATION_FAILED', 'Enter a valid date.');
  }
  const localDate = toLocalDate(input.occurredAt, input.timezoneOffsetMinutes);
  if (input.localDate !== localDate) {
    throw createCodedError('VALIDATION_FAILED', 'Enter a valid date.');
  }
  const currencyCode = input.currencyCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Currency code must be a three-letter ISO 4217 code.',
    );
  }
  const counterparty = normalizeOptionalText(input.counterparty ?? '');
  if (counterparty && Array.from(counterparty).length > 100) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Merchant or payer must be 100 characters or fewer.',
    );
  }
  const note = normalizeOptionalText(input.note ?? '');
  if (note && Array.from(note).length > 500) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Note must be 500 characters or fewer.',
    );
  }
  const receipt = normalizeReceipt(input.receipt);
  if (input.type === 'income' && input.isReimbursable) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Income cannot be reimbursable.',
    );
  }
  if (input.type === 'transfer' && input.isReimbursable) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Transfers cannot be reimbursable.',
    );
  }
  if (input.type !== 'expense' && receipt) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Income cannot have a receipt.',
    );
  }
  return {
    amountMinor: input.amountMinor,
    categoryId: input.categoryId,
    counterparty,
    currencyCode,
    isReimbursable: input.type === 'expense' && input.isReimbursable,
    localDate,
    note,
    occurredAt: input.occurredAt,
    paymentMethodId: input.paymentMethodId,
    receipt: input.type === 'expense' ? receipt : null,
    timezoneOffsetMinutes: input.timezoneOffsetMinutes,
    transferFeeCategoryId:
      input.type === 'transfer' ? input.transferFeeCategoryId ?? null : null,
    transferFeeMinor:
      input.type === 'transfer'
        ? Math.max(0, Math.round(input.transferFeeMinor ?? 0))
        : 0,
    transferFeeNote:
      input.type === 'transfer'
        ? normalizeOptionalText(input.transferFeeNote ?? '')
        : null,
    transferToPaymentMethodId:
      input.type === 'transfer'
        ? input.transferToPaymentMethodId ?? null
        : null,
    type: input.type,
  };
}

async function validateReferences(
  database: SQLiteDatabase,
  input: ReturnType<typeof normalizeInput>,
) {
  if (input.type !== 'transfer') {
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

  if (input.type === 'transfer' && input.transferToPaymentMethodId !== null) {
    const targetWallet = await database.getFirstAsync<{ id: number }>(
      'SELECT id FROM payment_methods WHERE id = ?',
      input.transferToPaymentMethodId,
    );
    if (!targetWallet) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Destination wallet no longer exists.',
      );
    }
  }
}

type PreparedReceipt = {
  storageKey: string;
  mimeType: ReceiptMimeType;
} | null;

async function writeReceipt(
  database: SQLiteDatabase,
  transactionId: number,
  receipt: PreparedReceipt,
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
       SET storage_key = ?, mime_type = ?, updated_at = ?
       WHERE transaction_id = ?`,
      receipt.storageKey,
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
      created_at,
      updated_at
    ) VALUES (?, ?, ?, 'not_processed', ?, ?)`,
    transactionId,
    receipt.storageKey,
    receipt.mimeType,
    timestamp,
    timestamp,
  );
}

async function prepareReceipt(
  receipt: ReturnType<typeof normalizeReceipt>,
): Promise<{ copiedStorageKey: string | null; receipt: PreparedReceipt }> {
  if (!receipt) {
    return { copiedStorageKey: null, receipt: null };
  }

  if (isReceiptStorageKey(receipt.sourceImageUri)) {
    if (!receiptFileExists(receipt.sourceImageUri)) {
      throw createCodedError(
        'FILE_OPERATION_FAILED',
        'The stored receipt image is unavailable.',
      );
    }
    const { sourceImageUri: storageKey, ...metadata } = receipt;
    return {
      copiedStorageKey: null,
      receipt: { ...metadata, storageKey },
    };
  }

  const storageKey = await copyReceiptToStorage(
    receipt.sourceImageUri,
    receipt.mimeType,
  );
  const { sourceImageUri: _sourceImageUri, ...metadata } = receipt;
  return {
    copiedStorageKey: storageKey,
    receipt: { ...metadata, storageKey },
  };
}

function cleanupReceiptFile(storageKey: string | null) {
  if (!storageKey) {
    return;
  }
  try {
    removeReceiptFile(storageKey);
  } catch (error) {
    if (__DEV__) {
      console.warn('Receipt file cleanup failed.', error);
    }
  }
}

export async function getTransaction(database: SQLiteDatabase, id: number) {
  const row = await database.getFirstAsync<TransactionRow>(
    `${TRANSACTION_SELECT} WHERE t.id = ?`,
    id,
  );
  return row ? mapTransaction(row) : null;
}

export async function getTransactionClaimMembership(
  database: SQLiteDatabase,
  transactionId: number,
) {
  return database
    .getFirstAsync<{
      claim_id: number;
      claim_title: string;
      claim_status: ClaimStatus;
    }>(
      `SELECT
       c.id AS claim_id,
       c.title AS claim_title,
       c.status AS claim_status
     FROM claim_items ci
     JOIN claims c ON c.id = ci.claim_id
     WHERE ci.transaction_id = ?`,
      transactionId,
    )
    .then((row): TransactionClaimMembership | null =>
      row
        ? {
            claimId: row.claim_id,
            claimStatus: row.claim_status,
            claimTitle: row.claim_title,
          }
        : null,
    );
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
  await validateReferences(database, normalized);
  const prepared = await prepareReceipt(normalized.receipt);
  let createdId: number | null = null;

  try {
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
        transfer_to_payment_method_id,
        transfer_fee_minor,
        transfer_fee_category_id,
        transfer_fee_note,
        counterparty,
        note,
        occurred_at,
        timezone_offset_minutes,
        local_date,
        is_reimbursable,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        normalized.type,
        normalized.amountMinor,
        normalized.currencyCode,
        normalized.categoryId,
        normalized.paymentMethodId,
        normalized.transferToPaymentMethodId,
        normalized.transferFeeMinor,
        normalized.transferFeeCategoryId,
        normalized.transferFeeNote,
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
        prepared.receipt,
        timestamp,
      );
    });
  } catch (error) {
    cleanupReceiptFile(prepared.copiedStorageKey);
    throw error;
  }

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
  const existing = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM transactions WHERE id = ?',
    id,
  );
  if (!existing) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Transaction no longer exists.',
    );
  }
  const membership = await getTransactionClaimMembership(database, id);
  if (membership && membership.claimStatus !== 'draft') {
    throw createCodedError(
      'CLAIM_LOCKED',
      'Move the claim back to Draft before editing this transaction.',
    );
  }
  if (
    membership &&
    (normalized.type !== 'expense' || !normalized.isReimbursable)
  ) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Remove this transaction from its Draft claim before making it ineligible.',
    );
  }
  await validateReferences(database, normalized);
  const oldReceipt = await database.getFirstAsync<{ storage_key: string }>(
    'SELECT storage_key FROM receipts WHERE transaction_id = ?',
    id,
  );
  const prepared = await prepareReceipt(normalized.receipt);

  try {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      const transactionStillExists = await transaction.getFirstAsync<{
        id: number;
      }>('SELECT id FROM transactions WHERE id = ?', id);
      if (!transactionStillExists) {
        throw createCodedError(
          'VALIDATION_FAILED',
          'Transaction no longer exists.',
        );
      }
      const currentMembership = await getTransactionClaimMembership(
        transaction,
        id,
      );
      if (
        currentMembership?.claimId !== membership?.claimId ||
        currentMembership?.claimStatus !== membership?.claimStatus
      ) {
        throw createCodedError(
          'CLAIM_LOCKED',
          'Claim status changed. Reload before editing this transaction.',
        );
      }
      if (currentMembership) {
        const differentCurrency = await transaction.getFirstAsync<{
          id: number;
        }>(
          `SELECT t.id
           FROM claim_items ci
           JOIN transactions t ON t.id = ci.transaction_id
           WHERE ci.claim_id = ? AND t.id <> ? AND t.currency_code <> ?
           LIMIT 1`,
          currentMembership.claimId,
          id,
          normalized.currencyCode,
        );
        if (differentCurrency) {
          throw createCodedError(
            'CLAIM_CURRENCY_MISMATCH',
            'This expense uses a different currency.',
          );
        }
      }
      await validateReferences(transaction, normalized);
      const timestamp = Date.now();
      await transaction.runAsync(
        `UPDATE transactions
       SET type = ?, amount_minor = ?, currency_code = ?, category_id = ?,
           payment_method_id = ?, transfer_to_payment_method_id = ?,
           transfer_fee_minor = ?, transfer_fee_category_id = ?, transfer_fee_note = ?,
           counterparty = ?, note = ?, occurred_at = ?,
           timezone_offset_minutes = ?, local_date = ?, is_reimbursable = ?,
           updated_at = ?
       WHERE id = ?`,
        normalized.type,
        normalized.amountMinor,
        normalized.currencyCode,
        normalized.categoryId,
        normalized.paymentMethodId,
        normalized.transferToPaymentMethodId,
        normalized.transferFeeMinor,
        normalized.transferFeeCategoryId,
        normalized.transferFeeNote,
        normalized.counterparty,
        normalized.note,
        normalized.occurredAt,
        normalized.timezoneOffsetMinutes,
        normalized.localDate,
        normalized.isReimbursable ? 1 : 0,
        timestamp,
        id,
      );
      await writeReceipt(transaction, id, prepared.receipt, timestamp);
      if (currentMembership) {
        await recalculateAutoClaimPeriod(
          transaction,
          currentMembership.claimId,
          timestamp,
        );
      }
    });
  } catch (error) {
    cleanupReceiptFile(prepared.copiedStorageKey);
    throw error;
  }

  if (oldReceipt && oldReceipt.storage_key !== prepared.receipt?.storageKey) {
    cleanupReceiptFile(oldReceipt.storage_key);
  }

  const saved = await getTransaction(database, id);
  if (!saved) {
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      'The transaction could not be loaded after updating.',
    );
  }
  return saved;
}

export async function deleteTransaction(database: SQLiteDatabase, id: number) {
  const receipt = await database.getFirstAsync<{ storage_key: string }>(
    'SELECT storage_key FROM receipts WHERE transaction_id = ?',
    id,
  );
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

    const membership = await getTransactionClaimMembership(transaction, id);
    if (membership && membership.claimStatus !== 'draft') {
      throw createCodedError(
        'CLAIM_LOCKED',
        'Move the claim back to Draft before deleting this transaction.',
      );
    }
    if (membership) {
      await transaction.runAsync(
        'DELETE FROM claim_items WHERE transaction_id = ?',
        id,
      );
      await recalculateAutoClaimPeriod(transaction, membership.claimId);
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
  cleanupReceiptFile(receipt?.storage_key ?? null);
}
