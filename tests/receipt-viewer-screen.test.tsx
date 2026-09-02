import { fireEvent, render, screen } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ReceiptViewerScreen } from '@/features/receipts/receipt-viewer-screen';
import { LanguageProvider } from '@/lib/i18n/language-context';

function renderScreen() {
  return render(
    <LanguageProvider initialLanguage="en">
      <ReceiptViewerScreen transactionId={42} />
    </LanguageProvider>,
  );
}

const mockRouter = { back: jest.fn(), push: jest.fn() };
const mockDatabase = {};
const mockGetTransaction = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockReceiptFileExists = jest.fn<(storageKey: string) => boolean>();
const mockGetReceiptFileUri = jest.fn<(storageKey: string) => string>();

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      React.useEffect(effect, [effect]),
    useRouter: () => mockRouter,
  };
});

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDatabase,
}));

jest.mock('@/features/transactions/transaction-repository', () => ({
  getTransaction: (...args: unknown[]) => mockGetTransaction(...args),
}));

jest.mock('@/features/receipts/receipt-storage', () => ({
  getReceiptFileUri: (storageKey: string) => mockGetReceiptFileUri(storageKey),
  receiptFileExists: (storageKey: string) => mockReceiptFileExists(storageKey),
}));

const transaction = {
  id: 42,
  receipt: {
    id: 7,
    mimeType: 'image/jpeg',
    storageKey: 'receipts/saved.jpg',
  },
};

describe('receipt viewer screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTransaction.mockResolvedValue(transaction);
    mockReceiptFileExists.mockReturnValue(true);
    mockGetReceiptFileUri.mockReturnValue(
      'file:///documents/receipts/saved.jpg',
    );
  });

  it('resolves the relative key and shows the persistent image', async () => {
    await renderScreen();

    const image = await screen.findByLabelText('Stored receipt image');
    expect(image).toHaveProp('source', {
      uri: 'file:///documents/receipts/saved.jpg',
    });
    expect(mockReceiptFileExists).toHaveBeenCalledWith('receipts/saved.jpg');
    expect(mockGetReceiptFileUri).toHaveBeenCalledWith('receipts/saved.jpg');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Replace or remove receipt' }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions/42/edit');
  });

  it('handles a missing persistent file without crashing', async () => {
    mockReceiptFileExists.mockReturnValue(false);
    await renderScreen();

    expect(
      await screen.findByText('The stored receipt image is unavailable.'),
    ).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Edit Transaction' }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions/42/edit');
  });
});
