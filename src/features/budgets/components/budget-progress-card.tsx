import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategoryBudget } from '@/features/budgets/budget-repository';
import { getCategoryMeta } from '@/features/categories/category-meta';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type BudgetProgressCardProps = {
  budget: CategoryBudget;
  currencyCode: string;
  onPressSetBudget: (budget: CategoryBudget) => void;
};

export const BudgetProgressCard = memo(function BudgetProgressCard({
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
    <Pressable
      accessibilityRole="button"
      onPress={() => onPressSetBudget(budget)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor:
            budget.status === 'overbudget' ? colors.destructive : colors.border,
          shadowColor: colors.textPrimary,
        },
        pressed ? styles.pressed : null,
      ]}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.categoryLeft}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.surfaceSecondary,
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name={meta.icon}
              size={20}
            />
          </View>
          <View style={styles.categoryTitleWrap}>
            <Text
              ellipsizeMode="tail"
              numberOfLines={1}
              style={[styles.categoryName, { color: colors.textPrimary }]}
            >
              {budget.categoryName}
            </Text>
            <Text
              ellipsizeMode="tail"
              numberOfLines={1}
              style={[styles.spentSubtitle, { color: colors.textSecondary }]}
            >
              {t.budgets.spentPrefix}{' '}
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {formatMoney(budget.spentMinor, currencyCode)}
              </Text>
            </Text>
          </View>
        </View>

        <View
          style={[styles.statusBadge, { backgroundColor: statusTheme.badgeBg }]}
        >
          <Text
            style={[styles.statusBadgeText, { color: statusTheme.badgeText }]}
          >
            {statusTheme.label} · {percent}%
          </Text>
        </View>
      </View>

      {/* Progress Bar & Allowance */}
      <View style={styles.budgetBody}>
        {/* Progress Bar Track */}
        <View
          style={[
            styles.barTrack,
            {
              backgroundColor: colors.surfaceSecondary,
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

        {/* Details Row: Limit & Remaining */}
        <View style={styles.detailsRow}>
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.detailText, { color: colors.textSecondary }]}
          >
            {t.budgets.limitPrefix}{' '}
            {formatMoney(budget.monthlyLimitMinor ?? 0, currencyCode)}
          </Text>

          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
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
                backgroundColor: colors.surfaceMuted,
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.primary}
              name="calendar-clock"
              size={15}
            />
            <Text
              ellipsizeMode="tail"
              numberOfLines={1}
              style={[styles.allowanceText, { color: colors.textSecondary }]}
            >
              {t.budgets.dailyAllowancePill}{' '}
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
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
                backgroundColor: colors.expenseBackground,
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.destructive}
              name="alert-circle-outline"
              size={15}
            />
            <Text
              ellipsizeMode="tail"
              numberOfLines={1}
              style={[styles.allowanceTextOver, { color: colors.destructive }]}
            >
              {t.budgets.overbudgetNotice}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  allowanceBanner: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  allowanceBannerOver: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
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
    height: 7,
    overflow: 'hidden',
    width: '100%',
  },
  budgetBody: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 2,
    padding: spacing.md,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  categoryLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0,
  },
  categoryName: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '800',
  },
  categoryTitleWrap: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  detailText: {
    ...typography.metadata,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  detailsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  pressed: {
    opacity: 0.85,
  },
  remainingText: {
    ...typography.metadata,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  spentSubtitle: {
    ...typography.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    borderRadius: radius.pill,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
  },
});
