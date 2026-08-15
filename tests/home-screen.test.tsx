import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { HomeScreen } from '@/features/home/home-screen';
import type { HomeSummary } from '@/features/home/home-repository';
import { formatMoney } from '@/lib/money';

const mockRouter = {
  push: jest.fn(),
};
const mockDatabase = {};
const mockGetHomeSummary = jest.fn<(...args: unknown[]) => Promise<unknown>>();
let mockFocusedEffect: (() => void | (() => void)) | null = null;

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      mockFocusedEffect = effect;
      React.useEffect(effect, [effect]);
    },
    useRouter: () => mockRouter,
  };
});

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDatabase,
}));

jest.mock('@/features/home/home-repository', () => ({
  getHomeSummary: (...args: unknown[]) => mockGetHomeSummary(...args),
}));

const summary: HomeSummary = {
  categoryTotals: [
    { amountMinor: 70_000, categoryId: 1, categoryName: 'Food & Drink' },
    { amountMinor: 30_000, categoryId: 2, categoryName: 'Transportation' },
  ],
  currencyCode: 'IDR',
  expenseMinor: 100_000,
  incomeMinor: 250_000,
  monthStart: '2026-08-01',
  netMinor: 150_000,
  nextMonthStart: '2026-09-01',
  recentTransactions: [
    {
      amountMinor: 70_000,
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
    },
  ],
};

describe('home screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocusedEffect = null;
    mockGetHomeSummary.mockReset();
  });

  it('renders monthly totals, category bars, and recent transactions', async () => {
    mockGetHomeSummary.mockResolvedValue(summary);
    await render(<HomeScreen />);

    expect(
      await screen.findByRole('header', { name: 'Personal Finance' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('August 2026')).toBeOnTheScreen();
    expect(screen.getByText('Expenses this month')).toBeOnTheScreen();
    expect(screen.getByText('Income')).toBeOnTheScreen();
    expect(screen.getByText('Net')).toBeOnTheScreen();
    expect(screen.getByText(formatMoney(100_000, 'IDR'))).toBeOnTheScreen();
    expect(screen.getByText(formatMoney(250_000, 'IDR'))).toBeOnTheScreen();
    expect(
      screen.getByText(`+${formatMoney(150_000, 'IDR')}`),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText(/Food & Drink.*70% of expenses/),
    ).toBeOnTheScreen();

    const recentRow = screen.getByRole('button', { name: /Coffee Shop/ });
    await fireEvent.press(recentRow);
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions/42');

    await fireEvent.press(screen.getByRole('button', { name: 'View all' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions');

    await act(async () => {
      mockFocusedEffect?.();
      await Promise.resolve();
    });
    await waitFor(() => expect(mockGetHomeSummary).toHaveBeenCalledTimes(2));
  });

  it('shows useful empty states without sample data', async () => {
    mockGetHomeSummary.mockResolvedValue({
      ...summary,
      categoryTotals: [],
      expenseMinor: 0,
      incomeMinor: 0,
      netMinor: 0,
      recentTransactions: [],
    });

    await render(<HomeScreen />);

    expect(
      await screen.findByText('No expenses this month.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('No transactions yet')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Add your first transaction' }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions/new');
  });

  it('offers a retry when the summary cannot be loaded', async () => {
    const warningSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetHomeSummary
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce(summary);

    await render(<HomeScreen />);

    expect(
      await screen.findByRole('header', { name: 'Overview unavailable' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("We couldn't load your overview. Try again."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('header', { name: 'Personal Finance' }),
    ).toBeOnTheScreen();
    expect(warningSpy).toHaveBeenCalledWith(
      'Home summary load failed.',
      'DATABASE_WRITE_FAILED',
    );
    warningSpy.mockRestore();
  });
});
