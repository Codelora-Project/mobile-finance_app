import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useCurrency } from '@/lib/currency/currency-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TransactionDateGroupHeaderProps = {
  formattedDate: string;
  totalNetMinor: number;
};

export const TransactionDateGroupHeader = memo(
  function TransactionDateGroupHeader({
    formattedDate,
    totalNetMinor,
  }: TransactionDateGroupHeaderProps) {
    const { colors, isDark } = useTheme();
    const { currencyCode } = useCurrency();

    const formattedDaily =
      totalNetMinor >= 0
        ? `+${formatMoney(totalNetMinor, currencyCode)}`
        : `−${formatMoney(Math.abs(totalNetMinor), currencyCode)}`;

    return (
      <View
        style={[
          styles.dateHeaderRow,
          { backgroundColor: colors.background },
        ]}
      >
        <View
          style={[
            styles.dateHeaderPill,
            {
              backgroundColor: isDark ? colors.surfaceSecondary : '#EFF6FF',
            },
          ]}
        >
          <Text
            style={[
              styles.dateHeaderTitle,
              { color: isDark ? colors.textSecondary : '#1D4ED8' },
            ]}
          >
            {formattedDate.toUpperCase()}
          </Text>
        </View>
        <Text
          style={[
            styles.dateHeaderNet,
            {
              color:
                totalNetMinor >= 0 ? colors.positive : colors.textSecondary,
            },
          ]}
        >
          {formattedDaily}
        </Text>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  dateHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  dateHeaderPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  dateHeaderTitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateHeaderNet: {
    ...typography.metadata,
    fontWeight: '700',
  },
});
