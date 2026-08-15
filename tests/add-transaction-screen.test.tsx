import { fireEvent, render, screen } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { AddTransactionScreen } from '@/features/transactions/add-transaction-screen';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

describe('add transaction screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the PRD option order and opens manual, camera, or gallery flows', async () => {
    await render(<AddTransactionScreen />);

    expect(
      screen.getByRole('header', { name: 'Add Transaction' }),
    ).toBeOnTheScreen();
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.props.accessibilityLabel)).toEqual([
      'Back',
      'Enter Manually',
      'Scan Receipt',
      'Import Receipt',
    ]);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Enter Manually' }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/transactions/new');

    await fireEvent.press(screen.getByRole('button', { name: 'Scan Receipt' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/receipt/camera');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Import Receipt' }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/receipt/import');
  });
});
