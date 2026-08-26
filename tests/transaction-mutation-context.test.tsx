import { act, render } from '@testing-library/react-native';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import {
  TransactionMutationProvider,
  useTransactionMutations,
  type TransactionMutationContextValue,
} from '@/features/transactions/transaction-mutation-context';
import type { DeletedTransactionSnapshot } from '@/features/transactions/transaction-repository';
import { LanguageProvider } from '@/lib/i18n/language-context';

const mockDatabase = {};
const mockDeleteTransaction = jest.fn<() => Promise<void>>();
const mockFinalizeDeletedTransactionUndo = jest.fn();
const mockRestoreDeletedTransaction = jest.fn<() => Promise<unknown>>();

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDatabase,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('@/components/ui/undo-toast-banner', () => ({
  UndoToastBanner: () => null,
}));

jest.mock('@/features/transactions/transaction-repository', () => ({
  deleteTransaction: () => mockDeleteTransaction(),
  finalizeDeletedTransactionUndo: (...args: unknown[]) =>
    mockFinalizeDeletedTransactionUndo(...args),
  restoreDeletedTransaction: () => mockRestoreDeletedTransaction(),
}));

const snapshot: DeletedTransactionSnapshot = {
  claimId: null,
  input: {
    amountMinor: 35_000,
    categoryId: 1,
    counterparty: null,
    currencyCode: 'IDR',
    isReimbursable: false,
    localDate: '2026-08-24',
    note: null,
    occurredAt: 1_756_000_000_000,
    paymentMethodId: 1,
    receipt: {
      mimeType: 'image/jpeg',
      sourceImageUri: 'receipts/preserved.jpg',
    },
    timezoneOffsetMinutes: 420,
    type: 'expense',
  },
};

let mutations: TransactionMutationContextValue | null = null;

function MutationConsumer() {
  mutations = useTransactionMutations();
  return null;
}

async function renderProvider() {
  return render(
    <LanguageProvider initialLanguage="id">
      <TransactionMutationProvider>
        <MutationConsumer />
      </TransactionMutationProvider>
    </LanguageProvider>,
  );
}

describe('TransactionMutationProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mutations = null;
    mockDeleteTransaction.mockResolvedValue(undefined);
    mockRestoreDeletedTransaction.mockResolvedValue({ id: 99 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('undoes a created transaction once and increments the revision', async () => {
    const view = await renderProvider();
    const initialRevision = mutations!.revision;
    await act(async () => {
      mutations!.notifyCreated(42);
      await Promise.resolve();
    });
    expect(mutations!.revision).toBe(initialRevision + 1);

    await act(async () => {
      await Promise.all([mutations!.undo(), mutations!.undo()]);
    });

    expect(mockDeleteTransaction).toHaveBeenCalledTimes(1);
    expect(mutations!.revision).toBe(initialRevision + 2);
    await act(async () => {
      view.unmount();
      await Promise.resolve();
    });
  });

  it('finalizes an expired deleted snapshot and a snapshot replaced by another notice', async () => {
    const view = await renderProvider();
    await act(async () => {
      mutations!.notifyDeleted(snapshot);
      await Promise.resolve();
    });
    await act(async () => {
      mutations!.notifyUpdated();
      await Promise.resolve();
    });
    expect(mockFinalizeDeletedTransactionUndo).toHaveBeenCalledWith(snapshot);

    mockFinalizeDeletedTransactionUndo.mockClear();
    await act(async () => {
      mutations!.notifyDeleted(snapshot);
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(5_000);
      await Promise.resolve();
    });
    expect(mockFinalizeDeletedTransactionUndo).toHaveBeenCalledWith(snapshot);
    await act(async () => {
      view.unmount();
      await Promise.resolve();
    });
  });

  it('does not delete a preserved receipt while restore is pending during unmount', async () => {
    let rejectRestore: ((reason: unknown) => void) | null = null;
    mockRestoreDeletedTransaction.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectRestore = reject;
        }),
    );
    const warningSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const view = await renderProvider();
    await act(async () => {
      mutations!.notifyDeleted(snapshot);
      await Promise.resolve();
    });

    let undoPromise: Promise<void> | undefined;
    await act(async () => {
      undoPromise = mutations!.undo();
      await Promise.resolve();
    });
    await act(async () => {
      view.unmount();
      await Promise.resolve();
    });
    expect(mockFinalizeDeletedTransactionUndo).not.toHaveBeenCalled();

    await act(async () => {
      rejectRestore?.(new Error('restore failed'));
      await undoPromise;
    });
    expect(mockFinalizeDeletedTransactionUndo).toHaveBeenCalledWith(snapshot);
    warningSpy.mockRestore();
  });
});
