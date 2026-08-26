import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import {
  type HomeCategoryTotal,
  type HomePeriod,
  type HomeSummary,
} from '@/features/home/home-repository';
import { HomeScreen } from '@/features/home/home-screen';
import type { TransactionListItem } from '@/features/transactions/transaction-repository';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
};

jest.mock(
  '@/features/transactions/transaction-mutation-context',
  () => ({
    useTransactionMutations: () => ({
      dismissNotice: jest.fn(),
      notifyCreated: jest.fn(),
      notifyDeleted: jest.fn(),
      notifyUpdated: jest.fn(),
      revision: 0,
      undo: jest.fn(),
    }),
  }),
);

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (callback: () => void) => {
      React.useEffect(() => {
        callback();
      }, []);
    },
    useLocalSearchParams: () => ({}),
    useRouter: () => mockRouter,
  };
});

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({}),
}));

const mockGetHomeSummary = jest.fn<(...args: any[]) => Promise<any>>();
const mockListCategoryBudgets = jest.fn<(...args: any[]) => Promise<any>>();

jest.mock('@/features/home/home-repository', () => {
  const actual = jest.requireActual(
    '@/features/home/home-repository',
  ) as object;
  return {
    ...actual,
    getHomeSummary: (...args: unknown[]) => mockGetHomeSummary(...args),
  };
});

jest.mock('@/features/settings/settings-repository', () => ({
  getHomeDisplayPreferences: jest.fn().mockImplementation(() =>
    Promise.resolve({
      hideBalance: false,
      showQuickLog: true,
      showWalletChips: true,
    }),
  ),
  getQuickLogCategoryIds: jest
    .fn()
    .mockImplementation(() => Promise.resolve([1, 2, 3, 4, 5])),
  setHomeDisplayPreferences: jest
    .fn()
    .mockImplementation(() => Promise.resolve(undefined)),
  setQuickLogCategoryIds: jest
    .fn()
    .mockImplementation(() => Promise.resolve(undefined)),
}));

jest.mock('@/features/categories/category-repository', () => ({
  listCategories: jest.fn().mockImplementation(() =>
    Promise.resolve([
      { id: 1, name: 'Food & Drink', type: 'expense' },
      { id: 2, name: 'Transportation', type: 'expense' },
      { id: 3, name: 'Shopping', type: 'expense' },
      { id: 4, name: 'Bills', type: 'expense' },
      { id: 5, name: 'Entertainment', type: 'expense' },
    ]),
  ),
}));

jest.mock('@/features/budgets/budget-repository', () => ({
  listCategoryBudgets: (...args: unknown[]) => mockListCategoryBudgets(...args),
}));

jest.mock('@/features/goals/goals-repository', () => ({
  listSavingsGoals: jest.fn().mockImplementation(() => Promise.resolve([])),
}));

jest.mock('@/features/habits/habit-repository', () => ({
  getHabitStats: jest.fn().mockImplementation(() =>
    Promise.resolve({
      activeLoggingDaysThisMonth: 1,
      bestStreak: 1,
      currentBadge: { emoji: 'fire', key: 'starter', minDays: 1 },
      currentStreak: 1,
      nextBadge: null,
      noSpendDaysThisMonth: 1,
    }),
  ),
}));

jest.mock('@/features/wallets/wallet-repository', () => ({
  getWalletSummary: jest.fn().mockImplementation(() =>
    Promise.resolve({
      operationalCashMinor: 10500000,
      totalNetWorthMinor: 35500000,
      trackingAssetsMinor: 25000000,
      wallets: [
        {
          accountNumber: null,
          accountType: 'bank',
          color: '#2563EB',
          createdAt: 0,
          currentBalanceMinor: 10000000,
          iconKey: 'bank',
          id: 1,
          includeInCashflow: true,
          initialBalanceMinor: 10000000,
          isArchived: false,
          isDefault: true,
          isFallback: false,
          name: 'Bank BCA',
          sortOrder: 1,
          systemKey: 'bank_transfer',
          updatedAt: 0,
        },
        {
          accountNumber: null,
          accountType: 'cash',
          color: '#10B981',
          createdAt: 0,
          currentBalanceMinor: 500000,
          iconKey: 'cash',
          id: 2,
          includeInCashflow: true,
          initialBalanceMinor: 500000,
          isArchived: false,
          isDefault: false,
          isFallback: false,
          name: 'Dompet Tunai',
          sortOrder: 2,
          systemKey: 'cash',
          updatedAt: 0,
        },
      ],
    }),
  ),
  getWallets: jest.fn().mockImplementation(() => Promise.resolve([])),
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
  previousNetMinor: 100_000,
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
    {
      amountMinor: 30_000,
      categoryName: 'Transportation',
      counterparty: 'Taxi',
      currencyCode: 'IDR',
      hasReceipt: false,
      id: 43,
      isReimbursable: true,
      localDate: '2026-08-14',
      occurredAt: 1_755_152_400_000,
      timezoneOffsetMinutes: 420,
      type: 'expense',
    },
  ],
  startDate: '2026-08-01',
};

describe('home screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListCategoryBudgets.mockResolvedValue([]);
  });

  it('prioritizes remaining budget in the financial insight', async () => {
    mockGetHomeSummary.mockResolvedValue(summary);
    mockListCategoryBudgets.mockResolvedValue([
      {
        categoryId: 1,
        categoryName: 'Food & Drink',
        dailyAllowanceMinor: 20_000,
        daysRemainingInMonth: 5,
        hasBudget: true,
        id: 1,
        monthlyLimitMinor: 500_000,
        remainingMinor: 125_000,
        spentMinor: 375_000,
        spentPercent: 75,
        status: 'warning',
      },
    ]);

    await render(
      <LanguageProvider initialLanguage="id">
        <HomeScreen />
      </LanguageProvider>,
    );

    expect(
      await screen.findByText(
        `Sisa anggaran bulan ini: ${formatMoney(125_000, 'IDR')}.`,
      ),
    ).toBeOnTheScreen();
  });

  it('renders monthly totals, period selector, and recent transactions in English', async () => {
    mockGetHomeSummary.mockResolvedValue(summary);

    await render(
      <LanguageProvider initialLanguage="en">
        <HomeScreen />
      </LanguageProvider>,
    );

    expect(await screen.findByText('Overview')).toBeOnTheScreen();
    expect(screen.getByText('Expenses')).toBeOnTheScreen();
    expect(screen.getByText(formatMoney(100_000, 'IDR'))).toBeOnTheScreen();
    expect(screen.getByText('Income')).toBeOnTheScreen();
    expect(screen.getByText(formatMoney(250_000, 'IDR'))).toBeOnTheScreen();
    expect(screen.getByText(/Net flow/i)).toBeOnTheScreen();
    expect(screen.getByText(formatMoney(150_000, 'IDR'))).toBeOnTheScreen();
    expect(screen.getByText(/higher compared with/i)).toBeOnTheScreen();
    expect(screen.getByText('This period insight')).toBeOnTheScreen();

    expect(screen.getByText('Coffee Shop')).toBeOnTheScreen();
    expect(screen.getByText('Taxi')).toBeOnTheScreen();

    const periodDropdown = screen.getByRole('button', { name: /Monthly/i });
    await fireEvent.press(periodDropdown);
    expect(mockGetHomeSummary).toHaveBeenLastCalledWith(
      expect.anything(),
      'daily',
      expect.any(Date),
      'en',
      null,
    );

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
      <LanguageProvider initialLanguage="en">
        <HomeScreen />
      </LanguageProvider>,
    );

    expect(await screen.findByText('Overview')).toBeOnTheScreen();
    expect(screen.getByText('No transactions yet')).toBeOnTheScreen();
  });

  it('renders wallet transfers as neutral movements instead of income categories', async () => {
    mockGetHomeSummary.mockResolvedValue({
      ...summary,
      categoryTotals: [],
      recentTransactions: [
        {
          amountMinor: 520_000,
          categoryName: 'Food & Drink',
          counterparty: null,
          currencyCode: 'IDR',
          hasReceipt: false,
          id: 99,
          isReimbursable: false,
          localDate: '2026-08-15',
          occurredAt: 1_755_238_800_000,
          paymentMethodId: 1,
          paymentMethodName: 'Bank BCA',
          timezoneOffsetMinutes: 420,
          transferFeeMinor: 0,
          transferToPaymentMethodId: 2,
          transferToPaymentMethodName: 'GoPay',
          type: 'transfer',
        },
      ],
    });

    await render(
      <LanguageProvider initialLanguage="en">
        <HomeScreen />
      </LanguageProvider>,
    );

    expect(await screen.findByText('Bank BCA → GoPay')).toBeOnTheScreen();
    expect(screen.getByText('Transfer')).toBeOnTheScreen();
    expect(
      screen.getByText(`⇄ ${formatMoney(520_000, 'IDR')}`),
    ).toBeOnTheScreen();
    expect(screen.getByText(formatMoney(0, 'IDR'))).toBeOnTheScreen();
  });

  it('offers a retry when the summary cannot be loaded', async () => {
    mockGetHomeSummary
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(summary);

    await render(
      <LanguageProvider initialLanguage="en">
        <HomeScreen />
      </LanguageProvider>,
    );

    expect(
      await screen.findByText("We couldn't load your overview. Try again."),
    ).toBeOnTheScreen();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    });

    expect(screen.getByText('Coffee Shop')).toBeOnTheScreen();
  });

  it('renders correctly in Indonesian language mode', async () => {
    mockGetHomeSummary.mockResolvedValue({
      ...summary,
      periodLabel: 'Agu 2026',
    });

    await render(
      <LanguageProvider initialLanguage="id">
        <HomeScreen />
      </LanguageProvider>,
    );

    expect(await screen.findByText('Ringkasan')).toBeOnTheScreen();
    expect(screen.getByText('Pengeluaran')).toBeOnTheScreen();
    expect(screen.getByText('Uang Masuk')).toBeOnTheScreen();
    expect(screen.getByText(/Arus Bersih/i)).toBeOnTheScreen();
    expect(screen.getByText('Catat Cepat')).toBeOnTheScreen();
    expect(screen.getByText('Transaksi Terakhir')).toBeOnTheScreen();
  });

  it('renders wallet chips and filters by wallet', async () => {
    mockGetHomeSummary.mockResolvedValue(summary);

    await render(
      <LanguageProvider initialLanguage="id">
        <HomeScreen />
      </LanguageProvider>,
    );

    expect(await screen.findByText('Semua Dompet')).toBeOnTheScreen();
    expect(screen.getByText('Bank BCA')).toBeOnTheScreen();
    expect(screen.getByText('Dompet Tunai')).toBeOnTheScreen();

    // Tap on Bank BCA chip to filter
    const bcaChip = screen.getByLabelText(/Bank BCA/);
    await fireEvent.press(bcaChip);

    expect(mockGetHomeSummary).toHaveBeenCalledWith(
      expect.anything(),
      'monthly',
      expect.anything(),
      'id',
      1,
    );
  });

  it('navigates to /transactions/new when a quick log category is tapped', async () => {
    mockGetHomeSummary.mockResolvedValue(summary);

    await render(
      <LanguageProvider initialLanguage="id">
        <HomeScreen />
      </LanguageProvider>,
    );

    const foodCategoryBtn = await screen.findByLabelText('Catat Food & Drink');
    fireEvent.press(foodCategoryBtn);

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/transactions/new',
      params: {
        categoryId: '1',
        categoryName: 'Food & Drink',
        type: 'expense',
      },
    });
  });
});
