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
      <View style={[styles.dateHeaderRow, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
        <View
          style={[
            styles.dateHeaderPill,
            {
              backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
            },
          ]}
        >
          <Text
            style={[
              styles.dateHeaderTitle,
              { color: isDark ? '#93C5FD' : '#1D4ED8' },
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
  dateHeaderNet: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  dateHeaderPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  dateHeaderRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs + 2,
  },
  dateHeaderTitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
