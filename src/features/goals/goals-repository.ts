import type { SQLiteDatabase } from 'expo-sqlite';

import { withIntegrityCheckedTransaction } from '@/db/transactions';
import { runSerializedDatabaseWrite } from '@/db/write-coordinator';
import { createCodedError } from '@/lib/errors';
import { normalizeOptionalText } from '@/lib/strings';
import { defaultGoalColor } from '@/theme/colors';

export type SavingsGoal = Readonly<{
  id: number;
  name: string;
  targetAmountMinor: number;
  currentAmountMinor: number;
  iconKey: string;
  colorKey: string;
  targetDate: string | null;
  isCompleted: boolean;
  progressPercent: number;
  createdAt: number;
  updatedAt: number;
}>;

export type GoalTransaction = Readonly<{
  id: number;
  goalId: number;
  type: 'deposit' | 'withdraw';
  amountMinor: number;
  note: string | null;
  occurredAt: number;
  createdAt: number;
}>;

export type CreateSavingsGoalInput = Readonly<{
  name: string;
  targetAmountMinor: number;
  initialDepositMinor?: number;
  iconKey?: string;
  colorKey?: string;
  targetDate?: string | null;
}>;

export type UpdateSavingsGoalInput = Readonly<{
  name?: string;
  targetAmountMinor?: number;
  iconKey?: string;
  colorKey?: string;
  targetDate?: string | null;
}>;

export type AddGoalTransactionInput = Readonly<{
  goalId: number;
  type: 'deposit' | 'withdraw';
  amountMinor: number;
  note?: string | null;
  occurredAt?: number;
}>;

export type GoalsSummary = Readonly<{
  totalSavedMinor: number;
  totalTargetMinor: number;
  activeCount: number;
  completedCount: number;
}>;

type GoalRow = {
  id: number;
  name: string;
  target_amount_minor: number;
  current_amount_minor: number;
  icon_key: string;
  color_key: string;
  target_date: string | null;
  is_completed: number;
  created_at: number;
  updated_at: number;
};

type GoalTransactionRow = {
  id: number;
  goal_id: number;
  type: string;
  amount_minor: number;
  note: string | null;
  occurred_at: number;
  created_at: number;
};

function mapGoalRow(row: GoalRow): SavingsGoal {
  const target = row.target_amount_minor;
  const current = row.current_amount_minor;
  const progressPercent =
    target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return {
    id: row.id,
    name: row.name,
    targetAmountMinor: target,
    currentAmountMinor: current,
    iconKey: row.icon_key,
    colorKey: row.color_key,
    targetDate: row.target_date,
    isCompleted: row.is_completed === 1,
    progressPercent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSavingsGoals(
  database: SQLiteDatabase,
): Promise<readonly SavingsGoal[]> {
  const rows = await database.getAllAsync<GoalRow>(
    `SELECT * FROM savings_goals ORDER BY is_completed ASC, updated_at DESC`,
  );
  return rows.map(mapGoalRow);
}

export async function getSavingsGoal(
  database: SQLiteDatabase,
  id: number,
): Promise<{
  goal: SavingsGoal;
  transactions: readonly GoalTransaction[];
} | null> {
  const goalRow = await database.getFirstAsync<GoalRow>(
    `SELECT * FROM savings_goals WHERE id = ?`,
    [id],
  );
  if (!goalRow) return null;

  const txRows = await database.getAllAsync<GoalTransactionRow>(
    `SELECT * FROM goal_transactions WHERE goal_id = ? ORDER BY occurred_at DESC, id DESC`,
    [id],
  );

  const transactions: GoalTransaction[] = txRows.map((r) => ({
    id: r.id,
    goalId: r.goal_id,
    type: r.type as 'deposit' | 'withdraw',
    amountMinor: r.amount_minor,
    note: r.note,
    occurredAt: r.occurred_at,
    createdAt: r.created_at,
  }));

  return {
    goal: mapGoalRow(goalRow),
    transactions,
  };
}

export async function createSavingsGoal(
  database: SQLiteDatabase,
  input: CreateSavingsGoalInput,
): Promise<SavingsGoal> {
  const name = input.name.trim();
  if (!name) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Nama target tidak boleh kosong.',
    );
  }
  if (
    !Number.isSafeInteger(input.targetAmountMinor) ||
    input.targetAmountMinor <= 0
  ) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Target nominal harus lebih besar dari 0.',
    );
  }

  const initialDeposit = input.initialDepositMinor ?? 0;
  if (!Number.isSafeInteger(initialDeposit) || initialDeposit < 0) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Setoran awal tidak boleh bernilai negatif.',
    );
  }

  const now = Date.now();
  const iconKey = input.iconKey || 'target';
  const colorKey = input.colorKey || defaultGoalColor;
  const isCompleted = initialDeposit >= input.targetAmountMinor ? 1 : 0;

  const goalId = await withIntegrityCheckedTransaction(
    database,
    async (transaction) => {
      const result = await transaction.runAsync(
        `INSERT INTO savings_goals (
          name, target_amount_minor, current_amount_minor, icon_key, color_key,
          target_date, is_completed, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          input.targetAmountMinor,
          initialDeposit,
          iconKey,
          colorKey,
          input.targetDate ?? null,
          isCompleted,
          now,
          now,
        ],
      );

      if (initialDeposit > 0) {
        await transaction.runAsync(
          `INSERT INTO goal_transactions (
        goal_id, type, amount_minor, note, occurred_at, created_at
      ) VALUES (?, 'deposit', ?, ?, ?, ?)`,
          [result.lastInsertRowId, initialDeposit, 'Setoran Awal', now, now],
        );
      }

      return result.lastInsertRowId;
    },
  );

  const created = await getSavingsGoal(database, goalId);
  if (!created) {
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      'Gagal membuat target tabungan.',
    );
  }
  return created.goal;
}

export async function updateSavingsGoal(
  database: SQLiteDatabase,
  id: number,
  input: UpdateSavingsGoalInput,
): Promise<SavingsGoal> {
  const existing = await database.getFirstAsync<GoalRow>(
    `SELECT * FROM savings_goals WHERE id = ?`,
    [id],
  );
  if (!existing) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Target tabungan tidak ditemukan.',
    );
  }

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  if (!name) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Nama target tidak boleh kosong.',
    );
  }

  const targetAmount =
    input.targetAmountMinor !== undefined
      ? input.targetAmountMinor
      : existing.target_amount_minor;
  if (targetAmount <= 0) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Target nominal harus lebih besar dari 0.',
    );
  }

  const iconKey = input.iconKey ?? existing.icon_key;
  const colorKey = input.colorKey ?? existing.color_key;
  const targetDate =
    input.targetDate !== undefined ? input.targetDate : existing.target_date;
  const now = Date.now();
  const isCompleted = existing.current_amount_minor >= targetAmount ? 1 : 0;

  await runSerializedDatabaseWrite(database, () =>
    database.runAsync(
      `UPDATE savings_goals SET
      name = ?,
      target_amount_minor = ?,
      icon_key = ?,
      color_key = ?,
      target_date = ?,
      is_completed = ?,
      updated_at = ?
    WHERE id = ?`,
      [name, targetAmount, iconKey, colorKey, targetDate, isCompleted, now, id],
    ),
  );

  const updated = await getSavingsGoal(database, id);
  if (!updated) {
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      'Gagal memperbarui target tabungan.',
    );
  }
  return updated.goal;
}

export async function deleteSavingsGoal(
  database: SQLiteDatabase,
  id: number,
): Promise<void> {
  const existing = await database.getFirstAsync<GoalRow>(
    `SELECT id FROM savings_goals WHERE id = ?`,
    [id],
  );
  if (!existing) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Target tabungan tidak ditemukan.',
    );
  }

  await runSerializedDatabaseWrite(database, () =>
    database.runAsync(`DELETE FROM savings_goals WHERE id = ?`, [id]),
  );
}

export async function addGoalTransaction(
  database: SQLiteDatabase,
  input: AddGoalTransactionInput,
): Promise<SavingsGoal> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw createCodedError(
      'VALIDATION_FAILED',
      'Nominal transaksi harus lebih besar dari 0.',
    );
  }

  const now = Date.now();
  const occurredAt = input.occurredAt ?? now;
  const note = normalizeOptionalText(input.note ?? '');

  await withIntegrityCheckedTransaction(database, async (transaction) => {
    const existing = await transaction.getFirstAsync<GoalRow>(
      `SELECT * FROM savings_goals WHERE id = ?`,
      [input.goalId],
    );
    if (!existing) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Target tabungan tidak ditemukan.',
      );
    }

    const delta =
      input.type === 'deposit' ? input.amountMinor : -input.amountMinor;
    const nextAmount = existing.current_amount_minor + delta;
    if (nextAmount < 0) {
      throw createCodedError(
        'VALIDATION_FAILED',
        'Nominal penarikan melebihi saldo tabungan saat ini.',
      );
    }
    const isCompleted = nextAmount >= existing.target_amount_minor ? 1 : 0;

    await transaction.runAsync(
      `INSERT INTO goal_transactions (
        goal_id, type, amount_minor, note, occurred_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [input.goalId, input.type, input.amountMinor, note, occurredAt, now],
    );

    const updateResult = await transaction.runAsync(
      `UPDATE savings_goals SET
        current_amount_minor = current_amount_minor + ?,
        is_completed = ?,
        updated_at = ?
       WHERE id = ? AND current_amount_minor = ?`,
      [delta, isCompleted, now, input.goalId, existing.current_amount_minor],
    );
    if (updateResult.changes !== 1) {
      throw createCodedError(
        'DATABASE_WRITE_FAILED',
        'Saldo target berubah. Silakan coba lagi.',
      );
    }
  });

  const updated = await getSavingsGoal(database, input.goalId);
  if (!updated) {
    throw createCodedError(
      'DATABASE_WRITE_FAILED',
      'Gagal memproses transaksi tabungan.',
    );
  }
  return updated.goal;
}

export async function getGoalsSummary(
  database: SQLiteDatabase,
): Promise<GoalsSummary> {
  const rows = await database.getAllAsync<GoalRow>(
    `SELECT target_amount_minor, current_amount_minor, is_completed FROM savings_goals`,
  );

  let totalSavedMinor = 0;
  let totalTargetMinor = 0;
  let activeCount = 0;
  let completedCount = 0;

  for (const row of rows) {
    totalSavedMinor += row.current_amount_minor;
    totalTargetMinor += row.target_amount_minor;
    if (row.is_completed === 1) {
      completedCount += 1;
    } else {
      activeCount += 1;
    }
  }

  return {
    totalSavedMinor,
    totalTargetMinor,
    activeCount,
    completedCount,
  };
}
