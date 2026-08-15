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
    useLocalSearchParams: () => ({}),
    useRouter: () => mockRouter,
  };
});

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDatabase,
}));

jest.mock('@/features/transactions/transaction-repository', () => ({
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
  });

  it('renders the empty state and Add entry point', async () => {
    mockListTransactions.mockResolvedValue({
      hasMore: false,
      items: [],
      nextOffset: 0,
    });

    await render(<TransactionHistoryScreen />);

    expect(await screen.findByText('No transactions')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Add transaction' }),
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
    expect(screen.getByText('Food & Drink · Receipt')).toBeOnTheScreen();
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

    await fireEvent.press(screen.getByRole('button', { name: 'Filters' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Apply test filter' }),
    );

    expect(
      await screen.findByText('No matching transactions'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Try changing your search or filters.'),
    ).toBeOnTheScreen();
  });
});
