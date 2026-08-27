import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type WalletNetWorthCardProps = {
  currencyCode: string;
  hideBalance?: boolean;
  language: 'id' | 'en';
  onToggleHideBalance?: () => void;
  operationalCash: number;
  totalNetWorth: number;
  trackingAssets: number;
};

export const WalletNetWorthCard = memo(function WalletNetWorthCard({
  currencyCode,
  hideBalance = false,
  language,
  onToggleHideBalance,
  operationalCash,
  totalNetWorth,
  trackingAssets,
}: WalletNetWorthCardProps) {
  const { colors, isDark } = useTheme();

  const formattedNetWorth = hideBalance
    ? '••••••'
    : formatMoney(totalNetWorth, currencyCode);

  const formattedCash = hideBalance
    ? '••••••'
    : formatMoney(operationalCash, currencyCode);

  const formattedAssets = hideBalance
    ? '••••••'
    : formatMoney(trackingAssets, currencyCode);

  return (
    <View
      style={[
        styles.netWorthCard,
        {
          backgroundColor: colors.surface,
          borderColor: isDark ? '#27272A' : '#E2E8F0',
          shadowColor: colors.shadow,
        },
      ]}
    >
      {/* 1. Header Row with Privacy Eye Toggle */}
      <View style={styles.topHeaderRow}>
        <View style={styles.headerLabelRow}>
          <MaterialCommunityIcons
            color={colors.primary}
            name="safe"
            size={16}
          />
          <Text style={[styles.netWorthLabel, { color: colors.textSecondary }]}>
            {language === 'id' ? 'TOTAL KEKAYAAN BERSIH' : 'TOTAL NET WORTH'}
          </Text>
        </View>

        {onToggleHideBalance ? (
          <Pressable
            accessibilityLabel={
              hideBalance
                ? language === 'id'
                  ? 'Tampilkan Saldo'
                  : 'Show Balance'
                : language === 'id'
                  ? 'Sembunyikan Saldo'
                  : 'Hide Balance'
            }
            accessibilityRole="button"
            hitSlop={8}
            onPress={onToggleHideBalance}
            style={({ pressed }) => [
              styles.eyeBtn,
              {
                backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
                borderColor: isDark ? '#3F3F46' : '#E2E8F0',
              },
              pressed ? styles.btnPressed : null,
            ]}
          >
            <MaterialCommunityIcons
              color={hideBalance ? colors.primary : colors.textSecondary}
              name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
              size={16}
            />
          </Pressable>
        ) : null}
      </View>

      {/* 2. Hero Net Worth Amount */}
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
        style={[styles.netWorthAmount, { color: colors.textPrimary }]}
      >
        {formattedNetWorth}
      </Text>

      {/* 3. Sleek Horizontal Divider */}
      <View
        style={[
          styles.divider,
          { backgroundColor: isDark ? '#27272A' : '#E2E8F0' },
        ]}
      />

      {/* 4. Split Metric Columns (Dana Operasional vs Aset Tracking) */}
      <View style={styles.breakdownRow}>
        {/* Liquid Cash Column */}
        <View style={styles.breakdownCol}>
          <View style={styles.metricLabelRow}>
            <View
              style={[styles.metricDot, { backgroundColor: colors.positive }]}
            />
            <Text
              numberOfLines={1}
              style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
              {language === 'id' ? 'Dana Operasional' : 'Liquid Cash'}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.breakdownValue, { color: colors.textPrimary }]}>
            {formattedCash}
          </Text>
        </View>

        {/* Center Vertical Divider */}
        <View
          style={[
            styles.verticalDivider,
            { backgroundColor: isDark ? '#27272A' : '#E2E8F0' },
          ]}
        />

        {/* Tracked Assets Column */}
        <View style={styles.breakdownCol}>
          <View style={styles.metricLabelRow}>
            <View
              style={[styles.metricDot, { backgroundColor: colors.primary }]}
            />
            <Text
              numberOfLines={1}
              style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
              {language === 'id' ? 'Aset & Investasi' : 'Tracked Assets'}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.breakdownValue, { color: colors.textPrimary }]}>
            {formattedAssets}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  breakdownCol: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  breakdownLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  breakdownRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  breakdownValue: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  btnPressed: {
    opacity: 0.75,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm + 2,
  },
  eyeBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  headerLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  metricDot: {
    borderRadius: radius.pill,
    height: 7,
    width: 7,
  },
  metricLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  netWorthAmount: {
    ...typography.displayAmount,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 40,
    marginTop: 2,
  },
  netWorthCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    gap: 4,
    padding: spacing.md + 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  netWorthLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  topHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  verticalDivider: {
    alignSelf: 'stretch',
    width: 1,
  },
});
