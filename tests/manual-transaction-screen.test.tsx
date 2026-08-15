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
const mockPickManualReceipt =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockRecognizeReceipt =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockParseReceipt = jest.fn<(...args: unknown[]) => unknown>();

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

jest.mock('@/features/transactions/manual-receipt-picker', () => ({
  pickManualReceipt: (...args: unknown[]) => mockPickManualReceipt(...args),
}));

jest.mock('@/features/receipts/ocr-service', () => ({
  recognizeReceipt: (...args: unknown[]) => mockRecognizeReceipt(...args),
}));

jest.mock('@/features/receipts/receipt-parser', () => ({
  parseReceipt: (...args: unknown[]) => mockParseReceipt(...args),
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
    mockRecognizeReceipt.mockReset();
    mockParseReceipt.mockReset();
  });

  it('defaults to Expense and removes expense-only controls for Income', async () => {
    await render(<ManualTransactionScreen />);

    expect(
      screen.getByRole('tab', { name: 'Expense' }).props.accessibilityState,
    ).toEqual({ selected: true });
    expect(screen.getByLabelText('Reimbursable')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Add receipt' }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Income' }));

    await waitFor(() => {
      expect(
        screen.getByRole('tab', { name: 'Income' }).props.accessibilityState,
      ).toEqual({ selected: true });
      expect(screen.queryByLabelText('Reimbursable')).not.toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: 'Add receipt' }),
      ).not.toBeOnTheScreen();
    });
    expect(
      screen.getByRole('button', { name: 'Save Income' }),
    ).toBeOnTheScreen();
  });

  it('offers camera and gallery from one receipt action', async () => {
    mockPickManualReceipt.mockResolvedValue(null);
    await render(<ManualTransactionScreen />);

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

  it('attaches a gallery receipt and fills empty fields from OCR', async () => {
    mockPickManualReceipt.mockResolvedValue({
      displayName: 'receipt.jpg',
      mimeType: 'image/jpeg',
      sourceImageUri: 'file:///cache/receipt.jpg',
    });
    mockRecognizeReceipt.mockResolvedValue({ rawText: 'TOKO\nTOTAL 45000' });
    mockParseReceipt.mockReturnValue({
      localDate: '2026-08-14',
      merchant: 'Toko',
      subtotalMinor: 40_000,
      taxMinor: 5_000,
      totalMinor: 45_000,
      warnings: [],
    });
    await render(<ManualTransactionScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Add receipt' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Choose from gallery' }),
    );

    await waitFor(() => {
      expect(mockPickManualReceipt).toHaveBeenCalledWith('gallery');
      expect(mockRecognizeReceipt).toHaveBeenCalledWith(
        'file:///cache/receipt.jpg',
      );
      expect(screen.getByText('receipt.jpg')).toBeOnTheScreen();
      expect(screen.getByLabelText('Merchant').props.value).toBe('Toko');
      expect(screen.getByLabelText('Transaction date').props.value).toBe(
        '2026-08-14',
      );
    });
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
