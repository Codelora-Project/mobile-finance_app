import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CategoryBudget } from '@/features/budgets/budget-repository';
import { BudgetProgressCard } from '@/features/budgets/components/budget-progress-card';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type AnalyticsBudgetsTabProps = {
  budgets: readonly CategoryBudget[];
  currencyCode: string;
  onOpenSetBudget: (budget: CategoryBudget) => void;
  t: TranslationSchema;
};

export const AnalyticsBudgetsTab = memo(function AnalyticsBudgetsTab({
  budgets,
  currencyCode,
  onOpenSetBudget,
  t,
}: AnalyticsBudgetsTabProps) {
  const { colors, isDark } = useTheme();

  const budgetedCategories = budgets.filter((b) => b.hasBudget);
  const totalBudgeted = budgetedCategories.reduce(
    (acc, b) => acc + (b.monthlyLimitMinor ?? 0),
    0,
  );
  const totalSpentInBudgeted = budgetedCategories.reduce(
    (acc, b) => acc + b.spentMinor,
    0,
  );
  const overallSpentPercent =
    totalBudgeted > 0
      ? Math.round((totalSpentInBudgeted / totalBudgeted) * 100)
      : 0;

  return (
    <View style={styles.tabContent}>
      {/* Overall Budget Progress Header */}
      {budgetedCategories.length > 0 ? (
        <View
          style={[
            styles.overallBudgetCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.overallHeader}>
            <View>
              <Text
                style={[
                  styles.overallTitle,
                  { color: colors.textSecondary },
                ]}
              >
                {t.budgets.overallProgress}
              </Text>
              <Text
                style={[
                  styles.overallSpentText,
                  { color: colors.textPrimary },
                ]}
              >
                {formatMoney(totalSpentInBudgeted, currencyCode)}{' '}
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  / {formatMoney(totalBudgeted, currencyCode)}
                </Text>
              </Text>
            </View>
            <View
              style={[
                styles.overallPercentPill,
                {
                  backgroundColor:
                    overallSpentPercent > 100
                      ? isDark
                        ? '#7F1D1D'
                        : '#FEE2E2'
                      : isDark
                        ? colors.surfaceSecondary
                        : '#EFF6FF',
                },
              ]}
            >
              <Text
                style={[
                  styles.overallPercentText,
                  {
                    color:
                      overallSpentPercent > 100
                        ? '#EF4444'
                        : colors.primary,
                  },
                ]}
              >
                {overallSpentPercent}%
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.overallBarTrack,
              {
                backgroundColor: isDark
                  ? colors.surfaceSecondary
                  : '#F1F5F9',
              },
            ]}
          >
            <View
              style={[
                styles.overallBarFill,
                {
                  backgroundColor:
                    overallSpentPercent > 100
                      ? '#EF4444'
                      : overallSpentPercent >= 70
                        ? '#F59E0B'
                        : colors.positive,
                  width: `${Math.min(100, Math.max(overallSpentPercent, 4))}%`,
                },
              ]}
            />
          </View>
        </View>
      ) : null}

      {/* Category Budget Cards List */}
      <View style={styles.budgetList}>
        {budgets.map((budget) => (
          <BudgetProgressCard
            budget={budget}
            currencyCode={currencyCode}
            key={budget.categoryId}
            onPressSetBudget={onOpenSetBudget}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  budgetList: {
    gap: spacing.sm,
  },
  overallBarFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  overallBarTrack: {
    borderRadius: radius.pill,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  overallBudgetCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  overallHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overallPercentPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  overallPercentText: {
    ...typography.metadata,
    fontWeight: '800',
  },
  overallSpentText: {
    ...typography.displayAmount,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  overallTitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  tabContent: {
    gap: spacing.md,
  },
});
