import type { SQLiteDatabase } from 'expo-sqlite';

import { isTransactionType, type TransactionType } from '@/domain/transaction';
import { supportedReceiptMimeTypes } from '@/features/receipts/receipt-types';
import type { SaveTransactionInput } from '@/features/transactions/transaction-types';
import { toLocalDate } from '@/lib/dates';
import { createCodedError } from '@/lib/errors';
import { assertMoney } from '@/lib/money';
import { normalizeOptionalText } from '@/lib/strings';

function normalizeReceipt(input: SaveTransactionInput['receipt']) {
  if (!input) return null;
  const sourceImageUri = input.sourceImageUri.trim();
  if (!sourceImageUri) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'The receipt image is unavailable.',
    );
  }
  if (!supportedReceiptMimeTypes.includes(input.mimeType)) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Choose a JPEG, PNG, or WEBP receipt image.',
    );
  }
  return { mimeType: input.mimeType, sourceImageUri };
}

export function normalizeTransactionInput(
  input: SaveTransactionInput,
  now: number,
) {
  if (!isTransactionType(input.type)) {
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
      !input.paymentMethodId ||
      !Number.isSafeInteger(input.paymentMethodId) ||
      input.paymentMethodId <= 0
    ) {
      throw createCodedError('VALIDATION_FAILED', 'Choose a source wallet.');
    }
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
  if (!Number.isSafeInteger(input.occurredAt) || input.occurredAt > now) {
    throw createCodedError(
      'VALIDATION_FAILED',
      input.occurredAt > now
        ? 'Transaction date cannot be in the future.'
        : 'Enter a valid date.',
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
  if (input.type !== 'expense' && input.isReimbursable) {
    throw createCodedError(
      'VALIDATION_FAILED',
      input.type === 'income'
        ? 'Income cannot be reimbursable.'
        : 'Transfers cannot be reimbursable.',
    );
  }
  if (input.type !== 'expense' && receipt) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Income cannot have a receipt.',
    );
  }

  const rawTransferFee =
    input.type === 'transfer' ? (input.transferFeeMinor ?? 0) : 0;
  if (!Number.isSafeInteger(rawTransferFee) || rawTransferFee < 0) {
    throw createCodedError('VALIDATION_FAILED', 'Transfer fee is invalid.');
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
      input.type === 'transfer' ? (input.transferFeeCategoryId ?? null) : null,
    transferFeeMinor: rawTransferFee,
    transferFeeNote:
      input.type === 'transfer'
        ? normalizeOptionalText(input.transferFeeNote ?? '')
        : null,
    transferToPaymentMethodId:
      input.type === 'transfer'
        ? (input.transferToPaymentMethodId ?? null)
        : null,
    type: input.type,
  };
}

export type NormalizedTransactionInput = ReturnType<
  typeof normalizeTransactionInput
>;

export async function validateTransactionReferences(
  database: SQLiteDatabase,
  input: NormalizedTransactionInput,
  options?: {
    allowedArchivedPaymentMethodId?: number | null;
    allowedArchivedTransferDestinationId?: number | null;
  },
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
    const wallet = await database.getFirstAsync<{
      id: number;
      is_archived: number;
    }>(
      'SELECT id, is_archived FROM payment_methods WHERE id = ?',
      input.paymentMethodId,
    );
    if (!wallet) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Payment method no longer exists.',
      );
    }
    if (
      wallet.is_archived === 1 &&
      options?.allowedArchivedPaymentMethodId !== input.paymentMethodId
    ) {
      throw createCodedError('VALIDATION_FAILED', 'Choose an active wallet.');
    }
  }

  if (input.type === 'transfer' && input.transferToPaymentMethodId !== null) {
    const targetWallet = await database.getFirstAsync<{
      id: number;
      is_archived: number;
    }>(
      'SELECT id, is_archived FROM payment_methods WHERE id = ?',
      input.transferToPaymentMethodId,
    );
    if (!targetWallet) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Destination wallet no longer exists.',
      );
    }
    if (
      targetWallet.is_archived === 1 &&
      options?.allowedArchivedTransferDestinationId !==
        input.transferToPaymentMethodId
    ) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Choose an active destination wallet.',
      );
    }
  }

  if (input.transferFeeCategoryId !== null) {
    const feeCategory = await database.getFirstAsync<{
      id: number;
      type: TransactionType;
    }>(
      'SELECT id, type FROM categories WHERE id = ?',
      input.transferFeeCategoryId,
    );
    if (!feeCategory || feeCategory.type !== 'expense') {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Choose an expense category for the transfer fee.',
      );
    }
  }
}
