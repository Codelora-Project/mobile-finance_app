import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Transaction } from '@/features/transactions/transaction-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type DetailTransferFlowProps = {
  language?: 'id' | 'en';
  t: TranslationSchema;
  transaction: Transaction;
};

export const DetailTransferFlow = memo(function DetailTransferFlow({
  language = 'id',
  t,
  transaction,
}: DetailTransferFlowProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.transferFlowCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.transferFlowTitle, { color: colors.textSecondary }]}>
        {language === 'id' ? 'ALUR TRANSFER DANA' : 'TRANSFER FLOW'}
      </Text>

      <View style={styles.transferFlowNodes}>
        {/* Source Account Node */}
        <View style={styles.transferAccountNode}>
          <View
            style={[
              styles.transferNodeIcon,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.destructive}
              name="wallet-outline"
              size={20}
            />
          </View>
          <Text
            style={[styles.transferNodeLabel, { color: colors.textSecondary }]}
          >
            {t.transactions.transferFrom}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.transferNodeName, { color: colors.textPrimary }]}
          >
            {transaction.paymentMethodName || '-'}
          </Text>
        </View>

        {/* Transfer Arrow Connector */}
        <View style={styles.transferConnector}>
          <View
            style={[
              styles.transferArrowCircle,
              { backgroundColor: colors.primary },
            ]}
          >
            <MaterialCommunityIcons
              color="#FFFFFF"
              name="arrow-right"
              size={16}
            />
          </View>
        </View>

        {/* Destination Account Node */}
        <View style={styles.transferAccountNode}>
          <View
            style={[
              styles.transferNodeIcon,
              {
                backgroundColor: isDark
                  ? 'rgba(16, 185, 129, 0.15)'
                  : '#DCFCE7',
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.positive}
              name="wallet-outline"
              size={20}
            />
          </View>
          <Text
            style={[styles.transferNodeLabel, { color: colors.textSecondary }]}
          >
            {t.transactions.transferTo}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.transferNodeName, { color: colors.textPrimary }]}
          >
            {transaction.transferToPaymentMethodName || '-'}
          </Text>
        </View>
      </View>

      {/* Transfer Fee Pill if any */}
      {transaction.transferFeeMinor > 0 ? (
        <View
          style={[
            styles.transferFeeRow,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.transferFeeLeft}>
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="cash-minus"
              size={16}
            />
            <Text
              style={[styles.transferFeeLabel, { color: colors.textSecondary }]}
            >
              {language === 'id' ? 'Biaya Transfer' : 'Transfer Fee'}
            </Text>
          </View>
          <Text
            style={[styles.transferFeeAmount, { color: colors.destructive }]}
          >
            {formatMoney(
              transaction.transferFeeMinor,
              transaction.currencyCode,
            )}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

export { DetailTransferFlow as TransactionDetailTransferFlow };

const styles = StyleSheet.create({
  transferAccountNode: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  transferArrowCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  transferConnector: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  transferFeeAmount: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
  },
  transferFeeLabel: {
    ...typography.metadata,
    fontSize: 12,
  },
  transferFeeLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  transferFeeRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
  },
  transferFlowCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  transferFlowNodes: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  transferFlowTitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  transferNodeIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    marginBottom: 2,
    width: 44,
  },
  transferNodeLabel: {
    ...typography.metadata,
    fontSize: 11,
  },
  transferNodeName: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
