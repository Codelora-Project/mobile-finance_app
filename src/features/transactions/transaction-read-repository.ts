import type { SQLiteDatabase } from 'expo-sqlite';

import type { TransactionType } from '@/domain/transaction';
import type { ClaimStatus } from '@/features/claims/claim-repository';
import type { ReceiptMimeType } from '@/features/receipts/receipt-types';
import type {
  Transaction,
  TransactionClaimMembership,
} from '@/features/transactions/transaction-types';

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
  created_at: number;
  updated_at: number;
};

const TRANSACTION_SELECT = `
  SELECT
    t.id, t.type, t.amount_minor, t.currency_code, t.category_id,
    c.name AS category_name,
    t.payment_method_id, pm.name AS payment_method_name,
    t.transfer_to_payment_method_id,
    tpm.name AS transfer_to_payment_method_name,
    t.transfer_fee_minor, t.transfer_fee_category_id,
    tfc.name AS transfer_fee_category_name, t.transfer_fee_note,
    t.counterparty, t.note, t.occurred_at, t.timezone_offset_minutes,
    t.local_date, t.is_reimbursable,
    r.id AS receipt_id, r.storage_key AS receipt_storage_key,
    r.mime_type AS receipt_mime_type,
    t.created_at, t.updated_at
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
  LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
  LEFT JOIN payment_methods tpm ON tpm.id = t.transfer_to_payment_method_id
  LEFT JOIN categories tfc ON tfc.id = t.transfer_fee_category_id
  LEFT JOIN receipts r ON r.transaction_id = t.id
`;

function mapTransaction(row: TransactionRow): Transaction {
  const receipt =
    row.receipt_id !== null &&
    row.receipt_storage_key !== null &&
    row.receipt_mime_type !== null
      ? {
          id: row.receipt_id,
          mimeType: row.receipt_mime_type,
          storageKey: row.receipt_storage_key,
        }
      : null;

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
    receipt,
    timezoneOffsetMinutes: row.timezone_offset_minutes,
    transferFeeCategoryId: row.transfer_fee_category_id,
    transferFeeCategoryName: row.transfer_fee_category_name,
    transferFeeMinor: row.transfer_fee_minor ?? 0,
    transferFeeNote: row.transfer_fee_note,
    transferToPaymentMethodId: row.transfer_to_payment_method_id,
    transferToPaymentMethodName: row.transfer_to_payment_method_name,
    type: row.type,
    updatedAt: row.updated_at,
  };
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
): Promise<TransactionClaimMembership | null> {
  const row = await database.getFirstAsync<{
    claim_id: number;
    claim_title: string;
    claim_status: ClaimStatus;
  }>(
    `SELECT c.id AS claim_id, c.title AS claim_title, c.status AS claim_status
     FROM claim_items ci
     JOIN claims c ON c.id = ci.claim_id
     WHERE ci.transaction_id = ?`,
    transactionId,
  );
  return row
    ? {
        claimId: row.claim_id,
        claimStatus: row.claim_status,
        claimTitle: row.claim_title,
      }
    : null;
}
