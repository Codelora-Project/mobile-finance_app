import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { generateClaimPdf, shareClaimPdf } from '@/features/claims/claim-pdf';
import {
  deleteDraftClaim,
  getClaim,
  transitionClaimStatus,
  type ClaimDetail,
  type ClaimStatus,
} from '@/features/claims/claim-repository';
import { isCodedError, mapError } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function statusLabel(status: ClaimStatus) {
  return status[0]?.toUpperCase() + status.slice(1);
}

export function ClaimDetailScreen({ claimId }: { claimId: number }) {
  const database = useSQLiteContext();
  const router = useRouter();
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [pdfAction, setPdfAction] = useState<'export' | 'share' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setClaim(await getClaim(database, claimId));
    } catch (loadError) {
      setError(mapError(loadError, 'DATABASE_WRITE_FAILED').message);
    } finally {
      setLoading(false);
    }
  }, [claimId, database]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function transition(nextStatus: ClaimStatus) {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      await transitionClaimStatus(database, claimId, nextStatus);
      setFeedback(`Claim moved to ${statusLabel(nextStatus)}.`);
      await load();
    } catch (transitionError) {
      setError(
        isCodedError(transitionError)
          ? transitionError.message
          : mapError(transitionError, 'DATABASE_WRITE_FAILED').message,
      );
    } finally {
      setWorking(false);
    }
  }

  function confirmTransition(nextStatus: ClaimStatus) {
    Alert.alert(
      `Mark claim ${statusLabel(nextStatus)}?`,
      nextStatus === 'reimbursed'
        ? 'Reimbursed is terminal and cannot be undone.'
        : 'The claim status will be updated.',
      [
        { style: 'cancel', text: 'Cancel' },
        { onPress: () => void transition(nextStatus), text: 'Confirm' },
      ],
    );
  }

  function confirmDelete() {
    Alert.alert(
      'Delete draft claim?',
      'Expenses will remain, but claim membership will be removed.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: () => {
            setWorking(true);
            deleteDraftClaim(database, claimId)
              .then(() =>
                router.dismissTo({
                  params: { feedback: 'Draft claim deleted.' },
                  pathname: '/claims',
                }),
              )
              .catch((deleteError: unknown) => {
                setError(
                  isCodedError(deleteError)
                    ? deleteError.message
                    : mapError(deleteError, 'DATABASE_WRITE_FAILED').message,
                );
                setWorking(false);
              });
          },
          style: 'destructive',
          text: 'Delete',
        },
      ],
    );
  }

  async function exportPdf() {
    if (pdfAction) return;
    setPdfAction('export');
    setError(null);
    try {
      const generated = await generateClaimPdf(database, claimId);
      setFeedback(`PDF generated: ${generated.fileName}`);
    } catch (pdfError) {
      setError(
        isCodedError(pdfError)
          ? pdfError.message
          : mapError(pdfError, 'PDF_GENERATION_FAILED').message,
      );
    } finally {
      setPdfAction(null);
    }
  }

  async function sharePdf() {
    if (pdfAction) return;
    setPdfAction('share');
    setError(null);
    try {
      await shareClaimPdf(database, claimId);
      setFeedback('PDF shared.');
    } catch (shareError) {
      setError(
        isCodedError(shareError)
          ? shareError.message
          : mapError(shareError, 'FILE_OPERATION_FAILED').message,
      );
    } finally {
      setPdfAction(null);
    }
  }

  if (loading && !claim) {
    return (
      <Screen style={styles.state}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Loading claim…</Text>
      </Screen>
    );
  }

  if (!claim) {
    return (
      <Screen style={styles.state}>
        <Text accessibilityRole="header" style={styles.title}>
          Claim unavailable
        </Text>
        <Text accessibilityLiveRegion="assertive" style={styles.stateText}>
          {error ?? 'Claim not found.'}
        </Text>
        <AppButton label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppButton label="Back" onPress={() => router.back()} variant="ghost" />
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Claim Detail
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Text style={styles.status}>{statusLabel(claim.status)}</Text>
          <Text style={styles.claimTitle}>{claim.title}</Text>
          {claim.description ? (
            <Text style={styles.description}>{claim.description}</Text>
          ) : null}
          <Text style={styles.period}>
            {claim.periodStart && claim.periodEnd
              ? `${claim.periodStart} – ${claim.periodEnd}`
              : 'No period'}
          </Text>
          <Text style={styles.total}>
            {claim.currencyCode
              ? formatMoney(claim.totalMinor, claim.currencyCode)
              : '—'}
          </Text>
          <Text style={styles.receipts}>
            {claim.receiptAttachedCount} receipt attached ·{' '}
            {claim.receiptMissingCount} missing
          </Text>
        </View>

        {feedback ? (
          <Text accessibilityLiveRegion="polite" style={styles.feedback}>
            {feedback}
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityLiveRegion="assertive" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Expenses
          </Text>
          {claim.expenses.map((expense) => (
            <Pressable
              accessibilityRole="button"
              key={expense.id}
              onPress={() => router.push(`/transactions/${expense.id}`)}
              style={({ pressed }) => [
                styles.expenseRow,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.expenseText}>
                <Text style={styles.expenseTitle}>
                  {expense.counterparty ?? expense.categoryName}
                </Text>
                <Text style={styles.metadata}>
                  {expense.categoryName} · {expense.localDate}
                </Text>
                <Text style={styles.metadata}>
                  {expense.hasReceipt ? 'Receipt attached' : 'Receipt missing'}
                </Text>
              </View>
              <Text style={styles.expenseAmount}>
                {formatMoney(expense.amountMinor, expense.currencyCode)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          <AppButton
            disabled={pdfAction !== null}
            label="Export PDF"
            loading={pdfAction === 'export'}
            onPress={() => void exportPdf()}
            variant="secondary"
          />
          {claim.status === 'draft' ? (
            <>
              <AppButton
                disabled={working}
                label="Edit Claim"
                onPress={() => router.push(`/claims/${claim.id}/edit`)}
                variant="secondary"
              />
              <AppButton
                disabled={working}
                label="Mark Submitted"
                onPress={() => confirmTransition('submitted')}
              />
              <AppButton
                disabled={working}
                label="Delete Claim"
                onPress={confirmDelete}
                variant="destructive"
              />
            </>
          ) : null}
          {claim.status === 'submitted' ? (
            <>
              <Text style={styles.locked}>Submitted claims are locked.</Text>
              <AppButton
                disabled={working}
                label="Move Back to Draft"
                onPress={() => confirmTransition('draft')}
                variant="secondary"
              />
              <AppButton
                disabled={working}
                label="Mark Reimbursed"
                onPress={() => confirmTransition('reimbursed')}
              />
              <AppButton
                disabled={working}
                label="Mark Rejected"
                onPress={() => confirmTransition('rejected')}
                variant="destructive"
              />
            </>
          ) : null}
          {claim.status === 'rejected' ? (
            <>
              <Text style={styles.locked}>
                Move this claim back to Draft before editing it.
              </Text>
              <AppButton
                disabled={working}
                label="Move Back to Draft"
                onPress={() => confirmTransition('draft')}
              />
            </>
          ) : null}
          {claim.status === 'reimbursed' ? (
            <>
              <Text style={styles.locked}>
                Reimbursed claims are final and read-only.
              </Text>
              <AppButton
                disabled={pdfAction !== null}
                label="Share PDF"
                loading={pdfAction === 'share'}
                onPress={() => void sharePdf()}
              />
            </>
          ) : null}
        </View>
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
  headerTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    textAlign: 'center',
  },
  headerSpacer: { width: 72 },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  status: { color: colors.primary, fontWeight: '700' },
  claimTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '700',
  },
  description: { color: colors.textSecondary },
  period: { color: colors.textSecondary },
  total: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  receipts: { color: colors.textSecondary },
  section: { gap: spacing.sm },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  expenseRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  expenseText: { flex: 1 },
  expenseTitle: { color: colors.textPrimary, fontWeight: '700' },
  expenseAmount: { color: colors.textPrimary, fontWeight: '700' },
  metadata: {
    color: colors.textSecondary,
    fontSize: typography.metadata.fontSize,
    marginTop: spacing.xs,
  },
  actions: { gap: spacing.sm },
  locked: { color: colors.textSecondary, textAlign: 'center' },
  feedback: { color: colors.positive },
  error: { color: colors.destructive },
  state: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  stateText: { color: colors.textSecondary, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
