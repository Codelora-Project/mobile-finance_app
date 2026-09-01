import type {
  BackupPayload,
  BackupStats,
} from '@/features/backup/backup-types';
import { supportedReceiptMimeTypes } from '@/features/receipts/receipt-types';
import { createCodedError } from '@/lib/errors';

export const MAX_BACKUP_TEXT_LENGTH = 50 * 1024 * 1024;
export const MAX_BACKUP_COLLECTION_ROWS = 100_000;
export const MAX_RECEIPT_BASE64_LENGTH = 12 * 1024 * 1024;

const requiredCollections = [
  'categories',
  'payment_methods',
  'transactions',
  'receipts',
  'claims',
  'claim_items',
  'app_settings',
  'savings_goals',
  'goal_transactions',
  'category_budgets',
] as const;

type JsonObject = Record<string, unknown>;
type RowValidator = (row: JsonObject, version: 1 | 2) => boolean;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function isPositiveInteger(value: unknown) {
  return isSafeInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown) {
  return isSafeInteger(value) && value >= 0;
}

function isFlag(value: unknown) {
  return value === 0 || value === 1;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyString(value: unknown) {
  return isString(value) && value.trim().length > 0;
}

function isNullableString(value: unknown) {
  return value === null || isString(value);
}

function isNullableSafeInteger(value: unknown) {
  return value === null || isSafeInteger(value);
}

function isNullablePositiveInteger(value: unknown) {
  return value === null || isPositiveInteger(value);
}

function isOptionalNullableString(value: unknown) {
  return value === undefined || isNullableString(value);
}

function isOptionalNullablePositiveInteger(value: unknown) {
  return value === undefined || isNullablePositiveInteger(value);
}

function isOptionalNonNegativeInteger(value: unknown) {
  return value === undefined || isNonNegativeInteger(value);
}

function isOptionalFlag(value: unknown) {
  return value === undefined || isFlag(value);
}

function isBase64(value: unknown) {
  return (
    isString(value) &&
    value.length > 0 &&
    value.length <= MAX_RECEIPT_BASE64_LENGTH &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(value)
  );
}

const validateCategory: RowValidator = (row) =>
  isPositiveInteger(row.id) &&
  isNonEmptyString(row.name) &&
  (row.type === 'expense' || row.type === 'income') &&
  isNullableString(row.icon_key) &&
  isNullableString(row.system_key) &&
  isFlag(row.is_default) &&
  isFlag(row.is_fallback) &&
  isSafeInteger(row.sort_order) &&
  isSafeInteger(row.created_at) &&
  isSafeInteger(row.updated_at);

const validatePaymentMethod: RowValidator = (row) =>
  isPositiveInteger(row.id) &&
  isNonEmptyString(row.name) &&
  isNullableString(row.system_key) &&
  isFlag(row.is_default) &&
  isFlag(row.is_fallback) &&
  isSafeInteger(row.sort_order) &&
  isSafeInteger(row.created_at) &&
  isSafeInteger(row.updated_at) &&
  (row.initial_balance_minor === undefined ||
    isSafeInteger(row.initial_balance_minor)) &&
  (row.account_type === undefined || isNonEmptyString(row.account_type)) &&
  isOptionalNullableString(row.account_number) &&
  isOptionalNullableString(row.color) &&
  isOptionalNullableString(row.icon_key) &&
  isOptionalFlag(row.include_in_cashflow) &&
  isOptionalFlag(row.is_archived);

const validateTransaction: RowValidator = (row) => {
  const baseIsValid =
    isPositiveInteger(row.id) &&
    (row.type === 'expense' ||
      row.type === 'income' ||
      row.type === 'transfer') &&
    isPositiveInteger(row.amount_minor) &&
    isString(row.currency_code) &&
    /^[A-Z]{3}$/.test(row.currency_code) &&
    isPositiveInteger(row.category_id) &&
    isNullablePositiveInteger(row.payment_method_id) &&
    isOptionalNullablePositiveInteger(row.transfer_to_payment_method_id) &&
    isOptionalNonNegativeInteger(row.transfer_fee_minor) &&
    isOptionalNullablePositiveInteger(row.transfer_fee_category_id) &&
    isOptionalNullableString(row.transfer_fee_note) &&
    isNullableString(row.counterparty) &&
    isNullableString(row.note) &&
    isSafeInteger(row.occurred_at) &&
    isSafeInteger(row.timezone_offset_minutes) &&
    isString(row.local_date) &&
    /^\d{4}-\d{2}-\d{2}$/.test(row.local_date) &&
    isFlag(row.is_reimbursable) &&
    isSafeInteger(row.created_at) &&
    isSafeInteger(row.updated_at);
  if (!baseIsValid) return false;
  if (row.type !== 'transfer') return true;
  return (
    isPositiveInteger(row.payment_method_id) &&
    isPositiveInteger(row.transfer_to_payment_method_id) &&
    row.payment_method_id !== row.transfer_to_payment_method_id
  );
};

const validateReceipt: RowValidator = (row, version) =>
  isPositiveInteger(row.id) &&
  isPositiveInteger(row.transaction_id) &&
  isNonEmptyString(row.storage_key) &&
  supportedReceiptMimeTypes.some((mimeType) => mimeType === row.mime_type) &&
  (row.ocr_status === 'not_processed' ||
    row.ocr_status === 'processed' ||
    row.ocr_status === 'partial' ||
    row.ocr_status === 'failed') &&
  isNullableString(row.ocr_raw_text) &&
  (row.subtotal_minor === null || isNonNegativeInteger(row.subtotal_minor)) &&
  (row.tax_minor === null || isNonNegativeInteger(row.tax_minor)) &&
  isSafeInteger(row.created_at) &&
  isSafeInteger(row.updated_at) &&
  (version === 1 || isBase64(row.file_base64));

const validateClaim: RowValidator = (row) =>
  isPositiveInteger(row.id) &&
  isNonEmptyString(row.title) &&
  isNullableString(row.description) &&
  (row.status === 'draft' ||
    row.status === 'submitted' ||
    row.status === 'reimbursed' ||
    row.status === 'rejected') &&
  (row.period_mode === 'auto' || row.period_mode === 'manual') &&
  isNullableString(row.period_start) &&
  isNullableString(row.period_end) &&
  isNullableSafeInteger(row.submitted_at) &&
  isNullableSafeInteger(row.reimbursed_at) &&
  isNullableSafeInteger(row.rejected_at) &&
  isSafeInteger(row.created_at) &&
  isSafeInteger(row.updated_at);

const validateClaimItem: RowValidator = (row) =>
  isPositiveInteger(row.id) &&
  isPositiveInteger(row.claim_id) &&
  isPositiveInteger(row.transaction_id) &&
  isSafeInteger(row.created_at);

const validateAppSetting: RowValidator = (row) =>
  isNonEmptyString(row.key) &&
  isString(row.value) &&
  isSafeInteger(row.updated_at);

const validateSavingsGoal: RowValidator = (row) =>
  isPositiveInteger(row.id) &&
  isNonEmptyString(row.name) &&
  isPositiveInteger(row.target_amount_minor) &&
  isNonNegativeInteger(row.current_amount_minor) &&
  isNonEmptyString(row.icon_key) &&
  isNonEmptyString(row.color_key) &&
  isNullableString(row.target_date) &&
  isFlag(row.is_completed) &&
  isSafeInteger(row.created_at) &&
  isSafeInteger(row.updated_at);

const validateGoalTransaction: RowValidator = (row) =>
  isPositiveInteger(row.id) &&
  isPositiveInteger(row.goal_id) &&
  (row.type === 'deposit' || row.type === 'withdraw') &&
  isPositiveInteger(row.amount_minor) &&
  isNullableString(row.note) &&
  isSafeInteger(row.occurred_at) &&
  isSafeInteger(row.created_at);

const validateCategoryBudget: RowValidator = (row) =>
  isPositiveInteger(row.id) &&
  isPositiveInteger(row.category_id) &&
  isPositiveInteger(row.monthly_limit_minor) &&
  isSafeInteger(row.created_at) &&
  isSafeInteger(row.updated_at);

const validators: Record<(typeof requiredCollections)[number], RowValidator> = {
  app_settings: validateAppSetting,
  categories: validateCategory,
  category_budgets: validateCategoryBudget,
  claim_items: validateClaimItem,
  claims: validateClaim,
  goal_transactions: validateGoalTransaction,
  payment_methods: validatePaymentMethod,
  receipts: validateReceipt,
  savings_goals: validateSavingsGoal,
  transactions: validateTransaction,
};

function invalidBackup(message: string): never {
  throw createCodedError('VALIDATION_FAILED', message);
}

function validateCollection(
  name: (typeof requiredCollections)[number],
  value: unknown,
  version: 1 | 2,
) {
  if (!Array.isArray(value)) {
    invalidBackup('Koleksi data dalam file backup rusak atau tidak lengkap.');
  }
  if (value.length > MAX_BACKUP_COLLECTION_ROWS) {
    invalidBackup('File backup berisi terlalu banyak data untuk dipulihkan.');
  }
  const validator = validators[name];
  for (const [index, row] of value.entries()) {
    if (!isObject(row) || !validator(row, version)) {
      invalidBackup(
        `Data ${name} pada baris ${index + 1} rusak atau tidak valid.`,
      );
    }
  }
}

export function parseBackupPayload(textContent: string): BackupPayload {
  if (textContent.length > MAX_BACKUP_TEXT_LENGTH) {
    invalidBackup('Ukuran file backup melebihi batas 50 MB.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textContent);
  } catch {
    invalidBackup('Format file tidak valid (Bukan JSON yang valid).');
  }

  return validateBackupPayload(parsed);
}

export function validateBackupPayload(parsed: unknown): BackupPayload {
  if (
    !isObject(parsed) ||
    (parsed.app_identifier !== 'personal_finance_app' &&
      parsed.app_identifier !== 'keuanganku_app')
  ) {
    invalidBackup(
      'File ini bukan file cadangan resmi dari aplikasi KeuanganKu.',
    );
  }
  if (parsed.version !== 1 && parsed.version !== 2) {
    invalidBackup('Versi file backup belum didukung oleh aplikasi ini.');
  }
  if (!isObject(parsed.data)) {
    invalidBackup('Struktur data dalam file backup rusak atau tidak lengkap.');
  }

  for (const key of requiredCollections) {
    validateCollection(key, parsed.data[key], parsed.version);
  }

  if (
    !isString(parsed.exported_at) ||
    !isString(parsed.app_version) ||
    !isObject(parsed.summary)
  ) {
    invalidBackup('Metadata file backup rusak atau tidak lengkap.');
  }

  return parsed as BackupPayload;
}

export function getBackupPayloadStats(payload: BackupPayload): BackupStats {
  return {
    transactionsCount: payload.data.transactions.length,
    categoriesCount: payload.data.categories.length,
    paymentMethodsCount: payload.data.payment_methods.length,
    goalsCount: payload.data.savings_goals.length,
    claimsCount: payload.data.claims.length,
    budgetsCount: payload.data.category_budgets.length,
  };
}
