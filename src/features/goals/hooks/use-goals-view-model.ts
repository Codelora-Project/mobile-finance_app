import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';

import {
  addGoalTransaction,
  createSavingsGoal,
  getGoalsSummary,
  listSavingsGoals,
  type GoalsSummary,
  type SavingsGoal,
} from '@/features/goals/goals-repository';
import {
  getHabitStats,
  type HabitStats,
} from '@/features/habits/habit-repository';
import { useCurrency } from '@/lib/currency/currency-context';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { parseMoneyInput } from '@/lib/money';

export type GoalsFilterTab = 'active' | 'all' | 'completed';

export function useGoalsViewModel() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { currencyCode } = useCurrency();
  const loadRequestRef = useRef(0);
  const savingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<readonly SavingsGoal[]>([]);
  const [summary, setSummary] = useState<GoalsSummary | null>(null);
  const [habitStats, setHabitStats] = useState<HabitStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<GoalsFilterTab>('all');

  // New Goal Modal State
  const [newGoalModalVisible, setNewGoalModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('target');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Deposit Modal State
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [depositError, setDepositError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const [goalsList, sum, habits] = await Promise.all([
        listSavingsGoals(database),
        getGoalsSummary(database),
        getHabitStats(database),
      ]);
      if (requestId !== loadRequestRef.current) return;
      setGoals(goalsList);
      setSummary(sum);
      setHabitStats(habits);
    } catch (err) {
      if (requestId === loadRequestRef.current) {
        const mapped = mapError(err, 'DATABASE_WRITE_FAILED');
        setError(mapped.message);
      }
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, [database]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        loadRequestRef.current += 1;
      };
    }, [load]),
  );

  const openCreateModal = useCallback(() => {
    setFormError(null);
    setNewGoalModalVisible(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setNewGoalModalVisible(false);
  }, []);

  const openDepositModal = useCallback((goal: SavingsGoal) => {
    setDepositGoal(goal);
    setDepositError(null);
    setDepositAmount('');
    setDepositNote('');
  }, []);

  const closeDepositModal = useCallback(() => {
    setDepositGoal(null);
  }, []);

  const handleCreateGoal = useCallback(async () => {
    if (savingRef.current) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError(t.goals.errorNameRequired);
      return;
    }
    let targetMinor: number;
    try {
      targetMinor = parseMoneyInput(targetAmount, currencyCode);
    } catch {
      setFormError(t.goals.errorTargetRequired);
      return;
    }
    let depositMinor = 0;
    if (initialDeposit.trim()) {
      try {
        depositMinor = parseMoneyInput(initialDeposit, currencyCode);
      } catch {
        setFormError(t.goals.errorDepositInvalid);
        return;
      }
    }

    savingRef.current = true;
    setSaving(true);
    setFormError(null);
    try {
      await createSavingsGoal(database, {
        colorKey: selectedColor,
        iconKey: selectedIcon,
        initialDepositMinor: depositMinor > 0 ? depositMinor : undefined,
        name: trimmedName,
        targetAmountMinor: targetMinor,
      });

      setName('');
      setTargetAmount('');
      setInitialDeposit('');
      setSelectedIcon('target');
      setSelectedColor('#3B82F6');
      setNewGoalModalVisible(false);
      await load();
    } catch (err) {
      const mapped = mapError(err, 'DATABASE_WRITE_FAILED');
      setFormError(mapped.message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [
    currencyCode,
    database,
    initialDeposit,
    load,
    name,
    selectedColor,
    selectedIcon,
    t.goals,
    targetAmount,
  ]);

  const handleDeposit = useCallback(async () => {
    if (!depositGoal || savingRef.current) return;
    let amountMinor: number;
    try {
      amountMinor = parseMoneyInput(depositAmount, currencyCode);
    } catch {
      setDepositError(t.goals.errorAmountInvalid);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setDepositError(null);
    try {
      await addGoalTransaction(database, {
        amountMinor,
        goalId: depositGoal.id,
        note: depositNote.trim() || undefined,
        type: 'deposit',
      });
      setDepositGoal(null);
      setDepositAmount('');
      setDepositNote('');
      await load();
    } catch (err) {
      const mapped = mapError(err, 'DATABASE_WRITE_FAILED');
      setDepositError(mapped.message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [
    currencyCode,
    database,
    depositAmount,
    depositGoal,
    depositNote,
    load,
    t.goals,
  ]);

  const navigateToDetail = useCallback(
    (id: number) => {
      router.push(`/goals/${id}`);
    },
    [router],
  );

  const filteredGoals = useMemo(() => {
    if (filterTab === 'active') {
      return goals.filter((g) => !g.isCompleted);
    }
    if (filterTab === 'completed') {
      return goals.filter((g) => g.isCompleted);
    }
    return goals;
  }, [filterTab, goals]);

  return {
    actions: {
      closeCreateModal,
      closeDepositModal,
      handleCreateGoal,
      handleDeposit,
      load,
      navigateToDetail,
      openCreateModal,
      openDepositModal,
      setDepositAmount,
      setDepositNote,
      setFilterTab,
      setInitialDeposit,
      setName,
      setSelectedColor,
      setSelectedIcon,
      setTargetAmount,
    },
    state: {
      depositAmount,
      depositError,
      depositGoal,
      depositNote,
      error,
      filteredGoals,
      filterTab,
      formError,
      goals,
      habitStats,
      initialDeposit,
      language,
      loading,
      name,
      newGoalModalVisible,
      saving,
      selectedColor,
      selectedIcon,
      summary,
      t,
      targetAmount,
    },
  };
}
