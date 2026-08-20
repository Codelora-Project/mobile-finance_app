import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type PaymentMethodNetWorthHeroProps = {
  currencyCode: string;
  language: 'id' | 'en';
  operationalCash: number;
  totalNetWorth: number;
  trackingAssets: number;
};

export const PaymentMethodNetWorthHero = memo(
  function PaymentMethodNetWorthHero({
    currencyCode,
    language,
    operationalCash,
    totalNetWorth,
    trackingAssets,
  }: PaymentMethodNetWorthHeroProps) {
    const { colors, isDark } = useTheme();

    return (
      <View
        style={[
          styles.netWorthCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.netWorthLabel, { color: colors.textMuted }]}>
          {language === 'id' ? 'TOTAL KEKAYAAN BERSIH' : 'TOTAL NET WORTH'}
        </Text>
        <Text style={[styles.netWorthAmount, { color: colors.textPrimary }]}>
          {formatMoney(totalNetWorth, currencyCode)}
        </Text>

        <View
          style={[
            styles.breakdownRow,
            {
              borderTopColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        >
          <View style={styles.breakdownCol}>
            <Text
              style={[styles.breakdownLabel, { color: colors.textSecondary }]}
            >
              {language === 'id' ? 'Dana Operasional' : 'Liquid Cash'}
            </Text>
            <Text
              style={[styles.breakdownValue, { color: colors.textPrimary }]}
            >
              {formatMoney(operationalCash, currencyCode)}
            </Text>
          </View>

          <View style={styles.breakdownDivider} />

          <View style={[styles.breakdownCol, { alignItems: 'flex-end' }]}>
            <Text
              style={[styles.breakdownLabel, { color: colors.textSecondary }]}
            >
              {language === 'id' ? 'Aset & Investasi' : 'Tracked Assets'}
            </Text>
            <Text
              style={[styles.breakdownValue, { color: colors.textPrimary }]}
            >
              {formatMoney(trackingAssets, currencyCode)}
            </Text>
          </View>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  breakdownCol: {
    flex: 1,
    gap: 2,
  },
  breakdownDivider: {
    width: 1,
  },
  breakdownLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '500',
  },
  breakdownRow: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  breakdownValue: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  netWorthAmount: {
    ...typography.pageTitle,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  netWorthCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md + 2,
  },
  netWorthLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
