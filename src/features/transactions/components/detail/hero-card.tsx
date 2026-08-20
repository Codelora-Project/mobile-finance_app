import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type {
  Transaction,
  TransactionType,
} from '@/features/transactions/transaction-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import type { ColorPalette } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type DetailHeroCardProps = {
  language: 'id' | 'en';
  t: TranslationSchema;
  transaction: Transaction;
};

/**
 * Pure visual resolver for transaction type indicators and theme colors.
 */
function getTransactionTypeVisuals(
  type: TransactionType,
  colors: ColorPalette,
  isDark: boolean,
) {
  switch (type) {
    case 'transfer':
      return {
        bgColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
        color: colors.primary,
        icon: 'swap-horizontal' as const,
        sign: '',
      };
    case 'income':
      return {
        bgColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
        color: colors.positive,
        icon: 'arrow-down-left' as const,
        sign: '+',
      };
    case 'expense':
    default:
      return {
        bgColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
        color: colors.destructive,
        icon: 'arrow-up-right' as const,
        sign: '−',
      };
  }
}

export const DetailHeroCard = memo(function DetailHeroCard({
  language,
  t,
  transaction,
}: DetailHeroCardProps) {
  const { colors, isDark } = useTheme();

  const isTransfer = transaction.type === 'transfer';
  const isExpense = transaction.type === 'expense';

  const typeVisuals = getTransactionTypeVisuals(
    transaction.type,
    colors,
    isDark,
  );

  const amountFormatted = formatMoney(
    transaction.amountMinor,
    transaction.currencyCode,
  );

  return (
    <View
      style={[
        styles.heroCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Status Indicator Pill */}
      <View style={styles.heroStatusRow}>
        <View
          style={[
            styles.statusIndicatorPill,
            { backgroundColor: typeVisuals.bgColor },
          ]}
        >
          <View
            style={[styles.statusDot, { backgroundColor: typeVisuals.color }]}
          />
          <Text style={[styles.statusText, { color: typeVisuals.color }]}>
            {isTransfer
              ? t.transactions.transfer
              : isExpense
              ? t.transactions.expense
              : t.transactions.income}
          </Text>
        </View>
      </View>

      {/* Category Avatar Icon */}
      <View
        style={[
          styles.heroAvatarCircle,
          {
            backgroundColor: isTransfer
              ? isDark
                ? 'rgba(59, 130, 246, 0.15)'
                : '#DBEAFE'
              : isDark
              ? `${colors.primary}22`
              : `${colors.primary}15`,
          },
        ]}
      >
        <MaterialCommunityIcons
          color={typeVisuals.color}
          name={typeVisuals.icon}
          size={28}
        />
      </View>

      {/* Counterparty or Category Title */}
      <Text
        numberOfLines={1}
        style={[styles.heroCounterparty, { color: colors.textPrimary }]}
      >
        {transaction.counterparty ||
          transaction.categoryName ||
          (isTransfer ? t.transactions.transfer : t.transactions.title)}
      </Text>

      {/* Big Bold Amount */}
      <Text style={[styles.heroAmount, { color: typeVisuals.color }]}>
        {typeVisuals.sign}
        {amountFormatted}
      </Text>

      {/* Secondary Info Badges (Reimburse & Receipt) */}
      <View style={styles.heroBadgesRow}>
        {transaction.isReimbursable ? (
          <View
            style={[
              styles.heroAuxPill,
              {
                backgroundColor: isDark
                  ? 'rgba(245, 158, 11, 0.15)'
                  : '#FEF3C7',
              },
            ]}
          >
            <MaterialCommunityIcons
              color="#D97706"
              name="briefcase-outline"
              size={13}
            />
            <Text style={[styles.heroAuxPillText, { color: '#D97706' }]}>
              {t.transactions.reimbursableBadge}
            </Text>
          </View>
        ) : null}

        {transaction.receipt ? (
          <View
            style={[
              styles.heroAuxPill,
              {
                backgroundColor: isDark
                  ? 'rgba(59, 130, 246, 0.15)'
                  : '#EFF6FF',
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.primary}
              name="receipt-text-outline"
              size={13}
            />
            <Text style={[styles.heroAuxPillText, { color: colors.primary }]}>
              {t.transactions.receipt}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});

export { DetailHeroCard as TransactionDetailHeroCard };

const styles = StyleSheet.create({
  heroAmount: {
    ...typography.pageTitle,
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
    borderRadius: radius.lg,
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
});
