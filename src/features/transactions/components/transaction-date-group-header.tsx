import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useCurrency } from '@/lib/currency/currency-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
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
  const { colors } = useTheme();
    const { currencyCode } = useCurrency();

    const formattedDaily =
      totalNetMinor > 0
        ? `+${formatMoney(totalNetMinor, currencyCode)}`
        : totalNetMinor < 0
          ? `−${formatMoney(Math.abs(totalNetMinor), currencyCode)}`
          : formatMoney(0, currencyCode);

    return (
      <View
        style={[
          styles.dateHeaderRow,
          {
            backgroundColor: colors.hairlineOverlay,
            borderBottomColor: colors.pressedOverlay,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.dateHeaderTitle, { color: colors.textPrimary }]}
        >
          {formattedDate}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            styles.dateHeaderNet,
            {
              color: totalNetMinor > 0 ? colors.positive : colors.textSecondary,
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
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: spacing.md,
  },
  dateHeaderRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
  },
  dateHeaderTitle: {
    ...typography.metadata,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
});
