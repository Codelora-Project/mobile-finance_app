import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AnalyticsData } from '@/features/analytics/analytics-repository';
import type { CategoryBudget } from '@/features/budgets/budget-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type Insight = Readonly<{
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  kind: 'attention' | 'positive' | 'primary';
  text: string;
}>;

export type AnalyticsInsightsCardProps = {
  analytics: AnalyticsData;
  budgets: readonly CategoryBudget[];
  t: TranslationSchema;
};

export const AnalyticsInsightsCard = memo(function AnalyticsInsightsCard({
  analytics,
  budgets,
  t,
}: AnalyticsInsightsCardProps) {
  const { colors, isDark } = useTheme();
  const insights: Insight[] = [];

  if (analytics.totalIncomeMinor > 0) {
    const expenseRatio = Math.round(
      (analytics.totalExpenseMinor / analytics.totalIncomeMinor) * 100,
    );
    insights.push({
      icon: 'scale-balance',
      kind: expenseRatio > 100 ? 'attention' : 'positive',
      text: t.analytics.expenseIncomeInsight.replace(
        '{percentage}',
        String(expenseRatio),
      ),
    });
  }

  if (analytics.topExpenseCategory) {
    insights.push({
      icon: 'chart-donut',
      kind: 'primary',
      text: t.analytics.topExpenseInsight
        .replace('{category}', analytics.topExpenseCategory.categoryName)
        .replace(
          '{percentage}',
          String(analytics.topExpenseCategory.percentage),
        ),
    });
  }

  const activeBudgets = budgets.filter((budget) => budget.hasBudget);
  const attentionBudgets = activeBudgets.filter(
    (budget) => budget.status !== 'safe',
  );
  if (attentionBudgets.length > 0) {
    insights.push({
      icon: 'alert-circle-outline',
      kind: 'attention',
      text: t.analytics.budgetAttentionInsight.replace(
        '{count}',
        String(attentionBudgets.length),
      ),
    });
  } else if (activeBudgets.length > 0) {
    insights.push({
      icon: 'shield-check-outline',
      kind: 'positive',
      text: t.analytics.budgetsHealthyInsight,
    });
  }

  if (insights.length === 0) return null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.titleRow}>
        <MaterialCommunityIcons
          color={colors.primary}
          name="lightbulb-on-outline"
          size={18}
        />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t.analytics.insightsTitle}
        </Text>
      </View>

      <View style={styles.list}>
        {insights.slice(0, 3).map((insight, index) => {
          const color =
            insight.kind === 'attention'
              ? colors.warning
              : insight.kind === 'positive'
                ? colors.positive
                : colors.primary;
          const backgroundColor =
            insight.kind === 'attention'
              ? colors.warningBackground
              : insight.kind === 'positive'
                ? colors.incomeBackground
                : isDark
                  ? colors.surfaceSecondary
                  : colors.primaryLight;

          return (
            <View key={`${insight.icon}-${index}`} style={styles.insightRow}>
              <View style={[styles.iconBadge, { backgroundColor }]}>
                <MaterialCommunityIcons
                  color={color}
                  name={insight.icon}
                  size={16}
                />
              </View>
              <Text
                style={[styles.insightText, { color: colors.textSecondary }]}
              >
                {insight.text}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  insightRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  insightText: {
    ...typography.secondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    gap: spacing.sm,
  },
  title: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '800',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
