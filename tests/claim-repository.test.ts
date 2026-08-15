import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createClaim,
  deleteDraftClaim,
  getClaim,
  listClaims,
  listEligibleClaimExpenses,
  transitionClaimStatus,
  updateDraftClaim,
  type ClaimStatus,
} from '@/features/claims/claim-repository';

const getAllAsync = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const getFirstAsync = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const runAsync = jest.fn<(...args: unknown[]) => Promise<unknown>>();
let database: SQLiteDatabase;

const expense = {
  amount_minor: 35_000,
  category_name: 'Travel',
  counterparty: 'Taxi',
  currency_code: 'IDR',
  existing_claim_id: null,
  has_receipt: 0,
  id: 1,
  is_reimbursable: 1,
  local_date: '2026-08-10',
  type: 'expense',
};

beforeEach(() => {
  jest.clearAllMocks();
  database = {
    getAllAsync,
    getFirstAsync,
    runAsync,
    withExclusiveTransactionAsync: async (
      task: (transaction: SQLiteDatabase) => Promise<void>,
    ) => task(database),
  } as unknown as SQLiteDatabase;
  runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 9 });
});

describe('claim repository', () => {
  it('lists 100+ Claims newest-first with one aggregate query', async () => {
    getAllAsync.mockResolvedValueOnce(
      Array.from({ length: 120 }, (_, index) => ({
        created_at: index,
        currency_code: 'IDR',
        description: null,
        id: 120 - index,
        item_count: 1,
        period_end: '2026-08-15',
        period_mode: 'auto',
        period_start: '2026-08-15',
        receipt_attached_count: 0,
        reimbursed_at: null,
        rejected_at: null,
        status: 'draft',
        submitted_at: null,
        title: `Claim ${120 - index}`,
        total_minor: 1_000,
        updated_at: 120 - index,
      })),
    );

    await expect(listClaims(database)).resolves.toHaveLength(120);
    expect(getAllAsync).toHaveBeenCalledTimes(1);
    expect(String(getAllAsync.mock.calls[0]?.[0])).toContain(
      'ORDER BY c.updated_at DESC, c.id DESC',
    );
  });

  it('lists only eligible expenses with receipt optional', async () => {
    getAllAsync.mockResolvedValueOnce([expense]);

    const result = await listEligibleClaimExpenses(database);

    expect(result).toEqual([
      expect.objectContaining({ hasReceipt: false, id: 1 }),
    ]);
    const sql = String(getAllAsync.mock.calls[0]?.[0]);
    expect(sql).toContain("t.type = 'expense'");
    expect(sql).toContain('t.is_reimbursable = 1');
    expect(sql).toContain('ci.claim_id IS NULL');
  });

  it('creates an accurate same-currency Draft with an auto period', async () => {
    getAllAsync.mockResolvedValueOnce([
      expense,
      {
        ...expense,
        amount_minor: 15_000,
        has_receipt: 1,
        id: 2,
        local_date: '2026-08-15',
      },
    ]);

    await expect(
      createClaim(
        database,
        {
          description: 'August travel',
          periodMode: 'auto',
          title: 'Travel reimbursement',
          transactionIds: [1, 2],
        },
        100,
      ),
    ).resolves.toBe(9);

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO claims'),
      'Travel reimbursement',
      'August travel',
      'auto',
      '2026-08-10',
      '2026-08-15',
      100,
      100,
    );
    expect(
      runAsync.mock.calls.filter((call) =>
        String(call[0]).includes('INSERT INTO claim_items'),
      ),
    ).toHaveLength(2);
  });

  for (const [label, rowPatch, code] of [
    ['income', { type: 'income' }, 'VALIDATION_FAILED'],
    ['non-reimbursable', { is_reimbursable: 0 }, 'VALIDATION_FAILED'],
    ['already claimed', { existing_claim_id: 44 }, 'VALIDATION_FAILED'],
  ] as const) {
    it(`rejects a ${label} transaction`, async () => {
      getAllAsync.mockResolvedValueOnce([{ ...expense, ...rowPatch }]);

      await expect(
        createClaim(database, {
          description: '',
          periodMode: 'auto',
          title: 'Claim',
          transactionIds: [1],
        }),
      ).rejects.toMatchObject({ code });
    });
  }

  it('allows USD + USD and rejects IDR + USD', async () => {
    getAllAsync.mockResolvedValueOnce([
      { ...expense, currency_code: 'USD' },
      { ...expense, currency_code: 'USD', id: 2 },
    ]);
    await expect(
      createClaim(database, {
        description: '',
        periodMode: 'auto',
        title: 'USD Claim',
        transactionIds: [1, 2],
      }),
    ).resolves.toBe(9);

    getAllAsync.mockResolvedValueOnce([
      expense,
      { ...expense, currency_code: 'USD', id: 2 },
    ]);
    await expect(
      createClaim(database, {
        description: '',
        periodMode: 'auto',
        title: 'Mixed Claim',
        transactionIds: [1, 2],
      }),
    ).rejects.toMatchObject({ code: 'CLAIM_CURRENCY_MISMATCH' });
  });

  it('rejects a selected expense total outside the safe money range', async () => {
    getAllAsync.mockResolvedValueOnce([
      { ...expense, amount_minor: Number.MAX_SAFE_INTEGER },
      { ...expense, amount_minor: 1, id: 2 },
    ]);

    await expect(
      createClaim(database, {
        description: '',
        periodMode: 'auto',
        title: 'Too large',
        transactionIds: [1, 2],
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'The selected expense total is too large.',
    });
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('derives total and receipt counts in one aggregate query', async () => {
    getFirstAsync.mockResolvedValueOnce({
      created_at: 1,
      currency_code: 'IDR',
      description: null,
      id: 9,
      item_count: 2,
      period_end: '2026-08-15',
      period_mode: 'auto',
      period_start: '2026-08-10',
      receipt_attached_count: 1,
      reimbursed_at: null,
      rejected_at: null,
      status: 'draft',
      submitted_at: null,
      title: 'Travel',
      total_minor: 50_000,
      updated_at: 2,
    });
    getAllAsync.mockResolvedValueOnce([expense]);

    const claim = await getClaim(database, 9);

    expect(claim).toEqual(
      expect.objectContaining({
        receiptAttachedCount: 1,
        receiptMissingCount: 1,
        totalMinor: 50_000,
      }),
    );
    expect(String(getFirstAsync.mock.calls[0]?.[0])).toContain(
      'COALESCE(SUM(t.amount_minor), 0)',
    );
  });

  it('edits membership only while Draft and deletes items without transactions', async () => {
    getFirstAsync.mockResolvedValueOnce({ status: 'draft' });
    getAllAsync.mockResolvedValueOnce([expense]);
    await updateDraftClaim(database, 9, {
      description: '',
      periodMode: 'auto',
      title: 'Updated',
      transactionIds: [1],
    });
    expect(runAsync).toHaveBeenCalledWith(
      'DELETE FROM claim_items WHERE claim_id = ?',
      9,
    );

    jest.clearAllMocks();
    getFirstAsync.mockResolvedValueOnce({ status: 'draft' });
    runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 0 });
    await deleteDraftClaim(database, 9);
    expect(runAsync).toHaveBeenCalledWith(
      'DELETE FROM claim_items WHERE claim_id = ?',
      9,
    );
    expect(runAsync).toHaveBeenCalledWith('DELETE FROM claims WHERE id = ?', 9);
    expect(runAsync).not.toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM transactions'),
      expect.anything(),
    );
  });

  it.each([
    ['draft', 'submitted'],
    ['submitted', 'draft'],
    ['submitted', 'reimbursed'],
    ['submitted', 'rejected'],
    ['rejected', 'draft'],
  ])('allows %s → %s', async (current, next) => {
    getFirstAsync.mockResolvedValueOnce({ status: current });
    if (next === 'submitted') {
      getAllAsync
        .mockResolvedValueOnce([{ transaction_id: 1 }])
        .mockResolvedValueOnce([expense]);
    }
    await expect(
      transitionClaimStatus(database, 9, next as ClaimStatus, 200),
    ).resolves.toBeUndefined();
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE claims'),
      next,
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      9,
    );
  });

  it('blocks submitting an empty Draft', async () => {
    getFirstAsync.mockResolvedValueOnce({ status: 'draft' });
    getAllAsync.mockResolvedValueOnce([]);
    await expect(
      transitionClaimStatus(database, 9, 'submitted'),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(runAsync).not.toHaveBeenCalled();
  });

  it.each([
    ['draft', 'reimbursed'],
    ['draft', 'rejected'],
    ['reimbursed', 'draft'],
  ])('blocks %s → %s', async (current, next) => {
    getFirstAsync.mockResolvedValueOnce({ status: current });
    await expect(
      transitionClaimStatus(database, 9, next as ClaimStatus),
    ).rejects.toMatchObject({ code: 'CLAIM_LOCKED' });
    expect(runAsync).not.toHaveBeenCalled();
  });
});
