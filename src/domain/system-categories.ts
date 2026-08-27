export type SystemCategoryDefinition = Readonly<{
  defaultName: string;
  iconKey: string;
  sortOrder: number;
  systemKey: string;
  type: 'expense' | 'income';
}>;

export const SYSTEM_CATEGORIES = {
  balanceReconciliation: {
    defaultName: 'Penyesuaian Saldo',
    iconKey: 'tune-vertical',
    sortOrder: 999,
    systemKey: 'balance_reconciliation',
    type: 'expense',
  },
  balanceReconciliationExpense: {
    defaultName: 'Penyesuaian Saldo',
    iconKey: 'tune-vertical',
    sortOrder: 999,
    systemKey: 'balance_reconciliation',
    type: 'expense',
  },
  balanceReconciliationIncome: {
    defaultName: 'Penyesuaian Saldo',
    iconKey: 'tune-vertical',
    sortOrder: 999,
    systemKey: 'balance_reconciliation_income',
    type: 'income',
  },
  walletTransfer: {
    defaultName: 'Transfer Antar Dompet',
    iconKey: 'swap-horizontal',
    sortOrder: 998,
    systemKey: 'wallet_transfer',
    type: 'expense',
  },
} as const satisfies Record<string, SystemCategoryDefinition>;
