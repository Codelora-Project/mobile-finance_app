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
import { CurrencyProvider } from '@/lib/currency/currency-context';
import { LanguageProvider } from '@/lib/i18n/language-context';

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  dismissTo: jest.fn(),
  replace: jest.fn(),
};
const mockNavigation = { dispatch: jest.fn() };
const mockDatabase = {};
const mockNotifyCreated = jest.fn();
const mockNotifyDeleted = jest.fn();
const mockNotifyUpdated = jest.fn();
const mockCreateTransaction =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPickManualReceipt =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockListCategories = jest.fn<() => Promise<unknown[]>>();
const mockListPaymentMethods = jest.fn<() => Promise<unknown[]>>();
let mockPreventRemoveEnabled = false;
let mockPreventRemoveCallback:
  | ((event: { data: { action: { type: string } } }) => void)
  | null = null;

const categories = [
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
  {
    createdAt: 0,
    iconKey: null,
    id: 3,
    isDefault: true,
    isFallback: false,
    name: 'Salary',
    sortOrder: 3,
    systemKey: 'income_salary',
    type: 'income',
    updatedAt: 0,
  },
];

const paymentMethods = [
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
    isDefault: false,
    isFallback: false,
    name: 'QRIS',
    sortOrder: 2,
    systemKey: 'qris',
    updatedAt: 0,
  },
];

let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
}));

jest.mock('expo-router/react-navigation', () => ({
  useNavigation: () => mockNavigation,
  usePreventRemove: (
    enabled: boolean,
    callback: (event: { data: { action: { type: string } } }) => void,
  ) => {
    mockPreventRemoveEnabled = enabled;
    mockPreventRemoveCallback = callback;
  },
}));

jest.mock(
  '@/features/transactions/transaction-mutation-context',
  () => ({
    useTransactionMutations: () => ({
      dismissNotice: jest.fn(),
      notifyCreated: mockNotifyCreated,
      notifyDeleted: mockNotifyDeleted,
      notifyUpdated: mockNotifyUpdated,
      revision: 0,
      undo: jest.fn(),
    }),
  }),
);

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDatabase,
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
  SUPPORTED_CURRENCIES: [
    {
      code: 'IDR',
      country: 'Indonesia',
      flag: '🇮🇩',
      name: 'Indonesian Rupiah',
      symbol: 'Rp',
    },
    {
      code: 'USD',
      country: 'United States',
      flag: '🇺🇸',
      name: 'US Dollar',
      symbol: '$',
    },
  ],
}));

jest.mock('@/features/categories/category-repository', () => ({
  listCategories: () => mockListCategories(),
}));

jest.mock('@/features/payment-methods/payment-method-repository', () => ({
  listPaymentMethods: () => mockListPaymentMethods(),
}));

jest.mock('@/features/wallets/wallet-repository', () => ({
  getWallets: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
    {
      accountNumber: null,
      accountType: 'bank',
      color: '#2563EB',
      createdAt: 0,
      currentBalanceMinor: 5000000,
      iconKey: 'bank',
      id: 1,
      includeInCashflow: true,
      initialBalanceMinor: 5000000,
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
      accountType: 'ewallet',
      color: '#00AED6',
      createdAt: 0,
      currentBalanceMinor: 250000,
      iconKey: 'cellphone',
      id: 2,
      includeInCashflow: true,
      initialBalanceMinor: 250000,
      isArchived: false,
      isDefault: false,
      isFallback: false,
      name: 'GoPay',
      sortOrder: 2,
      systemKey: null,
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
    mockParams = {};
    mockCreateTransaction.mockReset();
    mockPickManualReceipt.mockReset();
    mockListCategories.mockReset().mockResolvedValue(categories);
    mockListPaymentMethods.mockReset().mockResolvedValue(paymentMethods);
    mockPreventRemoveEnabled = false;
    mockPreventRemoveCallback = null;
    mockRouter.canGoBack.mockReturnValue(true);
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

  it('adds quick shortcuts without losing USD decimal precision', async () => {
    await render(
      <CurrencyProvider initialCurrency="USD">
        <LanguageProvider initialLanguage="en">
          <ManualTransactionScreen />
        </LanguageProvider>
      </CurrencyProvider>,
    );

    await fireEvent.changeText(screen.getByLabelText('Amount *'), '1.50');
    await fireEvent.press(screen.getByRole('button', { name: 'Add +$2k' }));

    expect(screen.getByLabelText('Amount *').props.value).toBe('2001.50');
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

  it('hydrates the active database default payment method instead of a seed id', async () => {
    mockListPaymentMethods.mockResolvedValueOnce([
      { ...paymentMethods[0], id: 7, isDefault: false, name: 'Cash' },
      { ...paymentMethods[1], id: 9, isDefault: true, name: 'Primary Bank' },
    ]);
    mockCreateTransaction.mockResolvedValueOnce({ id: 200, type: 'expense' });
    await render(
      <LanguageProvider initialLanguage="en">
        <ManualTransactionScreen />
      </LanguageProvider>,
    );

    await screen.findByText('Primary Bank');
    expect(mockPreventRemoveEnabled).toBe(false);
    await fireEvent.changeText(screen.getByLabelText('Amount *'), '35000');
    await fireEvent.press(screen.getByText('Food & Drink'));
    await fireEvent.press(screen.getByTestId('save-transaction'));

    await waitFor(() =>
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ paymentMethodId: 9 }),
        expect.any(Number),
        expect.any(Object),
      ),
    );
  });

  it('blocks saving after reference loading fails and retries successfully', async () => {
    const warningSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockListCategories
      .mockRejectedValueOnce(new Error('closed database'))
      .mockResolvedValueOnce(categories);
    await render(
      <LanguageProvider initialLanguage="en">
        <ManualTransactionScreen />
      </LanguageProvider>,
    );

    expect(
      await screen.findByText('Categories and wallets could not be loaded.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('save-transaction').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Food & Drink')).toBeOnTheScreen();
    warningSpy.mockRestore();
  });

  it('asks before discarding a dirty form and dispatches the blocked action', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(
      <LanguageProvider initialLanguage="en">
        <ManualTransactionScreen />
      </LanguageProvider>,
    );
    await screen.findByText('Food & Drink');
    await fireEvent.changeText(screen.getByLabelText('Amount *'), '1000');
    await waitFor(() => expect(mockPreventRemoveEnabled).toBe(true));

    const action = { type: 'GO_BACK' };
    await act(async () => {
      mockPreventRemoveCallback?.({ data: { action } });
    });
    expect(alertSpy).toHaveBeenCalledWith(
      'Discard changes?',
      'Unsaved transaction changes will be lost.',
      expect.any(Array),
    );
    const buttons = alertSpy.mock.calls[0]?.[2] ?? [];
    const discard = buttons.find((button) => button.text === 'Discard changes');
    discard?.onPress?.();
    expect(mockNavigation.dispatch).toHaveBeenCalledWith(action);
    alertSpy.mockRestore();
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
    await waitFor(() => expect(mockNotifyCreated).toHaveBeenCalledWith(123));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
  });

  it('falls back to transaction history after saving without a back stack', async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    mockCreateTransaction.mockResolvedValueOnce({ id: 124, type: 'expense' });
    await render(
      <LanguageProvider initialLanguage="en">
        <ManualTransactionScreen />
      </LanguageProvider>,
    );

    await fireEvent.changeText(screen.getByLabelText('Amount *'), '35000');
    await fireEvent.press(screen.getByText('Food & Drink'));
    await fireEvent.press(screen.getByTestId('save-transaction'));

    await waitFor(() => expect(mockNotifyCreated).toHaveBeenCalledWith(124));
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith('/transactions'),
    );
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('requests navigation when Close form is pressed', async () => {
    await render(
      <LanguageProvider initialLanguage="en">
        <ManualTransactionScreen />
      </LanguageProvider>,
    );

    await fireEvent.changeText(screen.getByLabelText('Amount *'), '1000');
    await fireEvent.press(screen.getByLabelText('Close form'));

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
  });
  it('prefills category and type when opened via quick category action', async () => {
    mockParams = {
      categoryId: '1',
      categoryName: 'Food & Drink',
      type: 'expense',
    };

    await render(
      <LanguageProvider initialLanguage="en">
        <ManualTransactionScreen />
      </LanguageProvider>,
    );

    expect(
      screen.getByRole('tab', { name: /Expense/ }).props.accessibilityState,
    ).toEqual({ selected: true });
    expect(screen.getAllByText('Food & Drink').length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it('switches to Transfer tab and handles transfer with optional transfer fee toggle', async () => {
    mockParams = {};
    let resolveTransfer: ((value: unknown) => void) | null = null;
    mockCreateTransaction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTransfer = resolve;
        }),
    );

    await render(
      <LanguageProvider initialLanguage="id">
        <ManualTransactionScreen />
      </LanguageProvider>,
    );

    // 1. Switch to Transfer tab
    const transferTab = screen.getByRole('tab', { name: 'Transfer' });
    await fireEvent.press(transferTab);

    expect(transferTab.props.accessibilityState).toEqual({ selected: true });

    // 2. Set transfer amount
    const amountInput = screen.getByLabelText('Nominal wajib');
    await fireEvent.changeText(amountInput, '500000');

    // 3. Open Source Wallet picker and select BCA
    const sourcePickerBtn = screen.getByLabelText('Dari Dompet / Rekening');
    await fireEvent.press(sourcePickerBtn);

    await waitFor(() =>
      expect(screen.getAllByText('Bank BCA').length).toBeGreaterThanOrEqual(1),
    );
    await fireEvent.press(screen.getAllByText('Bank BCA')[0]);

    // 4. Open Destination Wallet picker and select GoPay
    const destPickerBtn = screen.getByLabelText('Ke Dompet / Rekening');
    await fireEvent.press(destPickerBtn);

    await waitFor(() =>
      expect(screen.getAllByText('GoPay').length).toBeGreaterThanOrEqual(1),
    );
    await fireEvent.press(screen.getAllByText('GoPay')[0]);

    // 5. Toggle Transfer Fee Switch ON
    const feeToggle = screen.getByLabelText('Biaya Transfer');
    await fireEvent(feeToggle, 'valueChange', true);

    // 6. Set Transfer Fee amount to 2500
    const feeAmountInput = screen.getByLabelText('Masukkan biaya transfer');
    await fireEvent.changeText(feeAmountInput, '2500');

    // 7. Save Transfer
    const saveBtn = screen.getByTestId('save-transaction');
    await fireEvent.press(saveBtn);
    const confirmTransfer = await screen.findByTestId('confirm-transfer');
    const confirmPress = confirmTransfer.props.onClick as () => void;
    await act(async () => {
      confirmPress();
      confirmPress();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          amountMinor: 500000,
          paymentMethodId: 1,
          transferFeeMinor: 2500,
          transferToPaymentMethodId: 2,
          type: 'transfer',
        }),
        expect.any(Number),
        expect.any(Object),
      ),
    );
    expect(mockCreateTransaction).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveTransfer?.({ id: 99, type: 'transfer' });
    });
    await waitFor(() => expect(mockNotifyCreated).toHaveBeenCalledWith(99));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
  });

  it('filters category grid by income type when Income tab is selected', async () => {
    mockCreateTransaction.mockResolvedValueOnce({ id: 100, type: 'income' });

    await render(
      <LanguageProvider initialLanguage="id">
        <ManualTransactionScreen />
      </LanguageProvider>,
    );

    // Initial Expense tab shows Food & Drink
    expect(screen.getByText('Food & Drink')).toBeOnTheScreen();
    expect(screen.queryByText('Salary')).not.toBeOnTheScreen();

    // Switch to Income tab
    await fireEvent.press(screen.getByRole('tab', { name: 'Pemasukan' }));

    // Now Salary should be displayed, and Food & Drink should be hidden
    await waitFor(() => {
      expect(screen.getByText('Salary')).toBeOnTheScreen();
      expect(screen.queryByText('Food & Drink')).not.toBeOnTheScreen();
    });

    // Enter amount and select Salary category
    await fireEvent.changeText(
      screen.getByLabelText('Nominal wajib'),
      '10000000',
    );
    await fireEvent.press(screen.getByText('Salary'));

    // Save income transaction
    await fireEvent.press(screen.getByTestId('save-transaction'));

    await waitFor(() =>
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          amountMinor: 10000000,
          categoryId: 3,
          type: 'income',
        }),
        expect.any(Number),
        expect.any(Object),
      ),
    );
  });
});
