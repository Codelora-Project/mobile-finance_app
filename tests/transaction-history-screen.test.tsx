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
import { formatMoney } from '@/lib/money';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};
const mockDatabase = {};
const mockNotifyDeleted = jest.fn();
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

jest.mock(
  '@/features/transactions/transaction-mutation-context',
  () => ({
    useTransactionMutations: () => ({
      dismissNotice: jest.fn(),
      notifyCreated: jest.fn(),
      notifyDeleted: mockNotifyDeleted,
      notifyUpdated: jest.fn(),
      revision: 0,
      undo: jest.fn(),
    }),
  }),
);

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return ({ name }: { name: string }) => (
    <ReactNative.Text>{name}</ReactNative.Text>
  );
});

const mockCreateTransaction = jest.fn();
const mockDeleteTransaction = jest.fn();
const mockDeleteTransactionForUndo =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockRestoreDeletedTransaction = jest.fn();
const mockExportTransactionsToCsv = jest
  .fn()
  .mockImplementation(() =>
    Promise.resolve({ fileName: 'test.csv', uri: 'file:///test.csv' }),
  );
const mockShareTransactionCsv = jest
  .fn()
  .mockImplementation(() => Promise.resolve(undefined));

jest.mock('@/features/transactions/transaction-repository', () => ({
  createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
  deleteTransaction: (...args: unknown[]) => mockDeleteTransaction(...args),
  deleteTransactionForUndo: (...args: unknown[]) =>
    mockDeleteTransactionForUndo(...args),
  finalizeDeletedTransactionUndo: jest.fn(),
  listTransactions: (...args: unknown[]) => mockListTransactions(...args),
  restoreDeletedTransaction: (...args: unknown[]) =>
    mockRestoreDeletedTransaction(...args),
}));

jest.mock('@/features/transactions/transaction-export-service', () => ({
  exportTransactionsToCsv: (...args: unknown[]) =>
    mockExportTransactionsToCsv(...args),
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
    mockDeleteTransactionForUndo.mockResolvedValue({
      claimId: null,
      input: {
        amountMinor: transaction.amountMinor,
        categoryId: 1,
        counterparty: transaction.counterparty,
        currencyCode: transaction.currencyCode,
        isReimbursable: false,
        localDate: transaction.localDate,
        note: null,
        occurredAt: transaction.occurredAt,
        paymentMethodId: 1,
        receipt: null,
        timezoneOffsetMinutes: transaction.timezoneOffsetMinutes,
        type: transaction.type,
      },
    });
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
    expect(screen.getByText(/Food & Drink/)).toBeOnTheScreen();
    expect(screen.getAllByText('Struk').length).toBeGreaterThanOrEqual(1);
    await fireEvent.press(row);
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions/42');

    await act(async () => {
      mockFocusedEffect?.();
      await Promise.resolve();
    });
    await waitFor(() => expect(mockListTransactions).toHaveBeenCalledTimes(2));
  });

  it('renders transfers with a compact route and excludes them from cashflow totals', async () => {
    const transfer: TransactionListItem = {
      amountMinor: 520_000,
      categoryName: 'Food & Drink',
      counterparty: null,
      currencyCode: 'IDR',
      hasReceipt: false,
      id: 99,
      isReimbursable: false,
      localDate: '2026-08-15',
      occurredAt: 1_755_238_800_000,
      paymentMethodId: 10,
      paymentMethodName: 'Cash',
      timezoneOffsetMinutes: 420,
      transferFeeMinor: 0,
      transferToPaymentMethodId: 11,
      transferToPaymentMethodName: 'Mandiri',
      type: 'transfer',
    };
    mockListTransactions.mockResolvedValue({
      hasMore: false,
      items: [transfer],
      nextOffset: 1,
    });

    await render(<TransactionHistoryScreen />);

    expect(
      await screen.findByRole('button', { name: /Cash → Mandiri/ }),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Transfer Antar Dompet/)).toBeOnTheScreen();
    expect(
      screen.getByText(`⇄ ${formatMoney(520_000, 'IDR')}`),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: `Pengeluaran: -${formatMoney(0, 'IDR')}`,
      }),
    ).toBeOnTheScreen();
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

  it('filters transactions when the summary metric is pressed', async () => {
    mockListTransactions.mockResolvedValue({
      hasMore: false,
      items: [transaction],
      nextOffset: 1,
    });

    await render(<TransactionHistoryScreen />);
    await screen.findByRole('button', { name: /Coffee Shop/ });

    const expenseChip = screen.getByRole('button', { name: /^Pengeluaran:/ });
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

  it('navigates months and selects a month from the month picker', async () => {
    mockListTransactions.mockResolvedValue({
      hasMore: false,
      items: [transaction],
      nextOffset: 1,
    });

    await render(<TransactionHistoryScreen />);
    await screen.findByRole('button', { name: /Coffee Shop/ });

    const previousMonth = new Date();
    previousMonth.setDate(1);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const pickerYear = previousMonth.getFullYear();

    const prevBtn = screen.getByRole('button', { name: 'Bulan sebelumnya' });
    await fireEvent.press(prevBtn);

    await waitFor(() => {
      expect(mockListTransactions).toHaveBeenCalledTimes(2);
    });

    await fireEvent.press(screen.getByRole('button', { name: /Pilih bulan/ }));
    expect(
      screen.getByRole('button', { name: 'Tahun sebelumnya' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Tahun berikutnya' }),
    ).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: `Januari ${pickerYear}` }),
    );

    await waitFor(() => {
      expect(mockListTransactions).toHaveBeenCalledTimes(3);
      expect(mockListTransactions).toHaveBeenLastCalledWith(
        mockDatabase,
        expect.objectContaining({
          filters: expect.objectContaining({
            dateFrom: `${pickerYear}-01-01`,
            dateTo: `${pickerYear}-01-31`,
          }),
        }),
      );
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
      expect(mockListTransactions).toHaveBeenCalledWith(
        mockDatabase,
        expect.objectContaining({ limit: 100, offset: 0 }),
      );
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

  it('exports every matching page without exceeding the repository page limit', async () => {
    const secondTransaction: TransactionListItem = {
      ...transaction,
      amountMinor: 20_000,
      counterparty: 'Second Shop',
      id: 43,
    };
    mockListTransactions
      .mockResolvedValueOnce({
        hasMore: false,
        items: [transaction],
        nextOffset: 1,
      })
      .mockResolvedValueOnce({
        hasMore: true,
        items: [transaction],
        nextOffset: 1,
      })
      .mockResolvedValueOnce({
        hasMore: false,
        items: [secondTransaction],
        nextOffset: 2,
      });

    await render(<TransactionHistoryScreen />);
    await screen.findByRole('button', { name: /Coffee Shop/ });
    await fireEvent.press(screen.getByRole('button', { name: 'Ekspor CSV' }));

    await waitFor(() => {
      expect(mockExportTransactionsToCsv).toHaveBeenCalledWith(
        [transaction, secondTransaction],
        'id',
      );
      expect(mockListTransactions).toHaveBeenCalledWith(
        mockDatabase,
        expect.objectContaining({ limit: 100, offset: 1 }),
      );
    });
  });

  it('triggers edit and delete actions via swipe action buttons', async () => {
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
    await waitFor(() =>
      expect(mockDeleteTransactionForUndo).toHaveBeenCalledWith(
        mockDatabase,
        42,
      ),
    );
    expect(mockNotifyDeleted).toHaveBeenCalledWith(
      expect.objectContaining({ claimId: null }),
    );
  });
});
