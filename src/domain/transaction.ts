export const TRANSACTION_TYPES = ['expense', 'income', 'transfer'] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export function isTransactionType(value: unknown): value is TransactionType {
  return TRANSACTION_TYPES.some((type) => type === value);
}
