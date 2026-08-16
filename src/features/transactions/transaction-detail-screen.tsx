import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import {
  deleteTransaction,
  getTransaction,
  getTransactionClaimMembership,
  type Transaction,
  type TransactionClaimMembership,
} from '@/features/transactions/transaction-repository';
import { toLocalDateTimeInput } from '@/lib/dates';
import { isCodedError, mapError } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function DetailField({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.field, { borderBottomColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text selectable style={[styles.value, { color: colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

function receiptName(storageKey: string) {
  return storageKey.split(/[\\/]/).at(-1)?.split(/[?#]/, 1)[0] || 'Receipt';
}

export function TransactionDetailScreen({
  transactionId,
}: {
  transactionId: number;
}) {
  const database = useSQLiteContext();
  const router = useRouter();
  const { colors } = useTheme();
  const deletingRef = useRef(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [claimMembership, setClaimMembership] =
    useState<TransactionClaimMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextTransaction, nextMembership] = await Promise.all([
        getTransaction(database, transactionId),
        getTransactionClaimMembership(database, transactionId),
      ]);
      if (!nextTransaction) {
        setTransaction(null);
        setError('Transaction not found.');
        return;
      }
      setTransaction(nextTransaction);
      setClaimMembership(nextMembership);
    } catch (loadError) {
      setError(mapError(loadError, 'DATABASE_WRITE_FAILED').message);
    } finally {
      setLoading(false);
    }
  }, [database, transactionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function confirmDelete() {
    if (!transaction || deletingRef.current) {
      return;
    }
    const warning = claimMembership
      ? `This will remove the transaction from Draft claim “${claimMembership.claimTitle}” and delete it.`
      : 'This action cannot be undone.';
    Alert.alert('Delete transaction?', warning, [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: () => {
          if (deletingRef.current) return;
          deletingRef.current = true;
          setDeleting(true);
          deleteTransaction(database, transactionId)
            .then(() => {
              router.dismissTo({
                params: { feedback: 'Transaction deleted.' },
                pathname: '/transactions',
              });
            })
            .catch((deleteError) => {
              const message = isCodedError(deleteError)
                ? deleteError.message
                : mapError(deleteError, 'DATABASE_WRITE_FAILED').message;
              setError(message);
            })
            .finally(() => {
              deletingRef.current = false;
              setDeleting(false);
            });
        },
        style: 'destructive',
        text: 'Delete',
      },
    ]);
  }

  if (loading && !transaction) {
    return (
      <Screen>
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            Loading transaction…
          </Text>
        </View>
      </Screen>
    );
  }

  if (!transaction) {
    return (
      <Screen>
        <View style={styles.state}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.textPrimary }]}
          >
            Transaction not found
          </Text>
          <Text
            accessibilityLiveRegion="assertive"
            style={[styles.stateText, { color: colors.textSecondary }]}
          >
            {error ??
              'The requested transaction could not be loaded or was removed.'}
          </Text>
          <View style={styles.stateActions}>
            <AppButton
              label="Back to transactions"
              onPress={() => router.replace('/transactions')}
              variant="secondary"
            />
          </View>
        </View>
      </Screen>
    );
  }

  const dateTime = toLocalDateTimeInput(
    transaction.occurredAt,
    transaction.timezoneOffsetMinutes,
  );
  const counterpartyLabel =
    transaction.type === 'expense' ? 'Merchant' : 'Source';

  return (
    <Screen>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AppButton label="Back" onPress={() => router.back()} variant="ghost" />
        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: colors.textPrimary }]}
        >
          Transaction Detail
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Text style={[styles.type, { color: colors.textSecondary }]}>
            {transaction.type === 'expense' ? 'Expense' : 'Income'}
          </Text>
          <Text
            style={
              transaction.type === 'expense'
                ? [styles.expenseAmount, { color: colors.destructive }]
                : [styles.incomeAmount, { color: colors.positive }]
            }
          >
            {transaction.type === 'expense' ? '−' : '+'}
            {formatMoney(transaction.amountMinor, transaction.currencyCode)}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <DetailField
            label={counterpartyLabel}
            value={
              transaction.counterparty ??
              `No ${counterpartyLabel.toLowerCase()}`
            }
          />
          <DetailField label="Category" value={transaction.categoryName} />
          <DetailField
            label="Date & Time"
            value={`${dateTime.date} · ${dateTime.time}`}
          />
          <DetailField
            label="Payment Method"
            value={transaction.paymentMethodName ?? 'None'}
          />
          <DetailField label="Note" value={transaction.note ?? 'None'} />
          <DetailField
            label="Receipt"
            value={
              transaction.receipt
                ? `${receiptName(transaction.receipt.storageKey)} · ${transaction.receipt.ocrStatus.replaceAll('_', ' ')}`
                : 'No receipt'
            }
          />
          <DetailField
            label="Reimbursement status"
            value={
              transaction.type === 'income'
                ? 'Not applicable'
                : transaction.isReimbursable
                  ? 'Reimbursable'
                  : 'Not reimbursable'
            }
          />
          {claimMembership ? (
            <DetailField
              label="Claim"
              value={`${claimMembership.claimTitle} · ${claimMembership.claimStatus}`}
            />
          ) : null}
        </View>

        {error ? (
          <Text
            accessibilityLiveRegion="assertive"
            style={[styles.error, { color: colors.destructive }]}
          >
            {error}
          </Text>
        ) : null}

        <View style={styles.actions}>
          {transaction.receipt ? (
            <AppButton
              label="View receipt"
              onPress={() =>
                router.push(`/transactions/${transaction.id}/receipt`)
              }
              variant="secondary"
            />
          ) : null}
          {claimMembership && claimMembership.claimStatus !== 'draft' ? (
            <Text style={[styles.locked, { color: colors.textSecondary }]}>
              This transaction is locked by a {claimMembership.claimStatus}{' '}
              claim and cannot be edited or deleted.
            </Text>
          ) : (
            <>
              <AppButton
                label="Edit transaction"
                onPress={() =>
                  router.push(`/transactions/${transaction.id}/edit`)
                }
              />
              <AppButton
                disabled={deleting}
                label="Delete transaction"
                loading={deleting}
                onPress={confirmDelete}
                variant="destructive"
              />
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 72,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  summary: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  type: {
    fontSize: typography.secondary.fontSize,
    fontWeight: '600',
  },
  expenseAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  incomeAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  field: {
    borderBottomWidth: 1,
    paddingVertical: spacing.md,
  },
  label: {
    fontSize: typography.metadata.fontSize,
  },
  value: {
    fontSize: typography.body.fontSize,
    marginTop: spacing.xs,
  },
  error: {
    fontSize: typography.body.fontSize,
  },
  locked: {
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  stateText: {
    fontSize: typography.body.fontSize,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  stateActions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
  },
});
