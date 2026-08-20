import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import { isTransactionType, type TransactionType } from '@/domain/transaction';
import type {
  ListTransactionsInput,
  TransactionListItem,
  TransactionPage,
} from '@/features/transactions/transaction-types';
import { isLocalDate } from '@/lib/dates';
import { createCodedError } from '@/lib/errors';

export const TRANSACTION_PAGE_SIZE = 50;

type TransactionListRow = {
  id: number;
  type: TransactionType;
  amount_minor: number;
  currency_code: string;
  category_name: string;
  payment_method_id: number | null;
  payment_method_name: string | null;
  transfer_to_payment_method_id: number | null;
  transfer_to_payment_method_name: string | null;
  transfer_fee_minor: number;
  counterparty: string | null;
  occurred_at: number;
  timezone_offset_minutes: number;
  local_date: string;
  is_reimbursable: number;
  has_receipt: number;
};

const TRANSACTION_LIST_SELECT = `
  SELECT
    t.id, t.type, t.amount_minor, t.currency_code,
    c.name AS category_name,
    t.payment_method_id,
    pm.name AS payment_method_name,
    t.transfer_to_payment_method_id,
    tpm.name AS transfer_to_payment_method_name,
    t.transfer_fee_minor,
    t.counterparty, t.occurred_at, t.timezone_offset_minutes,
    t.local_date, t.is_reimbursable,
    CASE WHEN r.id IS NULL THEN 0 ELSE 1 END AS has_receipt
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
  LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
  LEFT JOIN payment_methods tpm ON tpm.id = t.transfer_to_payment_method_id
  LEFT JOIN receipts r ON r.transaction_id = t.id
`;

function requirePositiveId(value: number | undefined, label: string) {
  if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
    throw createCodedError('VALIDATION_FAILED', `Choose a valid ${label}.`);
  }
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function buildTransactionListQuery(input: ListTransactionsInput) {
  const filters = input.filters ?? {};
  const limit = input.limit ?? TRANSACTION_PAGE_SIZE;
  const offset = input.offset ?? 0;
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 100) {
    throw createCodedError('VALIDATION_FAILED', 'Page size is invalid.');
  }
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw createCodedError('VALIDATION_FAILED', 'Page offset is invalid.');
  }
  if (filters.type !== undefined && !isTransactionType(filters.type)) {
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
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
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
    where.push(
      '(t.payment_method_id = ? OR t.transfer_to_payment_method_id = ?)',
    );
    parameters.push(filters.paymentMethodId, filters.paymentMethodId);
  }
  if (filters.isReimbursable !== undefined) {
    where.push('t.is_reimbursable = ?');
    parameters.push(filters.isReimbursable ? 1 : 0);
  }
  if (filters.hasReceipt !== undefined) {
    where.push(filters.hasReceipt ? 'r.id IS NOT NULL' : 'r.id IS NULL');
  }
  if (filters.minAmountMinor !== undefined) {
    if (
      !Number.isSafeInteger(filters.minAmountMinor) ||
      filters.minAmountMinor < 0
    ) {
      throw createCodedError('VALIDATION_FAILED', 'Minimum amount is invalid.');
    }
    where.push('t.amount_minor >= ?');
    parameters.push(filters.minAmountMinor);
  }
  if (filters.maxAmountMinor !== undefined) {
    if (
      !Number.isSafeInteger(filters.maxAmountMinor) ||
      filters.maxAmountMinor < 0
    ) {
      throw createCodedError('VALIDATION_FAILED', 'Maximum amount is invalid.');
    }
    where.push('t.amount_minor <= ?');
    parameters.push(filters.maxAmountMinor);
  }
  if (filters.isNonCash !== undefined) {
    where.push(
      filters.isNonCash
        ? "(pm.system_key != 'cash' AND pm.name != 'Cash' AND pm.name != 'Tunai' AND pm.id IS NOT NULL)"
        : "(pm.system_key = 'cash' OR pm.name = 'Cash' OR pm.name = 'Tunai')",
    );
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
    paymentMethodId: row.payment_method_id,
    transferFeeMinor: row.transfer_fee_minor,
    transferToPaymentMethodId: row.transfer_to_payment_method_id,
    transferToPaymentMethodName: row.transfer_to_payment_method_name,
    timezoneOffsetMinutes: row.timezone_offset_minutes,
    type: row.type,
  };
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
