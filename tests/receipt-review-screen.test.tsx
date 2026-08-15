import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ReceiptReviewScreen } from '@/features/receipts/receipt-review-screen';

const mockRouter = { dismissTo: jest.fn() };
const mockClearImage = jest.fn();
const mockCreateTransaction =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
let mockFlow: Record<string, unknown>;

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({ name: 'test' }),
}));
jest.mock('@/features/receipts/receipt-flow-context', () => ({
  useReceiptFlow: () => mockFlow,
}));
jest.mock('@/features/transactions/transaction-repository', () => ({
  createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
}));
jest.mock('@/features/categories/category-picker', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    CategoryPicker: ({ onSelect }: { onSelect: (value: unknown) => void }) =>
      React.createElement(
        Pressable,
        {
          accessibilityLabel: 'Pick Food & Drink',
          accessibilityRole: 'button',
          onPress: () =>
            onSelect({ id: 1, name: 'Food & Drink', type: 'expense' }),
        },
        React.createElement(Text, null, 'Food & Drink'),
      ),
  };
});
jest.mock('@/features/payment-methods/payment-method-picker', () => ({
  PaymentMethodPicker: () => null,
}));

const image = {
  displayName: 'receipt.png',
  fileSize: 1000,
  height: 1000,
  mimeType: 'image/png',
  source: 'gallery',
  sourceImageUri: 'file:///receipt.png',
  width: 800,
};

function setFlow(status: 'processed' | 'partial' | 'failed' = 'processed') {
  mockFlow = {
    clearImage: mockClearImage,
    image,
    ocr: {
      parsed:
        status === 'failed'
          ? null
          : {
              localDate: '2026-08-14',
              merchant: 'TOKO TEST',
              subtotalMinor: 30_000,
              taxMinor: 3_000,
              totalMinor: status === 'partial' ? null : 33_000,
              warnings: status === 'partial' ? ['total_not_found'] : [],
            },
      rawText: status === 'failed' ? null : 'TOKO TEST\nTOTAL 33.000',
      status,
    },
  };
}

describe('receipt review screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setFlow();
    mockCreateTransaction.mockResolvedValue({ id: 10 });
  });

  it('shows editable partial results and blocks save without total/category', async () => {
    setFlow('partial');
    await render(<ReceiptReviewScreen />);
    expect(
      screen.getByText(/Some receipt details couldn’t be detected/),
    ).toBeOnTheScreen();
    expect(screen.getByDisplayValue('TOKO TEST')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('save-receipt-expense'));
    expect(
      await screen.findByText('Enter the receipt total.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Choose a category.')).toBeOnTheScreen();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it('saves only after review with parsed OCR metadata', async () => {
    await render(<ReceiptReviewScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Category *' }));
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Pick Food & Drink' }),
    );
    await fireEvent.press(screen.getByTestId('save-receipt-expense'));

    await waitFor(() => expect(mockCreateTransaction).toHaveBeenCalledTimes(1));
    expect(mockCreateTransaction.mock.calls[0]?.[1]).toMatchObject({
      amountMinor: 33_000,
      categoryId: 1,
      counterparty: 'TOKO TEST',
      receipt: {
        ocrRawText: 'TOKO TEST\nTOTAL 33.000',
        ocrStatus: 'processed',
        sourceImageUri: 'file:///receipt.png',
        subtotalMinor: 30_000,
        taxMinor: 3_000,
      },
      type: 'expense',
    });
    expect(mockClearImage).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalled();
  });

  it('keeps a failed receipt attached for manual entry', async () => {
    setFlow('failed');
    await render(<ReceiptReviewScreen />);
    expect(
      screen.getByText(
        'Enter the expense details manually. The receipt remains attached.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Receipt thumbnail')).toBeOnTheScreen();
  });
});
