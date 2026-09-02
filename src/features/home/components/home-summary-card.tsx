import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

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
  const { fontScale } = useWindowDimensions();
  const stackHeader = fontScale >= 1.5;

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
          shadowColor: colors.shadow,
        },
      ]}
    >
      {/* 1. Header: Period Switcher & Display Settings */}
      <View style={[styles.topRow, stackHeader ? styles.topRowStacked : null]}>
        <Text
          numberOfLines={stackHeader ? 2 : 1}
          style={[styles.cardTitleLabel, { color: colors.textSecondary }]}
        >
          {t.home.net.toUpperCase()} · {summary.periodLabel.toUpperCase()}
        </Text>

        <View
          style={[
            styles.topRightControls,
            stackHeader ? styles.topRightControlsStacked : null,
          ]}
        >
          {/* Period Selector Pill */}
          <Pressable
            accessibilityLabel={`${t.home.changePeriod}: ${getPeriodLabel(period)}`}
            accessibilityRole="button"
            onPress={handleCyclePeriod}
            style={({ pressed }) => [
              styles.periodDropdownPill,
              {
                backgroundColor: isDark
                  ? colors.primaryOverlay
                  : colors.primaryLight,
                borderColor: isDark
                  ? colors.primaryOverlayStrong
                  : colors.primaryOverlay,
              },
              pressed ? styles.pillPressed : null,
            ]}
          >
            <Text
              style={[styles.periodDropdownText, { color: colors.primary }]}
            >
              {getPeriodLabel(period)}
            </Text>
            <MaterialCommunityIcons
              color={colors.primary}
              name="chevron-down"
              size={14}
            />
          </Pressable>

          {/* Display Settings Button */}
          {onOpenDisplaySettings ? (
            <Pressable
              accessibilityLabel={t.home.displaySettings}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onOpenDisplaySettings}
              style={({ pressed }) => [
                styles.settingsBtn,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
                pressed ? styles.pillPressed : null,
              ]}
            >
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="tune-variant"
                size={14}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 2. Hero Net Balance Section */}
      <View style={styles.mainAmountSection}>
        <View style={styles.amountRow}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.85}
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
              hitSlop={6}
              onPress={onToggleHideBalance}
              style={({ pressed }) => [
                styles.eyeBtn,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
                pressed ? styles.pillPressed : null,
              ]}
            >
              <MaterialCommunityIcons
                color={hideBalance ? colors.primary : colors.textSecondary}
                name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
                size={17}
              />
            </Pressable>
          ) : null}
        </View>

        {/* Comparison Line (Clean Minimalist) */}
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
              style={[
                styles.comparisonText,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              {comparisonLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* 3. Sleek Horizontal Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* 4. Bottom Split Metrics with Clean White Text & Subtle Color Dots */}
      <View style={styles.metricsRow}>
        {/* Income Column */}
        <View style={styles.metricCol}>
          <View style={styles.metricHeader}>
            <View
              style={[styles.metricDot, { backgroundColor: colors.positive }]}
            />
            <Text
              numberOfLines={1}
              style={[styles.metricLabel, { color: colors.textSecondary }]}
            >
              {t.home.income}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            numberOfLines={1}
            style={[styles.metricValue, { color: colors.textPrimary }]}
          >
            {formattedIncome}
          </Text>
        </View>

        {/* Center Vertical Divider */}
        <View
          style={[styles.verticalDivider, { backgroundColor: colors.border }]}
        />

        {/* Expense Column */}
        <View style={styles.metricCol}>
          <View style={styles.metricHeader}>
            <View
              style={[
                styles.metricDot,
                { backgroundColor: colors.destructive },
              ]}
            />
            <Text
              numberOfLines={1}
              style={[styles.metricLabel, { color: colors.textSecondary }]}
            >
              {t.home.expensesThisMonth}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            numberOfLines={1}
            style={[styles.metricValue, { color: colors.textPrimary }]}
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
    justifyContent: 'space-between',
    width: '100%',
  },
  cardTitleLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  comparisonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  comparisonText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm + 2,
  },
  eyeBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  mainAmountSection: {
    alignItems: 'flex-start',
    gap: 4,
    marginVertical: spacing.xs,
  },
  mainAmountValue: {
    ...typography.displayAmount,
    flex: 1,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  metricCol: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  metricDot: {
    borderRadius: radius.pill,
    height: 7,
    width: 7,
  },
  metricHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  metricLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  metricValue: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  metricsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  periodDropdownPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  periodDropdownText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  pillPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  settingsBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  summaryCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    gap: 4,
    padding: spacing.md + 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  topRightControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  topRightControlsStacked: {
    alignSelf: 'flex-end',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  topRowStacked: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  verticalDivider: {
    alignSelf: 'stretch',
    width: 1,
  },
});
