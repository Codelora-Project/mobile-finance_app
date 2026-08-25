import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCategoryMeta } from '@/features/categories/category-meta';
import type { TransactionListItem } from '@/features/transactions/transaction-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney, formatSignedMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type GroupedTimelineItem = {
  date: string;
  formattedDate: string;
  items: TransactionListItem[];
  netMinor: number;
};

export type HomeRecentTransactionsProps = {
  currencyCode: string;
  groupedTimeline: readonly GroupedTimelineItem[];
  onPressTransaction: (id: number) => void;
  onViewAll: () => void;
  selectedWalletId?: number | null;
  t: TranslationSchema;
};

export const HomeRecentTransactions = memo(function HomeRecentTransactions({
  currencyCode,
  groupedTimeline,
  onPressTransaction,
  onViewAll,
  selectedWalletId = null,
  t,
}: HomeRecentTransactionsProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.integratedCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.textPrimary,
        },
      ]}
    >
      <View style={styles.integratedCardHeader}>
        <Text
          numberOfLines={1}
          style={[styles.integratedCardTitle, { color: colors.textPrimary }]}
        >
          {t.home.recentTransactions}
        </Text>
        <Pressable
          hitSlop={8}
          onPress={onViewAll}
          style={({ pressed }) => [
            styles.cardHeaderLink,
            pressed && styles.pressed,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.linkText, { color: colors.primary }]}
          >
            {t.home.viewAll}
          </Text>
        </Pressable>
      </View>

      {groupedTimeline.length === 0 ? (
        <View style={styles.emptyTransactionsWrap}>
          <MaterialCommunityIcons
            color={colors.textSecondary}
            name="receipt-text-plus-outline"
            size={38}
          />
          <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
            {t.home.noTransactionsYet}
          </Text>
          <Text
            style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}
          >
            {t.home.noTransactionsDesc}
          </Text>
        </View>
      ) : (
        <View style={styles.timelineListContainer}>
          {groupedTimeline.map((group) => (
            <View key={group.date} style={styles.timelineDateGroup}>
              {/* Date Header Row */}
              <View style={styles.timelineDateHeaderRow}>
                <Text
                  style={[
                    styles.timelineDateLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {group.formattedDate}
                </Text>
                <Text
                  style={[
                    styles.timelineDailyNet,
                    {
                      color:
                        group.netMinor >= 0
                          ? colors.positive
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {formatSignedMoney(group.netMinor, currencyCode)}
                </Text>
              </View>

              {/* Transaction Items with Connected Timeline Dots */}
              <View style={styles.timelineItemsWrap}>
                {group.items.map((item, idx) => {
                  const isLast = idx === group.items.length - 1;
                  const meta = getCategoryMeta(
                    item.categoryName,
                    item.type,
                    isDark,
                  );
                  const isTransfer = item.type === 'transfer';
                  const title =
                    isTransfer &&
                    item.paymentMethodName &&
                    item.transferToPaymentMethodName
                      ? `${item.paymentMethodName} → ${item.transferToPaymentMethodName}`
                      : item.counterparty?.trim() ||
                        (isTransfer
                          ? t.transactions.transfer
                          : item.categoryName);
                  const isIncomingTransfer =
                    isTransfer &&
                    selectedWalletId !== null &&
                    item.transferToPaymentMethodId === selectedWalletId;
                  const isOutgoingTransfer =
                    isTransfer &&
                    selectedWalletId !== null &&
                    item.paymentMethodId === selectedWalletId;
                  const amountPrefix =
                    item.type === 'expense' || isOutgoingTransfer
                      ? '−'
                      : item.type === 'income' || isIncomingTransfer
                        ? '+'
                        : '⇄ ';
                  const amountColor =
                    item.type === 'expense' || isOutgoingTransfer
                      ? colors.destructive
                      : item.type === 'income' || isIncomingTransfer
                        ? colors.positive
                        : colors.textPrimary;

                  return (
                    <Pressable
                      accessibilityLabel={`${title}, ${formatMoney(
                        item.amountMinor,
                        item.currencyCode,
                      )}`}
                      accessibilityRole="button"
                      key={item.id}
                      onPress={() => onPressTransaction(item.id)}
                      style={({ pressed }) => [
                        styles.timelineRow,
                        pressed && styles.pressed,
                      ]}
                    >
                      {/* Timeline Dot & Line */}
                      <View style={styles.timelineTrackCol}>
                        <View
                          style={[
                            styles.timelineDot,
                            { backgroundColor: meta.color },
                          ]}
                        />
                        {!isLast ? (
                          <View
                            style={[
                              styles.timelineLine,
                              { backgroundColor: colors.border },
                            ]}
                          />
                        ) : null}
                      </View>

                      {/* Content */}
                      <View style={styles.timelineContentCol}>
                        <View style={styles.timelineMainRow}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.timelineItemTitle,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {title}
                          </Text>
                          <Text
                            style={[
                              styles.timelineAmount,
                              {
                                color: amountColor,
                              },
                            ]}
                          >
                            {amountPrefix}
                            {formatMoney(item.amountMinor, item.currencyCode)}
                          </Text>
                        </View>

                        <View style={styles.timelineMetaRow}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.timelineCategoryName,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {isTransfer
                              ? t.transactions.transfer
                              : item.categoryName}
                          </Text>
                          {item.hasReceipt ? (
                            <View
                              style={[
                                styles.receiptPill,
                                {
                                  backgroundColor: isDark
                                    ? '#312E81'
                                    : '#EDE9FE',
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
                                {t.home.receiptBadge}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  cardHeaderLink: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  emptyStateSubtitle: {
    ...typography.metadata,
    maxWidth: 240,
    textAlign: 'center',
  },
  emptyStateTitle: {
    ...typography.body,
    fontWeight: '700',
  },
  emptyTransactionsWrap: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  integratedCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 2,
    gap: spacing.md,
    padding: spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  integratedCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  integratedCardTitle: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '800',
  },
  linkText: {
    ...typography.metadata,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
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
  timelineDateGroup: {
    gap: spacing.xs,
  },
  timelineDateHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  timelineDateLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  timelineDailyNet: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  timelineDot: {
    borderRadius: radius.pill,
    height: 10,
    marginTop: 4,
    width: 10,
  },
  timelineItemTitle: {
    ...typography.body,
    flex: 1,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  timelineItemsWrap: {
    gap: spacing.xs,
  },
  timelineLine: {
    bottom: -spacing.xs,
    position: 'absolute',
    top: 16,
    width: 2,
  },
  timelineListContainer: {
    gap: spacing.md,
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
    paddingVertical: 4,
  },
  timelineTrackCol: {
    alignItems: 'center',
    marginRight: spacing.sm,
    width: 16,
  },
});
