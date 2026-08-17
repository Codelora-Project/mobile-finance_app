import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import {
  type HomeSummary,
} from '@/features/home/home-repository';
import { HomeScreen } from '@/features/home/home-screen';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
};

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (callback: () => void) => {
      React.useEffect(() => { callback(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    },
    useLocalSearchParams: () => ({}),
    useRouter: () => mockRouter,
  };
});

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({}),
}));

const mockGetHomeSummary = jest.fn();

jest.mock('@/features/home/home-repository', () => {
  const actual = jest.requireActual('@/features/home/home-repository');
  return {
    ...actual,
    getHomeSummary: (...args: unknown[]) => mockGetHomeSummary(...args),
  };
});

jest.mock('@/features/budgets/budget-repository', () => ({
  listCategoryBudgets: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/features/goals/goals-repository', () => ({
  listSavingsGoals: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/features/habits/habit-repository', () => ({
  getHabitStats: jest.fn().mockResolvedValue({
    activeLoggingDaysThisMonth: 1,
    bestStreak: 1,
    currentBadge: { emoji: 'fire', key: 'starter', minDays: 1 },
    currentStreak: 1,
    nextBadge: null,
    noSpendDaysThisMonth: 1,
  }),
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return (props: { name: string }) => (
    <ReactNative.Text>{props.name}</ReactNative.Text>
  );
});

const summary: HomeSummary = {
  categoryTotals: [
    { amountMinor: 70_000, categoryId: 1, categoryName: 'Food & Drink' },
    { amountMinor: 30_000, categoryId: 2, categoryName: 'Transportation' },
  ],
  currencyCode: 'IDR',
  endDateExclusive: '2026-09-01',
  expenseMinor: 100_000,
  incomeMinor: 250_000,
  netMinor: 150_000,
  period: 'monthly',
  periodLabel: 'Aug 2026',
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
  startDate: '2026-08-01',
};

describe('home screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHomeSummary.mockReset();
  });

  it('renders monthly totals, period selector, and recent transactions in English', async () => {
    mockGetHomeSummary.mockResolvedValue(summary);
    await render(
      <LanguageProvider initialLanguage='en'>
        <HomeScreen />
      </LanguageProvider>,
    );

    expect(await screen.findByText('Monthly')).toBeOnTheScreen();
    expect(screen.getByText('Aug 2026')).toBeOnTheScreen();
    expect(screen.getByText('Total')).toBeOnTheScreen();
    expect(screen.getByText('Income')).toBeOnTheScreen();
    expect(screen.getByText('Expenses')).toBeOnTheScreen();
    expect(screen.getByText(formatMoney(100_000, 'IDR'))).toBeOnTheScreen();
    expect(screen.getByText(formatMoney(250_000, 'IDR'))).toBeOnTheScreen();

    const recentRow = screen.getByRole('button', { name: /Coffee Shop/ });
    await fireEvent.press(recentRow);
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions/42');

    const viewAllButtons = screen.getAllByText(/View all/i);
    await fireEvent.press(viewAllButtons[viewAllButtons.length - 1]!);
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions');

    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/settings');
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

    await render(
      <LanguageProvider initialLanguage='en'>
        <HomeScreen />
      </LanguageProvider>,
    );

    expect(await screen.findByText('No transactions yet')).toBeOnTheScreen();
  });

  it('offers a retry when the summary cannot be loaded', async () => {
    const warningSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetHomeSummary
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce(summary);

    await render(
      <LanguageProvider initialLanguage='en'>
        <HomeScreen />
      </LanguageProvider>,
    );

    expect(
      await screen.findByText(/load your overview/i),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Aug 2026')).toBeOnTheScreen();
    expect(warningSpy).toHaveBeenCalledWith(
      'Home summary load failed.',
      'DATABASE_WRITE_FAILED',
    );
    warningSpy.mockRestore();
  });

  it('renders correctly in Indonesian language mode', async () => {
    mockGetHomeSummary.mockResolvedValue({
      ...summary,
      periodLabel: 'Agu 2026',
    });
    await render(
      <LanguageProvider initialLanguage='id'>
        <HomeScreen />
      </LanguageProvider>,
    );

    expect(await screen.findByText('Bulanan')).toBeOnTheScreen();
    expect(screen.getByText('Agu 2026')).toBeOnTheScreen();
    expect(screen.getByText('Total')).toBeOnTheScreen();
    expect(screen.getByText('Uang Masuk')).toBeOnTheScreen();
    expect(screen.getByText('Pengeluaran')).toBeOnTheScreen();
    expect(screen.getByText('Pengeluaran per Kategori')).toBeOnTheScreen();
    expect(screen.getByText('Transaksi Terakhir')).toBeOnTheScreen();
  });
});
