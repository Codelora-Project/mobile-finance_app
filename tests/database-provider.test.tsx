import { render, screen, waitFor } from '@testing-library/react-native';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { PropsWithChildren } from 'react';
import { Text } from 'react-native';

import { DatabaseProvider } from '@/db/database-provider';
import type { ReceiptStorage } from '@/features/receipts/receipt-storage';

const mockProviderError = new Error('database is locked');

jest.mock('expo-sqlite', () => ({
  SQLiteProvider: ({
    children,
    onError,
  }: PropsWithChildren<{ onError(error: Error): void }>) => {
    onError(mockProviderError);
    return children;
  },
}));
jest.mock('@/db/database', () => ({
  initializeDatabase: jest.fn(),
}));

describe('DatabaseProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('defers and deduplicates errors reported during SQLiteProvider render', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    render(
      <DatabaseProvider
        databaseName="account.db"
        receiptStorage={{} as ReceiptStorage}
      >
        <Text>App content</Text>
      </DatabaseProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText('Database unavailable')).toBeTruthy(),
    );
    expect(
      consoleError.mock.calls.filter(
        ([message]) => message === 'Database initialization failed.',
      ),
    ).toHaveLength(1);
    expect(
      consoleError.mock.calls.some(
        ([message]) =>
          typeof message === 'string' &&
          message.includes('Cannot update a component'),
      ),
    ).toBe(false);
  });
});
