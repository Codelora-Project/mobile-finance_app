import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
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
  type Transaction,
} from '@/features/transactions/transaction-repository';
import { toLocalDateTimeInput } from '@/lib/dates';
import { isCodedError, mapError } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text selectable style={styles.value}>
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
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextTransaction = await getTransaction(database, transactionId);
      if (!nextTransaction) {
        setTransaction(null);
        setError('Transaction not found.');
        return;
      }
      setTransaction(nextTransaction);
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
    if (!transaction || deleting) {
      return;
    }
    Alert.alert('Delete transaction?', 'This action cannot be undone.', [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: () => {
          setDeleting(true);
          deleteTransaction(database, transaction.id)
            .then(() => {
              router.dismissTo({
                params: { feedback: 'Transaction deleted.' },
                pathname: '/transactions',
              });
            })
            .catch((deleteError: unknown) => {
              setError(
                isCodedError(deleteError)
                  ? deleteError.message
                  : mapError(deleteError, 'DATABASE_WRITE_FAILED').message,
              );
              setDeleting(false);
            });
        },
        style: 'destructive',
        text: 'Delete',
      },
    ]);
  }

  if (loading) {
    return (
      <Screen style={styles.state}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Loading transaction…</Text>
      </Screen>
    );
  }

  if (!transaction) {
    return (
      <Screen style={styles.state}>
        <Text accessibilityRole="header" style={styles.title}>
          Transaction unavailable
        </Text>
        <Text accessibilityLiveRegion="assertive" style={styles.stateText}>
          {error ?? 'Transaction not found.'}
        </Text>
        <View style={styles.stateActions}>
          <AppButton label="Try again" onPress={() => void load()} />
          <AppButton
            label="Back"
            onPress={() => router.back()}
            variant="secondary"
          />
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
      <View style={styles.header}>
        <AppButton label="Back" onPress={() => router.back()} variant="ghost" />
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Transaction Detail
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Text style={styles.type}>
            {transaction.type === 'expense' ? 'Expense' : 'Income'}
          </Text>
          <Text
            style={
              transaction.type === 'expense'
                ? styles.expenseAmount
                : styles.incomeAmount
            }
          >
            {transaction.type === 'expense' ? '−' : '+'}
            {formatMoney(transaction.amountMinor, transaction.currencyCode)}
          </Text>
        </View>

        <View style={styles.card}>
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
        </View>

        {error ? (
          <Text accessibilityLiveRegion="assertive" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <AppButton
            disabled={deleting}
            label="Edit transaction"
            onPress={() => router.push(`/transactions/${transaction.id}/edit`)}
            variant="secondary"
          />
          <AppButton
            label="Delete transaction"
            loading={deleting}
            onPress={confirmDelete}
            variant="destructive"
          />
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerTitle: {
    color: colors.textPrimary,
    flex: 1,
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
    color: colors.textSecondary,
    fontSize: typography.secondary.fontSize,
    fontWeight: '600',
  },
  expenseAmount: {
    color: colors.destructive,
    fontSize: 32,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  incomeAmount: {
    color: colors.positive,
    fontSize: 32,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  field: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingVertical: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.metadata.fontSize,
  },
  value: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.destructive,
    fontSize: typography.body.fontSize,
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
    color: colors.textPrimary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  stateText: {
    color: colors.textSecondary,
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
