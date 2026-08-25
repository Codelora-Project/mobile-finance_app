import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HomePeriod, HomeSummary } from '@/features/home/home-repository';
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
  const netDeltaMinor = summary.netMinor - summary.previousNetMinor;

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
  const comparisonLabel =
    netDeltaMinor === 0
      ? t.home.sameAsPrevious
      : `${formatMoney(Math.abs(netDeltaMinor), summary.currencyCode)} ${
          netDeltaMinor > 0
            ? t.home.higherThanPrevious
            : t.home.lowerThanPrevious
        } ${t.home.comparedToPrevious}`;

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
      {/* 1. Header: net-flow label, period, and display controls. */}
      <View style={styles.topRow}>
        <View style={styles.topLeftGroup}>
          <Text
            numberOfLines={1}
            style={[styles.cardTitleLabel, { color: colors.textSecondary }]}
          >
            {t.home.net.toUpperCase()} · {summary.periodLabel.toUpperCase()}
          </Text>
        </View>

        <View style={styles.topRightGroup}>
          {/* Period Dropdown Pill */}
          <Pressable
            accessibilityLabel={`${t.home.changePeriod}: ${getPeriodLabel(period)}`}
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
              accessibilityLabel={t.home.displaySettings}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onOpenDisplaySettings}
              style={({ pressed }) => [
                styles.settingsBtn,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
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
              <Text
                style={[styles.settingsText, { color: colors.textPrimary }]}
              >
                {t.home.displaySettings}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 2. Main Net Amount */}
      <View style={styles.mainAmountSection}>
        <View style={styles.amountRow}>
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
          {onToggleHideBalance ? (
            <Pressable
              accessibilityLabel={
                hideBalance ? t.home.showBalance : t.home.hideBalance
              }
              accessibilityRole="button"
              onPress={onToggleHideBalance}
              style={({ pressed }) => [
                styles.eyeBtn,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
                },
                pressed ? { opacity: 0.6 } : null,
              ]}
            >
              <MaterialCommunityIcons
                color={hideBalance ? colors.primary : colors.textSecondary}
                name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
                size={18}
              />
            </Pressable>
          ) : null}
        </View>
        {!hideBalance ? (
          <View style={styles.comparisonRow}>
            <MaterialCommunityIcons
              color={
                netDeltaMinor > 0
                  ? colors.positive
                  : netDeltaMinor < 0
                    ? colors.destructive
                    : colors.textMuted
              }
              name={
                netDeltaMinor > 0
                  ? 'trending-up'
                  : netDeltaMinor < 0
                    ? 'trending-down'
                    : 'minus'
              }
              size={15}
            />
            <Text
              numberOfLines={2}
              style={[styles.comparisonText, { color: colors.textSecondary }]}
            >
              {comparisonLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* 3. Supporting metrics stay inside the same information group. */}
      <View style={[styles.metricsRow, { borderTopColor: colors.border }]}>
        <View style={styles.metric}>
          <View style={styles.metricHeader}>
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
              style={[styles.metricLabel, { color: colors.textSecondary }]}
            >
              {t.home.income}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.metricValue, { color: colors.positive }]}
          >
            {formattedIncome}
          </Text>
        </View>

        <View
          style={[styles.metricDivider, { backgroundColor: colors.border }]}
        />

        <View style={styles.metric}>
          <View style={styles.metricHeader}>
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
              style={[styles.metricLabel, { color: colors.textSecondary }]}
            >
              {t.home.expensesThisMonth}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.metricValue, { color: colors.destructive }]}
          >
            {formattedExpense}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  amountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    maxWidth: '100%',
  },
  cardTitleLabel: {
    ...typography.metadata,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  eyeBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
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
    maxWidth: '86%',
  },
  periodDropdownPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    minHeight: 40,
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
    flexDirection: 'row',
    gap: 4,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  settingsText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  metric: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  metricDivider: {
    alignSelf: 'stretch',
    width: StyleSheet.hairlineWidth,
  },
  metricHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  metricLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  metricsRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  summaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 1,
    padding: spacing.md + 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
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
  comparisonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  comparisonText: {
    ...typography.metadata,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
