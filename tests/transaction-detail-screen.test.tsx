import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert } from 'react-native';

import { TransactionDetailScreen } from '@/features/transactions/transaction-detail-screen';

const mockRouter = {
  back: jest.fn(),
  dismissTo: jest.fn(),
  push: jest.fn(),
};
const mockDatabase = {};
const mockDeleteTransaction = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockGetTransaction = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetTransactionClaimMembership =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      React.useEffect(effect, [effect]),
    useRouter: () => mockRouter,
  };
});

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDatabase,
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return ({ name }: { name: string }) => (
    <ReactNative.Text>{name}</ReactNative.Text>
  );
});

jest.mock('@/features/transactions/transaction-repository', () => ({
  deleteTransaction: (...args: unknown[]) => mockDeleteTransaction(...args),
  getTransaction: (...args: unknown[]) => mockGetTransaction(...args),
  getTransactionClaimMembership: (...args: unknown[]) =>
    mockGetTransactionClaimMembership(...args),
}));

const savedTransaction = {
  amountMinor: 35_000,
  categoryId: 1,
  categoryName: 'Food & Drink',
  counterparty: 'Coffee Shop',
  createdAt: 1,
  currencyCode: 'IDR',
  id: 42,
  isReimbursable: true,
  localDate: '2026-08-15',
  note: 'Client meeting',
  occurredAt: 1_755_238_800_000,
  paymentMethodId: 10,
  paymentMethodName: 'Cash',
  receipt: {
    id: 7,
    mimeType: 'image/jpeg',
    ocrStatus: 'not_processed',
    storageKey: 'receipts/receipt.jpg',
  },
  timezoneOffsetMinutes: 420,
  type: 'expense',
  updatedAt: 1,
};

describe('transaction detail screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTransaction.mockResolvedValue(savedTransaction);
    mockGetTransactionClaimMembership.mockResolvedValue(null);
    mockDeleteTransaction.mockResolvedValue(undefined);
  });

  it('shows all detail fields and opens Edit', async () => {
    await render(<TransactionDetailScreen transactionId={42} />);

    expect(
      await screen.findByRole('header', { name: 'Detail Transaksi' }),
    ).toBeOnTheScreen();
    expect(screen.getAllByText('Coffee Shop').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Food & Drink')).toBeOnTheScreen();
    expect(screen.getByText('Cash')).toBeOnTheScreen();
    expect(screen.getByText('Client meeting')).toBeOnTheScreen();
    expect(screen.getByText('receipt.jpg (not processed)')).toBeOnTheScreen();
    expect(screen.getAllByText('Dapat Diklaim').length).toBeGreaterThanOrEqual(
      1,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Ubah Transaksi' }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions/42/edit');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Lihat Bukti Struk' }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions/42/receipt');
  });

  it('deletes with confirmation and returns to the refetching list', async () => {
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        const deleteButton = buttons?.find((button) => button.text === 'Hapus');
        deleteButton?.onPress?.();
      });
    await render(<TransactionDetailScreen transactionId={42} />);
    await screen.findAllByText('Coffee Shop');

    const deleteButtons = screen.getAllByRole('button', {
      name: 'Hapus Transaksi',
    });
    await fireEvent.press(deleteButtons[0]!);

    await waitFor(() =>
      expect(mockDeleteTransaction).toHaveBeenCalledWith(expect.anything(), 42),
    );
    await waitFor(() =>
      expect(mockRouter.dismissTo).toHaveBeenCalledWith({
        params: { feedback: 'Transaksi berhasil dihapus.' },
        pathname: '/transactions',
      }),
    );
    expect(alertSpy).toHaveBeenCalledWith(
      'Hapus transaksi?',
      'Tindakan ini tidak dapat dibatalkan.',
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it('locks edit and delete while the transaction is in a submitted claim', async () => {
    mockGetTransactionClaimMembership.mockResolvedValue({
      claimId: 9,
      claimStatus: 'submitted',
      claimTitle: 'Travel Claim',
    });

    await render(<TransactionDetailScreen transactionId={42} />);

    expect(
      await screen.findByText(/Transaksi ini terkunci oleh klaim/i),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Ubah Transaksi' }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Hapus Transaksi' }),
    ).not.toBeOnTheScreen();
  });
});
