import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert } from 'react-native';

import { ManualTransactionScreen } from '@/features/transactions/manual-transaction-screen';

const mockRouter = {
  back: jest.fn(),
  dismissTo: jest.fn(),
};
const mockCreateTransaction = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({}),
}));

jest.mock('@/features/transactions/transaction-repository', () => ({
  createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
  deleteTransaction: jest.fn(),
  getTransaction: jest.fn(),
  updateTransaction: jest.fn(),
}));

jest.mock('@/features/transactions/manual-receipt-picker', () => ({
  pickManualReceipt: jest.fn(),
}));

jest.mock('@/features/categories/category-picker', () => {
  const ReactNative = require('react-native');
  return {
    CategoryPicker: ({ onSelect }: { onSelect: (value: unknown) => void }) => (
      <ReactNative.Pressable
        accessibilityLabel="Select Food"
        accessibilityRole="button"
        onPress={() =>
          onSelect({
            id: 1,
            name: 'Food & Drink',
            type: 'expense',
          })
        }
      >
        <ReactNative.Text>Select Food</ReactNative.Text>
      </ReactNative.Pressable>
    ),
  };
});

jest.mock('@/features/payment-methods/payment-method-picker', () => ({
  PaymentMethodPicker: () => null,
}));

describe('manual transaction form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTransaction.mockReset();
  });

  it('defaults to Expense and removes expense-only controls for Income', async () => {
    await render(<ManualTransactionScreen />);

    expect(
      screen.getByRole('tab', { name: 'Expense' }).props.accessibilityState,
    ).toEqual({ selected: true });
    expect(screen.getByLabelText('Reimbursable')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Attach receipt' }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Income' }));

    await waitFor(() => {
      expect(
        screen.getByRole('tab', { name: 'Income' }).props.accessibilityState,
      ).toEqual({ selected: true });
      expect(screen.queryByLabelText('Reimbursable')).not.toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: 'Attach receipt' }),
      ).not.toBeOnTheScreen();
    });
    expect(
      screen.getByRole('button', { name: 'Save Income' }),
    ).toBeOnTheScreen();
  });

  it('shows required amount and category errors before saving', async () => {
    await render(<ManualTransactionScreen />);

    await fireEvent.press(screen.getByTestId('save-transaction'));

    await waitFor(() => {
      expect(screen.getByText('Enter an amount.')).toBeOnTheScreen();
      expect(screen.getByText('Choose a category.')).toBeOnTheScreen();
    });
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it('prevents a double save while the first write is pending', async () => {
    let resolveSave: ((value: unknown) => void) | null = null;
    mockCreateTransaction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    await render(<ManualTransactionScreen />);

    await fireEvent.changeText(screen.getByLabelText('Amount *'), '35000');
    await fireEvent.press(screen.getByRole('button', { name: 'Category *' }));
    const selectFood = await screen.findByRole('button', {
      name: 'Select Food',
    });
    await fireEvent.press(selectFood);
    await waitFor(() =>
      expect(screen.getByText('Food & Drink')).toBeOnTheScreen(),
    );

    const saveButton = screen.getByTestId('save-transaction');
    await fireEvent.press(saveButton);
    await fireEvent.press(saveButton);

    await waitFor(() => expect(mockCreateTransaction).toHaveBeenCalledTimes(1));
    await act(async () => {
      resolveSave?.({ id: 123, type: 'expense' });
    });
    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalled());
  });

  it('guards Back when the form has unsaved changes', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    await render(<ManualTransactionScreen />);

    await fireEvent.changeText(screen.getByLabelText('Amount *'), '1000');
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(alertSpy).toHaveBeenCalledWith(
      'Discard changes?',
      'Your unsaved changes will be lost.',
      expect.any(Array),
    );
    expect(mockRouter.back).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
