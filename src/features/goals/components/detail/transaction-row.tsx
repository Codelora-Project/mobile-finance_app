import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { GoalTransaction } from '@/features/goals/goals-repository';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function formatTxDate(timestamp: number, language: string) {
  return new Date(timestamp).toLocaleDateString(
    language === 'id' ? 'id-ID' : 'en-US',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  );
}

export type GoalDetailTransactionRowProps = {
  currencyCode: string;
  isLast?: boolean;
  item: GoalTransaction;
  language: 'id' | 'en';
};

export const GoalDetailTransactionRow = memo(function GoalDetailTransactionRow({
  currencyCode,
  isLast = false,
  item,
  language,
}: GoalDetailTransactionRowProps) {
  const { colors, isDark } = useTheme();

  const isDeposit = item.type === 'deposit';

  return (
    <View
      style={[
        styles.txRow,
        !isLast
          ? [
              styles.txRowBorder,
              {
                borderBottomColor: isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : 'rgba(0, 0, 0, 0.05)',
              },
            ]
          : null,
      ]}
    >
      <View
        style={[
          styles.txIconCircle,
          {
            backgroundColor: isDeposit
              ? colors.incomeBackground
              : colors.expenseBackground,
          },
        ]}
      >
        <MaterialCommunityIcons
          color={isDeposit ? colors.positive : colors.destructive}
          name={isDeposit ? 'arrow-down-left' : 'arrow-up-right'}
          size={16}
        />
      </View>

      <View style={styles.txMetaCol}>
        <Text
          numberOfLines={1}
          style={[styles.txNote, { color: colors.textPrimary }]}
        >
          {item.note ||
            (isDeposit
              ? language === 'id'
                ? 'Setoran Tabungan'
                : 'Deposit'
              : language === 'id'
                ? 'Penarikan Dana'
                : 'Withdrawal')}
        </Text>
        <Text style={[styles.txDate, { color: colors.textSecondary }]}>
          {formatTxDate(item.createdAt, language)}
        </Text>
      </View>

      <Text
        style={[
          styles.txAmount,
          { color: isDeposit ? colors.positive : colors.destructive },
        ]}
      >
        {isDeposit ? '+' : '−'}
        {formatMoney(item.amountMinor, currencyCode)}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  txAmount: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  txDate: {
    ...typography.metadata,
    fontSize: 11,
  },
  txIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  txMetaCol: {
    flex: 1,
    gap: 2,
  },
  txNote: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
  },
  txRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  txRowBorder: {
    borderBottomWidth: 1,
  },
});
