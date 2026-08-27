import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
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
  onAddFirstTransaction: () => void;
  onPressTransaction: (id: number) => void;
  onViewAll: () => void;
  selectedWalletId?: number | null;
  t: TranslationSchema;
};

export const HomeRecentTransactions = memo(function HomeRecentTransactions({
  currencyCode,
  groupedTimeline,
  onAddFirstTransaction,
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
          borderColor: isDark ? '#27272A' : '#E2E8F0',
          shadowColor: colors.shadow,
        },
      ]}
    >
      {/* 1. Header Row */}
      <View style={styles.integratedCardHeader}>
        <View style={styles.headerTitleGroup}>
          <MaterialCommunityIcons
            color={colors.primary}
            name="history"
            size={18}
          />
          <Text
            numberOfLines={1}
            style={[styles.integratedCardTitle, { color: colors.textPrimary }]}
          >
            {t.home.recentTransactions}
          </Text>
        </View>

        <Pressable
          accessibilityLabel={t.home.viewAll}
          accessibilityRole="button"
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
          <MaterialCommunityIcons
            color={colors.primary}
            name="chevron-right"
            size={16}
          />
        </Pressable>
      </View>

      {/* 2. Content */}
      {groupedTimeline.length === 0 ? (
        <View style={styles.emptyTransactionsWrap}>
          <View
            style={[
              styles.emptyIconCircle,
              {
                backgroundColor: isDark
                  ? 'rgba(59, 130, 246, 0.12)'
                  : colors.primaryLight,
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.primary}
              name="receipt-text-plus-outline"
              size={32}
            />
          </View>
          <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
            {t.home.noTransactionsYet}
          </Text>
          <Text
            style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}
          >
            {t.home.noTransactionsDesc}
          </Text>
          {selectedWalletId === null ? (
            <View style={styles.firstTransactionAction}>
              <AppButton
                label={t.home.addFirstTransaction}
                onPress={onAddFirstTransaction}
              />
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.timelineListContainer}>
          {groupedTimeline.map((group) => (
            <View key={group.date} style={styles.timelineDateGroup}>
              {/* Date Header Row */}
              <View
                style={[
                  styles.timelineDateHeaderRow,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#F8FAFC',
                    borderColor: isDark ? '#27272A' : '#F1F5F9',
                  },
                ]}
              >
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
                        group.netMinor > 0
                          ? colors.positive
                          : group.netMinor < 0
                            ? colors.destructive
                            : colors.textSecondary,
                    },
                  ]}
                >
                  {formatSignedMoney(group.netMinor, currencyCode)}
                </Text>
              </View>

              {/* Transaction Items */}
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
                    <View key={item.id}>
                      <Pressable
                        accessibilityLabel={`${title}, ${formatMoney(
                          item.amountMinor,
                          item.currencyCode,
                        )}`}
                        accessibilityRole="button"
                        android_ripple={{
                          borderless: false,
                          color: isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.04)',
                        }}
                        onPress={() => onPressTransaction(item.id)}
                        style={({ pressed }) => [
                          styles.transactionRow,
                          pressed && Platform.OS === 'ios'
                            ? styles.pressed
                            : null,
                        ]}
                      >
                        {/* Category Avatar */}
                        <View
                          style={[
                            styles.categoryAvatar,
                            {
                              backgroundColor:
                                item.type === 'income'
                                  ? isDark
                                    ? 'rgba(74, 222, 128, 0.16)'
                                    : '#DCFCE7'
                                  : item.type === 'transfer'
                                    ? isDark
                                      ? 'rgba(59, 130, 246, 0.16)'
                                      : '#DBEAFE'
                                    : meta.backgroundColor,
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            color={
                              item.type === 'income'
                                ? colors.positive
                                : item.type === 'transfer'
                                  ? colors.primary
                                  : meta.color
                            }
                            name={meta.icon}
                            size={20}
                          />
                        </View>

                        {/* Content Body */}
                        <View style={styles.transactionBody}>
                          <View style={styles.transactionMainRow}>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.transactionTitle,
                                { color: colors.textPrimary },
                              ]}
                            >
                              {title}
                            </Text>
                            <Text
                              style={[
                                styles.transactionAmount,
                                {
                                  color: amountColor,
                                },
                              ]}
                            >
                              {amountPrefix}
                              {formatMoney(item.amountMinor, item.currencyCode)}
                            </Text>
                          </View>

                          <View style={styles.transactionMetaRow}>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.transactionSubtitle,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {isTransfer
                                ? t.transactions.transfer
                                : item.paymentMethodName
                                  ? `${item.categoryName} • ${item.paymentMethodName}`
                                  : item.categoryName}
                            </Text>

                            {item.hasReceipt ? (
                              <View
                                style={[
                                  styles.receiptPill,
                                  {
                                    backgroundColor: isDark
                                      ? 'rgba(124, 58, 237, 0.18)'
                                      : '#EDE9FE',
                                    borderColor: isDark
                                      ? 'rgba(124, 58, 237, 0.3)'
                                      : '#DDD6FE',
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

                      {!isLast ? (
                        <View
                          style={[
                            styles.rowDivider,
                            {
                              backgroundColor: isDark
                                ? '#27272A'
                                : '#F1F5F9',
                            },
                          ]}
                        />
                      ) : null}
                    </View>
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  categoryAvatar: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
    width: 42,
  },
  emptyIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 60,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 60,
  },
  emptyStateSubtitle: {
    ...typography.metadata,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 240,
    textAlign: 'center',
  },
  emptyStateTitle: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyTransactionsWrap: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  firstTransactionAction: {
    marginTop: spacing.sm,
    minWidth: 220,
  },
  headerTitleGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  integratedCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    gap: spacing.md,
    padding: spacing.md + 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  integratedCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  integratedCardTitle: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  linkText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.985 }],
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
    fontWeight: '700',
    lineHeight: 12,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 42 + spacing.sm + 2,
    marginVertical: 1,
  },
  timelineDailyNet: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
  },
  timelineDateGroup: {
    gap: spacing.xs,
  },
  timelineDateHeaderRow: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  timelineDateLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  timelineItemsWrap: {
    gap: 1,
  },
  timelineListContainer: {
    gap: spacing.md,
  },
  transactionAmount: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  transactionBody: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  transactionMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transactionMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  transactionRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    paddingVertical: spacing.xs + 2,
  },
  transactionSubtitle: {
    ...typography.metadata,
    flexShrink: 1,
    fontSize: 12,
  },
  transactionTitle: {
    ...typography.body,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
});
