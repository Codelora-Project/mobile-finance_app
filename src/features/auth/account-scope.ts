import type { AccountScope, AuthUser } from '@/features/auth/auth-types';

const ACCOUNT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function createAccountScope(user: Pick<AuthUser, 'id'>): AccountScope {
  if (!ACCOUNT_ID_PATTERN.test(user.id)) {
    throw new Error('Google returned an invalid account identifier.');
  }
  return {
    accountId: user.id,
    databaseName: `keuanganku-${user.id}.db`,
    receiptDirectory: `accounts/${user.id}/receipts`,
  };
}
