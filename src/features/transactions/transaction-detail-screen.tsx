import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import {
  DetailActionBar,
  DetailHeroCard,
  DetailInfoRow,
  DetailReceiptCard,
  DetailTransferFlow,
} from '@/features/transactions/components/detail';
import { useTransactionShare } from '@/features/transactions/hooks/use-transaction-share';
import {
  deleteTransactionForUndo,
  getTransaction,
  getTransactionClaimMembership,
  type Transaction,
  type TransactionClaimMembership,
} from '@/features/transactions/transaction-repository';
import { getTimezoneOffsetMinutes, toLocalDateTimeInput } from '@/lib/dates';
import { isCodedError, mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

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
  const { language, t } = useLanguage();
  const { colors } = useTheme();
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletingRef = useRef(false);
  const loadRequestRef = useRef(0);

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [claimMembership, setClaimMembership] =
    useState<TransactionClaimMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const { handleShareSlip } = useTransactionShare({
    language,
    transaction,
  });

  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const [nextTransaction, nextMembership] = await Promise.all([
        getTransaction(database, transactionId),
        getTransactionClaimMembership(database, transactionId),
      ]);
      if (requestId !== loadRequestRef.current) return;
      if (!nextTransaction) {
        setTransaction(null);
        setClaimMembership(null);
        setError(t.transactions.notFoundDesc);
        return;
      }
      setTransaction(nextTransaction);
      setClaimMembership(nextMembership);
    } catch (loadError) {
      if (requestId === loadRequestRef.current) {
        setError(mapError(loadError, 'DATABASE_WRITE_FAILED').message);
      }
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, [database, t.transactions.notFoundDesc, transactionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        loadRequestRef.current += 1;
      };
    }, [load]),
  );

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  function confirmDelete() {
    if (!transaction || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    deleteTransactionForUndo(database, transactionId)
      .then((snapshot) => {
        router.dismissTo({
          params: {
            feedback:
              language === 'id'
                ? 'Transaksi telah dihapus'
                : 'Transaction deleted',
            undoPayload: JSON.stringify(snapshot),
          },
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
  }

  function handleCopyDetails() {
    if (!transaction) return;
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setCopiedNotification(true);
    copyTimerRef.current = setTimeout(() => {
      copyTimerRef.current = null;
      setCopiedNotification(false);
    }, 2000);
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.centeredState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            {t.transactions.loading}
          </Text>
        </View>
      </Screen>
    );
  }

  if (!transaction) {
    return (
      <Screen>
        <View style={styles.centeredState}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textMuted}
              name="receipt-text-remove-outline"
              size={42}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {language === 'id'
              ? 'Transaksi Tidak Ditemukan'
              : 'Transaction Not Found'}
          </Text>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            {error || t.transactions.notFoundDesc}
          </Text>
          <View style={styles.stateActions}>
            <AppButton label={t.common.back} onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  let dateTime = { date: transaction.localDate, time: '' };
  try {
    const offset = Number.isInteger(transaction.timezoneOffsetMinutes)
      ? (transaction.timezoneOffsetMinutes as number)
      : getTimezoneOffsetMinutes(transaction.occurredAt);
    dateTime = toLocalDateTimeInput(transaction.occurredAt, offset);
  } catch {
    // Fallback
  }

  const isTransfer = transaction.type === 'transfer';

  return (
    <Screen>
      {/* 1. Header Bar with Back & Delete Actions */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          accessibilityLabel={t.common.back}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.textPrimary}
            name="arrow-left"
            size={22}
          />
        </Pressable>

        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[styles.headerTitle, { color: colors.textPrimary }]}
        >
          {isTransfer
            ? language === 'id'
              ? 'Detail Transfer'
              : 'Transfer Details'
            : t.transactions.detailTitle}
        </Text>

        {!claimMembership || claimMembership.claimStatus === 'draft' ? (
          <Pressable
            accessibilityLabel={t.transactions.deleteTransaction}
            accessibilityRole="button"
            disabled={deleting}
            hitSlop={8}
            onPress={confirmDelete}
            style={({ pressed }) => [
              styles.deleteIconBtn,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.destructive}
              name="trash-can-outline"
              size={22}
            />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 2. Hero Visual Card */}
        <DetailHeroCard language={language} t={t} transaction={transaction} />

        {/* 3. Transfer Direction Flow (if transfer) */}
        {isTransfer ? (
          <DetailTransferFlow t={t} transaction={transaction} />
        ) : null}

        {/* 4. Receipt Photo Preview Card */}
        {transaction.receipt ? (
          <DetailReceiptCard
            language={language}
            t={t}
            transaction={transaction}
          />
        ) : null}

        {/* 5. Clean Metadata Group */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {!isTransfer ? (
            <>
              <DetailInfoRow
                icon="shape-outline"
                label={t.transactions.category}
                value={transaction.categoryName}
              />

              <DetailInfoRow
                icon="storefront-outline"
                label={
                  transaction.type === 'expense'
                    ? t.transactions.merchant
                    : t.transactions.source
                }
                value={transaction.counterparty || '-'}
              />

              <DetailInfoRow
                icon="wallet-outline"
                label={t.transactions.paymentMethod}
                value={transaction.paymentMethodName || '-'}
              />
            </>
          ) : null}

          <DetailInfoRow
            icon="calendar-clock-outline"
            label={t.transactions.dateTime}
            value={`${dateTime.date} · ${dateTime.time}`}
          />

          <DetailInfoRow
            icon="note-text-outline"
            label={t.transactions.note}
            value={transaction.note || t.transactions.none}
          />

          {!isTransfer ? (
            <>
              <DetailInfoRow
                icon="receipt-text-outline"
                label={t.transactions.receipt}
                value={
                  transaction.receipt
                    ? receiptName(transaction.receipt.storageKey)
                    : t.transactions.noReceipt
                }
              />

              <DetailInfoRow
                icon="briefcase-check-outline"
                isLast={!claimMembership}
                label={t.transactions.reimbursementStatus}
                value={
                  transaction.type === 'income'
                    ? t.transactions.notApplicable
                    : transaction.isReimbursable
                      ? t.transactions.reimbursableBadge
                      : t.transactions.notReimbursable
                }
              />
            </>
          ) : null}

          {claimMembership ? (
            <DetailInfoRow
              icon="file-document-outline"
              isLast={false}
              label={t.transactions.claim}
              value={`${claimMembership.claimTitle} (${claimMembership.claimStatus})`}
            />
          ) : null}

          {/* Transaction ID & Copy */}
          <DetailInfoRow
            icon="identifier"
            isLast
            label={language === 'id' ? 'ID Transaksi' : 'Transaction ID'}
            onPress={handleCopyDetails}
            rightActionIcon="content-copy"
            value={
              copiedNotification
                ? language === 'id'
                  ? 'Disalin!'
                  : 'Copied!'
                : `#${transaction.id}`
            }
          />
        </View>

        {error ? (
          <Text
            accessibilityLiveRegion="assertive"
            style={[styles.error, { color: colors.destructive }]}
          >
            {error}
          </Text>
        ) : null}

        {/* 6. Professional Dual Bottom Action Bar */}
        <DetailActionBar
          claimMembership={claimMembership}
          language={language}
          onShareSlip={handleShareSlip}
          t={t}
          transaction={transaction}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  centeredState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  deleteIconBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  emptyIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 76,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 76,
  },
  emptyTitle: {
    ...typography.sectionTitle,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  error: {
    ...typography.metadata,
    fontSize: 13,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    ...typography.sectionTitle,
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  infoCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  stateActions: {
    marginTop: spacing.md,
    width: '100%',
  },
  stateText: {
    ...typography.metadata,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
