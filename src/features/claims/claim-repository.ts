import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import type { ReceiptMimeType } from '@/features/receipts/receipt-types';
import { isLocalDate } from '@/lib/dates';
import { createCodedError } from '@/lib/errors';
import { sumMoney } from '@/lib/money';
import { normalizeOptionalText, normalizeText } from '@/lib/strings';

export type ClaimStatus = 'draft' | 'submitted' | 'reimbursed' | 'rejected';
export type ClaimPeriodMode = 'auto' | 'manual';

export type ClaimExpense = Readonly<{
  id: number;
  amountMinor: number;
  currencyCode: string;
  categoryName: string;
  counterparty: string | null;
  localDate: string;
  hasReceipt: boolean;
  note: string | null;
  receipt: Readonly<{
    storageKey: string;
    mimeType: ReceiptMimeType;
  }> | null;
}>;

export type ClaimSummary = Readonly<{
  id: number;
  title: string;
  description: string | null;
  status: ClaimStatus;
  periodMode: ClaimPeriodMode;
  periodStart: string | null;
  periodEnd: string | null;
  currencyCode: string | null;
  totalMinor: number;
  itemCount: number;
  receiptAttachedCount: number;
  receiptMissingCount: number;
  submittedAt: number | null;
  reimbursedAt: number | null;
  rejectedAt: number | null;
  createdAt: number;
  updatedAt: number;
}>;

export type ClaimDetail = ClaimSummary &
  Readonly<{ expenses: readonly ClaimExpense[] }>;

export type SaveClaimInput = Readonly<{
  title: string;
  description: string;
  periodMode: ClaimPeriodMode;
  periodStart?: string;
  periodEnd?: string;
  transactionIds: readonly number[];
}>;

type ClaimSummaryRow = {
  id: number;
  title: string;
  description: string | null;
  status: ClaimStatus;
  period_mode: ClaimPeriodMode;
  period_start: string | null;
  period_end: string | null;
  currency_code: string | null;
  total_minor: number;
  item_count: number;
  receipt_attached_count: number;
  submitted_at: number | null;
  reimbursed_at: number | null;
  rejected_at: number | null;
  created_at: number;
  updated_at: number;
};

type ClaimExpenseRow = {
  id: number;
  amount_minor: number;
  currency_code: string;
  category_name: string;
  counterparty: string | null;
  local_date: string;
  has_receipt: number;
  note: string | null;
  receipt_storage_key: string | null;
  receipt_mime_type: ReceiptMimeType | null;
};

type SelectedExpenseRow = ClaimExpenseRow & {
  type: string;
  is_reimbursable: number;
  existing_claim_id: number | null;
};

const CLAIM_SUMMARY_SELECT = `
  SELECT
    c.id,
    c.title,
    c.description,
    c.status,
    c.period_mode,
    c.period_start,
    c.period_end,
    MIN(t.currency_code) AS currency_code,
    COALESCE(SUM(t.amount_minor), 0) AS total_minor,
    COUNT(ci.id) AS item_count,
    SUM(CASE WHEN r.id IS NULL THEN 0 ELSE 1 END) AS receipt_attached_count,
    c.submitted_at,
    c.reimbursed_at,
    c.rejected_at,
    c.created_at,
    c.updated_at
  FROM claims c
  LEFT JOIN claim_items ci ON ci.claim_id = c.id
  LEFT JOIN transactions t ON t.id = ci.transaction_id
  LEFT JOIN receipts r ON r.transaction_id = t.id
`;

function mapSummary(row: ClaimSummaryRow): ClaimSummary {
  if (!Number.isSafeInteger(row.total_minor) || row.total_minor < 0) {
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      'The claim total is outside the supported range.',
    );
  }
  return {
    createdAt: row.created_at,
    currencyCode: row.currency_code,
    description: row.description,
    id: row.id,
    itemCount: row.item_count,
    periodEnd: row.period_end,
    periodMode: row.period_mode,
    periodStart: row.period_start,
    receiptAttachedCount: row.receipt_attached_count,
    receiptMissingCount: row.item_count - row.receipt_attached_count,
    reimbursedAt: row.reimbursed_at,
    rejectedAt: row.rejected_at,
    status: row.status,
    submittedAt: row.submitted_at,
    title: row.title,
    totalMinor: row.total_minor,
    updatedAt: row.updated_at,
  };
}

function mapExpense(row: ClaimExpenseRow): ClaimExpense {
  return {
    amountMinor: row.amount_minor,
    categoryName: row.category_name,
    counterparty: row.counterparty,
    currencyCode: row.currency_code,
    hasReceipt: row.has_receipt === 1,
    id: row.id,
    localDate: row.local_date,
    note: row.note ?? null,
    receipt:
      typeof row.receipt_storage_key === 'string' &&
      typeof row.receipt_mime_type === 'string'
        ? {
            mimeType: row.receipt_mime_type,
            storageKey: row.receipt_storage_key,
          }
        : null,
  };
}

function requireId(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw createCodedError('VALIDATION_FAILED', `${label} is invalid.`);
  }
}

function normalizeClaimInput(input: SaveClaimInput) {
  const title = normalizeText(input.title);
  const description = normalizeOptionalText(input.description);
  if (!title) {
    throw createCodedError('VALIDATION_FAILED', 'Enter a claim title.');
  }
  if (Array.from(title).length > 100) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Claim title must be 100 characters or fewer.',
    );
  }
  if (description && Array.from(description).length > 500) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Description must be 500 characters or fewer.',
    );
  }
  if (input.periodMode !== 'auto' && input.periodMode !== 'manual') {
    throw createCodedError('VALIDATION_FAILED', 'Claim period is invalid.');
  }

  const transactionIds = [...new Set(input.transactionIds)];
  if (transactionIds.length !== input.transactionIds.length) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'An expense can only be selected once.',
    );
  }
  if (transactionIds.length === 0) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Select at least one reimbursable expense.',
    );
  }
  for (const transactionId of transactionIds) {
    requireId(transactionId, 'Transaction');
  }

  const periodStart = input.periodStart?.trim() || null;
  const periodEnd = input.periodEnd?.trim() || null;
  if (
    input.periodMode === 'manual' &&
    (!periodStart ||
      !periodEnd ||
      !isLocalDate(periodStart) ||
      !isLocalDate(periodEnd) ||
      periodStart > periodEnd)
  ) {
    throw createCodedError('VALIDATION_FAILED', 'Enter a valid claim period.');
  }

  return {
    description,
    periodEnd: input.periodMode === 'manual' ? periodEnd : null,
    periodMode: input.periodMode,
    periodStart: input.periodMode === 'manual' ? periodStart : null,
    title,
    transactionIds,
  };
}

async function loadSelectedExpenses(
  database: SQLiteDatabase,
  transactionIds: readonly number[],
  currentClaimId?: number,
) {
  const placeholders = transactionIds.map(() => '?').join(', ');
  const parameters: SQLiteBindValue[] = [...transactionIds];
  const rows = await database.getAllAsync<SelectedExpenseRow>(
    `SELECT
       t.id,
       t.type,
       t.amount_minor,
       t.currency_code,
       t.counterparty,
       t.note,
       t.local_date,
       t.is_reimbursable,
       c.name AS category_name,
       CASE WHEN r.id IS NULL THEN 0 ELSE 1 END AS has_receipt,
       r.storage_key AS receipt_storage_key,
       r.mime_type AS receipt_mime_type,
       ci.claim_id AS existing_claim_id
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     LEFT JOIN receipts r ON r.transaction_id = t.id
     LEFT JOIN claim_items ci ON ci.transaction_id = t.id
     WHERE t.id IN (${placeholders})`,
    ...parameters,
  );

  if (rows.length !== transactionIds.length) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'One or more selected expenses no longer exist.',
    );
  }
  for (const row of rows) {
    if (row.type !== 'expense' || row.is_reimbursable !== 1) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Only reimbursable expenses can be added to a claim.',
      );
    }
    if (
      row.existing_claim_id !== null &&
      row.existing_claim_id !== currentClaimId
    ) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'This expense is already in another claim.',
      );
    }
  }

  const currencyCode = rows[0]?.currency_code;
  if (rows.some((row) => row.currency_code !== currencyCode)) {
    throw createCodedError(
      'CLAIM_CURRENCY_MISMATCH',
      'This expense uses a different currency.',
    );
  }
  try {
    sumMoney(rows.map((row) => row.amount_minor));
  } catch {
    throw createCodedError(
      'VALIDATION_FAILED',
      'The selected expense total is too large.',
    );
  }
  return rows;
}

function getAutoPeriod(rows: readonly SelectedExpenseRow[]) {
  const dates = rows.map((row) => row.local_date).sort();
  return { periodEnd: dates.at(-1) ?? null, periodStart: dates[0] ?? null };
}

export async function listClaims(
  database: SQLiteDatabase,
  status?: ClaimStatus,
) {
  if (
    status !== undefined &&
    status !== 'draft' &&
    status !== 'submitted' &&
    status !== 'reimbursed' &&
    status !== 'rejected'
  ) {
    throw createCodedError('VALIDATION_FAILED', 'Claim status is invalid.');
  }
  const where = status ? 'WHERE c.status = ?' : '';
  const parameters: SQLiteBindValue[] = status ? [status] : [];
  const rows = await database.getAllAsync<ClaimSummaryRow>(
    `${CLAIM_SUMMARY_SELECT}
     ${where}
     GROUP BY c.id
     ORDER BY c.updated_at DESC, c.id DESC`,
    ...parameters,
  );
  return rows.map(mapSummary);
}

export async function listEligibleClaimExpenses(
  database: SQLiteDatabase,
  currentClaimId?: number,
) {
  if (currentClaimId !== undefined) {
    requireId(currentClaimId, 'Claim');
  }
  const rows = await database.getAllAsync<ClaimExpenseRow>(
    `SELECT
       t.id,
       t.amount_minor,
       t.currency_code,
       t.counterparty,
       t.note,
       t.local_date,
       c.name AS category_name,
       CASE WHEN r.id IS NULL THEN 0 ELSE 1 END AS has_receipt,
       r.storage_key AS receipt_storage_key,
       r.mime_type AS receipt_mime_type
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     LEFT JOIN receipts r ON r.transaction_id = t.id
     LEFT JOIN claim_items ci ON ci.transaction_id = t.id
     WHERE t.type = 'expense'
       AND t.is_reimbursable = 1
       AND (ci.claim_id IS NULL${
         currentClaimId === undefined ? '' : ' OR ci.claim_id = ?'
       })
     ORDER BY t.occurred_at DESC, t.id DESC`,
    ...(currentClaimId === undefined ? [] : [currentClaimId]),
  );
  return rows.map(mapExpense);
}

export async function getClaim(database: SQLiteDatabase, id: number) {
  requireId(id, 'Claim');
  const row = await database.getFirstAsync<ClaimSummaryRow>(
    `${CLAIM_SUMMARY_SELECT}
     WHERE c.id = ?
     GROUP BY c.id`,
    id,
  );
  if (!row) {
    return null;
  }
  const expenses = await database.getAllAsync<ClaimExpenseRow>(
    `SELECT
       t.id,
       t.amount_minor,
       t.currency_code,
       t.counterparty,
       t.note,
       t.local_date,
       c.name AS category_name,
       CASE WHEN r.id IS NULL THEN 0 ELSE 1 END AS has_receipt,
       r.storage_key AS receipt_storage_key,
       r.mime_type AS receipt_mime_type
     FROM claim_items ci
     JOIN transactions t ON t.id = ci.transaction_id
     JOIN categories c ON c.id = t.category_id
     LEFT JOIN receipts r ON r.transaction_id = t.id
     WHERE ci.claim_id = ?
     ORDER BY t.occurred_at DESC, t.id DESC`,
    id,
  );
  return { ...mapSummary(row), expenses: expenses.map(mapExpense) };
}

export async function createClaim(
  database: SQLiteDatabase,
  input: SaveClaimInput,
  now = Date.now(),
) {
  const normalized = normalizeClaimInput(input);
  let claimId: number | null = null;
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const expenses = await loadSelectedExpenses(
      transaction,
      normalized.transactionIds,
    );
    const autoPeriod = getAutoPeriod(expenses);
    const result = await transaction.runAsync(
      `INSERT INTO claims (
        title, description, status, period_mode, period_start, period_end,
        submitted_at, reimbursed_at, rejected_at, created_at, updated_at
      ) VALUES (?, ?, 'draft', ?, ?, ?, NULL, NULL, NULL, ?, ?)`,
      normalized.title,
      normalized.description,
      normalized.periodMode,
      normalized.periodMode === 'auto'
        ? autoPeriod.periodStart
        : normalized.periodStart,
      normalized.periodMode === 'auto'
        ? autoPeriod.periodEnd
        : normalized.periodEnd,
      now,
      now,
    );
    claimId = result.lastInsertRowId;
    for (const transactionId of normalized.transactionIds) {
      await transaction.runAsync(
        'INSERT INTO claim_items (claim_id, transaction_id, created_at) VALUES (?, ?, ?)',
        result.lastInsertRowId,
        transactionId,
        now,
      );
    }
  });
  if (claimId === null) {
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      'The claim could not be created.',
    );
  }
  return claimId;
}

export async function updateDraftClaim(
  database: SQLiteDatabase,
  id: number,
  input: SaveClaimInput,
  now = Date.now(),
) {
  requireId(id, 'Claim');
  const normalized = normalizeClaimInput(input);
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const claim = await transaction.getFirstAsync<{ status: ClaimStatus }>(
      'SELECT status FROM claims WHERE id = ?',
      id,
    );
    if (!claim) {
      throw createCodedError('VALIDATION_FAILED', 'Claim no longer exists.');
    }
    if (claim.status !== 'draft') {
      throw createCodedError(
        'CLAIM_LOCKED',
        'Move this claim back to Draft before editing it.',
      );
    }
    const expenses = await loadSelectedExpenses(
      transaction,
      normalized.transactionIds,
      id,
    );
    const autoPeriod = getAutoPeriod(expenses);
    await transaction.runAsync(
      `UPDATE claims
       SET title = ?, description = ?, period_mode = ?, period_start = ?,
           period_end = ?, updated_at = ?
       WHERE id = ?`,
      normalized.title,
      normalized.description,
      normalized.periodMode,
      normalized.periodMode === 'auto'
        ? autoPeriod.periodStart
        : normalized.periodStart,
      normalized.periodMode === 'auto'
        ? autoPeriod.periodEnd
        : normalized.periodEnd,
      now,
      id,
    );
    await transaction.runAsync(
      'DELETE FROM claim_items WHERE claim_id = ?',
      id,
    );
    for (const transactionId of normalized.transactionIds) {
      await transaction.runAsync(
        'INSERT INTO claim_items (claim_id, transaction_id, created_at) VALUES (?, ?, ?)',
        id,
        transactionId,
        now,
      );
    }
  });
}

const allowedTransitions: Record<ClaimStatus, readonly ClaimStatus[]> = {
  draft: ['submitted'],
  submitted: ['draft', 'reimbursed', 'rejected'],
  reimbursed: [],
  rejected: ['draft'],
};

export async function transitionClaimStatus(
  database: SQLiteDatabase,
  id: number,
  nextStatus: ClaimStatus,
  now = Date.now(),
) {
  requireId(id, 'Claim');
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const claim = await transaction.getFirstAsync<{ status: ClaimStatus }>(
      'SELECT status FROM claims WHERE id = ?',
      id,
    );
    if (!claim) {
      throw createCodedError('VALIDATION_FAILED', 'Claim no longer exists.');
    }
    if (!allowedTransitions[claim.status].includes(nextStatus)) {
      throw createCodedError(
        'CLAIM_LOCKED',
        `A ${claim.status} claim cannot move to ${nextStatus}.`,
      );
    }
    if (nextStatus === 'submitted') {
      const itemRows = await transaction.getAllAsync<{
        transaction_id: number;
      }>('SELECT transaction_id FROM claim_items WHERE claim_id = ?', id);
      if (itemRows.length === 0) {
        throw createCodedError(
          'VALIDATION_FAILED',
          'Add at least one reimbursable expense before submitting.',
        );
      }
      await loadSelectedExpenses(
        transaction,
        itemRows.map((row) => row.transaction_id),
        id,
      );
    }
    await transaction.runAsync(
      `UPDATE claims
       SET status = ?,
           submitted_at = CASE WHEN ? = 'submitted' THEN ? WHEN ? = 'draft' THEN NULL ELSE submitted_at END,
           reimbursed_at = CASE WHEN ? = 'reimbursed' THEN ? ELSE reimbursed_at END,
           rejected_at = CASE WHEN ? = 'rejected' THEN ? WHEN ? = 'draft' THEN NULL ELSE rejected_at END,
           updated_at = ?
       WHERE id = ?`,
      nextStatus,
      nextStatus,
      now,
      nextStatus,
      nextStatus,
      now,
      nextStatus,
      now,
      nextStatus,
      now,
      id,
    );
  });
}

export async function deleteDraftClaim(database: SQLiteDatabase, id: number) {
  requireId(id, 'Claim');
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const claim = await transaction.getFirstAsync<{ status: ClaimStatus }>(
      'SELECT status FROM claims WHERE id = ?',
      id,
    );
    if (!claim) {
      throw createCodedError('VALIDATION_FAILED', 'Claim no longer exists.');
    }
    if (claim.status !== 'draft') {
      throw createCodedError(
        'CLAIM_LOCKED',
        'Only Draft claims can be deleted.',
      );
    }
    await transaction.runAsync(
      'DELETE FROM claim_items WHERE claim_id = ?',
      id,
    );
    await transaction.runAsync('DELETE FROM claims WHERE id = ?', id);
  });
}

export async function recalculateAutoClaimPeriod(
  database: SQLiteDatabase,
  claimId: number,
  now = Date.now(),
) {
  await database.runAsync(
    `UPDATE claims
     SET period_start = (
           SELECT MIN(t.local_date)
           FROM claim_items ci
           JOIN transactions t ON t.id = ci.transaction_id
           WHERE ci.claim_id = claims.id
         ),
         period_end = (
           SELECT MAX(t.local_date)
           FROM claim_items ci
           JOIN transactions t ON t.id = ci.transaction_id
           WHERE ci.claim_id = claims.id
         ),
         updated_at = ?
     WHERE id = ? AND status = 'draft' AND period_mode = 'auto'`,
    now,
    claimId,
  );
}
