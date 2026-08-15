import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { Screen } from '@/components/ui/screen';
import {
  createClaim,
  getClaim,
  listEligibleClaimExpenses,
  updateDraftClaim,
  type ClaimExpense,
  type ClaimPeriodMode,
} from '@/features/claims/claim-repository';
import { isLocalDate } from '@/lib/dates';
import { isCodedError, mapError } from '@/lib/errors';
import { formatMoney, sumMoney } from '@/lib/money';
import { normalizeText } from '@/lib/strings';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type ClaimFormScreenProps = { claimId?: number };

type ClaimFormSnapshot = Readonly<{
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

export function ClaimFormScreen({ claimId }: ClaimFormScreenProps) {
  const database = useSQLiteContext();
  const router = useRouter();
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
          setError('Claim not found.');
          return;
        }
        if (claim && claim.status !== 'draft') {
          setError('Move this claim back to Draft before editing it.');
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
          setError(mapError(loadError, 'DATABASE_WRITE_FAILED').message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [claimId, database]);

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
    Alert.alert('Discard changes?', 'Your unsaved changes will be lost.', [
      { style: 'cancel', text: 'Keep Editing' },
      { onPress: () => router.back(), style: 'destructive', text: 'Discard' },
    ]);
  }, [isDirty, router, step]);

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

  function validateDetails() {
    const normalizedTitle = normalizeText(title);
    if (!normalizedTitle) {
      setError('Enter a claim title.');
      return false;
    }
    if (Array.from(normalizedTitle).length > 100) {
      setError('Claim title must be 100 characters or fewer.');
      return false;
    }
    if (Array.from(normalizeText(description)).length > 500) {
      setError('Description must be 500 characters or fewer.');
      return false;
    }
    if (
      periodMode === 'manual' &&
      (!isLocalDate(periodStart.trim()) ||
        !isLocalDate(periodEnd.trim()) ||
        periodStart.trim() > periodEnd.trim())
    ) {
      setError('Enter a valid claim period.');
      return false;
    }
    setError(null);
    return true;
  }

  function toggleExpense(expense: ClaimExpense) {
    if (selectedIds.includes(expense.id)) {
      setSelectedIds((current) => current.filter((id) => id !== expense.id));
      setError(null);
      return;
    }
    if (selectedCurrency && expense.currencyCode !== selectedCurrency) {
      setError('This expense uses a different currency.');
      return;
    }
    if (calculateClaimTotal([...selectedExpenses, expense]) === null) {
      setError('The selected expense total is too large.');
      return;
    }
    setSelectedIds((current) => [...current, expense.id]);
    setError(null);
  }

  async function save() {
    if (savingRef.current || !validateDetails()) return;
    if (selectedIds.length === 0) {
      setError('Select at least one reimbursable expense.');
      return;
    }
    if (totalMinor === null) {
      setError('The selected expense total is too large.');
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
        params: { feedback: 'Draft claim saved.' },
        pathname: `/claims/${savedId}`,
      });
    } catch (saveError) {
      setError(
        isCodedError(saveError)
          ? saveError.message
          : mapError(saveError, 'DATABASE_WRITE_FAILED').message,
      );
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen style={styles.state}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Loading claim…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppButton
          label={step === 1 ? 'Back' : 'Previous'}
          onPress={requestBack}
          variant="ghost"
        />
        <Text accessibilityRole="header" style={styles.title}>
          {claimId === undefined ? 'New Claim' : 'Edit Claim'}
        </Text>
        <Text style={styles.step}>Step {step} of 3</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <Text accessibilityLiveRegion="assertive" style={styles.error}>
            {error}
          </Text>
        ) : null}

        {step === 1 ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Claim details
            </Text>
            <AppInput
              label="Title *"
              maxLength={100}
              onChangeText={setTitle}
              value={title}
            />
            <AppInput
              label="Description"
              maxLength={500}
              multiline
              onChangeText={setDescription}
              value={description}
            />
            <Text style={styles.label}>Period</Text>
            <View style={styles.choiceRow}>
              {(['auto', 'manual'] as const).map((mode) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: periodMode === mode }}
                  key={mode}
                  onPress={() => setPeriodMode(mode)}
                  style={[
                    styles.choice,
                    periodMode === mode ? styles.choiceSelected : null,
                  ]}
                >
                  <Text style={styles.choiceText}>
                    {mode === 'auto' ? 'Based on expense dates' : 'Manual'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {periodMode === 'manual' ? (
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <AppInput
                    label="From"
                    onChangeText={setPeriodStart}
                    placeholder="YYYY-MM-DD"
                    value={periodStart}
                  />
                </View>
                <View style={styles.dateField}>
                  <AppInput
                    label="To"
                    onChangeText={setPeriodEnd}
                    placeholder="YYYY-MM-DD"
                    value={periodEnd}
                  />
                </View>
              </View>
            ) : null}
            <AppButton
              label="Select Expenses"
              onPress={() => {
                if (validateDetails()) setStep(2);
              }}
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Select reimbursable expenses
            </Text>
            {expenses.length === 0 ? (
              <Text style={styles.stateText}>
                No eligible reimbursable expenses are available.
              </Text>
            ) : (
              expenses.map((expense) => {
                const selected = selectedIds.includes(expense.id);
                return (
                  <Pressable
                    accessibilityLabel={`${expense.counterparty ?? expense.categoryName}, ${expense.currencyCode}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    key={expense.id}
                    onPress={() => toggleExpense(expense)}
                    style={[
                      styles.expenseRow,
                      selected ? styles.expenseSelected : null,
                    ]}
                  >
                    <View style={styles.expenseText}>
                      <Text numberOfLines={2} style={styles.expenseTitle}>
                        {expense.counterparty ?? expense.categoryName}
                      </Text>
                      <Text style={styles.metadata}>
                        {expense.categoryName} · {expense.localDate}
                      </Text>
                      <Text style={styles.metadata}>
                        {expense.hasReceipt
                          ? 'Receipt attached'
                          : 'Receipt missing'}
                      </Text>
                    </View>
                    <Text style={styles.expenseAmount}>
                      {formatMoney(expense.amountMinor, expense.currencyCode)}
                    </Text>
                  </Pressable>
                );
              })
            )}
            <Text style={styles.selectionSummary}>
              {selectedIds.length} selected
            </Text>
            <AppButton
              label="Review Claim"
              onPress={() => {
                if (selectedIds.length === 0) {
                  setError('Select at least one reimbursable expense.');
                } else if (totalMinor === null) {
                  setError('The selected expense total is too large.');
                } else {
                  setError(null);
                  setStep(3);
                }
              }}
            />
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Claim Review
            </Text>
            <Text style={styles.reviewTitle}>{normalizeText(title)}</Text>
            <Text style={styles.metadata}>
              {periodMode === 'auto'
                ? `${selectedExpenses.map((expense) => expense.localDate).sort()[0]} – ${selectedExpenses
                    .map((expense) => expense.localDate)
                    .sort()
                    .at(-1)}`
                : `${periodStart.trim()} – ${periodEnd.trim()}`}
            </Text>
            {selectedExpenses.map((expense) => (
              <View key={expense.id} style={styles.reviewRow}>
                <Text numberOfLines={2} style={styles.expenseTitle}>
                  {expense.counterparty ?? expense.categoryName}
                </Text>
                <Text style={styles.expenseAmount}>
                  {formatMoney(expense.amountMinor, expense.currencyCode)}
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>
                {selectedCurrency && totalMinor !== null
                  ? formatMoney(totalMinor, selectedCurrency)
                  : '—'}
              </Text>
            </View>
            <Text style={styles.metadata}>
              {attachedCount} receipt attached ·{' '}
              {selectedExpenses.length - attachedCount} missing
            </Text>
            <AppButton label="Save Draft" loading={saving} onPress={save} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    padding: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    textAlign: 'center',
  },
  step: { color: colors.textSecondary, width: 82 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  section: { gap: spacing.md },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  label: { color: colors.textPrimary, fontWeight: '600' },
  choiceRow: { flexDirection: 'row', gap: spacing.sm },
  choice: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
  choiceSelected: { borderColor: colors.primary, borderWidth: 2 },
  choiceText: { color: colors.textPrimary, textAlign: 'center' },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  dateField: { flex: 1 },
  error: {
    backgroundColor: colors.surfaceSecondary,
    color: colors.destructive,
    padding: spacing.sm,
  },
  expenseRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  expenseSelected: { borderColor: colors.primary, borderWidth: 2 },
  expenseText: { flex: 1 },
  expenseTitle: { color: colors.textPrimary, fontWeight: '700' },
  expenseAmount: {
    color: colors.textPrimary,
    flexShrink: 0,
    fontWeight: '700',
  },
  metadata: {
    color: colors.textSecondary,
    fontSize: typography.metadata.fontSize,
    marginTop: spacing.xs,
  },
  selectionSummary: { color: colors.textSecondary, textAlign: 'right' },
  reviewTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '700',
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  totalRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  totalLabel: { color: colors.textPrimary, fontWeight: '700' },
  totalAmount: {
    color: colors.primary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '700',
  },
  state: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  stateText: { color: colors.textSecondary, marginTop: spacing.sm },
});
