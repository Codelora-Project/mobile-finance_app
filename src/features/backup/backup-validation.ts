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

function isCalendarDate(value: unknown) {
  if (!isString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isNullableCalendarDate(value: unknown) {
  return value === null || isCalendarDate(value);
}

function areNullableDatesOrdered(start: unknown, end: unknown) {
  return (
    start === null ||
    end === null ||
    (isString(start) && isString(end) && start <= end)
  );
}

function isBase64(value: unknown) {
  return (
    isString(value) &&
    value.length > 0 &&
    value.length <= MAX_RECEIPT_BASE64_LENGTH &&
    value.length % 4 === 0 &&
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
  (row.account_type === undefined ||
    row.account_type === 'cash' ||
    row.account_type === 'bank' ||
    row.account_type === 'credit_card' ||
    row.account_type === 'ewallet' ||
    row.account_type === 'investment' ||
    row.account_type === 'other') &&
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
    isCalendarDate(row.local_date) &&
    isFlag(row.is_reimbursable) &&
    isSafeInteger(row.created_at) &&
    isSafeInteger(row.updated_at);
  if (!baseIsValid) return false;
  if (row.type !== 'transfer') {
    return (
      row.transfer_to_payment_method_id == null &&
      (row.transfer_fee_minor === undefined || row.transfer_fee_minor === 0) &&
      row.transfer_fee_category_id == null &&
      row.transfer_fee_note == null &&
      (row.type === 'expense' || row.is_reimbursable === 0)
    );
  }
  return (
    isPositiveInteger(row.payment_method_id) &&
    isPositiveInteger(row.transfer_to_payment_method_id) &&
    row.payment_method_id !== row.transfer_to_payment_method_id &&
    row.is_reimbursable === 0
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
  isNullableCalendarDate(row.period_start) &&
  isNullableCalendarDate(row.period_end) &&
  areNullableDatesOrdered(row.period_start, row.period_end) &&
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

function assertUnique<T>(
  rows: readonly T[],
  keyFor: (row: T) => string | number | null,
  label: string,
) {
  const keys = new Set<string | number>();
  for (const row of rows) {
    const key = keyFor(row);
    if (key === null) continue;
    if (keys.has(key)) {
      invalidBackup(`File backup berisi ${label} duplikat.`);
    }
    keys.add(key);
  }
}

function validateBackupRelations(payload: BackupPayload) {
  const { data } = payload;
  assertUnique(data.categories, (row) => row.id, 'ID categories');
  assertUnique(data.payment_methods, (row) => row.id, 'ID payment_methods');
  assertUnique(data.transactions, (row) => row.id, 'ID transactions');
  assertUnique(data.receipts, (row) => row.id, 'ID receipts');
  assertUnique(data.claims, (row) => row.id, 'ID claims');
  assertUnique(data.claim_items, (row) => row.id, 'ID claim_items');
  assertUnique(data.savings_goals, (row) => row.id, 'ID savings_goals');
  assertUnique(data.goal_transactions, (row) => row.id, 'ID goal_transactions');
  assertUnique(data.category_budgets, (row) => row.id, 'ID category_budgets');

  assertUnique(data.categories, (row) => row.system_key, 'system_key kategori');
  assertUnique(
    data.categories,
    (row) => `${row.type}:${row.name.trim().toLocaleLowerCase()}`,
    'nama kategori',
  );
  assertUnique(
    data.payment_methods,
    (row) => row.system_key,
    'system_key dompet',
  );
  assertUnique(
    data.payment_methods,
    (row) => row.name.trim().toLocaleLowerCase(),
    'nama dompet',
  );
  assertUnique(data.app_settings, (row) => row.key, 'pengaturan aplikasi');
  assertUnique(
    data.receipts,
    (row) => row.transaction_id,
    'struk untuk transaksi yang sama',
  );
  assertUnique(data.receipts, (row) => row.storage_key, 'lokasi file struk');
  assertUnique(
    data.claim_items,
    (row) => row.transaction_id,
    'transaksi pada klaim',
  );
  assertUnique(
    data.category_budgets,
    (row) => row.category_id,
    'anggaran kategori',
  );

  const categories = new Map(data.categories.map((row) => [row.id, row]));
  const walletIds = new Set(data.payment_methods.map((row) => row.id));
  const transactions = new Map(data.transactions.map((row) => [row.id, row]));
  const claimIds = new Set(data.claims.map((row) => row.id));
  const goals = new Map(data.savings_goals.map((row) => [row.id, row]));

  for (const transaction of data.transactions) {
    const category = categories.get(transaction.category_id);
    const categoryIsValid =
      category &&
      ((transaction.type === 'transfer' &&
        category.system_key === 'wallet_transfer') ||
        (transaction.type !== 'transfer' &&
          category.type === transaction.type));
    if (!categoryIsValid) {
      invalidBackup('File backup berisi relasi kategori transaksi yang rusak.');
    }
    if (
      (transaction.payment_method_id !== null &&
        !walletIds.has(transaction.payment_method_id)) ||
      (transaction.transfer_to_payment_method_id != null &&
        !walletIds.has(transaction.transfer_to_payment_method_id))
    ) {
      invalidBackup('File backup berisi relasi dompet transaksi yang rusak.');
    }
    if (transaction.transfer_fee_category_id != null) {
      const feeCategory = categories.get(transaction.transfer_fee_category_id);
      if (!feeCategory || feeCategory.type !== 'expense') {
        invalidBackup('File backup berisi kategori biaya transfer yang rusak.');
      }
    }
  }

  if (payload.version >= 2) {
    for (const receipt of data.receipts) {
      if (transactions.get(receipt.transaction_id)?.type !== 'expense') {
        invalidBackup('File backup berisi relasi struk transaksi yang rusak.');
      }
    }
  }
  for (const item of data.claim_items) {
    const transaction = transactions.get(item.transaction_id);
    if (
      !claimIds.has(item.claim_id) ||
      transaction?.type !== 'expense' ||
      transaction.is_reimbursable !== 1
    ) {
      invalidBackup('File backup berisi relasi klaim yang rusak.');
    }
  }
  for (const budget of data.category_budgets) {
    if (categories.get(budget.category_id)?.type !== 'expense') {
      invalidBackup('File backup berisi relasi anggaran kategori yang rusak.');
    }
  }

  const goalBalances = new Map<number, number>();
  for (const transaction of data.goal_transactions) {
    if (!goals.has(transaction.goal_id)) {
      invalidBackup('File backup berisi relasi transaksi target yang rusak.');
    }
    const delta =
      transaction.type === 'deposit'
        ? transaction.amount_minor
        : -transaction.amount_minor;
    goalBalances.set(
      transaction.goal_id,
      (goalBalances.get(transaction.goal_id) ?? 0) + delta,
    );
  }
  for (const goal of data.savings_goals) {
    if ((goalBalances.get(goal.id) ?? 0) !== goal.current_amount_minor) {
      invalidBackup('Saldo target pada file backup tidak konsisten.');
    }
    const expectedCompleted =
      goal.current_amount_minor >= goal.target_amount_minor ? 1 : 0;
    if (goal.is_completed !== expectedCompleted) {
      invalidBackup('Status target pada file backup tidak konsisten.');
    }
  }
}

function validateBackupSummary(payload: BackupPayload) {
  const expected: BackupPayload['summary'] = {
    budgets_count: payload.data.category_budgets.length,
    categories_count: payload.data.categories.length,
    claims_count: payload.data.claims.length,
    goals_count: payload.data.savings_goals.length,
    payment_methods_count: payload.data.payment_methods.length,
    transactions_count: payload.data.transactions.length,
  };
  for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
    if (!isNonNegativeInteger(payload.summary[key])) {
      invalidBackup('Ringkasan jumlah data pada file backup rusak.');
    }
    if (payload.summary[key] !== expected[key]) {
      invalidBackup('Ringkasan jumlah data pada file backup tidak konsisten.');
    }
  }
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
    Number.isNaN(Date.parse(parsed.exported_at)) ||
    !isNonEmptyString(parsed.app_version) ||
    !isObject(parsed.summary)
  ) {
    invalidBackup('Metadata file backup rusak atau tidak lengkap.');
  }

  const payload = parsed as BackupPayload;
  validateBackupSummary(payload);
  validateBackupRelations(payload);
  return payload;
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
