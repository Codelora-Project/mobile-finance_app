import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { getCategoryMeta } from '@/features/categories/category-meta';
import {
  getReceiptFileUri,
  receiptFileExists,
} from '@/features/receipts/receipt-storage';
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
import { typography } from '@/theme/typography';

function DetailItemRow({
  icon,
  iconColor,
  isLast = false,
  label,
  onPress,
  rightActionIcon,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor?: string;
  isLast?: boolean;
  label: string;
  onPress?: () => void;
  rightActionIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  value: string;
}) {
  const { colors, isDark } = useTheme();

  const content = (
    <View
      style={[
        styles.detailItemRow,
        !isLast
          ? [
              styles.detailItemBorder,
              {
                borderBottomColor: isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : 'rgba(0, 0, 0, 0.05)',
              },
            ]
          : null,
      ]}
    >
      <View style={styles.detailItemLeft}>
        <View
          style={[
            styles.detailIconBox,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.06)'
                : 'rgba(0, 0, 0, 0.04)',
            },
          ]}
        >
          <MaterialCommunityIcons
            color={iconColor || colors.textSecondary}
            name={icon}
            size={16}
          />
        </View>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
      </View>
      <View style={styles.detailItemRight}>
        <Text
          numberOfLines={2}
          selectable
          style={[styles.detailValue, { color: colors.textPrimary }]}
        >
          {value}
        </Text>
        {rightActionIcon ? (
          <MaterialCommunityIcons
            color={colors.textSecondary}
            name={rightActionIcon}
            size={16}
          />
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [pressed ? { opacity: 0.7 } : null]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
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
  const [copiedNotification, setCopiedNotification] = useState(false);

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

  function handleCopyDetails() {
    if (!transaction) return;
    setCopiedNotification(true);
    setTimeout(() => {
      setCopiedNotification(false);
    }, 2000);
  }

  async function handleShareSlip() {
    if (!transaction) return;

    let hasImage = false;
    let imageUri = '';
    try {
      if (
        transaction.receipt &&
        receiptFileExists(transaction.receipt.storageKey)
      ) {
        hasImage = true;
        imageUri = getReceiptFileUri(transaction.receipt.storageKey);
      }
    } catch {
      hasImage = false;
    }

    if (hasImage && imageUri) {
      try {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(imageUri, {
            dialogTitle:
              language === 'id'
                ? 'Bagikan Foto Struk'
                : 'Share Receipt Image',
            mimeType: transaction.receipt?.mimeType || 'image/jpeg',
          });
          return;
        }
      } catch {
        // Fallback to text share if native file sharing is cancelled/fails
      }
    }

    // Text share fallback or if no image attached
    const dateTime = toLocalDateTimeInput(
      transaction.occurredAt,
      transaction.timezoneOffsetMinutes,
    );
    const isExpense = transaction.type === 'expense';
    const isTransfer = transaction.type === 'transfer';
    const typeLabel = isTransfer
      ? 'TRANSFER'
      : isExpense
      ? language === 'id'
        ? 'PENGELUARAN'
        : 'EXPENSE'
      : language === 'id'
      ? 'PEMASUKAN'
      : 'INCOME';

    const amountFormatted = formatMoney(
      transaction.amountMinor,
      transaction.currencyCode,
    );
    const sign = isTransfer ? '' : isExpense ? '−' : '+';

    let detailLines = '';
    if (isTransfer) {
      detailLines = `Dari: ${transaction.paymentMethodName || '-'}\nKe: ${
        transaction.transferToPaymentMethodName || '-'
      }`;
      if (transaction.transferFeeMinor > 0) {
        detailLines += `\nBiaya Admin: ${formatMoney(
          transaction.transferFeeMinor,
          transaction.currencyCode,
        )}`;
      }
    } else {
      detailLines = `Kategori: ${transaction.categoryName}\n${
        isExpense ? 'Toko/Merchant' : 'Sumber'
      }: ${transaction.counterparty || '-'}\nMetode: ${
        transaction.paymentMethodName || '-'
      }`;
    }

    const noteLine = transaction.note ? `\nCatatan: ${transaction.note}` : '';

    const message =
      `🧾 *BUKTI TRANSAKSI*\n` +
      `─────────────────────────\n` +
      `No. Ref : #${transaction.id}\n` +
      `Waktu   : ${dateTime.date} ${dateTime.time}\n` +
      `Tipe    : ${typeLabel}\n` +
      `Nominal : ${sign}${amountFormatted}\n` +
      `─────────────────────────\n` +
      `${detailLines}${noteLine}\n` +
      `─────────────────────────\n` +
      `Dicatat via FinanceApp`;

    try {
      await Share.share({
        message,
        title: language === 'id' ? 'Bukti Transaksi' : 'Transaction Receipt',
      });
    } catch {
      // Share cancelled
    }
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

  const typeLabel = isTransfer
    ? 'Transfer'
    : isExpense
    ? t.transactions.expense
    : t.transactions.income;

  let receiptImageUri: string | null = null;
  try {
    if (
      transaction.receipt &&
      receiptFileExists(transaction.receipt.storageKey)
    ) {
      receiptImageUri = getReceiptFileUri(transaction.receipt.storageKey);
    }
  } catch {
    receiptImageUri = null;
  }

  return (
    <Screen>
      {/* 1. Top App Bar Header */}
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
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.06)'
                : 'rgba(0, 0, 0, 0.04)',
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
                backgroundColor: isDark
                  ? 'rgba(239, 68, 68, 0.15)'
                  : '#FEE2E2',
              },
              pressed ? styles.pressed : null,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.destructive}
              name="trash-can-outline"
              size={18}
            />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 🌟 2. Digital Receipt Hero Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Status & Type Row */}
          <View style={styles.heroStatusRow}>
            <View
              style={[
                styles.statusIndicatorPill,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(0, 0, 0, 0.04)',
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isTransfer
                      ? colors.primary
                      : isExpense
                      ? colors.destructive
                      : colors.positive,
                  },
                ]}
              />
              <Text
                style={[styles.statusText, { color: colors.textSecondary }]}
              >
                {typeLabel}
              </Text>
            </View>
          </View>

          {/* Icon Badge */}
          <View
            style={[
              styles.heroAvatarCircle,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : 'rgba(0, 0, 0, 0.04)',
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name={isTransfer ? 'swap-horizontal' : meta.icon}
              size={26}
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
                  ? colors.textPrimary
                  : isExpense
                  ? colors.destructive
                  : colors.positive,
              },
            ]}
          >
            {isTransfer ? '⇄ ' : isExpense ? '−' : '+'}
            {formatMoney(transaction.amountMinor, transaction.currencyCode)}
          </Text>

          {/* Auxiliary Pill Badges */}
          {transaction.receipt || transaction.isReimbursable ? (
            <View style={styles.heroBadgesRow}>
              {transaction.receipt ? (
                <View
                  style={[
                    styles.heroAuxPill,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.06)'
                        : 'rgba(0, 0, 0, 0.04)',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.textSecondary}
                    name="receipt-outline"
                    size={11}
                  />
                  <Text
                    style={[
                      styles.heroAuxPillText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.home.receiptBadge}
                  </Text>
                </View>
              ) : null}

              {transaction.isReimbursable ? (
                <View
                  style={[
                    styles.heroAuxPill,
                    {
                      backgroundColor: isDark ? '#451A03' : '#FEF3C7',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={isDark ? '#FBBF24' : '#D97706'}
                    name="briefcase-outline"
                    size={11}
                  />
                  <Text
                    style={[
                      styles.heroAuxPillText,
                      { color: isDark ? '#FBBF24' : '#D97706' },
                    ]}
                  >
                    {t.transactions.reimbursableBadge}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* 📋 3. Transfer Visual Flow Card (If Transfer) */}
        {isTransfer ? (
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.transferFlowCard}>
              <View style={styles.transferNode}>
                <Text
                  style={[
                    styles.transferNodeLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.transactions.transferFrom}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.transferNodeValue,
                    { color: colors.textPrimary },
                  ]}
                >
                  {transaction.paymentMethodName || t.transactions.none}
                </Text>
              </View>

              <View style={styles.transferArrowWrapper}>
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="arrow-right-thin"
                  size={24}
                />
              </View>

              <View style={styles.transferNode}>
                <Text
                  style={[
                    styles.transferNodeLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.transactions.transferTo}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.transferNodeValue,
                    { color: colors.textPrimary },
                  ]}
                >
                  {transaction.transferToPaymentMethodName ||
                    t.transactions.none}
                </Text>
              </View>
            </View>

            {transaction.transferFeeMinor > 0 ? (
              <DetailItemRow
                icon="tag-outline"
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
          </View>
        ) : null}

        {/* 🧾 4. Struk / Receipt Preview Card (If Receipt Attached) */}
        {transaction.receipt ? (
          <Pressable
            accessibilityLabel="Lihat Bukti Struk"
            accessibilityRole="button"
            onPress={() =>
              router.push(`/transactions/${transaction.id}/receipt`)
            }
            style={({ pressed }) => [
              styles.receiptPreviewCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              pressed ? { opacity: 0.8 } : null,
            ]}
          >
            <View style={styles.receiptPreviewLeft}>
              <View
                style={[
                  styles.receiptThumbBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : '#F1F5F9',
                  },
                ]}
              >
                {receiptImageUri ? (
                  <Image
                    resizeMode="cover"
                    source={{ uri: receiptImageUri }}
                    style={styles.receiptThumbImage}
                  />
                ) : (
                  <MaterialCommunityIcons
                    color={colors.textSecondary}
                    name="receipt-text-outline"
                    size={22}
                  />
                )}
              </View>
              <View style={styles.receiptPreviewMeta}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.receiptPreviewTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {receiptName(transaction.receipt.storageKey)}
                </Text>
                <Text
                  style={[
                    styles.receiptPreviewSub,
                    { color: colors.textSecondary },
                  ]}
                >
                  {transaction.receipt.mimeType.toUpperCase()} · Ketuk untuk
                  perbesar
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="chevron-right"
              size={20}
            />
          </Pressable>
        ) : null}

        {/* 📋 5. Transaction Complete Info Card */}
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
              <DetailItemRow
                icon={meta.icon}
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
          ) : null}

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
              isLast={false}
              label={t.transactions.claim}
              value={`${claimMembership.claimTitle} (${claimMembership.claimStatus})`}
            />
          ) : null}

          {/* Transaction ID & Copy */}
          <DetailItemRow
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

        {/* 🚀 6. Professional Dual Bottom Action Bar (Rekomendasi 3) */}
        <View style={styles.actions}>
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
            <View style={styles.dualActionBar}>
              <View style={styles.actionBtnCol}>
                <AppButton
                  label={
                    transaction.receipt
                      ? language === 'id'
                        ? 'Bagikan Struk'
                        : 'Share Receipt'
                      : language === 'id'
                      ? 'Bagikan Slip'
                      : 'Share Slip'
                  }
                  onPress={handleShareSlip}
                  variant="secondary"
                />
              </View>

              <View style={styles.actionBtnCol}>
                <AppButton
                  label={t.transactions.editTransaction}
                  onPress={() =>
                    router.push(`/transactions/${transaction.id}/edit`)
                  }
                  variant="primary"
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionBtnCol: {
    flex: 1,
  },
  actions: {
    marginTop: spacing.xs,
  },
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
  detailIconBox: {
    alignItems: 'center',
    borderRadius: radius.sm,
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
  detailItemRight: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  detailItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  detailLabel: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    ...typography.body,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    paddingLeft: spacing.md,
    textAlign: 'right',
  },
  dualActionBar: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  heroAmount: {
    ...typography.screenTitle,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  heroAuxPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heroAuxPillText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  heroAvatarCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 52,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 52,
  },
  heroBadgesRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: spacing.xs + 2,
  },
  heroCard: {
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  heroCounterparty: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroStatusRow: {
    marginBottom: spacing.xs,
  },
  infoCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
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
    ...typography.metadata,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  receiptPreviewCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.sm + 2,
  },
  receiptPreviewLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  receiptPreviewMeta: {
    flex: 1,
    gap: 2,
  },
  receiptPreviewSub: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '500',
  },
  receiptPreviewTitle: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
  },
  receiptThumbBox: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  receiptThumbImage: {
    height: '100%',
    width: '100%',
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
  statusDot: {
    borderRadius: radius.pill,
    height: 6,
    width: 6,
  },
  statusIndicatorPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  transferArrowWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  transferFlowCard: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  transferNode: {
    flex: 1,
    gap: 2,
  },
  transferNodeLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '500',
  },
  transferNodeValue: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
});
