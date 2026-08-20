import {
  act,
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
const mockShareAsync = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockIsSharingAvailable = jest.fn<() => Promise<boolean>>();

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

jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockIsSharingAvailable(),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

jest.mock('@/features/receipts/receipt-storage', () => ({
  getReceiptFileUri: (key: string) => `file:///mock-docs/${key}`,
  receiptFileExists: (key: string) => Boolean(key),
}));

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
    mockIsSharingAvailable.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
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
    expect(screen.getAllByText('receipt.jpg').length).toBeGreaterThanOrEqual(1);
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

  it('confirms with Alert dialog before deleting transaction and returns', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');

    await render(<TransactionDetailScreen transactionId={42} />);
    await screen.findAllByText('Coffee Shop');

    const deleteButtons = screen.getAllByRole('button', {
      name: 'Hapus Transaksi',
    });
    await fireEvent.press(deleteButtons[0]!);

    expect(alertSpy).toHaveBeenCalledWith(
      'Hapus Transaksi?',
      expect.stringContaining('Transaksi ini akan dihapus'),
      expect.any(Array),
    );

    const buttons = alertSpy.mock.calls[0]![2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    const confirmBtn = buttons.find((b) => b.text === 'Hapus');
    await act(async () => {
      confirmBtn?.onPress?.();
    });

    await waitFor(() =>
      expect(mockDeleteTransaction).toHaveBeenCalledWith(expect.anything(), 42),
    );
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
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

  it('shares receipt image file when receipt is attached and share button is pressed', async () => {
    await render(<TransactionDetailScreen transactionId={42} />);
    await screen.findAllByText('Coffee Shop');

    const shareBtn = screen.getByRole('button', {
      name: 'Bagikan Struk',
    });
    await fireEvent.press(shareBtn);

    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///mock-docs/receipts/receipt.jpg',
      expect.objectContaining({
        dialogTitle: 'Bagikan Foto Struk',
        mimeType: 'image/jpeg',
      }),
    );
  });

  it('shares formatted text slip when no receipt is attached', async () => {
    const { Share } = require('react-native');
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' });

    mockGetTransaction.mockResolvedValue({
      ...savedTransaction,
      receipt: null,
    });

    await render(<TransactionDetailScreen transactionId={42} />);
    await screen.findAllByText('Coffee Shop');

    const shareBtn = screen.getByRole('button', {
      name: 'Bagikan Slip',
    });
    await fireEvent.press(shareBtn);

    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('BUKTI TRANSAKSI'),
      }),
      expect.anything(),
    );
  });
});
