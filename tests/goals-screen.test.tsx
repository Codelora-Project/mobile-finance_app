import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { GoalsScreen } from '@/features/goals/goals-screen';
import { CurrencyProvider } from '@/lib/currency/currency-context';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { ThemeProvider } from '@/lib/theme/theme-context';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
const mockDatabase = {};
const mockListSavingsGoals = jest.fn<() => Promise<unknown>>();
const mockGetGoalsSummary = jest.fn<() => Promise<unknown>>();
const mockCreateSavingsGoal =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockAddGoalTransaction =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetHabitStats = jest.fn<() => Promise<unknown>>();

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
jest.mock('@/features/goals/goals-repository', () => ({
  addGoalTransaction: (...args: unknown[]) => mockAddGoalTransaction(...args),
  createSavingsGoal: (...args: unknown[]) => mockCreateSavingsGoal(...args),
  getGoalsSummary: () => mockGetGoalsSummary(),
  listSavingsGoals: () => mockListSavingsGoals(),
}));
jest.mock('@/features/habits/habit-repository', () => ({
  getHabitStats: () => mockGetHabitStats(),
}));
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return (props: { name: string }) => (
    <ReactNative.Text>{props.name}</ReactNative.Text>
  );
});

describe('goals screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGoalsSummary.mockResolvedValue({
      activeCount: 1,
      completedCount: 0,
      totalSavedMinor: 2_000_000,
      totalTargetMinor: 10_000_000,
    });
    mockGetHabitStats.mockResolvedValue({
      activeLoggingDaysThisMonth: 5,
      bestStreak: 7,
      currentBadge: { emoji: '🔥', minDays: 3, title: 'Api Semangat' },
      currentStreak: 5,
      nextBadge: { emoji: '⚡', minDays: 7, title: '1 Minggu Konsisten' },
      noSpendDaysThisMonth: 10,
    });
    mockListSavingsGoals.mockResolvedValue([
      {
        colorKey: '#3B82F6',
        createdAt: 1000,
        currentAmountMinor: 2_000_000,
        iconKey: 'laptop',
        id: 1,
        isCompleted: false,
        name: 'Laptop Gaming',
        progressPercent: 20,
        targetAmountMinor: 10_000_000,
        targetDate: null,
        updatedAt: 1000,
      },
    ]);
  });

  it('renders goals, habit streak badge, and handles navigation to detail', async () => {
    await render(
      <ThemeProvider>
        <LanguageProvider initialLanguage="id">
          <GoalsScreen />
        </LanguageProvider>
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole('header', { name: 'Target Tabungan' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Laptop Gaming')).toBeOnTheScreen();
    expect(screen.getAllByText('20%').length).toBeGreaterThanOrEqual(1);

    // Click on goal card
    await fireEvent.press(screen.getByText('Laptop Gaming'));
    expect(mockRouter.push).toHaveBeenCalledWith('/goals/1');
  });

  it('opens new goal modal and creates savings goal', async () => {
    mockCreateSavingsGoal.mockResolvedValue({
      colorKey: '#3B82F6',
      createdAt: 1000,
      currentAmountMinor: 0,
      iconKey: 'target',
      id: 2,
      isCompleted: false,
      name: 'Liburan Bali',
      progressPercent: 0,
      targetAmountMinor: 5_000_000,
      targetDate: null,
      updatedAt: 1000,
    });

    await render(
      <ThemeProvider>
        <LanguageProvider initialLanguage="id">
          <GoalsScreen />
        </LanguageProvider>
      </ThemeProvider>,
    );

    await screen.findByText('Laptop Gaming');
    await fireEvent.press(screen.getByText('Target baru'));

    expect(
      screen.getByPlaceholderText('misal: Beli Laptop Baru, Liburan Bali'),
    ).toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText('misal: Beli Laptop Baru, Liburan Bali'),
      'Liburan Bali',
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText('5000000'),
      '5000000',
    );

    await fireEvent.press(screen.getByText('Simpan target tabungan'));
    await waitFor(() => expect(mockCreateSavingsGoal).toHaveBeenCalled());
  });

  it('stores decimal goal amounts in USD minor units', async () => {
    mockCreateSavingsGoal.mockResolvedValue({ id: 2 });

    await render(
      <ThemeProvider>
        <LanguageProvider initialLanguage="en">
          <CurrencyProvider initialCurrency="USD">
            <GoalsScreen />
          </CurrencyProvider>
        </LanguageProvider>
      </ThemeProvider>,
    );

    await screen.findByText('Laptop Gaming');
    await fireEvent.press(screen.getByText('New goal'));
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. New Laptop, Emergency Fund'),
      'Emergency Fund',
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText('50000.00'),
      '12.50',
    );
    await fireEvent.changeText(screen.getByPlaceholderText('0'), '1.25');
    await fireEvent.press(screen.getByText('Save savings goal'));

    await waitFor(() =>
      expect(mockCreateSavingsGoal).toHaveBeenCalledWith(
        mockDatabase,
        expect.objectContaining({
          initialDepositMinor: 125,
          name: 'Emergency Fund',
          targetAmountMinor: 1_250,
        }),
      ),
    );
  });
});
