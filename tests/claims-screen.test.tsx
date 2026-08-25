import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ClaimsScreen } from '@/features/claims/claims-screen';

const mockRouter = { back: jest.fn(), push: jest.fn() };
const mockDatabase = {};
const mockListClaims = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      React.useEffect(effect, [effect]),
    useLocalSearchParams: () => ({}),
    useRouter: () => mockRouter,
  };
});
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDatabase }));
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return (props: { name: string }) => (
    <ReactNative.Text>{props.name}</ReactNative.Text>
  );
});
jest.mock('@/features/claims/claim-repository', () => ({
  listClaims: (...args: unknown[]) => mockListClaims(...args),
}));

const summary = {
  createdAt: 1,
  currencyCode: 'IDR',
  description: null,
  id: 9,
  itemCount: 2,
  periodEnd: '2026-08-15',
  periodMode: 'auto',
  periodStart: '2026-08-10',
  receiptAttachedCount: 1,
  receiptMissingCount: 1,
  reimbursedAt: null,
  rejectedAt: null,
  status: 'draft',
  submittedAt: null,
  title: 'Travel Claim',
  totalMinor: 50_000,
  updatedAt: 1,
};

describe('claims screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListClaims.mockResolvedValue([summary]);
  });

  it('lists claims, navigates to detail, and applies status filters', async () => {
    await render(<ClaimsScreen />);
    const row = await screen.findByRole('button', {
      name: 'Travel Claim, Draf',
    });
    expect(screen.getByText('1 klaim perlu tindakan')).toBeOnTheScreen();
    await fireEvent.press(row);
    expect(mockRouter.push).toHaveBeenCalledWith('/claims/9');

    await fireEvent.press(screen.getByRole('tab', { name: 'Diajukan' }));
    await waitFor(() =>
      expect(mockListClaims).toHaveBeenLastCalledWith(
        expect.anything(),
        'submitted',
      ),
    );
  });

  it('ignores a stale claim response after the status filter changes', async () => {
    let resolveInitial: (claims: unknown[]) => void = () => {};
    const initialRequest = new Promise<unknown[]>((resolve) => {
      resolveInitial = resolve;
    });
    const submitted = {
      ...summary,
      id: 10,
      status: 'submitted',
      title: 'Newest Submitted Claim',
    };
    mockListClaims
      .mockImplementationOnce(() => initialRequest)
      .mockResolvedValueOnce([submitted]);

    await render(<ClaimsScreen />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Diajukan' }));
    expect(
      await screen.findByRole('button', {
        name: 'Newest Submitted Claim, Diajukan',
      }),
    ).toBeOnTheScreen();

    await act(async () => {
      resolveInitial([summary]);
      await initialRequest;
    });

    expect(screen.queryByText('Travel Claim')).not.toBeOnTheScreen();
    expect(screen.getByText('Newest Submitted Claim')).toBeOnTheScreen();
  });
});
