import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CategoryBudget } from '@/features/budgets/budget-repository';
import type { HomeSummary } from '@/features/home/home-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type HomeFinancialInsightProps = {
  budgets: readonly CategoryBudget[];
  hideBalance: boolean;
  summary: HomeSummary;
  t: TranslationSchema;
};

function interpolate(
  template: string,
  values: Readonly<Record<string, string>>,
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}

export const HomeFinancialInsight = memo(function HomeFinancialInsight({
  budgets,
  hideBalance,
  summary,
  t,
}: HomeFinancialInsightProps) {
  const { colors, isDark } = useTheme();
  const hiddenAmount = '••••••';
  let message: string | null = null;
  let icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] =
    'lightbulb-on-outline';
  let accentColor = colors.primary;
  const activeBudgets = budgets.filter(
    (budget) => budget.hasBudget && budget.remainingMinor !== null,
  );
  const totalBudgetRemaining = activeBudgets.reduce(
    (total, budget) => total + (budget.remainingMinor ?? 0),
    0,
  );

  if (activeBudgets.length > 0) {
    const isOverBudget = totalBudgetRemaining < 0;
    icon = isOverBudget ? 'alert-circle-outline' : 'wallet-outline';
    accentColor = isOverBudget ? colors.destructive : colors.positive;
    message = interpolate(
      isOverBudget
        ? t.home.budgetExceededInsight
        : t.home.budgetRemainingInsight,
      {
        amount: hideBalance
          ? hiddenAmount
          : formatMoney(Math.abs(totalBudgetRemaining), summary.currencyCode),
      },
    );
  } else if (summary.netMinor < 0) {
    icon = 'alert-circle-outline';
    accentColor = colors.destructive;
    message = interpolate(t.home.deficitInsight, {
      amount: hideBalance
        ? hiddenAmount
        : formatMoney(Math.abs(summary.netMinor), summary.currencyCode),
    });
  } else {
    const topExpense = summary.categoryTotals[0];
    if (topExpense) {
      message = interpolate(t.home.topExpenseInsight, {
        amount: hideBalance
          ? hiddenAmount
          : formatMoney(topExpense.amountMinor, summary.currencyCode),
        category: topExpense.categoryName,
      });
    }
  }

  if (!message) return null;

  return (
    <View
      accessibilityLabel={`${t.home.financialInsight}. ${message}`}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isDark ? `${accentColor}22` : `${accentColor}14`,
          },
        ]}
      >
        <MaterialCommunityIcons color={accentColor} name={icon} size={20} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t.home.financialInsight}
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    minHeight: 64,
    padding: spacing.sm + 2,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  message: {
    ...typography.metadata,
    fontSize: 12,
    lineHeight: 17,
  },
  textWrap: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  title: {
    ...typography.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
});
