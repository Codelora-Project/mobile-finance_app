import type { SQLiteDatabase } from 'expo-sqlite';

import { withIntegrityCheckedTransaction } from '@/db/transactions';
import { SYSTEM_CATEGORIES } from '@/domain/system-categories';
import { ensureSystemCategory } from '@/features/categories/system-category-repository';
import { recalculateAutoClaimPeriod } from '@/features/claims/claim-repository';
import type { ReceiptMimeType } from '@/features/receipts/receipt-types';
import {
  copyReceiptToStorage,
  isReceiptStorageKey,
  receiptFileExists,
  removeReceiptFile,
} from '@/features/receipts/receipt-storage';
import {
  getTransaction,
  getTransactionClaimMembership,
} from '@/features/transactions/transaction-read-repository';
import type {
  DeletedTransactionSnapshot,
  SaveTransactionInput,
  Transaction,
} from '@/features/transactions/transaction-types';
import {
  normalizeTransactionInput,
  type NormalizedTransactionInput,
  validateTransactionReferences,
} from '@/features/transactions/transaction-validation';
import { createCodedError } from '@/lib/errors';
// Write orchestration remains here while pure validation and read/query paths
// live in dedicated modules.

export {
  listTransactions,
  TRANSACTION_PAGE_SIZE,
} from '@/features/transactions/transaction-list-repository';
export {
  getTransaction,
  getTransactionClaimMembership,
} from '@/features/transactions/transaction-read-repository';
export type {
  ListTransactionsInput,
  DeletedTransactionSnapshot,
  SaveTransactionInput,
  Transaction,
  TransactionClaimMembership,
  TransactionFilters,
  TransactionListItem,
  TransactionPage,
  TransactionReceipt,
  TransactionType,
} from '@/features/transactions/transaction-types';
type PreparedReceipt = {
  storageKey: string;
  mimeType: ReceiptMimeType;
} | null;

function normalizeInputForWrite(
  input: SaveTransactionInput,
  now: number,
) {
  return normalizeTransactionInput(input, now);
}

async function resolveSystemCategoryForWrite(
  database: SQLiteDatabase,
  normalized: NormalizedTransactionInput,
  now: number,
) {
  if (normalized.type !== 'transfer') return normalized;

  const categoryId = await ensureSystemCategory(
    database,
    SYSTEM_CATEGORIES.walletTransfer,
    now,
  );
  return { ...normalized, categoryId };
}

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
  receipt: NormalizedTransactionInput['receipt'],
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

function mapTransactionWriteError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('transaction_transfer_wallets_invalid')) {
    return createCodedError(
      'VALIDATION_FAILED',
      'Source and destination wallet must be different.',
    );
  }
  if (message.includes('transaction_non_transfer_fields_invalid')) {
    return createCodedError(
      'VALIDATION_FAILED',
      'Transfer details are only valid for transfers.',
    );
  }
  if (message.includes('transaction_category_type_invalid')) {
    return createCodedError(
      'VALIDATION_FAILED',
      'Choose a category that matches the transaction type.',
    );
  }
  if (message.includes('transaction_transfer_fee_category_invalid')) {
    return createCodedError(
      'VALIDATION_FAILED',
      'Choose an expense category for the transfer fee.',
    );
  }
  if (message.includes('receipt_transaction_type_invalid')) {
    return createCodedError(
      'VALIDATION_FAILED',
      'Receipts can only be attached to expenses.',
    );
  }
  return error;
}

export async function createTransaction(
  database: SQLiteDatabase,
  input: SaveTransactionInput,
  now = Date.now(),
) {
  const normalized = normalizeInputForWrite(input, now);
  const prepared = await prepareReceipt(normalized.receipt);
  let createdId: number | null = null;

  try {
    await withIntegrityCheckedTransaction(database, async (transaction) => {
      const writeInput = await resolveSystemCategoryForWrite(
        transaction,
        normalized,
        now,
      );
      await validateTransactionReferences(transaction, writeInput);
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
        writeInput.type,
        writeInput.amountMinor,
        writeInput.currencyCode,
        writeInput.categoryId,
        writeInput.paymentMethodId,
        writeInput.transferToPaymentMethodId,
        writeInput.transferFeeMinor,
        writeInput.transferFeeCategoryId,
        writeInput.transferFeeNote,
        writeInput.counterparty,
        writeInput.note,
        writeInput.occurredAt,
        writeInput.timezoneOffsetMinutes,
        writeInput.localDate,
        writeInput.isReimbursable ? 1 : 0,
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
    throw mapTransactionWriteError(error);
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
  const normalized = normalizeInputForWrite(input, now);
  const existing = await database.getFirstAsync<{
    id: number;
    payment_method_id: number | null;
    transfer_to_payment_method_id: number | null;
  }>(
    `SELECT id, payment_method_id, transfer_to_payment_method_id
     FROM transactions
     WHERE id = ?`,
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
  const oldReceipt = await database.getFirstAsync<{ storage_key: string }>(
    'SELECT storage_key FROM receipts WHERE transaction_id = ?',
    id,
  );
  const prepared = await prepareReceipt(normalized.receipt);

  try {
    await withIntegrityCheckedTransaction(database, async (transaction) => {
      const writeInput = await resolveSystemCategoryForWrite(
        transaction,
        normalized,
        now,
      );
      const transactionStillExists = await transaction.getFirstAsync<{
        id: number;
        payment_method_id: number | null;
        transfer_to_payment_method_id: number | null;
      }>(
        `SELECT id, payment_method_id, transfer_to_payment_method_id
         FROM transactions
         WHERE id = ?`,
        id,
      );
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
      await validateTransactionReferences(transaction, writeInput, {
        allowedArchivedPaymentMethodId:
          transactionStillExists.payment_method_id,
        allowedArchivedTransferDestinationId:
          transactionStillExists.transfer_to_payment_method_id,
      });
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
        writeInput.type,
        writeInput.amountMinor,
        writeInput.currencyCode,
        writeInput.categoryId,
        writeInput.paymentMethodId,
        writeInput.transferToPaymentMethodId,
        writeInput.transferFeeMinor,
        writeInput.transferFeeCategoryId,
        writeInput.transferFeeNote,
        writeInput.counterparty,
        writeInput.note,
        writeInput.occurredAt,
        writeInput.timezoneOffsetMinutes,
        writeInput.localDate,
        writeInput.isReimbursable ? 1 : 0,
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
    throw mapTransactionWriteError(error);
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

export async function deleteTransaction(
  database: SQLiteDatabase,
  id: number,
  options?: { preserveReceiptFile?: boolean },
) {
  const receipt = await database.getFirstAsync<{ storage_key: string }>(
    'SELECT storage_key FROM receipts WHERE transaction_id = ?',
    id,
  );
  await withIntegrityCheckedTransaction(database, async (transaction) => {
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
  if (!options?.preserveReceiptFile) {
    cleanupReceiptFile(receipt?.storage_key ?? null);
  }
}

function transactionToSaveInput(
  transaction: Transaction,
): SaveTransactionInput {
  return {
    amountMinor: transaction.amountMinor,
    categoryId: transaction.categoryId,
    counterparty: transaction.counterparty,
    currencyCode: transaction.currencyCode,
    isReimbursable: transaction.isReimbursable,
    localDate: transaction.localDate,
    note: transaction.note,
    occurredAt: transaction.occurredAt,
    paymentMethodId: transaction.paymentMethodId,
    receipt: transaction.receipt
      ? {
          mimeType: transaction.receipt.mimeType,
          sourceImageUri: transaction.receipt.storageKey,
        }
      : null,
    timezoneOffsetMinutes: transaction.timezoneOffsetMinutes,
    transferFeeCategoryId: transaction.transferFeeCategoryId,
    transferFeeMinor: transaction.transferFeeMinor,
    transferFeeNote: transaction.transferFeeNote,
    transferToPaymentMethodId: transaction.transferToPaymentMethodId,
    type: transaction.type,
  };
}

export async function deleteTransactionForUndo(
  database: SQLiteDatabase,
  id: number,
): Promise<DeletedTransactionSnapshot> {
  const [transaction, membership] = await Promise.all([
    getTransaction(database, id),
    getTransactionClaimMembership(database, id),
  ]);
  if (!transaction) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Transaction no longer exists.',
    );
  }
  const snapshot: DeletedTransactionSnapshot = {
    claimId: membership?.claimId ?? null,
    input: transactionToSaveInput(transaction),
  };
  await deleteTransaction(database, id, { preserveReceiptFile: true });
  return snapshot;
}

export async function restoreDeletedTransaction(
  database: SQLiteDatabase,
  snapshot: DeletedTransactionSnapshot,
) {
  const restored = await createTransaction(database, snapshot.input);
  const claimId = snapshot.claimId;
  if (claimId !== null) {
    await withIntegrityCheckedTransaction(database, async (transaction) => {
      const claim = await transaction.getFirstAsync<{ status: string }>(
        'SELECT status FROM claims WHERE id = ?',
        claimId,
      );
      if (claim?.status === 'draft') {
        await transaction.runAsync(
          `INSERT OR IGNORE INTO claim_items (claim_id, transaction_id, created_at)
           VALUES (?, ?, ?)`,
          claimId,
          restored.id,
          Date.now(),
        );
        await recalculateAutoClaimPeriod(transaction, claimId);
      }
    });
  }
  return restored;
}

export function finalizeDeletedTransactionUndo(
  snapshot: DeletedTransactionSnapshot,
) {
  cleanupReceiptFile(snapshot.input.receipt?.sourceImageUri ?? null);
}
