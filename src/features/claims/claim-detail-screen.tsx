import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
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
import { useReceiptStorage } from '@/features/receipts/receipt-storage-context';
import {
  deleteDraftClaim,
  getClaim,
  transitionClaimStatus,
  type ClaimDetail,
  type ClaimStatus,
} from '@/features/claims/claim-repository';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function ClaimDetailScreen({ claimId }: { claimId: number }) {
  const database = useSQLiteContext();
  const receiptStorage = useReceiptStorage();
  const router = useRouter();
  const { t } = useLanguage();
  const workingRef = useRef(false);
  const pdfActionRef = useRef(false);
  const loadRequestRef = useRef(0);
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [pdfAction, setPdfAction] = useState<'export' | 'share' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const nextClaim = await getClaim(database, claimId);
      if (requestId === loadRequestRef.current) {
        setClaim(nextClaim);
      }
    } catch (loadError) {
      if (requestId === loadRequestRef.current) {
        setError(
          mapError(loadError, 'DATABASE_WRITE_FAILED', t.appErrors).message,
        );
      }
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, [claimId, database, t.appErrors]);

  function statusLabel(status: ClaimStatus) {
    switch (status) {
      case 'draft':
        return t.claims.statusDraft;
      case 'submitted':
        return t.claims.statusSubmitted;
      case 'reimbursed':
        return t.claims.statusReimbursed;
      case 'rejected':
        return t.claims.statusRejected;
    }
  }

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        loadRequestRef.current += 1;
      };
    }, [load]),
  );

  async function transition(nextStatus: ClaimStatus) {
    if (workingRef.current || pdfActionRef.current) return;
    workingRef.current = true;
    setWorking(true);
    setError(null);
    try {
      await transitionClaimStatus(database, claimId, nextStatus);
      setFeedback(
        t.claims.statusMoved.replace('{status}', statusLabel(nextStatus)),
      );
      await load();
    } catch (transitionError) {
      setError(
        mapError(transitionError, 'DATABASE_WRITE_FAILED', t.appErrors).message,
      );
    } finally {
      workingRef.current = false;
      setWorking(false);
    }
  }

  function confirmTransition(nextStatus: ClaimStatus) {
    Alert.alert(
      t.claims.confirmStatusTitle.replace('{status}', statusLabel(nextStatus)),
      nextStatus === 'reimbursed'
        ? t.claims.reimbursedTerminal
        : t.claims.statusUpdateDescription,
      [
        { style: 'cancel', text: t.common.cancel },
        { onPress: () => void transition(nextStatus), text: t.common.confirm },
      ],
    );
  }

  function confirmDelete() {
    Alert.alert(t.claims.deleteDraftTitle, t.claims.deleteDraftDescription, [
      { style: 'cancel', text: t.common.cancel },
      {
        onPress: () => {
          if (workingRef.current || pdfActionRef.current) return;
          workingRef.current = true;
          setWorking(true);
          deleteDraftClaim(database, claimId)
            .then(() =>
              router.dismissTo({
                params: { feedback: t.claims.draftDeleted },
                pathname: '/claims',
              }),
            )
            .catch((deleteError: unknown) => {
              setError(
                mapError(deleteError, 'DATABASE_WRITE_FAILED', t.appErrors)
                  .message,
              );
              workingRef.current = false;
              setWorking(false);
            });
        },
        style: 'destructive',
        text: t.common.delete,
      },
    ]);
  }

  async function exportPdf() {
    if (pdfActionRef.current || workingRef.current) return;
    pdfActionRef.current = true;
    setPdfAction('export');
    setError(null);
    try {
      const generated = await generateClaimPdf(
        database,
        claimId,
        Date.now(),
        receiptStorage,
      );
      setFeedback(
        t.claims.pdfGenerated.replace('{fileName}', generated.fileName),
      );
    } catch (pdfError) {
      setError(
        mapError(pdfError, 'PDF_GENERATION_FAILED', t.appErrors).message,
      );
    } finally {
      pdfActionRef.current = false;
      setPdfAction(null);
    }
  }

  async function sharePdf() {
    if (pdfActionRef.current || workingRef.current) return;
    pdfActionRef.current = true;
    setPdfAction('share');
    setError(null);
    try {
      await shareClaimPdf(database, claimId, Date.now(), receiptStorage);
      setFeedback(t.claims.pdfShared);
    } catch (shareError) {
      setError(
        mapError(shareError, 'FILE_OPERATION_FAILED', t.appErrors).message,
      );
    } finally {
      pdfActionRef.current = false;
      setPdfAction(null);
    }
  }

  if (loading && !claim) {
    return (
      <Screen style={styles.state}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>{t.claims.loading}</Text>
      </Screen>
    );
  }

  if (!claim) {
    return (
      <Screen style={styles.state}>
        <Text accessibilityRole="header" style={styles.title}>
          {t.claims.unavailable}
        </Text>
        <Text accessibilityLiveRegion="assertive" style={styles.stateText}>
          {error ?? t.claims.notFound}
        </Text>
        <AppButton label={t.common.back} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppButton
          label={t.common.back}
          onPress={() => router.back()}
          variant="ghost"
        />
        <Text accessibilityRole="header" style={styles.headerTitle}>
          {t.claims.detailTitle}
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
              : t.claims.noPeriod}
          </Text>
          <Text style={styles.total}>
            {claim.currencyCode
              ? formatMoney(claim.totalMinor, claim.currencyCode)
              : '—'}
          </Text>
          <Text style={styles.receipts}>
            {t.claims.receiptSummary
              .replace('{attached}', String(claim.receiptAttachedCount))
              .replace('{missing}', String(claim.receiptMissingCount))}
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
            {t.claims.expensesTitle}
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
                <Text numberOfLines={2} style={styles.expenseTitle}>
                  {expense.counterparty ?? expense.categoryName}
                </Text>
                <Text style={styles.metadata}>
                  {expense.categoryName} · {expense.localDate}
                </Text>
                <Text style={styles.metadata}>
                  {expense.hasReceipt
                    ? t.claims.receiptAttached
                    : t.claims.receiptMissing}
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
            label={t.claims.exportPdf}
            loading={pdfAction === 'export'}
            onPress={() => void exportPdf()}
            variant="secondary"
          />
          {claim.status === 'draft' ? (
            <>
              <AppButton
                disabled={working}
                label={t.claims.editClaim}
                onPress={() => router.push(`/claims/${claim.id}/edit`)}
                variant="secondary"
              />
              <AppButton
                disabled={working}
                label={t.claims.markSubmitted}
                onPress={() => confirmTransition('submitted')}
              />
              <AppButton
                disabled={working}
                label={t.claims.deleteClaim}
                onPress={confirmDelete}
                variant="destructive"
              />
            </>
          ) : null}
          {claim.status === 'submitted' ? (
            <>
              <Text style={styles.locked}>{t.claims.submittedLocked}</Text>
              <AppButton
                disabled={working}
                label={t.claims.moveToDraft}
                onPress={() => confirmTransition('draft')}
                variant="secondary"
              />
              <AppButton
                disabled={working}
                label={t.claims.markReimbursed}
                onPress={() => confirmTransition('reimbursed')}
              />
              <AppButton
                disabled={working}
                label={t.claims.markRejected}
                onPress={() => confirmTransition('rejected')}
                variant="destructive"
              />
            </>
          ) : null}
          {claim.status === 'rejected' ? (
            <>
              <Text style={styles.locked}>{t.claims.rejectedLocked}</Text>
              <AppButton
                disabled={working}
                label={t.claims.moveToDraft}
                onPress={() => confirmTransition('draft')}
              />
            </>
          ) : null}
          {claim.status === 'reimbursed' ? (
            <>
              <Text style={styles.locked}>{t.claims.reimbursedLocked}</Text>
              <AppButton
                disabled={pdfAction !== null}
                label={t.claims.sharePdf}
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
