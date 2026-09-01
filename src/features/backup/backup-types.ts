import type { TransactionType } from '@/domain/transaction';

export type BackupCategory = {
  id: number;
  name: string;
  type: 'expense' | 'income';
  icon_key: string | null;
  system_key: string | null;
  is_default: number;
  is_fallback: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
};

export type BackupPaymentMethod = {
  id: number;
  name: string;
  system_key: string | null;
  is_default: number;
  is_fallback: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
  initial_balance_minor?: number;
  account_type?: string;
  account_number?: string | null;
  color?: string | null;
  icon_key?: string | null;
  include_in_cashflow?: number;
  is_archived?: number;
};

export type BackupTransaction = {
  id: number;
  type: TransactionType;
  amount_minor: number;
  currency_code: string;
  category_id: number;
  payment_method_id: number | null;
  transfer_to_payment_method_id?: number | null;
  transfer_fee_minor?: number;
  transfer_fee_category_id?: number | null;
  transfer_fee_note?: string | null;
  counterparty: string | null;
  note: string | null;
  occurred_at: number;
  timezone_offset_minutes: number;
  local_date: string;
  is_reimbursable: number;
  created_at: number;
  updated_at: number;
};

export type BackupReceipt = {
  id: number;
  transaction_id: number;
  storage_key: string;
  mime_type: string;
  ocr_status: string;
  ocr_raw_text: string | null;
  subtotal_minor: number | null;
  tax_minor: number | null;
  created_at: number;
  updated_at: number;
  /** Added in backup format v2. V1 backups only contain storage_key. */
  file_base64?: string | null;
};

export type BackupClaim = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  period_mode: string;
  period_start: string | null;
  period_end: string | null;
  submitted_at: number | null;
  reimbursed_at: number | null;
  rejected_at: number | null;
  created_at: number;
  updated_at: number;
};

export type BackupClaimItem = {
  id: number;
  claim_id: number;
  transaction_id: number;
  created_at: number;
};

export type BackupAppSetting = {
  key: string;
  value: string;
  updated_at: number;
};

export type BackupSavingsGoal = {
  id: number;
  name: string;
  target_amount_minor: number;
  current_amount_minor: number;
  icon_key: string;
  color_key: string;
  target_date: string | null;
  is_completed: number;
  created_at: number;
  updated_at: number;
};

export type BackupGoalTransaction = {
  id: number;
  goal_id: number;
  type: 'deposit' | 'withdraw';
  amount_minor: number;
  note: string | null;
  occurred_at: number;
  created_at: number;
};

export type BackupCategoryBudget = {
  id: number;
  category_id: number;
  monthly_limit_minor: number;
  created_at: number;
  updated_at: number;
};

export type BackupData = {
  categories: BackupCategory[];
  payment_methods: BackupPaymentMethod[];
  transactions: BackupTransaction[];
  receipts: BackupReceipt[];
  claims: BackupClaim[];
  claim_items: BackupClaimItem[];
  app_settings: BackupAppSetting[];
  savings_goals: BackupSavingsGoal[];
  goal_transactions: BackupGoalTransaction[];
  category_budgets: BackupCategoryBudget[];
};

export type BackupPayload = {
  app_identifier: 'keuanganku_app' | 'personal_finance_app';
  version: 1 | 2;
  exported_at: string;
  app_version: string;
  summary: {
    transactions_count: number;
    categories_count: number;
    payment_methods_count: number;
    goals_count: number;
    claims_count: number;
    budgets_count: number;
  };
  data: BackupData;
};

export type BackupStats = {
  transactionsCount: number;
  categoriesCount: number;
  paymentMethodsCount: number;
  goalsCount: number;
  claimsCount: number;
  budgetsCount: number;
};

export type ValidationResult = {
  isValid: boolean;
  payload?: BackupPayload;
  error?: string;
};
