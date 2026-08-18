import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  HomePeriod,
  HomeSummary,
} from '@/features/home/home-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney, formatSignedMoney } from '@/lib/money';
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

  const formattedNet = hideBalance
    ? '••••••'
    : summary.netMinor < 0
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
      {/* 1. Header: Total Label & Privacy + Period Dropdown + Settings Button */}
      <View style={styles.topRow}>
        <View style={styles.topLeftGroup}>
          <Text style={[styles.cardTitleLabel, { color: colors.textSecondary }]}>
            {t.home.totalBalance}
          </Text>

          {onToggleHideBalance ? (
            <Pressable
              accessibilityLabel={
                hideBalance
                  ? 'Tampilkan Saldo'
                  : 'Sembunyikan Saldo'
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
          style={[styles.mainAmountValue, { color: colors.textPrimary }]}
        >
          {formattedNet}
        </Text>
        <Text
          style={[styles.periodSubLabel, { color: colors.textSecondary }]}
        >
          {summary.periodLabel}
        </Text>
      </View>

      {/* 3. Divider Line */}
      <View
        style={[
          styles.divider,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      />

      {/* 4. Two-Column Split: Pemasukan (Income) & Pengeluaran (Expense) */}
      <View style={styles.bottomColsRow}>
        {/* Income Column */}
        <View style={styles.colItem}>
          <View style={styles.colHeader}>
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
              style={[styles.colLabel, { color: colors.textSecondary }]}
            >
              {t.home.income}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.colValue, { color: colors.positive }]}
          >
            {formattedIncome}
          </Text>
        </View>

        {/* Vertical Separator */}
        <View
          style={[
            styles.verticalDivider,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        />

        {/* Expense Column */}
        <View style={styles.colItem}>
          <View style={styles.colHeader}>
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
              style={[styles.colLabel, { color: colors.textSecondary }]}
            >
              {t.home.expensesThisMonth}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.colValue, { color: colors.destructive }]}
          >
            {formattedExpense}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  bottomColsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  cardTitleLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  colHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 3,
  },
  colItem: {
    flex: 1,
  },
  colLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  colValue: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm + 2,
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
    marginVertical: 4,
  },
  mainAmountValue: {
    ...typography.displayAmount,
    fontSize: 28,
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
  periodSubLabel: {
    ...typography.metadata,
    fontSize: 12,
    marginTop: 2,
  },
  settingsBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  summaryCard: {
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    elevation: 2,
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  topLeftGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
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
  verticalDivider: {
    height: 34,
    marginHorizontal: spacing.md,
    width: 1,
  },
});
