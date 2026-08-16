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
import { LanguageProvider } from '@/lib/i18n/language-context';

const mockRouter = {
  back: jest.fn(),
  dismissTo: jest.fn(),
};
const mockCreateTransaction = jest.fn();
const mockPickManualReceipt =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({}),
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return (props: { name: string }) => (
    <ReactNative.Text>{props.name}</ReactNative.Text>
  );
});

jest.mock('@/features/transactions/transaction-repository', () => ({
  createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
  deleteTransaction: jest.fn(),
  getTransaction: jest.fn(),
  getTransactionClaimMembership: jest
    .fn<() => Promise<null>>()
    .mockResolvedValue(null),
  updateTransaction: jest.fn(),
}));

jest.mock('@/features/settings/settings-repository', () => ({
  DEFAULT_QUICK_SHORTCUTS: [2000, 5000, 10000, 20000, 50000, 100000],
  getQuickShortcuts: jest
    .fn<() => Promise<number[]>>()
    .mockResolvedValue([2000, 5000, 10000, 20000, 50000, 100000]),
}));

jest.mock('@/features/categories/category-repository', () => ({
  listCategories: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
    {
      createdAt: 0,
      iconKey: null,
      id: 1,
      isDefault: true,
      isFallback: false,
      name: 'Food & Drink',
      sortOrder: 1,
      systemKey: 'expense_food_drink',
      type: 'expense',
      updatedAt: 0,
    },
    {
      createdAt: 0,
      iconKey: null,
      id: 2,
      isDefault: true,
      isFallback: false,
      name: 'Transportation',
      sortOrder: 2,
      systemKey: 'expense_transportation',
      type: 'expense',
      updatedAt: 0,
    },
  ]),
}));

jest.mock('@/features/payment-methods/payment-method-repository', () => ({
  listPaymentMethods: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
    {
      createdAt: 0,
      id: 1,
      isDefault: true,
      isFallback: false,
      name: 'Cash',
      sortOrder: 1,
      systemKey: 'cash',
      updatedAt: 0,
    },
    {
      createdAt: 0,
      id: 2,
      isDefault: true,
      isFallback: false,
      name: 'QRIS',
      sortOrder: 2,
      systemKey: 'qris',
      updatedAt: 0,
    },
  ]),
}));

jest.mock('@/features/transactions/manual-receipt-picker', () => ({
  pickManualReceipt: (...args: unknown[]) => mockPickManualReceipt(...args),
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
    mockPickManualReceipt.mockReset();
  });

  it('defaults to Expense and removes expense-only controls for Income', async () => {
    await render(
      <LanguageProvider initialLanguage="en">
        <ManualTransactionScreen />
      </LanguageProvider>,
    );

    expect(
      screen.getByRole('tab', { name: /Expense/ }).props.accessibilityState,
    ).toEqual({ selected: true });

    // Open advanced section
    await fireEvent.press(screen.getByRole('button', { name: /Details/ }));
    expect(screen.getByLabelText('Reimbursable')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Add receipt' }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: /Income/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('tab', { name: /Income/ }).props.accessibilityState,
      ).toEqual({ selected: true });
      expect(screen.queryByLabelText('Reimbursable')).not.toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: 'Add receipt' }),
      ).not.toBeOnTheScreen();
    });
    expect(
      screen.getByRole('button', { name: /Save Income/ }),
    ).toBeOnTheScreen();
  });

  it('offers quick cash shortcuts (+2k, +5k, +10k)', async () => {
    await render(
      <LanguageProvider initialLanguage="en">
        <ManualTransactionScreen />
      </LanguageProvider>,
    );

    const plus2k = screen.getByRole('button', { name: 'Add +2k' });
    const plus5k = screen.getByRole('button', { name: 'Add +5k' });
    const reset = screen.getByRole('button', { name: 'Reset amount' });

    await fireEvent.press(plus2k);
    expect(screen.getByLabelText('Amount *').props.value).toBe('2000');

    await fireEvent.press(plus5k);
    expect(screen.getByLabelText('Amount *').props.value).toBe('7000');

    await fireEvent.press(reset);
    expect(screen.getByLabelText('Amount *').props.value).toBe('');
  });

  it('offers camera and gallery from one receipt action', async () => {
    mockPickManualReceipt.mockResolvedValue(null);
    await render(
      <LanguageProvider initialLanguage="en">
        <ManualTransactionScreen />
      </LanguageProvider>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Add receipt' }));

    expect(
      screen.getByRole('button', { name: 'Take photo' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Choose from gallery' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));
    expect(mockPickManualReceipt).toHaveBeenCalledWith('camera');
  });

  it('attaches a photo from gallery directly', async () => {
    mockPickManualReceipt.mockResolvedValue({
      displayName: 'receipt.jpg',
      mimeType: 'image/jpeg',
      sourceImageUri: 'file:///cache/receipt.jpg',
    });
    await render(
      <LanguageProvider initialLanguage="en">
        <ManualTransactionScreen />
      </LanguageProvider>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Add receipt' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Choose from gallery' }),
    );

    await waitFor(() => {
      expect(mockPickManualReceipt).toHaveBeenCalledWith('gallery');
      expect(screen.getByText('receipt.jpg')).toBeOnTheScreen();
    });
  });

  it('shows required amount and category errors before saving', async () => {
    await render(
      <LanguageProvider initialLanguage="en">
        <ManualTransactionScreen />
      </LanguageProvider>,
    );

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
    await render(
      <LanguageProvider initialLanguage="en">
        <ManualTransactionScreen />
      </LanguageProvider>,
    );

    await fireEvent.changeText(screen.getByLabelText('Amount *'), '35000');
    await fireEvent.press(screen.getByRole('button', { name: 'Category *' }));
    const selectFood = await screen.findByRole('button', {
      name: 'Select Food',
    });
    await fireEvent.press(selectFood);
    await waitFor(() =>
      expect(screen.getAllByText('Food & Drink').length).toBeGreaterThanOrEqual(
        1,
      ),
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
    await render(
      <LanguageProvider initialLanguage="en">
        <ManualTransactionScreen />
      </LanguageProvider>,
    );

    await fireEvent.changeText(screen.getByLabelText('Amount *'), '1000');
    await fireEvent.press(screen.getByLabelText('Close modal'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Discard changes?',
      'Your unsaved changes will be lost.',
      expect.any(Array),
    );
    expect(mockRouter.back).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
