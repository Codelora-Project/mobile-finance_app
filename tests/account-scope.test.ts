import { describe, expect, it } from '@jest/globals';

import { createAccountScope } from '@/features/auth/account-scope';

describe('account scope', () => {
  it('derives a distinct database and receipt directory from the Google id', () => {
    expect(createAccountScope({ id: 'google_user-A1' })).toEqual({
      accountId: 'google_user-A1',
      databaseName: 'personal-finance-google_user-A1.db',
      receiptDirectory: 'accounts/google_user-A1/receipts',
    });
    expect(createAccountScope({ id: 'google_user-B2' }).databaseName).not.toBe(
      createAccountScope({ id: 'google_user-A1' }).databaseName,
    );
  });

  it('rejects identifiers that could escape the account directory', () => {
    expect(() => createAccountScope({ id: '../other-account' })).toThrow(
      'invalid account identifier',
    );
  });
});
