import { act, renderHook } from '@testing-library/react-native';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import type { DeletedTransactionSnapshot } from '@/features/transactions/transaction-repository';
import { useUndoTransaction } from '@/features/transactions/hooks/use-undo-transaction';

const mockDeleteTransaction = jest.fn<() => Promise<void>>();
const mockFinalizeDeletedTransactionUndo = jest.fn();
const mockRestoreDeletedTransaction = jest.fn<() => Promise<unknown>>();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({}),
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

describe('useUndoTransaction', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('cancels expiry cleanup and rejects duplicate undo while restore is pending', async () => {
    let resolveRestore: ((value: unknown) => void) | null = null;
    mockRestoreDeletedTransaction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRestore = resolve;
        }),
    );
    const { result, unmount } = await renderHook(() =>
      useUndoTransaction({ toastDuration: 5_000 }),
    );

    await act(async () => {
      result.current.showDeletedTransactionUndo(snapshot, 'Deleted');
      await Promise.resolve();
    });
    expect(result.current.canUndo).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(4_999);
      await Promise.resolve();
    });

    let undoPromise: Promise<void> | undefined;
    await act(async () => {
      undoPromise = result.current.handleUndo();
      void result.current.handleUndo();
      await Promise.resolve();
    });
    expect(mockRestoreDeletedTransaction).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });
    expect(mockFinalizeDeletedTransactionUndo).not.toHaveBeenCalled();

    await act(async () => {
      resolveRestore?.({ id: 99 });
      await undoPromise;
    });
    expect(mockFinalizeDeletedTransactionUndo).not.toHaveBeenCalled();

    await act(async () => {
      unmount();
    });
    expect(mockFinalizeDeletedTransactionUndo).not.toHaveBeenCalled();
  });

  it('keeps the receipt during unmount and cleans it only if restore later fails', async () => {
    let rejectRestore: ((reason: unknown) => void) | null = null;
    mockRestoreDeletedTransaction.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectRestore = reject;
        }),
    );
    const warningSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result, unmount } = await renderHook(() =>
      useUndoTransaction({ toastDuration: 5_000 }),
    );
    await act(async () => {
      result.current.showDeletedTransactionUndo(snapshot, 'Deleted');
      await Promise.resolve();
    });

    let undoPromise: Promise<void> | undefined;
    await act(async () => {
      undoPromise = result.current.handleUndo();
      await Promise.resolve();
    });
    await act(async () => {
      unmount();
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
