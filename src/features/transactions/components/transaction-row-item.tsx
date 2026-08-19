import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCategoryMeta } from '@/features/categories/category-meta';
import type { TransactionListItem } from '@/features/transactions/transaction-repository';
import { toLocalDateTimeInput } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TransactionRowItemProps = {
  isLast?: boolean;
  onLongPress?: (transaction: TransactionListItem) => void;
  onPress: (id: number) => void;
  receiptBadgeText?: string;
  reimbursableBadgeText?: string;
  transaction: TransactionListItem;
};

export const TransactionRowItem = memo(function TransactionRowItem({
  isLast = false,
  onLongPress,
  onPress,
  receiptBadgeText = 'Struk',
  reimbursableBadgeText = 'Reimburse',
  transaction,
}: TransactionRowItemProps) {
  const { colors, isDark } = useTheme();

  const meta = getCategoryMeta(
    transaction.categoryName,
    transaction.type,
    isDark,
  );
  const isTransfer = transaction.type === 'transfer';

  // 1. Determine Title
  const hasCounterparty = Boolean(transaction.counterparty?.trim());
  const title =
    isTransfer &&
    transaction.paymentMethodName &&
    transaction.transferToPaymentMethodName
      ? `${transaction.paymentMethodName} ➔ ${transaction.transferToPaymentMethodName}`
      : hasCounterparty
      ? transaction.counterparty?.trim()
      : transaction.categoryName;

  // 2. Determine Subtitle
  const metaSubtitle = isTransfer
    ? 'Transfer Antar Dompet'
    : hasCounterparty
    ? `${transaction.categoryName}${
        transaction.paymentMethodName ? ` · ${transaction.paymentMethodName}` : ''
      }`
    : transaction.paymentMethodName || '';

  // 3. Format Time
  let timeStr = '';
  try {
    if (transaction.occurredAt) {
      const { time } = toLocalDateTimeInput(
        transaction.occurredAt,
        transaction.timezoneOffsetMinutes ?? 0,
      );
      timeStr = time;
    }
  } catch {
    // Fallback if timestamp issue
  }

  return (
    <Pressable
      accessibilityLabel={`${title}, ${formatMoney(
        transaction.amountMinor,
        transaction.currencyCode,
      )}`}
      accessibilityRole="button"
      onLongPress={onLongPress ? () => onLongPress(transaction) : undefined}
      onPress={() => onPress(transaction.id)}
      style={({ pressed }) => [
        styles.rowContainer,
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      {/* Category Icon Badge (Unified Monochromatic) */}
      <View
        style={[
          styles.iconBadge,
          {
            backgroundColor: meta.backgroundColor,
          },
        ]}
      >
        <MaterialCommunityIcons
          color={meta.color}
          name={meta.icon}
          size={19}
        />
      </View>

      {/* Content Column */}
      <View style={styles.contentCol}>
        {/* Row 1: Title & Amount */}
        <View style={styles.mainRow}>
          <Text
            numberOfLines={1}
            style={[styles.itemTitle, { color: colors.textPrimary }]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.itemAmount,
              {
                color:
                  transaction.type === 'expense'
                    ? colors.destructive
                    : transaction.type === 'income'
                    ? colors.positive
                    : colors.textPrimary,
              },
            ]}
          >
            {transaction.type === 'expense'
              ? '−'
              : transaction.type === 'income'
              ? '+'
              : '⇄ '}
            {formatMoney(transaction.amountMinor, transaction.currencyCode)}
          </Text>
        </View>

        {/* Row 2: Subtitle, Time & Badges */}
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            {metaSubtitle ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.categorySubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {metaSubtitle}
              </Text>
            ) : null}
            {timeStr ? (
              <Text style={[styles.timeText, { color: colors.textMuted }]}>
                {metaSubtitle ? ` · ${timeStr}` : timeStr}
              </Text>
            ) : null}
          </View>

          {/* Badges */}
          <View style={styles.badgesWrap}>
            {transaction.hasReceipt ? (
              <View
                style={[
                  styles.pillBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.04)',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="receipt-outline"
                  size={10}
                />
                <Text
                  style={[styles.pillBadgeText, { color: colors.textSecondary }]}
                >
                  {receiptBadgeText}
                </Text>
              </View>
            ) : null}

            {transaction.isReimbursable ? (
              <View
                style={[
                  styles.pillBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.04)',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="briefcase-outline"
                  size={10}
                />
                <Text
                  style={[
                    styles.pillBadgeText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {reimbursableBadgeText}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  badgesWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  categorySubtitle: {
    ...typography.metadata,
    flexShrink: 1,
    fontSize: 12,
  },
  contentCol: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  itemAmount: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  itemTitle: {
    ...typography.body,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  mainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pillBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  pillBadgeText: {
    ...typography.metadata,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
  rowContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingVertical: spacing.xs + 3,
  },
  timeText: {
    ...typography.metadata,
    fontSize: 12,
  },
});
