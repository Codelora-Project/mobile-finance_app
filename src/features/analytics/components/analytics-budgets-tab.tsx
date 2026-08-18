import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategoryBudget } from '@/features/budgets/budget-repository';
import { BudgetProgressCard } from '@/features/budgets/components/budget-progress-card';
import { getCategoryMeta } from '@/features/categories/category-meta';
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
  const unbudgetedCategories = budgets.filter((b) => !b.hasBudget);

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
      {/* 1. Overall Budget Progress Header Card */}
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
            <View style={styles.overallTitleWrap}>
              <Text
                numberOfLines={1}
                style={[
                  styles.overallTitle,
                  { color: colors.textSecondary },
                ]}
              >
                {t.budgets.overallProgress}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.overallSpentText,
                  { color: colors.textPrimary },
                ]}
              >
                {formatMoney(totalSpentInBudgeted, currencyCode)}{' '}
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
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

      {/* 2. Section: Active Budgets List or Empty State */}
      {budgetedCategories.length > 0 ? (
        <View style={styles.sectionContainer}>
          <Text
            style={[
              styles.sectionHeaderTitle,
              { color: colors.textSecondary },
            ]}
          >
            ANGGARAN AKTIF ({budgetedCategories.length})
          </Text>
          <View style={styles.budgetList}>
            {budgetedCategories.map((budget) => (
              <BudgetProgressCard
                budget={budget}
                currencyCode={currencyCode}
                key={budget.categoryId}
                onPressSetBudget={onOpenSetBudget}
              />
            ))}
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.emptyHeroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.emptyHeroIconBadge,
              {
                backgroundColor: isDark ? colors.surfaceSecondary : '#EFF6FF',
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.primary}
              name="chart-arc"
              size={28}
            />
          </View>
          <Text
            style={[styles.emptyHeroTitle, { color: colors.textPrimary }]}
          >
            Atur Batas Anggaran Bulanan
          </Text>
          <Text
            style={[
              styles.emptyHeroSubtitle,
              { color: colors.textSecondary },
            ]}
          >
            Pasang batas pengeluaran pada kategori di bawah ini untuk mengontrol arus kas dan mencegah pengeluaran berlebih.
          </Text>
        </View>
      )}

      {/* 3. Section: Unbudgeted Categories in a Grouped List Card */}
      {unbudgetedCategories.length > 0 ? (
        <View style={styles.sectionContainer}>
          <Text
            style={[
              styles.sectionHeaderTitle,
              { color: colors.textSecondary },
            ]}
          >
            KATEGORI LAINNYA ({unbudgetedCategories.length})
          </Text>

          <View
            style={[
              styles.groupedContainerCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {unbudgetedCategories.map((budget, index) => {
              const meta = getCategoryMeta(
                budget.categoryName,
                'expense',
                isDark,
              );
              const isLast = index === unbudgetedCategories.length - 1;

              return (
                <Pressable
                  accessibilityLabel={`Pasang Anggaran ${budget.categoryName}`}
                  accessibilityRole="button"
                  hitSlop={4}
                  key={budget.categoryId}
                  onPress={() => onOpenSetBudget(budget)}
                  style={({ pressed }) => [
                    styles.unbudgetedRow,
                    !isLast && [
                      styles.unbudgetedRowDivider,
                      { borderColor: colors.border },
                    ],
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.unbudgetedIconCircle,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceSecondary
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={isDark ? '#94A3B8' : '#475569'}
                      name={meta.icon}
                      size={18}
                    />
                  </View>

                  <View style={styles.unbudgetedInfoWrap}>
                    <Text
                      ellipsizeMode="tail"
                      numberOfLines={1}
                      style={[
                        styles.unbudgetedName,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {budget.categoryName}
                    </Text>
                    <Text
                      ellipsizeMode="tail"
                      numberOfLines={1}
                      style={[
                        styles.unbudgetedSpent,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {budget.spentMinor > 0 ? (
                        <>
                          {t.budgets.spentPrefix}{' '}
                          <Text
                            style={{
                              color: colors.textPrimary,
                              fontWeight: '700',
                            }}
                          >
                            {formatMoney(budget.spentMinor, currencyCode)}
                          </Text>
                        </>
                      ) : (
                        'Belum ada transaksi'
                      )}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.unbudgetedActionBtn,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceSecondary
                          : '#EFF6FF',
                        borderColor: isDark ? colors.border : '#DBEAFE',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.unbudgetedActionText,
                        { color: colors.primary },
                      ]}
                    >
                      {t.budgets.setBudget}
                    </Text>
                    <MaterialCommunityIcons
                      color={colors.primary}
                      name="chevron-right"
                      size={14}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  budgetList: {
    gap: spacing.sm,
  },
  emptyHeroCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
  emptyHeroIconBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 52,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 52,
  },
  emptyHeroSubtitle: {
    ...typography.secondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyHeroTitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  groupedContainerCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 1,
    overflow: 'hidden',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
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
    fontSize: 18,
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
  overallTitleWrap: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  rowPressed: {
    opacity: 0.7,
  },
  sectionContainer: {
    gap: spacing.xs + 2,
  },
  sectionHeaderTitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  tabContent: {
    gap: spacing.md + 2,
  },
  unbudgetedActionBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    flexShrink: 0,
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  unbudgetedActionText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
  },
  unbudgetedIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  unbudgetedInfoWrap: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  unbudgetedName: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
  unbudgetedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  unbudgetedRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  unbudgetedSpent: {
    ...typography.secondary,
    fontSize: 12,
  },
});
