import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategoryBudget } from '@/features/budgets/budget-repository';
import { getCategoryMeta } from '@/features/categories/category-meta';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

type BudgetProgressCardProps = {
  budget: CategoryBudget;
  currencyCode: string;
  onPressSetBudget: (budget: CategoryBudget) => void;
};

export function BudgetProgressCard({
  budget,
  currencyCode,
  onPressSetBudget,
}: BudgetProgressCardProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const meta = getCategoryMeta(budget.categoryName, 'expense', isDark);

  const getStatusTheme = () => {
    switch (budget.status) {
      case 'overbudget':
      case 'danger':
        return {
          badgeBg: colors.expenseBackground,
          badgeText: colors.destructive,
          barColor: colors.destructive,
          label:
            budget.status === 'overbudget'
              ? t.budgets.statusOverbudget
              : t.budgets.statusDanger,
        };
      case 'warning':
        return {
          badgeBg: colors.warningBackground,
          badgeText: colors.warning,
          barColor: colors.warning,
          label: t.budgets.statusWarning,
        };
      default:
        return {
          badgeBg: colors.incomeBackground,
          badgeText: colors.positive,
          barColor: colors.positive,
          label: t.budgets.statusSafe,
        };
    }
  };

  const statusTheme = getStatusTheme();
  const percent = budget.spentPercent ?? 0;
  const clampedPercent = Math.min(100, Math.max(percent, 3));

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor:
            budget.status === 'overbudget' ? colors.destructive : colors.border,
          shadowColor: colors.textPrimary,
        },
      ]}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.categoryLeft}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: meta.backgroundColor },
            ]}
          >
            <MaterialCommunityIcons
              color={meta.color}
              name={meta.icon}
              size={22}
            />
          </View>
          <View style={styles.categoryTitleWrap}>
            <Text
              numberOfLines={1}
              style={[styles.categoryName, { color: colors.textPrimary }]}
            >
              {budget.categoryName}
            </Text>
            <Text
              style={[styles.spentSubtitle, { color: colors.textSecondary }]}
            >
              {t.budgets.spentPrefix}{' '}
              {formatMoney(budget.spentMinor, currencyCode)}
            </Text>
          </View>
        </View>

        {budget.hasBudget ? (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusTheme.badgeBg },
            ]}
          >
            <Text
              style={[styles.statusBadgeText, { color: statusTheme.badgeText }]}
            >
              {statusTheme.label} · {percent}%
            </Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => onPressSetBudget(budget)}
            style={({ pressed }) => [
              styles.setBudgetBtn,
              {
                backgroundColor: isDark ? colors.surfaceSecondary : '#EFF6FF',
                borderColor: isDark ? colors.border : '#DBEAFE',
              },
              pressed ? styles.pressed : null,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.primary}
              name="plus-circle-outline"
              size={14}
            />
            <Text style={[styles.setBudgetBtnText, { color: colors.primary }]}>
              {t.budgets.setBudget}
            </Text>
          </Pressable>
        )}
      </View>

      {/* If has budget: Progress Bar & Allowance */}
      {budget.hasBudget ? (
        <View style={styles.budgetBody}>
          {/* Progress Bar */}
          <View
            style={[
              styles.barTrack,
              {
                backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
              },
            ]}
          >
            <View
              style={[
                styles.barFill,
                {
                  backgroundColor: statusTheme.barColor,
                  width: `${clampedPercent}%`,
                },
              ]}
            />
          </View>

          {/* Details Row */}
          <View style={styles.detailsRow}>
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {t.budgets.limitPrefix}{' '}
              {formatMoney(budget.monthlyLimitMinor ?? 0, currencyCode)}
            </Text>

            <Text
              style={[
                styles.remainingText,
                {
                  color:
                    budget.status === 'overbudget'
                      ? colors.destructive
                      : colors.textPrimary,
                },
              ]}
            >
              {budget.remainingMinor !== null && budget.remainingMinor >= 0
                ? `${t.budgets.remainingPrefix} ${formatMoney(budget.remainingMinor, currencyCode)}`
                : `${t.budgets.overbudgetPrefix} ${formatMoney(
                    Math.abs(budget.remainingMinor ?? 0),
                    currencyCode,
                  )}`}
            </Text>
          </View>

          {/* Daily Allowance Banner */}
          {budget.status !== 'overbudget' &&
          budget.dailyAllowanceMinor !== null ? (
            <View
              style={[
                styles.allowanceBanner,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
                },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.primary}
                name="calendar-clock"
                size={16}
              />
              <Text
                style={[styles.allowanceText, { color: colors.textSecondary }]}
              >
                {t.budgets.dailyAllowancePill}{' '}
                <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>
                  {formatMoney(budget.dailyAllowanceMinor, currencyCode)}/hari
                </Text>{' '}
                {t.budgets.perDayThisMonth}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.allowanceBannerOver,
                {
                  backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
                },
              ]}
            >
              <MaterialCommunityIcons
                color="#EF4444"
                name="alert-circle-outline"
                size={16}
              />
              <Text style={[styles.allowanceTextOver, { color: '#EF4444' }]}>
                {t.budgets.overbudgetNotice}
              </Text>
            </View>
          )}

          {/* Edit Budget Action */}
          <Pressable
            hitSlop={8}
            onPress={() => onPressSetBudget(budget)}
            style={styles.editAction}
          >
            <Text style={[styles.editText, { color: colors.primary }]}>
              {t.budgets.changeBudgetLimit}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  allowanceBanner: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  allowanceBannerOver: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  allowanceText: {
    flex: 1,
    fontSize: 12,
  },
  allowanceTextOver: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  barFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  barTrack: {
    borderRadius: radius.pill,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  budgetBody: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 2,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  categoryLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '800',
  },
  categoryTitleWrap: {
    flex: 1,
    gap: 2,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  editAction: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  editText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  pressed: {
    opacity: 0.75,
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '800',
  },
  setBudgetBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  setBudgetBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  spentSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
