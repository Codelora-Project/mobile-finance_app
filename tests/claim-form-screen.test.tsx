import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert } from 'react-native';

import { ClaimFormScreen } from '@/features/claims/claim-form-screen';

const mockRouter = { back: jest.fn(), dismissTo: jest.fn() };
const mockDatabase = {};
const mockCreateClaim = jest.fn<(...args: unknown[]) => Promise<number>>();
const mockGetClaim = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockListEligible = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockUpdateClaim = jest.fn<(...args: unknown[]) => Promise<void>>();

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDatabase }));
jest.mock('@/features/claims/claim-repository', () => ({
  createClaim: (...args: unknown[]) => mockCreateClaim(...args),
  getClaim: (...args: unknown[]) => mockGetClaim(...args),
  listEligibleClaimExpenses: (...args: unknown[]) => mockListEligible(...args),
  updateDraftClaim: (...args: unknown[]) => mockUpdateClaim(...args),
}));

const eligible = [
  {
    amountMinor: 35_000,
    categoryName: 'Travel',
    counterparty: 'Taxi',
    currencyCode: 'IDR',
    hasReceipt: false,
    id: 1,
    localDate: '2026-08-10',
  },
  {
    amountMinor: 15_000,
    categoryName: 'Travel',
    counterparty: 'Train',
    currencyCode: 'IDR',
    hasReceipt: true,
    id: 2,
    localDate: '2026-08-15',
  },
  {
    amountMinor: 2_000,
    categoryName: 'Travel',
    counterparty: 'USD Taxi',
    currencyCode: 'USD',
    hasReceipt: false,
    id: 3,
    localDate: '2026-08-16',
  },
];

describe('claim form screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListEligible.mockResolvedValue(eligible);
    mockCreateClaim.mockResolvedValue(9);
    mockGetClaim.mockResolvedValue(null);
    mockUpdateClaim.mockResolvedValue(undefined);
  });

  it('reviews and saves a same-currency Draft with missing receipt allowed', async () => {
    await render(<ClaimFormScreen />);
    await screen.findByRole('header', { name: 'New Claim' });

    await fireEvent.changeText(screen.getByLabelText('Title *'), 'August Trip');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Select Expenses' }),
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Taxi, IDR' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Train, IDR' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Review Claim' }));

    expect(
      screen.getByRole('header', { name: 'Claim Review' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('1 receipt attached · 1 missing'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Save Draft' }));

    await waitFor(() =>
      expect(mockCreateClaim).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          periodMode: 'auto',
          title: 'August Trip',
          transactionIds: [1, 2],
        }),
      ),
    );
    expect(mockRouter.dismissTo).toHaveBeenCalledWith({
      params: { feedback: 'Draft claim saved.' },
      pathname: '/claims/9',
    });
  });

  it('rejects a different currency during selection', async () => {
    await render(<ClaimFormScreen />);
    await screen.findByRole('header', { name: 'New Claim' });
    await fireEvent.changeText(screen.getByLabelText('Title *'), 'Mixed');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Select Expenses' }),
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Taxi, IDR' }));
    await fireEvent.press(
      screen.getByRole('checkbox', { name: 'USD Taxi, USD' }),
    );

    expect(
      screen.getByText('This expense uses a different currency.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('1 selected')).toBeOnTheScreen();
  });

  it('rejects a selection whose aggregate exceeds the safe money range', async () => {
    mockListEligible.mockResolvedValueOnce([
      { ...eligible[0], amountMinor: Number.MAX_SAFE_INTEGER },
      { ...eligible[1], amountMinor: 1 },
    ]);
    await render(<ClaimFormScreen />);
    await screen.findByRole('header', { name: 'New Claim' });
    await fireEvent.changeText(screen.getByLabelText('Title *'), 'Large');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Select Expenses' }),
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Taxi, IDR' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Train, IDR' }));

    expect(
      screen.getByText('The selected expense total is too large.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('1 selected')).toBeOnTheScreen();
  });

  it('protects unsaved claim details when leaving from the first step', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<ClaimFormScreen />);
    await screen.findByRole('header', { name: 'New Claim' });

    await fireEvent.changeText(screen.getByLabelText('Title *'), 'Unsaved');
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
