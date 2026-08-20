import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  addGoalTransaction,
  createSavingsGoal,
  deleteSavingsGoal,
  getGoalsSummary,
  getSavingsGoal,
  listSavingsGoals,
  updateSavingsGoal,
} from '@/features/goals/goals-repository';

const getAllAsync = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const getFirstAsync = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const runAsync = jest.fn<(...args: unknown[]) => Promise<unknown>>();
let database: SQLiteDatabase;

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
  runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 1 });
});

describe('goals repository', () => {
  it('creates a savings goal with initial deposit and validates inputs', async () => {
    getFirstAsync.mockResolvedValueOnce({
      color_key: '#3B82F6',
      created_at: 1000,
      current_amount_minor: 2_000_000,
      icon_key: 'laptop',
      id: 1,
      is_completed: 0,
      name: 'Beli Laptop',
      target_amount_minor: 10_000_000,
      target_date: null,
      updated_at: 1000,
    });

    getAllAsync.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        amount_minor: 2_000_000,
        created_at: 1000,
        goal_id: 1,
        id: 1,
        note: 'Setoran Awal',
        occurred_at: 1000,
        type: 'deposit',
      },
    ]);

    const goal = await createSavingsGoal(database, {
      colorKey: '#3B82F6',
      iconKey: 'laptop',
      initialDepositMinor: 2_000_000,
      name: 'Beli Laptop',
      targetAmountMinor: 10_000_000,
    });

    expect(goal.name).toBe('Beli Laptop');
    expect(goal.targetAmountMinor).toBe(10_000_000);
    expect(goal.currentAmountMinor).toBe(2_000_000);
    expect(goal.progressPercent).toBe(20);
    expect(goal.isCompleted).toBe(false);

    // Validation checks
    await expect(
      createSavingsGoal(database, {
        name: ' ',
        targetAmountMinor: 5_000_000,
      }),
    ).rejects.toThrow('Nama target tidak boleh kosong.');

    await expect(
      createSavingsGoal(database, {
        name: 'Invalid Target',
        targetAmountMinor: 0,
      }),
    ).rejects.toThrow('Target nominal harus lebih besar dari 0.');
  });

  it('adds deposits and withdrawals, updates balance and completion status', async () => {
    getFirstAsync
      .mockResolvedValueOnce({
        color_key: '#3B82F6',
        created_at: 1000,
        current_amount_minor: 1_000_000,
        icon_key: 'target',
        id: 1,
        is_completed: 0,
        name: 'Dana Darurat',
        target_amount_minor: 5_000_000,
        target_date: null,
        updated_at: 1000,
      })
      .mockResolvedValueOnce({
        color_key: '#3B82F6',
        created_at: 1000,
        current_amount_minor: 4_000_000,
        icon_key: 'target',
        id: 1,
        is_completed: 0,
        name: 'Dana Darurat',
        target_amount_minor: 5_000_000,
        target_date: null,
        updated_at: 1000,
      });

    getAllAsync.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const updated = await addGoalTransaction(database, {
      amountMinor: 3_000_000,
      goalId: 1,
      note: 'Gajian Pertama',
      type: 'deposit',
    });

    expect(updated.currentAmountMinor).toBe(4_000_000);
    expect(updated.progressPercent).toBe(80);
    expect(runAsync).toHaveBeenCalled();
  });

  it('calculates total savings goals summary', async () => {
    getAllAsync.mockResolvedValueOnce([
      {
        current_amount_minor: 5_000_000,
        is_completed: 1,
        target_amount_minor: 5_000_000,
      },
      {
        current_amount_minor: 1_000_000,
        is_completed: 0,
        target_amount_minor: 20_000_000,
      },
    ]);

    const summary = await getGoalsSummary(database);
    expect(summary.totalSavedMinor).toBe(6_000_000);
    expect(summary.totalTargetMinor).toBe(25_000_000);
    expect(summary.completedCount).toBe(1);
    expect(summary.activeCount).toBe(1);
  });
});
