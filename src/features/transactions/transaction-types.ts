import type { TransactionType } from '@/domain/transaction';
import type { ClaimStatus } from '@/features/claims/claim-repository';
import type { ReceiptMimeType } from '@/features/receipts/receipt-types';

export type { TransactionType } from '@/domain/transaction';

export type TransactionClaimMembership = Readonly<{
  claimId: number;
  claimTitle: string;
  claimStatus: ClaimStatus;
}>;

export type TransactionReceipt = Readonly<{
  id: number;
  storageKey: string;
  mimeType: ReceiptMimeType;
}>;

export type Transaction = Readonly<{
  id: number;
  type: TransactionType;
  amountMinor: number;
  currencyCode: string;
  categoryId: number;
  categoryName: string;
  paymentMethodId: number | null;
  paymentMethodName: string | null;
  transferToPaymentMethodId: number | null;
  transferToPaymentMethodName: string | null;
  transferFeeMinor: number;
  transferFeeCategoryId: number | null;
  transferFeeCategoryName: string | null;
  transferFeeNote: string | null;
  counterparty: string | null;
  note: string | null;
  occurredAt: number;
  timezoneOffsetMinutes: number;
  localDate: string;
  isReimbursable: boolean;
  receipt: TransactionReceipt | null;
  createdAt: number;
  updatedAt: number;
}>;

export type SaveTransactionInput = Readonly<{
  type: TransactionType;
  amountMinor: number;
  currencyCode: string;
  categoryId: number;
  paymentMethodId: number | null;
  transferToPaymentMethodId?: number | null;
  transferFeeMinor?: number;
  transferFeeCategoryId?: number | null;
  transferFeeNote?: string | null;
  counterparty: string | null;
  note: string | null;
  occurredAt: number;
  timezoneOffsetMinutes: number;
  localDate: string;
  isReimbursable: boolean;
  receipt: Readonly<{
    sourceImageUri: string;
    mimeType: ReceiptMimeType;
  }> | null;
}>;

export type DeletedTransactionSnapshot = Readonly<{
  claimId: number | null;
  input: SaveTransactionInput;
}>;

export type TransactionFilters = Readonly<{
  type?: TransactionType;
  categoryId?: number;
  dateFrom?: string;
  dateTo?: string;
  paymentMethodId?: number;
  isReimbursable?: boolean;
  hasReceipt?: boolean;
  minAmountMinor?: number;
  maxAmountMinor?: number;
  isNonCash?: boolean;
}>;

export type TransactionListItem = Readonly<{
  id: number;
  type: TransactionType;
  amountMinor: number;
  currencyCode: string;
  categoryName: string;
  paymentMethodId?: number | null;
  paymentMethodName?: string | null;
  transferToPaymentMethodId?: number | null;
  transferToPaymentMethodName?: string | null;
  transferFeeMinor?: number;
  counterparty: string | null;
  occurredAt: number;
  timezoneOffsetMinutes: number;
  localDate: string;
  isReimbursable: boolean;
  hasReceipt: boolean;
}>;

export type ListTransactionsInput = Readonly<{
  search?: string;
  filters?: TransactionFilters;
  limit?: number;
  offset?: number;
}>;

export type TransactionPage = Readonly<{
  items: readonly TransactionListItem[];
  hasMore: boolean;
  nextOffset: number;
}>;
