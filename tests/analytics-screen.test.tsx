import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { AnalyticsScreen } from '@/features/analytics/analytics-screen';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { ThemeProvider } from '@/lib/theme/theme-context';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
const mockDatabase = {};
const mockGetAnalyticsData = jest.fn<() => Promise<unknown>>();
const mockListCategoryBudgets = jest.fn<() => Promise<unknown>>();
const mockSetCategoryBudget =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDeleteCategoryBudget =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
    useRouter: () => mockRouter,
  };
});
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDatabase,
}));
jest.mock('@/features/analytics/analytics-repository', () => ({
  getAnalyticsData: () => mockGetAnalyticsData(),
}));
jest.mock('@/features/budgets/budget-repository', () => ({
  deleteCategoryBudget: (...args: unknown[]) =>
    mockDeleteCategoryBudget(...args),
  listCategoryBudgets: () => mockListCategoryBudgets(),
  setCategoryBudget: (...args: unknown[]) => mockSetCategoryBudget(...args),
}));
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return (props: { name: string }) => (
    <ReactNative.Text>{props.name}</ReactNative.Text>
  );
});

describe('analytics screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAnalyticsData.mockResolvedValue({
      averageDailyExpenseMinor: 50_000,
      categoryBreakdown: [
        {
          amountMinor: 800_000,
          categoryId: 1,
          categoryName: 'Food & Drink',
          percentage: 80,
          transactionCount: 4,
        },
        {
          amountMinor: 200_000,
          categoryId: 2,
          categoryName: 'Transport',
          percentage: 20,
          transactionCount: 2,
        },
      ],
      monthStart: '2026-08-01',
      monthlyCashFlow: [
        {
          expenseMinor: 1_000_000,
          incomeMinor: 3_000_000,
          monthLabel: 'Agu 26',
          monthStart: '2026-08-01',
          netMinor: 2_000_000,
        },
      ],
      referenceDate: '2026-08-16',
      topExpenseCategory: {
        amountMinor: 800_000,
        categoryId: 1,
        categoryName: 'Food & Drink',
        percentage: 80,
        transactionCount: 4,
      },
      totalExpenseMinor: 1_000_000,
      totalIncomeMinor: 3_000_000,
      totalTransactionsCount: 6,
      weeklyComparison: {
        dailyBreakdown: [
          {
            dayIndex: 0,
            dayName: 'Sen',
            lastWeekMinor: 20_000,
            thisWeekMinor: 50_000,
          },
        ],
        lastWeekTotalMinor: 500_000,
        percentChange: 15,
        thisWeekTotalMinor: 575_000,
      },
    });

    mockListCategoryBudgets.mockResolvedValue([
      {
        categoryId: 1,
        categoryName: 'Food & Drink',
        dailyAllowanceMinor: 40_000,
        daysRemainingInMonth: 16,
        hasBudget: true,
        id: 1,
        monthlyLimitMinor: 1_500_000,
        remainingMinor: 700_000,
        spentMinor: 800_000,
        spentPercent: 53,
        status: 'safe',
      },
      {
        categoryId: 2,
        categoryName: 'Transport',
        dailyAllowanceMinor: null,
        daysRemainingInMonth: 16,
        hasBudget: false,
        id: null,
        monthlyLimitMinor: null,
        remainingMinor: null,
        spentMinor: 200_000,
        spentPercent: null,
        status: 'safe',
      },
    ]);
  });

  it('renders analytics overview, breakdown items, and switches to budgets tab', async () => {
    await render(
      <ThemeProvider>
        <LanguageProvider initialLanguage="id">
          <AnalyticsScreen />
        </LanguageProvider>
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole('header', { name: 'Wawasan Finansial' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Total Pengeluaran')).toBeOnTheScreen();
    expect(screen.getAllByText('Food & Drink').length).toBeGreaterThanOrEqual(
      1,
    );

    // Switch to Budgets Tab
    await fireEvent.press(screen.getByText('Anggaran'));
    expect(screen.getByText('Realisasi Anggaran Total')).toBeOnTheScreen();
    expect(screen.getByText('Pasang Anggaran')).toBeOnTheScreen();

    // Open Set Budget Modal for Transport
    await fireEvent.press(screen.getByText('Pasang Anggaran'));
    expect(
      screen.getAllByText('Pasang Anggaran').length,
    ).toBeGreaterThanOrEqual(1);

    await fireEvent.changeText(
      screen.getByPlaceholderText('1000000'),
      '500000',
    );
    await fireEvent.press(screen.getByText('Simpan Batas Anggaran'));
    await waitFor(() =>
      expect(mockSetCategoryBudget).toHaveBeenCalledWith(
        mockDatabase,
        2,
        500_000,
      ),
    );

    // Switch to Trends Tab (testing positive/negative cash flows)
    await fireEvent.press(screen.getByText('Tren Arus Kas'));
    expect(screen.getByText('Tren Arus Kas Bulanan')).toBeOnTheScreen();
    expect(
      screen.getAllByText('+Rp 2.000.000').length,
    ).toBeGreaterThanOrEqual(1);
  });
});
