import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
import { getCategoryMeta } from '@/features/categories/category-meta';
import {
  deleteTransaction,
  getTransaction,
  getTransactionClaimMembership,
  type Transaction,
  type TransactionClaimMembership,
} from '@/features/transactions/transaction-repository';
import { toLocalDateTimeInput } from '@/lib/dates';
import { isCodedError, mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

function DetailItemRow({
  icon,
  iconColor,
  label,
  value,
  isLast = false,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor?: string;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.detailItemRow,
        !isLast
          ? [styles.detailItemBorder, { borderBottomColor: colors.border }]
          : null,
      ]}
    >
      <View style={styles.detailItemLeft}>
        <View
          style={[
            styles.detailIconBox,
            { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          <MaterialCommunityIcons
            color={iconColor || colors.textSecondary}
            name={icon}
            size={18}
          />
        </View>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
      </View>
      <Text
        numberOfLines={2}
        selectable
        style={[styles.detailValue, { color: colors.textPrimary }]}
      >
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
  const { language, t } = useLanguage();
  const { colors, isDark } = useTheme();
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
        setError(t.transactions.notFoundDesc);
        return;
      }
      setTransaction(nextTransaction);
      setClaimMembership(nextMembership);
    } catch (loadError) {
      setError(mapError(loadError, 'DATABASE_WRITE_FAILED').message);
    } finally {
      setLoading(false);
    }
  }, [database, t.transactions.notFoundDesc, transactionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function confirmDelete() {
    if (!transaction || deletingRef.current) {
      return;
    }

    Alert.alert(
      language === 'id' ? 'Hapus Transaksi?' : 'Delete Transaction?',
      language === 'id'
        ? 'Transaksi ini akan dihapus dari riwayat dan saldo dompet akan otomatis disesuaikan kembali.'
        : 'This transaction will be removed from your history and wallet balance will be adjusted accordingly.',
      [
        {
          style: 'cancel',
          text: language === 'id' ? 'Batal' : 'Cancel',
        },
        {
          onPress: () => {
            deletingRef.current = true;
            setDeleting(true);
            deleteTransaction(database, transactionId)
              .then(() => {
                router.back();
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
          text: language === 'id' ? 'Hapus' : 'Delete',
        },
      ],
    );
  }

  if (loading && !transaction) {
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
              {
                backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="alert-circle-outline"
              size={44}
            />
          </View>
          <Text
            accessibilityRole="header"
            style={[styles.emptyTitle, { color: colors.textPrimary }]}
          >
            {t.transactions.notFound}
          </Text>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            {error ?? t.transactions.notFoundDesc}
          </Text>
          <View style={styles.stateActions}>
            <AppButton
              label={t.transactions.backToList}
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
  const meta = getCategoryMeta(
    transaction.categoryName,
    transaction.type,
    isDark,
  );
  const counterpartyLabel =
    transaction.type === 'expense'
      ? t.transactions.merchant
      : t.transactions.source;
  const isExpense = transaction.type === 'expense';

  const isTransfer = transaction.type === 'transfer';
  const heroTitle =
    isTransfer &&
    transaction.paymentMethodName &&
    transaction.transferToPaymentMethodName
      ? `${transaction.paymentMethodName} ➔ ${transaction.transferToPaymentMethodName}`
      : transaction.counterparty?.trim() || transaction.categoryName;

  return (
    <Screen>
      {/* Top App Bar Header */}
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
            {
              backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
            },
            pressed ? styles.pressed : null,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.textPrimary}
            name="arrow-left"
            size={20}
          />
        </Pressable>

        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: colors.textPrimary }]}
        >
          {t.transactions.detailTitle}
        </Text>

        {!claimMembership || claimMembership.claimStatus === 'draft' ? (
          <Pressable
            accessibilityLabel={t.transactions.deleteTransaction}
            accessibilityRole="button"
            hitSlop={8}
            onPress={confirmDelete}
            style={({ pressed }) => [
              styles.deleteIconBtn,
              {
                backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
              },
              pressed ? styles.pressed : null,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.destructive}
              name="trash-can-outline"
              size={20}
            />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 🌟 Hero Card: Big Amount & Category */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.textPrimary,
            },
          ]}
        >
          {/* Avatar Icon */}
          <View
            style={[
              styles.heroAvatarCircle,
              {
                backgroundColor: isTransfer
                  ? isDark
                    ? '#1E3A8A'
                    : '#EFF6FF'
                  : meta.backgroundColor,
              },
            ]}
          >
            <MaterialCommunityIcons
              color={isTransfer ? '#2563EB' : meta.color}
              name={isTransfer ? 'swap-horizontal' : meta.icon}
              size={32}
            />
          </View>

          {/* Title / Counterparty */}
          <Text
            numberOfLines={2}
            style={[styles.heroCounterparty, { color: colors.textPrimary }]}
          >
            {heroTitle}
          </Text>

          {/* Large Amount Display */}
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            style={[
              styles.heroAmount,
              {
                color: isTransfer
                  ? '#2563EB'
                  : isExpense
                  ? colors.destructive
                  : colors.positive,
              },
            ]}
          >
            {isTransfer ? '⇄ ' : isExpense ? '−' : '+'}
            {formatMoney(transaction.amountMinor, transaction.currencyCode)}
          </Text>

          {/* Pill Badges */}
          <View style={styles.heroBadgesRow}>
            <View
              style={[
                styles.heroTypePill,
                {
                  backgroundColor: isTransfer
                    ? isDark
                      ? '#1E3A8A'
                      : '#EFF6FF'
                    : isExpense
                    ? isDark
                      ? '#7F1D1D'
                      : '#FEE2E2'
                    : isDark
                    ? '#14532D'
                    : '#DCFCE7',
                },
              ]}
            >
              <Text
                style={[
                  styles.heroTypePillText,
                  {
                    color: isTransfer
                      ? '#2563EB'
                      : isExpense
                      ? colors.destructive
                      : colors.positive,
                  },
                ]}
              >
                {isTransfer
                  ? '⇄ Transfer'
                  : isExpense
                  ? `💸 ${t.transactions.expense}`
                  : `💰 ${t.transactions.income}`}
              </Text>
            </View>

            {transaction.receipt ? (
              <View
                style={[
                  styles.heroReceiptPill,
                  {
                    backgroundColor: isDark ? '#312E81' : '#EDE9FE',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color="#7C3AED"
                  name="receipt-outline"
                  size={12}
                />
                <Text style={styles.heroReceiptPillText}>
                  {t.home.receiptBadge}
                </Text>
              </View>
            ) : null}

            {transaction.isReimbursable ? (
              <View
                style={[
                  styles.heroReimbursePill,
                  {
                    backgroundColor: isDark ? '#78350F' : '#FEF3C7',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color="#D97706"
                  name="briefcase-outline"
                  size={12}
                />
                <Text style={styles.heroReimbursePillText}>
                  {t.transactions.reimbursableBadge}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 📋 Complete Info Card Group */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.textPrimary,
            },
          ]}
        >
          {isTransfer ? (
            <>
              <DetailItemRow
                icon="wallet-outline"
                iconColor="#2563EB"
                label={t.transactions.transferFrom}
                value={transaction.paymentMethodName || t.transactions.none}
              />
              <DetailItemRow
                icon="bank-transfer-in"
                iconColor="#10B981"
                label={t.transactions.transferTo}
                value={
                  transaction.transferToPaymentMethodName ||
                  t.transactions.none
                }
              />
              {transaction.transferFeeMinor > 0 ? (
                <DetailItemRow
                  icon="tag-outline"
                  iconColor="#EF4444"
                  label={t.transactions.transferFeeToggle}
                  value={
                    formatMoney(
                      transaction.transferFeeMinor,
                      transaction.currencyCode,
                    ) +
                    (transaction.transferFeeNote
                      ? ` (${transaction.transferFeeNote})`
                      : '')
                  }
                />
              ) : null}
            </>
          ) : (
            <>
              <DetailItemRow
                icon={meta.icon}
                iconColor={meta.color}
                label={t.transactions.category}
                value={transaction.categoryName}
              />

              <DetailItemRow
                icon="storefront-outline"
                label={counterpartyLabel}
                value={transaction.counterparty || t.transactions.none}
              />

              <DetailItemRow
                icon="credit-card-outline"
                label={t.transactions.paymentMethod}
                value={transaction.paymentMethodName || t.transactions.none}
              />
            </>
          )}

          <DetailItemRow
            icon="calendar-clock-outline"
            label={t.transactions.dateTime}
            value={`${dateTime.date} · ${dateTime.time}`}
          />

          <DetailItemRow
            icon="note-text-outline"
            label={t.transactions.note}
            value={transaction.note || t.transactions.none}
          />

          {!isTransfer ? (
            <>
              <DetailItemRow
                icon="receipt-text-outline"
                label={t.transactions.receipt}
                value={
                  transaction.receipt
                    ? receiptName(transaction.receipt.storageKey)
                    : t.transactions.noReceipt
                }
              />

              <DetailItemRow
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
            <DetailItemRow
              icon="file-document-outline"
              isLast
              label={t.transactions.claim}
              value={`${claimMembership.claimTitle} (${claimMembership.claimStatus})`}
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

        {/* 🚀 Actions Section */}
        <View style={styles.actions}>
          {transaction.receipt ? (
            <AppButton
              label={t.transactions.viewReceipt}
              onPress={() =>
                router.push(`/transactions/${transaction.id}/receipt`)
              }
              variant="secondary"
            />
          ) : null}

          {claimMembership && claimMembership.claimStatus !== 'draft' ? (
            <View
              style={[
                styles.lockedBanner,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#FEF3C7',
                  borderColor: isDark ? colors.border : '#FDE68A',
                },
              ]}
            >
              <MaterialCommunityIcons
                color="#D97706"
                name="lock-outline"
                size={18}
              />
              <Text
                style={[
                  styles.lockedText,
                  { color: isDark ? colors.textPrimary : '#92400E' },
                ]}
              >
                {t.transactions.lockedByClaim}
              </Text>
            </View>
          ) : (
            <View style={styles.primaryActionGroup}>
              <AppButton
                label={t.transactions.editTransaction}
                onPress={() =>
                  router.push(`/transactions/${transaction.id}/edit`)
                }
                variant="primary"
              />

              <AppButton
                disabled={deleting}
                label={t.transactions.deleteTransaction}
                loading={deleting}
                onPress={confirmDelete}
                variant="destructive"
              />
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 14,
    height: 38,
    justifyContent: 'center',
    width: 38,
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
    borderRadius: 14,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  detailIconBox: {
    alignItems: 'center',
    borderRadius: 8,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  detailItemBorder: {
    borderBottomWidth: 1,
  },
  detailItemLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  detailItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    paddingLeft: spacing.md,
    textAlign: 'right',
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
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerSpacer: {
    width: 38,
  },
  headerTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  heroAvatarCircle: {
    alignItems: 'center',
    borderRadius: 20,
    height: 60,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 60,
  },
  heroBadgesRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: spacing.sm + 2,
  },
  heroCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 3,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  heroCounterparty: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroReceiptPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroReceiptPillText: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '800',
  },
  heroReimbursePill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroReimbursePillText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '800',
  },
  heroTypePill: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  heroTypePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    elevation: 2,
    overflow: 'hidden',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  lockedBanner: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  lockedText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  primaryActionGroup: {
    gap: spacing.sm,
  },
  stateActions: {
    marginTop: spacing.md,
    width: '100%',
  },
  stateText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
