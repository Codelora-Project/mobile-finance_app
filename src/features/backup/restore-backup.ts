import type { SQLiteDatabase } from 'expo-sqlite';

import { withIntegrityCheckedTransaction } from '@/db/transactions';
import type {
  BackupPayload,
  BackupReceipt,
  BackupStats,
} from '@/features/backup/backup-types';
import {
  getBackupPayloadStats,
  MAX_RECEIPT_BASE64_LENGTH,
  validateBackupPayload,
} from '@/features/backup/backup-validation';
import { supportedReceiptMimeTypes } from '@/features/receipts/receipt-types';
import {
  removeReceiptFile,
  writeReceiptBase64ToStorage,
} from '@/features/receipts/receipt-storage';
import { createCodedError } from '@/lib/errors';

async function stageReceiptFiles(payload: BackupPayload) {
  const storageKeys: string[] = [];
  const receipts: BackupReceipt[] = [];

  try {
    for (const receipt of payload.data.receipts) {
      // V1 backups did not embed image data. Restoring their receipt rows would
      // create broken references on a different device, so only their
      // transactions are restored.
      if (payload.version < 2) continue;
      if (
        !receipt.file_base64 ||
        receipt.file_base64.length > MAX_RECEIPT_BASE64_LENGTH
      ) {
        throw createCodedError(
          'VALIDATION_FAILED',
          'File backup tidak berisi data gambar struk yang valid.',
        );
      }
      const mimeType = supportedReceiptMimeTypes.find(
        (supported) => supported === receipt.mime_type,
      );
      if (!mimeType) {
        throw createCodedError(
          'VALIDATION_FAILED',
          'File backup berisi format gambar struk yang tidak didukung.',
        );
      }
      const storageKey = await writeReceiptBase64ToStorage(
        receipt.file_base64,
        mimeType,
      );
      storageKeys.push(storageKey);
      receipts.push({ ...receipt, storage_key: storageKey });
    }
  } catch (error) {
    removeReceiptFiles(storageKeys);
    throw error;
  }

  return { receipts, storageKeys };
}

function removeReceiptFiles(storageKeys: readonly string[]) {
  for (const storageKey of storageKeys) {
    try {
      removeReceiptFile(storageKey);
    } catch {
      // Database integrity takes priority over best-effort file cleanup.
    }
  }
}

async function replaceDatabaseData(
  database: SQLiteDatabase,
  payload: BackupPayload,
  receipts: readonly BackupReceipt[],
) {
  const { data } = payload;
  await withIntegrityCheckedTransaction(database, async (transaction) => {
    await transaction.execAsync(`
      DELETE FROM claim_items;
      DELETE FROM receipts;
      DELETE FROM claims;
      DELETE FROM goal_transactions;
      DELETE FROM category_budgets;
      DELETE FROM transactions;
      DELETE FROM savings_goals;
      DELETE FROM payment_methods;
      DELETE FROM categories;
      DELETE FROM app_settings;
    `);

    for (const category of data.categories) {
      await transaction.runAsync(
        `INSERT INTO categories (
          id, name, type, icon_key, system_key, is_default, is_fallback,
          sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          category.id,
          category.name,
          category.type,
          category.icon_key,
          category.system_key,
          category.is_default,
          category.is_fallback,
          category.sort_order,
          category.created_at,
          category.updated_at,
        ],
      );
    }

    for (const wallet of data.payment_methods) {
      await transaction.runAsync(
        `INSERT INTO payment_methods (
          id, name, system_key, is_default, is_fallback, sort_order,
          created_at, updated_at, initial_balance_minor, account_type,
          account_number, color, icon_key, include_in_cashflow, is_archived
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          wallet.id,
          wallet.name,
          wallet.system_key,
          wallet.is_default,
          wallet.is_fallback,
          wallet.sort_order,
          wallet.created_at,
          wallet.updated_at,
          wallet.initial_balance_minor ?? 0,
          wallet.account_type ?? 'cash',
          wallet.account_number ?? null,
          wallet.color ?? '#2563EB',
          wallet.icon_key ?? 'wallet',
          wallet.include_in_cashflow ?? 1,
          wallet.is_archived ?? 0,
        ],
      );
    }

    for (const setting of data.app_settings) {
      await transaction.runAsync(
        'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);',
        [setting.key, setting.value, setting.updated_at],
      );
    }

    for (const item of data.transactions) {
      await transaction.runAsync(
        `INSERT INTO transactions (
          id, type, amount_minor, currency_code, category_id,
          payment_method_id, transfer_to_payment_method_id,
          transfer_fee_minor, transfer_fee_category_id, transfer_fee_note,
          counterparty, note, occurred_at, timezone_offset_minutes,
          local_date, is_reimbursable, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          item.id,
          item.type,
          item.amount_minor,
          item.currency_code,
          item.category_id,
          item.payment_method_id,
          item.transfer_to_payment_method_id ?? null,
          item.transfer_fee_minor ?? 0,
          item.transfer_fee_category_id ?? null,
          item.transfer_fee_note ?? null,
          item.counterparty,
          item.note,
          item.occurred_at,
          item.timezone_offset_minutes,
          item.local_date,
          item.is_reimbursable,
          item.created_at,
          item.updated_at,
        ],
      );
    }

    for (const receipt of receipts) {
      await transaction.runAsync(
        `INSERT INTO receipts (
          id, transaction_id, storage_key, mime_type, ocr_status,
          ocr_raw_text, subtotal_minor, tax_minor, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          receipt.id,
          receipt.transaction_id,
          receipt.storage_key,
          receipt.mime_type,
          receipt.ocr_status,
          receipt.ocr_raw_text,
          receipt.subtotal_minor,
          receipt.tax_minor,
          receipt.created_at,
          receipt.updated_at,
        ],
      );
    }

    for (const claim of data.claims) {
      await transaction.runAsync(
        `INSERT INTO claims (
          id, title, description, status, period_mode, period_start,
          period_end, submitted_at, reimbursed_at, rejected_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          claim.id,
          claim.title,
          claim.description,
          claim.status,
          claim.period_mode,
          claim.period_start,
          claim.period_end,
          claim.submitted_at,
          claim.reimbursed_at,
          claim.rejected_at,
          claim.created_at,
          claim.updated_at,
        ],
      );
    }

    for (const claimItem of data.claim_items) {
      await transaction.runAsync(
        `INSERT INTO claim_items (id, claim_id, transaction_id, created_at)
         VALUES (?, ?, ?, ?);`,
        [
          claimItem.id,
          claimItem.claim_id,
          claimItem.transaction_id,
          claimItem.created_at,
        ],
      );
    }

    for (const goal of data.savings_goals) {
      await transaction.runAsync(
        `INSERT INTO savings_goals (
          id, name, target_amount_minor, current_amount_minor, icon_key,
          color_key, target_date, is_completed, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          goal.id,
          goal.name,
          goal.target_amount_minor,
          goal.current_amount_minor,
          goal.icon_key,
          goal.color_key,
          goal.target_date,
          goal.is_completed,
          goal.created_at,
          goal.updated_at,
        ],
      );
    }

    for (const goalTransaction of data.goal_transactions) {
      await transaction.runAsync(
        `INSERT INTO goal_transactions (
          id, goal_id, type, amount_minor, note, occurred_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          goalTransaction.id,
          goalTransaction.goal_id,
          goalTransaction.type,
          goalTransaction.amount_minor,
          goalTransaction.note,
          goalTransaction.occurred_at,
          goalTransaction.created_at,
        ],
      );
    }

    for (const budget of data.category_budgets) {
      await transaction.runAsync(
        `INSERT INTO category_budgets (
          id, category_id, monthly_limit_minor, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?);`,
        [
          budget.id,
          budget.category_id,
          budget.monthly_limit_minor,
          budget.created_at,
          budget.updated_at,
        ],
      );
    }
  });
}

export async function restoreBackupData(
  database: SQLiteDatabase,
  payload: BackupPayload,
): Promise<{ stats: BackupStats }> {
  const validatedPayload = validateBackupPayload(payload);
  const previousReceipts = await database.getAllAsync<{ storage_key: string }>(
    'SELECT storage_key FROM receipts;',
  );
  let staged: Awaited<ReturnType<typeof stageReceiptFiles>> | null = null;

  try {
    staged = await stageReceiptFiles(validatedPayload);
    await replaceDatabaseData(database, validatedPayload, staged.receipts);
  } catch (error) {
    removeReceiptFiles(staged?.storageKeys ?? []);
    throw error;
  }

  const activeReceiptKeys = new Set(
    staged.receipts.map((receipt) => receipt.storage_key),
  );
  removeReceiptFiles(
    previousReceipts
      .map((receipt) => receipt.storage_key)
      .filter((storageKey) => !activeReceiptKeys.has(storageKey)),
  );

  return { stats: getBackupPayloadStats(validatedPayload) };
}
