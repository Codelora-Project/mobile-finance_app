import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCategoryMeta } from '@/features/categories/category-meta';
import type { TransactionListItem } from '@/features/transactions/transaction-repository';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TransactionRowItemProps = {
  isLast?: boolean;
  onPress: (id: number) => void;
  receiptBadgeText?: string;
  reimbursableBadgeText?: string;
  transaction: TransactionListItem;
};

export const TransactionRowItem = memo(function TransactionRowItem({
  isLast = false,
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

  // 2. Determine Subtitle (avoid duplicate category name when no counterparty)
  const metaSubtitle = isTransfer
    ? 'Transfer Antar Dompet'
    : hasCounterparty
    ? `${transaction.categoryName}${
        transaction.paymentMethodName ? ` · ${transaction.paymentMethodName}` : ''
      }`
    : transaction.paymentMethodName || '';

  return (
    <Pressable
      accessibilityLabel={`${title}, ${formatMoney(
        transaction.amountMinor,
        transaction.currencyCode,
      )}`}
      accessibilityRole="button"
      onPress={() => onPress(transaction.id)}
      style={({ pressed }) => [
        styles.timelineRow,
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      {/* Timeline Dot & Connecting Line */}
      <View style={styles.timelineTrackCol}>
        <View
          style={[
            styles.timelineDot,
            { backgroundColor: isTransfer ? '#2563EB' : meta.color },
          ]}
        />
        {!isLast ? (
          <View
            style={[
              styles.timelineLine,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)' },
            ]}
          />
        ) : null}
      </View>

      {/* Content Column */}
      <View style={styles.timelineContentCol}>
        {/* Row 1: Title & Amount */}
        <View style={styles.timelineMainRow}>
          <Text
            numberOfLines={1}
            style={[styles.timelineItemTitle, { color: colors.textPrimary }]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.timelineAmount,
              {
                color:
                  transaction.type === 'expense'
                    ? colors.destructive
                    : transaction.type === 'income'
                    ? colors.positive
                    : '#2563EB',
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

        {/* Row 2: Subtitle & Badges */}
        <View style={styles.timelineMetaRow}>
          {metaSubtitle ? (
            <Text
              numberOfLines={1}
              style={[
                styles.timelineCategoryName,
                { color: colors.textSecondary },
              ]}
            >
              {metaSubtitle}
            </Text>
          ) : null}

          {isTransfer ? (
            <View
              style={[
                styles.receiptPill,
                {
                  backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF',
                  borderColor: isDark ? '#2563EB' : '#BFDBFE',
                },
              ]}
            >
              <MaterialCommunityIcons
                color="#2563EB"
                name="swap-horizontal"
                size={10}
              />
              <Text style={[styles.receiptPillText, { color: '#2563EB' }]}>
                Transfer
              </Text>
            </View>
          ) : null}

          {transaction.hasReceipt ? (
            <View
              style={[
                styles.receiptPill,
                {
                  backgroundColor: isDark ? '#312E81' : '#EDE9FE',
                  borderColor: isDark ? '#4338CA' : '#DDD6FE',
                },
              ]}
            >
              <MaterialCommunityIcons
                color="#7C3AED"
                name="receipt-outline"
                size={10}
              />
              <Text style={styles.receiptPillText}>
                {receiptBadgeText}
              </Text>
            </View>
          ) : null}

          {transaction.isReimbursable ? (
            <View
              style={[
                styles.reimbursablePill,
                {
                  backgroundColor: isDark ? '#451A03' : '#FEF3C7',
                  borderColor: isDark ? '#D97706' : '#FDE68A',
                },
              ]}
            >
              <MaterialCommunityIcons
                color="#D97706"
                name="briefcase-outline"
                size={10}
              />
              <Text style={styles.reimbursablePillText}>
                {reimbursableBadgeText}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  receiptPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  receiptPillText: {
    ...typography.metadata,
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
  reimbursablePill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  reimbursablePillText: {
    ...typography.metadata,
    color: '#D97706',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
  timelineAmount: {
    ...typography.body,
    fontWeight: '700',
  },
  timelineCategoryName: {
    ...typography.metadata,
    flexShrink: 1,
  },
  timelineContentCol: {
    flex: 1,
    gap: 2,
  },
  timelineDot: {
    borderRadius: radius.pill,
    height: 10,
    marginTop: 5,
    width: 10,
  },
  timelineItemTitle: {
    ...typography.body,
    flex: 1,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  timelineLine: {
    bottom: -8,
    position: 'absolute',
    top: 18,
    width: 2,
  },
  timelineMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
    paddingVertical: spacing.xs + 2,
  },
  timelineTrackCol: {
    alignItems: 'center',
    marginRight: spacing.sm,
    width: 16,
  },
});
