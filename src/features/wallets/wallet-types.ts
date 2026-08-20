export type AccountType =
  | 'cash'
  | 'bank'
  | 'ewallet'
  | 'investment'
  | 'credit_card'
  | 'other';

export type Wallet = {
  id: number;
  name: string;
  systemKey: string | null;
  accountType: AccountType;
  accountNumber: string | null;
  color: string;
  iconKey: string;
  initialBalanceMinor: number;
  currentBalanceMinor: number;
  includeInCashflow: boolean;
  isDefault: boolean;
  isFallback: boolean;
  isArchived: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type CreateWalletInput = {
  name: string;
  accountType: AccountType;
  accountNumber?: string | null;
  color?: string;
  iconKey?: string;
  initialBalanceMinor?: number;
  includeInCashflow?: boolean;
  isDefault?: boolean;
};

export type UpdateWalletInput = {
  name?: string;
  accountType?: AccountType;
  accountNumber?: string | null;
  color?: string;
  iconKey?: string;
  initialBalanceMinor?: number;
  includeInCashflow?: boolean;
  isDefault?: boolean;
  isArchived?: boolean;
  sortOrder?: number;
};

export type WalletSummary = {
  totalNetWorthMinor: number;
  operationalCashMinor: number;
  trackingAssetsMinor: number;
  wallets: Wallet[];
};

export type TransferTransactionInput = {
  fromWalletId: number;
  toWalletId: number;
  amountMinor: number;
  currencyCode: string;
  occurredAt: number;
  note?: string | null;
  transferFeeMinor?: number;
  transferFeeCategoryId?: number | null;
  transferFeeNote?: string | null;
};

/** PaymentMethod alias for backwards compatibility with selector components */
export type PaymentMethod = Readonly<{
  id: number;
  name: string;
  systemKey: string | null;
  isDefault: boolean;
  isFallback: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}>;
