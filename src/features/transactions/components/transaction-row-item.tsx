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
  const title = transaction.counterparty?.trim() || transaction.categoryName;

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
        { backgroundColor: colors.surface },
        pressed ? { opacity: 0.75 } : null,
      ]}
    >
      {/* Timeline Dot & Connecting Line */}
      <View style={styles.timelineTrackCol}>
        <View style={[styles.timelineDot, { backgroundColor: meta.color }]} />
        {!isLast ? (
          <View
            style={[styles.timelineLine, { backgroundColor: colors.border }]}
          />
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.timelineContentCol}>
        {/* Row 1: title + amount */}
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
                    : colors.positive,
              },
            ]}
          >
            {transaction.type === 'expense' ? '−' : '+'}
            {formatMoney(transaction.amountMinor, transaction.currencyCode)}
          </Text>
        </View>

        {/* Row 2: category + badges */}
        <View style={styles.timelineMetaRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.timelineCategoryName,
              { color: colors.textSecondary },
            ]}
          >
            {transaction.categoryName}
          </Text>

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
              <Text style={styles.receiptPillText}>{receiptBadgeText}</Text>
            </View>
          ) : null}

          {transaction.isReimbursable ? (
            <View
              style={[
                styles.reimbursablePill,
                {
                  backgroundColor: isDark ? '#78350F' : '#FEF3C7',
                  borderColor: isDark ? '#92400E' : '#FDE68A',
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
  timelineRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  timelineTrackCol: {
    alignItems: 'center',
    marginRight: spacing.sm,
    width: 16,
  },
  timelineDot: {
    borderRadius: radius.pill,
    height: 10,
    marginTop: 5,
    width: 10,
  },
  timelineLine: {
    bottom: -spacing.sm,
    position: 'absolute',
    top: 19,
    width: 2,
  },
  timelineContentCol: {
    flex: 1,
    gap: 3,
  },
  timelineMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineItemTitle: {
    ...typography.body,
    flex: 1,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  timelineAmount: {
    ...typography.body,
    fontWeight: '700',
  },
  timelineMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  timelineCategoryName: {
    ...typography.metadata,
    flexShrink: 1,
  },
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
});
