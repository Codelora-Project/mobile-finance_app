import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { TransactionFilterModal } from '@/features/transactions/transaction-filter-modal';

const mockDatabase = {};

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDatabase,
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return ({ name }: { name: string }) => (
    <ReactNative.Text>{name}</ReactNative.Text>
  );
});

jest.mock('@/features/categories/category-repository', () => ({
  listCategories: jest.fn<() => Promise<unknown>>().mockResolvedValue([
    { id: 1, name: 'Food & Drink', type: 'expense' },
    { id: 2, name: 'Salary', type: 'income' },
  ]),
}));

jest.mock('@/features/payment-methods/payment-method-repository', () => ({
  listPaymentMethods: jest
    .fn<() => Promise<unknown>>()
    .mockResolvedValue([{ id: 10, name: 'Cash' }]),
}));

describe('transaction filter modal', () => {
  it('applies all filters and validates date order', async () => {
    const onApply = jest.fn();
    await render(
      <TransactionFilterModal
        filters={{}}
        onApply={onApply}
        onClose={jest.fn()}
        visible
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /Pemasukan/ }),
      ).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole('radio', { name: /Pemasukan/ }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Salary' }));
    await fireEvent.changeText(
      screen.getByLabelText('Dari Tanggal'),
      '2026-08-31',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Sampai Tanggal'),
      '2026-08-01',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Terapkan Filter' }),
    );
    expect(
      screen.getByText(
        'Tanggal awal tidak boleh lebih besar dari tanggal akhir.',
      ),
    ).toBeOnTheScreen();
    expect(onApply).not.toHaveBeenCalled();

    await fireEvent.changeText(
      screen.getByLabelText('Dari Tanggal'),
      '2026-08-01',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Sampai Tanggal'),
      '2026-08-31',
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Cash' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Klaim Kantor' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Ada Struk' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Terapkan Filter' }),
    );

    expect(onApply).toHaveBeenCalledWith({
      categoryId: 2,
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      hasReceipt: true,
      isReimbursable: true,
      paymentMethodId: 10,
      type: 'income',
    });
  });
});
