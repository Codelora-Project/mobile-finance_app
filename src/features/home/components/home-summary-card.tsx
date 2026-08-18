import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  HomePeriod,
  HomeSummary,
} from '@/features/home/home-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type HomeSummaryCardProps = {
  hideBalance?: boolean;
  onOpenDisplaySettings?: () => void;
  onPeriodChange: (period: HomePeriod) => void;
  onToggleHideBalance?: () => void;
  period: HomePeriod;
  summary: HomeSummary;
  t: TranslationSchema;
};

const PERIODS: HomePeriod[] = ['monthly', 'daily', 'weekly', 'yearly'];

export const HomeSummaryCard = memo(function HomeSummaryCard({
  hideBalance = false,
  onOpenDisplaySettings,
  onPeriodChange,
  onToggleHideBalance,
  period,
  summary,
  t,
}: HomeSummaryCardProps) {
  const { colors, isDark } = useTheme();

  function getPeriodLabel(p: HomePeriod) {
    switch (p) {
      case 'daily':
        return t.home.periodDaily;
      case 'weekly':
        return t.home.periodWeekly;
      case 'monthly':
        return t.home.periodMonthly;
      case 'yearly':
        return t.home.periodYearly;
    }
  }

  function handleCyclePeriod() {
    const currentIndex = PERIODS.indexOf(period);
    const nextIndex = (currentIndex + 1) % PERIODS.length;
    onPeriodChange(PERIODS[nextIndex] ?? 'monthly');
  }

  const isNegative = summary.netMinor < 0;
  const isPositive = summary.netMinor > 0;

  const formattedNet = hideBalance
    ? '••••••'
    : isNegative
    ? `\u2212${formatMoney(Math.abs(summary.netMinor), summary.currencyCode)}`
    : formatMoney(summary.netMinor, summary.currencyCode);

  const formattedIncome = hideBalance
    ? '••••••'
    : formatMoney(summary.incomeMinor, summary.currencyCode);

  const formattedExpense = hideBalance
    ? '••••••'
    : formatMoney(summary.expenseMinor, summary.currencyCode);

  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.textPrimary,
        },
      ]}
    >
      {/* 1. Header: Total · Period Label + Privacy Eye + Dropdown + Settings Button */}
      <View style={styles.topRow}>
        <View style={styles.topLeftGroup}>
          <Text
            numberOfLines={1}
            style={[styles.cardTitleLabel, { color: colors.textSecondary }]}
          >
            {t.home.totalBalance.toUpperCase()} · {summary.periodLabel.toUpperCase()}
          </Text>

          {onToggleHideBalance ? (
            <Pressable
              accessibilityLabel={
                hideBalance ? 'Tampilkan Saldo' : 'Sembunyikan Saldo'
              }
              accessibilityRole="button"
              hitSlop={8}
              onPress={onToggleHideBalance}
              style={({ pressed }) => [
                styles.eyeBtn,
                pressed ? { opacity: 0.6 } : null,
              ]}
            >
              <MaterialCommunityIcons
                color={hideBalance ? colors.primary : colors.textMuted}
                name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
                size={16}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.topRightGroup}>
          {/* Period Dropdown Pill */}
          <Pressable
            accessibilityLabel={`Ubah Periode: ${getPeriodLabel(period)}`}
            accessibilityRole="button"
            onPress={handleCyclePeriod}
            style={({ pressed }) => [
              styles.periodDropdownPill,
              {
                backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF',
                borderColor: isDark ? '#2563EB' : '#BFDBFE',
              },
              pressed ? { opacity: 0.75 } : null,
            ]}
          >
            <Text
              style={[
                styles.periodDropdownText,
                { color: isDark ? '#93C5FD' : '#1D4ED8' },
              ]}
            >
              {getPeriodLabel(period)}
            </Text>
            <MaterialCommunityIcons
              color={isDark ? '#93C5FD' : '#1D4ED8'}
              name="chevron-down"
              size={15}
            />
          </Pressable>

          {/* Display Settings Button 🎚️ */}
          {onOpenDisplaySettings ? (
            <Pressable
              accessibilityLabel="Pengaturan Tampilan Beranda"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onOpenDisplaySettings}
              style={({ pressed }) => [
                styles.settingsBtn,
                {
                  backgroundColor: isDark
                    ? colors.surfaceSecondary
                    : '#F1F5F9',
                  borderColor: colors.border,
                },
                pressed ? { opacity: 0.75 } : null,
              ]}
            >
              <MaterialCommunityIcons
                color={colors.textPrimary}
                name="tune-variant"
                size={16}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 2. Main Net Amount */}
      <View style={styles.mainAmountSection}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          numberOfLines={1}
          style={[
            styles.mainAmountValue,
            {
              color: isNegative
                ? colors.destructive
                : isPositive
                ? colors.positive
                : colors.textPrimary,
            },
          ]}
        >
          {formattedNet}
        </Text>
      </View>

      {/* 3. Symmetrical 50/50 Sub-Cards for Income & Expense */}
      <View style={styles.subCardsRow}>
        {/* Income Sub-Card */}
        <View
          style={[
            styles.subCard,
            {
              backgroundColor: isDark
                ? '#14532D1F'
                : '#F0FDF4',
              borderColor: isDark
                ? '#166534'
                : '#DCFCE7',
            },
          ]}
        >
          <View style={styles.subCardHeader}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isDark ? '#14532D' : '#DCFCE7',
                },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.positive}
                name="arrow-up"
                size={13}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.subCardLabel, { color: colors.textSecondary }]}
            >
              {t.home.income}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.subCardValue, { color: colors.positive }]}
          >
            {formattedIncome}
          </Text>
        </View>

        {/* Expense Sub-Card */}
        <View
          style={[
            styles.subCard,
            {
              backgroundColor: isDark
                ? '#7F1D1D1F'
                : '#FEF2F2',
              borderColor: isDark
                ? '#991B1B'
                : '#FEE2E2',
            },
          ]}
        >
          <View style={styles.subCardHeader}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
                },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.destructive}
                name="arrow-down"
                size={13}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.subCardLabel, { color: colors.textSecondary }]}
            >
              {t.home.expensesThisMonth}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.subCardValue, { color: colors.destructive }]}
          >
            {formattedExpense}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cardTitleLabel: {
    ...typography.metadata,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  eyeBtn: {
    padding: 2,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  mainAmountSection: {
    alignItems: 'flex-start',
    gap: 6,
    marginVertical: spacing.sm,
  },
  mainAmountValue: {
    ...typography.displayAmount,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  periodDropdownPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5,
  },
  periodDropdownText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  settingsBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  subCard: {
    borderRadius: radius.md + 2,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
  subCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  subCardLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  subCardValue: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  subCardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  summaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 2,
    padding: spacing.md + 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  topLeftGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    marginRight: spacing.xs,
  },
  topRightGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
});
