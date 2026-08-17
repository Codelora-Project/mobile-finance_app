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

jest.mock('@/features/transactions/transaction-repository', () => ({
  createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
  listTransactions: (...args: unknown[]) => mockListTransactions(...args),
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
    expect(screen.getByText('Struk')).toBeOnTheScreen();
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
  it('displays the floating undo toast when undoPayload is present and restores on click', async () => {
    mockListTransactions.mockResolvedValue({
      hasMore: false,
      items: [],
      nextOffset: 0,
    });
    mockLocalParams = {
      feedback: 'Transaksi berhasil dihapus.',
      undoPayload: JSON.stringify({
        amountMinor: 35000,
        categoryId: 1,
        counterparty: 'Coffee Shop',
        currencyCode: 'IDR',
        isReimbursable: false,
        localDate: '2026-08-15',
        note: '',
        occurredAt: 1755238800000,
        paymentMethodId: null,
        receipt: null,
        timezoneOffsetMinutes: 420,
        type: 'expense',
      }),
    };

    await render(<TransactionHistoryScreen />);

    expect(await screen.findByText('Transaksi berhasil dihapus.')).toBeOnTheScreen();
    const undoButton = screen.getByRole('button', { name: 'Undo action' });
    expect(undoButton).toBeOnTheScreen();

    await fireEvent.press(undoButton);
    await waitFor(() => {
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          amountMinor: 35000,
          counterparty: 'Coffee Shop',
        }),
      );
    });
  });
});