import { describe, expect, it } from '@jest/globals';

import { formFromTransaction } from '@/features/transactions/manual-transaction-form';
import type { Transaction } from '@/features/transactions/transaction-repository';

describe('manual transaction form mapping', () => {
  it('formats a transfer fee using the transaction currency fraction digits', () => {
    const transaction: Transaction = {
      amountMinor: 12_500,
      categoryId: 1,
      categoryName: 'Wallet Transfer',
      counterparty: null,
      createdAt: 1,
      currencyCode: 'USD',
      id: 10,
      isReimbursable: false,
      localDate: '2026-08-24',
      note: null,
      occurredAt: 1_756_000_000_000,
      paymentMethodId: 1,
      paymentMethodName: 'Checking',
      receipt: null,
      timezoneOffsetMinutes: 420,
      transferFeeCategoryId: 2,
      transferFeeCategoryName: 'Bank Fees',
      transferFeeMinor: 150,
      transferFeeNote: null,
      transferToPaymentMethodId: 2,
      transferToPaymentMethodName: 'Savings',
      type: 'transfer',
      updatedAt: 1,
    };

    const form = formFromTransaction(transaction);

    expect(form.amount).toBe('125.00');
    expect(form.transferFeeAmount).toBe('1.50');
  });
});
