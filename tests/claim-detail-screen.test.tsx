import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert } from 'react-native';

import { ClaimDetailScreen } from '@/features/claims/claim-detail-screen';
import { LanguageProvider } from '@/lib/i18n/language-context';

function renderScreen() {
  return render(
    <LanguageProvider initialLanguage="en">
      <ClaimDetailScreen claimId={9} />
    </LanguageProvider>,
  );
}

const mockRouter = { back: jest.fn(), dismissTo: jest.fn(), push: jest.fn() };
const mockDatabase = {};
const mockDelete = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockGetClaim = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockTransition = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockGenerateClaimPdf =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockShareClaimPdf = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      React.useEffect(effect, [effect]),
    useRouter: () => mockRouter,
  };
});
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDatabase }));
jest.mock('@/features/claims/claim-pdf', () => ({
  generateClaimPdf: (...args: unknown[]) => mockGenerateClaimPdf(...args),
  shareClaimPdf: (...args: unknown[]) => mockShareClaimPdf(...args),
}));
jest.mock('@/features/claims/claim-repository', () => ({
  deleteDraftClaim: (...args: unknown[]) => mockDelete(...args),
  getClaim: (...args: unknown[]) => mockGetClaim(...args),
  transitionClaimStatus: (...args: unknown[]) => mockTransition(...args),
}));

const claim = {
  createdAt: 1,
  currencyCode: 'IDR',
  description: 'Client travel',
  expenses: [
    {
      amountMinor: 35_000,
      categoryName: 'Travel',
      counterparty: 'Taxi',
      currencyCode: 'IDR',
      hasReceipt: false,
      id: 1,
      localDate: '2026-08-10',
    },
  ],
  id: 9,
  itemCount: 1,
  periodEnd: '2026-08-10',
  periodMode: 'auto',
  periodStart: '2026-08-10',
  receiptAttachedCount: 0,
  receiptMissingCount: 1,
  reimbursedAt: null,
  rejectedAt: null,
  status: 'draft',
  submittedAt: null,
  title: 'Travel Claim',
  totalMinor: 35_000,
  updatedAt: 1,
};

describe('claim detail screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClaim.mockResolvedValue(claim);
    mockDelete.mockResolvedValue(undefined);
    mockTransition.mockResolvedValue(undefined);
    mockGenerateClaimPdf.mockResolvedValue({
      fileName: 'expense-claim-travel-2026-08-15.pdf',
      numberOfPages: 1,
      uri: 'file:///cache/exports/claim.pdf',
    });
    mockShareClaimPdf.mockResolvedValue({
      fileName: 'expense-claim-travel-2026-08-15.pdf',
      numberOfPages: 1,
      uri: 'file:///cache/exports/claim.pdf',
    });
  });

  it('allows Draft editing, submission, membership viewing, and deletion', async () => {
    await renderScreen();
    expect(await screen.findByText('Travel Claim')).toBeOnTheScreen();
    expect(screen.getByText('Receipt missing')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Export PDF' }));
    await waitFor(() =>
      expect(mockGenerateClaimPdf).toHaveBeenCalledWith(
        expect.anything(),
        9,
        expect.any(Number),
        expect.any(Object),
      ),
    );
    expect(
      await screen.findByText(/PDF generated: expense-claim-travel/),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Edit claim' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/claims/9/edit');

    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        buttons
          ?.find(
            (button) => button.text === 'Confirm' || button.text === 'Delete',
          )
          ?.onPress?.();
      });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Mark submitted' }),
    );
    await waitFor(() =>
      expect(mockTransition).toHaveBeenCalledWith(
        expect.anything(),
        9,
        'submitted',
      ),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Delete claim' }));
    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith(expect.anything(), 9),
    );
    alertSpy.mockRestore();
  });

  it.each([
    ['submitted', 'Submitted claims are locked.', 'Move back to draft'],
    [
      'rejected',
      'Move this claim back to draft before editing it.',
      'Move back to draft',
    ],
    ['reimbursed', 'Reimbursed claims are final and read-only.', null],
  ])('renders %s lock behavior', async (status, message, action) => {
    mockGetClaim.mockResolvedValue({ ...claim, status });
    await renderScreen();
    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Edit claim' }),
    ).not.toBeOnTheScreen();
    if (action) {
      expect(screen.getByRole('button', { name: action })).toBeOnTheScreen();
    } else {
      expect(
        screen.queryByRole('button', { name: 'Move back to draft' }),
      ).not.toBeOnTheScreen();
    }
    if (status === 'submitted') {
      expect(
        screen.getByRole('button', { name: 'Mark reimbursed' }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: 'Mark rejected' }),
      ).toBeOnTheScreen();
    }
    if (status === 'reimbursed') {
      await fireEvent.press(screen.getByRole('button', { name: 'Share PDF' }));
      await waitFor(() =>
        expect(mockShareClaimPdf).toHaveBeenCalledWith(
          expect.anything(),
          9,
          expect.any(Number),
          expect.any(Object),
        ),
      );
    }
  });

  it('prevents duplicate status writes from rapid confirmation taps', async () => {
    let resolveTransition: (() => void) | undefined;
    mockTransition.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveTransition = resolve;
        }),
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderScreen();
    await screen.findByText('Travel Claim');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Mark submitted' }),
    );
    const confirm = alertSpy.mock.calls[0]?.[2]?.find(
      (button) => button.text === 'Confirm',
    )?.onPress;
    await act(async () => {
      confirm?.();
      confirm?.();
      await Promise.resolve();
    });

    expect(mockTransition).toHaveBeenCalledTimes(1);
    await act(async () => resolveTransition?.());
    await waitFor(() => expect(mockGetClaim).toHaveBeenCalledTimes(2));
    alertSpy.mockRestore();
  });
});
