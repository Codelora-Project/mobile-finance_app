import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler } from 'react-native';

import {
  createClaim,
  getClaim,
  listEligibleClaimExpenses,
  updateDraftClaim,
  type ClaimExpense,
  type ClaimPeriodMode,
} from '@/features/claims/claim-repository';
import { isLocalDate } from '@/lib/dates';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { sumMoney } from '@/lib/money';
import { normalizeText } from '@/lib/strings';

export type ClaimFormSnapshot = Readonly<{
  description: string;
  periodEnd: string;
  periodMode: ClaimPeriodMode;
  periodStart: string;
  selectedIds: readonly number[];
  title: string;
}>;

function serializeClaimForm(snapshot: ClaimFormSnapshot) {
  return JSON.stringify(snapshot);
}

function calculateClaimTotal(expenses: readonly ClaimExpense[]) {
  try {
    return sumMoney(expenses.map((expense) => expense.amountMinor));
  } catch {
    return null;
  }
}

export type UseClaimFormViewModelOptions = {
  claimId?: number;
};

export function useClaimFormViewModel({
  claimId,
}: UseClaimFormViewModelOptions = {}) {
  const database = useSQLiteContext();
  const router = useRouter();
  const { t } = useLanguage();
  const savingRef = useRef(false);

  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(
    claimId === undefined
      ? serializeClaimForm({
          description: '',
          periodEnd: '',
          periodMode: 'auto',
          periodStart: '',
          selectedIds: [],
          title: '',
        })
      : null,
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [periodMode, setPeriodMode] = useState<ClaimPeriodMode>('auto');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [expenses, setExpenses] = useState<readonly ClaimExpense[]>([]);
  const [selectedIds, setSelectedIds] = useState<readonly number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      listEligibleClaimExpenses(database, claimId),
      claimId === undefined
        ? Promise.resolve(null)
        : getClaim(database, claimId),
    ])
      .then(([eligible, claim]) => {
        if (!active) return;
        if (claimId !== undefined && !claim) {
          setError(t.claims.notFound);
          return;
        }
        if (claim && claim.status !== 'draft') {
          setError(t.claims.rejectedLocked);
          return;
        }
        setExpenses(eligible);
        if (claim) {
          setTitle(claim.title);
          setDescription(claim.description ?? '');
          setPeriodMode(claim.periodMode);
          setPeriodStart(claim.periodStart ?? '');
          setPeriodEnd(claim.periodEnd ?? '');
          const claimExpenseIds = claim.expenses.map((expense) => expense.id);
          setSelectedIds(claimExpenseIds);
          setInitialSnapshot(
            serializeClaimForm({
              description: claim.description ?? '',
              periodEnd: claim.periodEnd ?? '',
              periodMode: claim.periodMode,
              periodStart: claim.periodStart ?? '',
              selectedIds: claimExpenseIds,
              title: claim.title,
            }),
          );
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            mapError(loadError, 'DATABASE_WRITE_FAILED', t.appErrors).message,
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [claimId, database, t]);

  const selectedExpenses = useMemo(
    () => expenses.filter((expense) => selectedIds.includes(expense.id)),
    [expenses, selectedIds],
  );
  const selectedCurrency = selectedExpenses[0]?.currencyCode ?? null;
  const totalMinor = calculateClaimTotal(selectedExpenses);
  const attachedCount = selectedExpenses.filter(
    (expense) => expense.hasReceipt,
  ).length;
  const currentSnapshot = serializeClaimForm({
    description,
    periodEnd,
    periodMode,
    periodStart,
    selectedIds,
    title,
  });
  const isDirty =
    initialSnapshot !== null && initialSnapshot !== currentSnapshot;

  const requestBack = useCallback(() => {
    if (savingRef.current) return;
    if (step > 1) {
      setStep((step - 1) as 1 | 2);
      return;
    }
    if (!isDirty) {
      router.back();
      return;
    }
    Alert.alert(t.claims.discardTitle, t.claims.discardDescription, [
      { style: 'cancel', text: t.claims.keepEditing },
      {
        onPress: () => router.back(),
        style: 'destructive',
        text: t.claims.discard,
      },
    ]);
  }, [isDirty, router, step, t.claims]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        requestBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [requestBack]);

  const validateDetails = useCallback((): boolean => {
    const normalizedTitle = normalizeText(title);
    if (!normalizedTitle) {
      setError(t.claims.titleRequired);
      return false;
    }
    if (Array.from(normalizedTitle).length > 100) {
      setError(t.claims.titleTooLong);
      return false;
    }
    if (Array.from(normalizeText(description)).length > 500) {
      setError(t.claims.descriptionTooLong);
      return false;
    }
    if (
      periodMode === 'manual' &&
      (!isLocalDate(periodStart.trim()) ||
        !isLocalDate(periodEnd.trim()) ||
        periodStart.trim() > periodEnd.trim())
    ) {
      setError(t.claims.invalidPeriod);
      return false;
    }
    setError(null);
    return true;
  }, [description, periodEnd, periodMode, periodStart, t.claims, title]);

  const toggleExpense = useCallback(
    (expense: ClaimExpense) => {
      if (selectedIds.includes(expense.id)) {
        setSelectedIds((current) => current.filter((id) => id !== expense.id));
        setError(null);
        return;
      }
      if (selectedCurrency && expense.currencyCode !== selectedCurrency) {
        setError(t.claims.differentCurrency);
        return;
      }
      if (calculateClaimTotal([...selectedExpenses, expense]) === null) {
        setError(t.claims.selectedTotalTooLarge);
        return;
      }
      setSelectedIds((current) => [...current, expense.id]);
      setError(null);
    },
    [selectedCurrency, selectedExpenses, selectedIds, t.claims],
  );

  const save = useCallback(async () => {
    if (savingRef.current || !validateDetails()) return;
    if (selectedIds.length === 0) {
      setError(t.claims.selectAtLeastOne);
      return;
    }
    if (totalMinor === null) {
      setError(t.claims.selectedTotalTooLarge);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const input = {
        description,
        periodEnd,
        periodMode,
        periodStart,
        title,
        transactionIds: selectedIds,
      } as const;
      const savedId =
        claimId === undefined
          ? await createClaim(database, input)
          : (await updateDraftClaim(database, claimId, input), claimId);
      router.dismissTo({
        params: { feedback: t.claims.draftSaved },
        pathname: `/claims/${savedId}`,
      });
    } catch (saveError) {
      setError(
        mapError(saveError, 'DATABASE_WRITE_FAILED', t.appErrors).message,
      );
      savingRef.current = false;
      setSaving(false);
    }
  }, [
    claimId,
    database,
    description,
    periodEnd,
    periodMode,
    periodStart,
    router,
    selectedIds,
    title,
    t,
    totalMinor,
    validateDetails,
  ]);

  return {
    actions: {
      requestBack,
      save,
      setDescription,
      setError,
      setPeriodEnd,
      setPeriodMode,
      setPeriodStart,
      setStep,
      setTitle,
      toggleExpense,
      validateDetails,
    },
    state: {
      attachedCount,
      claimId,
      description,
      error,
      expenses,
      isDirty,
      loading,
      periodEnd,
      periodMode,
      periodStart,
      saving,
      selectedCurrency,
      selectedExpenses,
      selectedIds,
      step,
      title,
      totalMinor,
    },
  };
}
