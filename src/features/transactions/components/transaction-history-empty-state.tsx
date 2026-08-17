import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TransactionHistoryEmptyStateProps = {
  hasFilters: boolean;
  onAddTransaction: () => void;
  onResetFilters: () => void;
  t: TranslationSchema;
};

export const TransactionHistoryEmptyState = memo(
  function TransactionHistoryEmptyState({
    hasFilters,
    onAddTransaction,
    onResetFilters,
    t,
  }: TransactionHistoryEmptyStateProps) {
    const { colors } = useTheme();

    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          color={colors.textSecondary}
          name={hasFilters ? 'filter-remove-outline' : 'receipt-text-outline'}
          size={56}
        />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          {hasFilters
            ? t.transactions.noMatchingTitle
            : t.transactions.noTransactionsTitle}
        </Text>
        <Text
          style={[styles.emptyDescription, { color: colors.textSecondary }]}
        >
          {hasFilters
            ? t.transactions.noMatchingDesc
            : t.transactions.noTransactionsDesc}
        </Text>
        <View style={styles.actionBtnWrap}>
          <AppButton
            label={
              hasFilters
                ? t.transactions.resetFilter
                : t.transactions.addTransaction
            }
            onPress={hasFilters ? onResetFilters : onAddTransaction}
            variant={hasFilters ? 'secondary' : 'primary'}
          />
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  actionBtnWrap: {
    marginTop: spacing.xs,
    minWidth: 160,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyDescription: {
    ...typography.metadata,
    maxWidth: 280,
    textAlign: 'center',
  },
  emptyTitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '800',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
