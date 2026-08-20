let mockLocalParams: Record<string, string> = {};
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { TransactionHistoryScreen } from '@/features/transactions/transaction-history-screen';
import type { TransactionListItem } from '@/features/transactions/transaction-repository';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};
const mockDatabase = {};
const mockListTransactions =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
let mockFocusedEffect: (() => void | (() => void)) | null = null;

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      mockFocusedEffect = effect;
      React.useEffect(effect, [effect]);
    },
    useLocalSearchParams: () => mockLocalParams,
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

const mockCreateTransaction = jest.fn();
const mockDeleteTransaction = jest.fn();
const mockExportTransactionsToCsv = jest.fn().mockResolvedValue({ fileName: 'test.csv', uri: 'file:///test.csv' });
const mockShareTransactionCsv = jest.fn().mockResolvedValue(undefined);

jest.mock('@/features/transactions/transaction-repository', () => ({
  createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
  deleteTransaction: (...args: unknown[]) => mockDeleteTransaction(...args),
  listTransactions: (...args: unknown[]) => mockListTransactions(...args),
}));

jest.mock('@/features/transactions/transaction-export-service', () => ({
  exportTransactionsToCsv: (...args: unknown[]) => mockExportTransactionsToCsv(...args),
  shareTransactionCsv: (...args: unknown[]) => mockShareTransactionCsv(...args),
}));

jest.mock('@/features/transactions/transaction-filter-modal', () => {
  const ReactNative = require('react-native');
  return {
    TransactionFilterModal: ({
      onApply,
      visible,
    }: {
      onApply: (filters: { type: 'income' }) => void;
      visible: boolean;
    }) =>
      visible ? (
        <ReactNative.Pressable
          accessibilityLabel="Apply test filter"
          accessibilityRole="button"
          onPress={() => onApply({ type: 'income' })}
        >
          <ReactNative.Text>Apply test filter</ReactNative.Text>
        </ReactNative.Pressable>
      ) : null,
  };
});

const transaction: TransactionListItem = {
  amountMinor: 35_000,
  categoryName: 'Food & Drink',
  counterparty: 'Coffee Shop',
  currencyCode: 'IDR',
  hasReceipt: true,
  id: 42,
  isReimbursable: false,
  localDate: '2026-08-15',
  occurredAt: 1_755_238_800_000,
  timezoneOffsetMinutes: 420,
  type: 'expense',
};

describe('transaction history screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocusedEffect = null;
    mockLocalParams = {};
  });

  it('renders the empty state and Add entry point', async () => {
    mockListTransactions.mockResolvedValue({
      hasMore: false,
      items: [],
      nextOffset: 0,
    });

    await render(<TransactionHistoryScreen />);

    expect(await screen.findByText('Belum Ada Transaksi')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Catat Transaksi' }),
    ).toBeOnTheScreen();
  });

  it('renders a joined list item, opens detail, and refetches on focus', async () => {
    mockListTransactions.mockResolvedValue({
      hasMore: false,
      items: [transaction],
      nextOffset: 1,
    });

    await render(<TransactionHistoryScreen />);

    const row = await screen.findByRole('button', {
      name: /Coffee Shop/,
    });
    expect(screen.getByText('Food & Drink')).toBeOnTheScreen();
    expect(screen.getAllByText('Struk').length).toBeGreaterThanOrEqual(1);
    await fireEvent.press(row);
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions/42');

    await act(async () => {
      mockFocusedEffect?.();
      await Promise.resolve();
    });
    await waitFor(() => expect(mockListTransactions).toHaveBeenCalledTimes(2));
  });

  it('shows the correct empty state after applying filters', async () => {
    mockListTransactions
      .mockResolvedValueOnce({
        hasMore: false,
        items: [transaction],
        nextOffset: 1,
      })
      .mockResolvedValue({ hasMore: false, items: [], nextOffset: 0 });

    await render(<TransactionHistoryScreen />);
    await screen.findByRole('button', { name: /Coffee Shop/ });

    await fireEvent.press(screen.getByRole('button', { name: 'Filter' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Apply test filter' }),
    );

    expect(
      await screen.findByText('Tidak Ada Transaksi yang Cocok'),
    ).toBeOnTheScreen();
  });

  it('filters transactions when quick filter chips are pressed', async () => {
    mockListTransactions.mockResolvedValue({
      hasMore: false,
      items: [transaction],
      nextOffset: 1,
    });

    await render(<TransactionHistoryScreen />);
    await screen.findByRole('button', { name: /Coffee Shop/ });

    // Press 'Pengeluaran' chip
    const expenseChip = screen.getByRole('tab', { name: 'Pengeluaran' });
    await fireEvent.press(expenseChip);

    await waitFor(() => {
      expect(mockListTransactions).toHaveBeenCalledWith(
        mockDatabase,
        expect.objectContaining({
          filters: expect.objectContaining({ type: 'expense' }),
        }),
      );
    });
  });

  it('navigates months and toggles all time with Month Selector', async () => {
    mockListTransactions.mockResolvedValue({
      hasMore: false,
      items: [transaction],
      nextOffset: 1,
    });

    await render(<TransactionHistoryScreen />);
    await screen.findByRole('button', { name: /Coffee Shop/ });

    // Press Previous Month button
    const prevBtn = screen.getByRole('button', { name: 'Bulan Sebelumnya' });
    await fireEvent.press(prevBtn);

    await waitFor(() => {
      expect(mockListTransactions).toHaveBeenCalledTimes(2);
    });

    // Press Toggle All Time
    const toggleAllTimeBtn = screen.getByText(/Semua waktu/i);
    await fireEvent.press(toggleAllTimeBtn);

    await waitFor(() => {
      expect(mockListTransactions).toHaveBeenCalledTimes(3);
    });
  });

  it('triggers CSV export when export button is pressed', async () => {
    mockListTransactions.mockResolvedValue({
      hasMore: false,
      items: [transaction],
      nextOffset: 1,
    });

    await render(<TransactionHistoryScreen />);
    await screen.findByRole('button', { name: /Coffee Shop/ });

    const exportBtn = screen.getByRole('button', { name: 'Ekspor CSV' });
    await fireEvent.press(exportBtn);

    await waitFor(() => {
      expect(mockExportTransactionsToCsv).toHaveBeenCalledWith(
        [transaction],
        'id',
      );
      expect(mockShareTransactionCsv).toHaveBeenCalledWith(
        'file:///test.csv',
        'Ekspor Riwayat Transaksi',
      );
    });
  });

  it('triggers edit and delete actions via swipe action buttons', async () => {
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert');

    mockListTransactions.mockResolvedValue({
      hasMore: false,
      items: [transaction],
      nextOffset: 1,
    });

    await render(<TransactionHistoryScreen />);
    await screen.findByRole('button', { name: /Coffee Shop/ });

    // 1. Test Swipe Edit button
    const editBtn = screen.getByRole('button', { name: 'Ubah' });
    await fireEvent.press(editBtn);
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions/42/edit');

    // 2. Test Swipe Delete button
    const deleteBtn = screen.getByRole('button', { name: 'Hapus' });
    await fireEvent.press(deleteBtn);
    expect(alertSpy).toHaveBeenCalledWith(
      'Hapus Transaksi',
      expect.stringContaining('Hapus transaksi'),
      expect.any(Array),
    );
  });
});