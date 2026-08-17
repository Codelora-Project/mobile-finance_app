import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import {
  listCategoryBudgets,
  type CategoryBudget,
} from '@/features/budgets/budget-repository';
import { getCategoryMeta } from '@/features/categories/category-meta';
import { GoalCard } from '@/features/goals/components/goal-card';
import {
  listSavingsGoals,
  type SavingsGoal,
} from '@/features/goals/goals-repository';
import {
  getHabitStats,
  type HabitStats,
} from '@/features/habits/habit-repository';
import {
  getHomeSummary,
  type HomeSummary,
} from '@/features/home/home-repository';
import type { TransactionListItem } from '@/features/transactions/transaction-repository';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import type { Language } from '@/lib/i18n/translations';
import { formatMoney, formatSignedMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function parseLocalDate(localDate: string) {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function formatMonth(monthStart: string, language: Language) {
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(parseLocalDate(monthStart));
}

function formatTransactionDate(localDate: string, language: Language) {
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  }).format(parseLocalDate(localDate));
}


function transactionTitle(
  transaction: TransactionListItem,
  language: Language,
) {
  const fallback =
    transaction.type === 'expense'
      ? language === 'id'
        ? 'Pengeluaran'
        : 'Expense'
      : language === 'id'
        ? 'Pemasukan'
        : 'Income';

  return (
    transaction.counterparty?.trim() || transaction.categoryName || fallback
  );
}

export function HomeScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { colors, isDark } = useTheme();

  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [goals, setGoals] = useState<readonly SavingsGoal[]>([]);
  const [habitStats, setHabitStats] = useState<HabitStats | null>(null);
  const [categoryBudgets, setCategoryBudgets] = useState<
    readonly CategoryBudget[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadSummary = useCallback(
    async (mode: 'focus' | 'refresh' = 'focus') => {
      const currentRequest = ++requestId.current;
      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [nextSummary, nextGoals, nextHabits, nextBudgets] =
          await Promise.all([
            getHomeSummary(database),
            listSavingsGoals(database).catch(() => []),
            getHabitStats(database).catch(() => null),
            listCategoryBudgets(database).catch(() => []),
          ]);
        if (requestId.current === currentRequest) {
          setSummary(nextSummary);
          setGoals(nextGoals);
          setHabitStats(nextHabits);
          setCategoryBudgets(nextBudgets);
        }
      } catch (loadError) {
        if (requestId.current === currentRequest) {
          const mappedError = mapError(loadError, 'DATABASE_WRITE_FAILED');
          if (__DEV__) {
            console.warn('Home summary load failed.', mappedError.code);
          }
          setError(t.home.loadFailed);
        }
      } finally {
        if (requestId.current === currentRequest) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [database, t.home.loadFailed],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
      return () => {
        requestId.current += 1;
      };
    }, [loadSummary]),
  );

  if (loading && !summary) {
    return (
      <Screen>
        <View style={styles.centeredState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            {t.home.loading}
          </Text>
        </View>
      </Screen>
    );
  }

  if (!summary) {
    return (
      <Screen>
        <View style={styles.centeredState}>
          <Text
            accessibilityRole="header"
            style={[styles.stateTitle, { color: colors.textPrimary }]}
          >
            {t.home.overviewUnavailable}
          </Text>
          <Text
            accessibilityLiveRegion="assertive"
            style={[styles.stateText, { color: colors.textSecondary }]}
          >
            {error}
          </Text>
          <View style={styles.stateAction}>
            <AppButton
              label={t.home.tryAgain}
              onPress={() => void loadSummary()}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const isPositiveNet = summary.netMinor >= 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => void loadSummary('refresh')}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTitles}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {t.home.greeting}
            </Text>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.textPrimary }]}
            >
              {t.home.appTitle}
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <View
              style={[
                styles.monthBadge,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#EEF2FF',
                  borderColor: isDark ? colors.border : '#C7D2FE',
                },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.primary}
                name="calendar-month-outline"
                size={16}
              />
              <Text style={[styles.month, { color: colors.primary }]}>
                {formatMonth(summary.monthStart, language)}
              </Text>
            </View>

            <Pressable
              accessibilityLabel={t.settings.title}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [
                styles.settingsHeaderBtn,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
                  borderColor: colors.border,
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <MaterialCommunityIcons
                color={colors.textPrimary}
                name="cog-outline"
                size={22}
              />
            </Pressable>
          </View>
        </View>

        {/* Hero Card: Net Balance Overview */}
        <View
          accessibilityLabel={`Net balance: ${formatSignedMoney(summary.netMinor, summary.currencyCode)}`}
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.textPrimary,
            },
          ]}
        >
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroBadge}>
              <MaterialCommunityIcons
                color={colors.primary}
                name="wallet-outline"
                size={16}
              />
              <Text
                style={[styles.heroNetLabel, { color: colors.textSecondary }]}
              >
                {t.home.net}
              </Text>
            </View>
          </View>

          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[
              styles.heroAmount,
              {
                color: isPositiveNet ? colors.textPrimary : colors.destructive,
              },
            ]}
          >
            {formatSignedMoney(summary.netMinor, summary.currencyCode)}
          </Text>

          <View
            style={[styles.cardDivider, { backgroundColor: colors.border }]}
          />

          <View style={styles.summaryRows}>
            {/* Income Row */}
            <View style={styles.summaryRowItem}>
              <View style={styles.summaryRowLeft}>
                <View
                  style={[
                    styles.iconCircleIncome,
                    { backgroundColor: colors.incomeBackground },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.positive}
                    name="arrow-bottom-left"
                    size={20}
                  />
                </View>
                <Text
                  style={[
                    styles.summaryRowLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.home.income}
                </Text>
              </View>
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[styles.summaryIncomeValue, { color: colors.positive }]}
              >
                {formatMoney(summary.incomeMinor, summary.currencyCode)}
              </Text>
            </View>

            {/* Expense Row */}
            <View style={styles.summaryRowItem}>
              <View style={styles.summaryRowLeft}>
                <View
                  style={[
                    styles.iconCircleExpense,
                    { backgroundColor: colors.expenseBackground },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.destructive}
                    name="arrow-top-right"
                    size={20}
                  />
                </View>
                <Text
                  style={[
                    styles.summaryRowLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.home.expensesThisMonth}
                </Text>
              </View>
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[
                  styles.summaryExpenseValue,
                  { color: colors.destructive },
                ]}
              >
                {formatMoney(summary.expenseMinor, summary.currencyCode)}
              </Text>
            </View>
          </View>
        </View>

        {/* 📊 Analytics & Visual Insights Banner */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/analytics')}
          style={({ pressed }) => [
            styles.analyticsBanner,
            {
              backgroundColor: isDark ? colors.surfaceSecondary : '#EFF6FF',
              borderColor: isDark ? colors.border : '#BFDBFE',
            },
            pressed ? styles.pressed : null,
          ]}
        >
          <View style={styles.analyticsBannerLeft}>
            <View
              style={[
                styles.analyticsIconCircle,
                { backgroundColor: colors.primary },
              ]}
            >
              <MaterialCommunityIcons
                color="#FFFFFF"
                name="chart-box-outline"
                size={22}
              />
            </View>
            <View style={styles.analyticsBannerTextWrap}>
              <Text
                style={[
                  styles.analyticsBannerTitle,
                  { color: colors.textPrimary },
                ]}
              >
                {t.analytics.title}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.analyticsBannerSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {t.analytics.subtitle}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            color={colors.primary}
            name="chevron-right"
            size={22}
          />
        </Pressable>

        {/* 🎯 Habit Streak Widget */}
        {habitStats ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/goals')}
            style={({ pressed }) => [
              styles.habitStreakWidget,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.habitWidgetLeft}>
              <Text style={styles.habitEmoji}>
                {habitStats.currentBadge.emoji}
              </Text>
              <View>
                <Text
                  style={[
                    styles.habitStreakTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {habitStats.currentStreak} {t.habits.streakDays} 🔥
                </Text>
                <Text
                  style={[
                    styles.habitStreakSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {habitStats.currentBadge.title} ·{' '}
                  {habitStats.noSpendDaysThisMonth} {t.habits.noSpendDays}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="chevron-right"
              size={22}
            />
          </Pressable>
        ) : null}

        {/* 🎯 Celengan Impian (Savings Goals) Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              accessibilityRole="header"
              style={[styles.sectionTitle, { color: colors.textPrimary }]}
            >
              {t.goals.title}
            </Text>
            <Pressable hitSlop={8} onPress={() => router.push('/goals')}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>
                {t.home.viewAll} ›
              </Text>
            </Pressable>
          </View>

          {goals.length > 0 ? (
            <View style={styles.goalCardWrapper}>
              <GoalCard
                compact
                goal={goals[0]!}
                onPress={() => router.push(`/goals/${goals[0]!.id}`)}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => router.push('/goals')}
              style={({ pressed }) => [
                styles.emptyGoalPromptCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <View
                style={[
                  styles.emptyGoalIconWrap,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#FEF3C7',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color="#D97706"
                  name="piggy-bank-outline"
                  size={28}
                />
              </View>
              <View style={styles.emptyGoalTextWrap}>
                <Text
                  style={[styles.emptyGoalTitle, { color: colors.textPrimary }]}
                >
                  {t.goals.createFirstGoal}
                </Text>
                <Text
                  style={[
                    styles.emptyGoalSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.goals.subtitle}
                </Text>
              </View>
              <MaterialCommunityIcons
                color={colors.primary}
                name="plus-circle"
                size={24}
              />
            </Pressable>
          )}
        </View>

        {/* Spending by Category Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              accessibilityRole="header"
              style={[styles.sectionTitle, { color: colors.textPrimary }]}
            >
              {t.home.spendingByCategory}
            </Text>
            <Pressable hitSlop={8} onPress={() => router.push('/analytics')}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>
                {t.budgets.manageBudgets} ›
              </Text>
            </Pressable>
          </View>

          {summary.categoryTotals.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptySectionText,
                  { color: colors.textSecondary },
                ]}
              >
                {t.home.noExpensesThisMonth}
              </Text>
            </View>
          ) : (
            <View style={styles.categoryList}>
              {summary.categoryTotals.map((category) => {
                const percentage =
                  summary.expenseMinor > 0
                    ? Math.round(
                        (category.amountMinor / summary.expenseMinor) * 100,
                      )
                    : 0;
                const meta = getCategoryMeta(
                  category.categoryName,
                  'expense',
                  isDark,
                );

                const catBudget = categoryBudgets.find(
                  (b) =>
                    b.categoryName === category.categoryName && b.hasBudget,
                );

                return (
                  <Pressable
                    accessibilityLabel={`${category.categoryName}, ${formatMoney(category.amountMinor, summary.currencyCode)}, ${percentage}% ${t.home.ofExpenses}`}
                    key={category.categoryName}
                    onPress={() => router.push('/analytics')}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor:
                          catBudget?.status === 'overbudget'
                            ? '#EF4444'
                            : colors.border,
                        shadowColor: colors.textPrimary,
                      },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.categoryIconCircle,
                        { backgroundColor: meta.backgroundColor },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={meta.color}
                        name={meta.icon}
                        size={22}
                      />
                    </View>

                    <View style={styles.categoryInfo}>
                      <View style={styles.categoryHeader}>
                        <View style={styles.categoryTitleGroup}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.categoryName,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {category.categoryName}
                          </Text>
                          <View
                            style={[
                              styles.percentBadge,
                              {
                                backgroundColor: isDark
                                  ? colors.surfaceSecondary
                                  : '#E2E8F0',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.percentText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {percentage}%
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.categoryAmount,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {formatMoney(
                            category.amountMinor,
                            summary.currencyCode,
                          )}
                        </Text>
                      </View>

                      {/* Bar Track */}
                      <View
                        style={[
                          styles.barTrack,
                          {
                            backgroundColor: isDark
                              ? colors.surfaceSecondary
                              : '#F1F5F9',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.barFill,
                            {
                              backgroundColor:
                                catBudget?.status === 'overbudget'
                                  ? '#EF4444'
                                  : catBudget?.status === 'warning'
                                    ? '#F59E0B'
                                    : meta.color,
                              width: `${Math.max(percentage, 4)}%`,
                            },
                          ]}
                        />
                      </View>

                      {/* Budget Badge / Daily Allowance if set */}
                      {catBudget && catBudget.dailyAllowanceMinor !== null ? (
                        <View style={styles.categoryBudgetNotice}>
                          <Text
                            style={[
                              styles.categoryBudgetText,
                              {
                                color:
                                  catBudget.status === 'overbudget'
                                    ? '#EF4444'
                                    : colors.textSecondary,
                              },
                            ]}
                          >
                            {catBudget.status === 'overbudget'
                              ? t.budgets.statusOverbudget
                              : `${t.budgets.dailyAllowancePill}: ${formatMoney(catBudget.dailyAllowanceMinor, summary.currencyCode)}/hari`}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              accessibilityRole="header"
              style={[styles.sectionTitle, { color: colors.textPrimary }]}
            >
              {t.home.recentTransactions}
            </Text>
            {summary.recentTransactions.length > 0 ? (
              <Pressable hitSlop={8} onPress={() => router.push('/transactions')}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>
                  {t.home.viewAll} ›
                </Text>
              </Pressable>
            ) : null}
          </View>
          {summary.recentTransactions.length === 0 ? (
            <View
              style={[
                styles.emptyRecentCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: colors.textPrimary,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="receipt-text-plus-outline"
                  size={36}
                />
              </View>
              <Text
                style={[
                  styles.emptySectionTitle,
                  { color: colors.textPrimary },
                ]}
              >
                {t.home.noTransactionsYet}
              </Text>
              <Text
                style={[
                  styles.emptySectionText,
                  { color: colors.textSecondary },
                ]}
              >
                {t.home.noTransactionsDesc}
              </Text>
              <View style={styles.emptyAction}>
                <AppButton
                  label={t.home.addFirstTransaction}
                  onPress={() => router.push('/transactions/new')}
                  variant="secondary"
                />
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.cardList,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: colors.textPrimary,
                },
              ]}
            >
              {summary.recentTransactions.map((transaction, index) => {
                const title = transactionTitle(transaction, language);
                const meta = getCategoryMeta(
                  transaction.categoryName,
                  transaction.type,
                  isDark,
                );
                const isLast = index === summary.recentTransactions.length - 1;

                return (
                  <Pressable
                    accessibilityLabel={`${title}, ${formatMoney(
                      transaction.amountMinor,
                      transaction.currencyCode,
                    )}`}
                    accessibilityRole="button"
                    key={transaction.id}
                    onPress={() =>
                      router.push(`/transactions/${transaction.id}`)
                    }
                    style={({ pressed }) => [
                      styles.transactionRow,
                      {
                        backgroundColor: colors.surface,
                        borderBottomColor: colors.border,
                      },
                      isLast ? styles.transactionRowLast : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.avatarBadge,
                        { backgroundColor: meta.backgroundColor },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={meta.color}
                        name={meta.icon}
                        size={22}
                      />
                    </View>
                    <View style={styles.transactionText}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.transactionTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {title}
                      </Text>
                      <View style={styles.transactionMetaRow}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.transactionCategory,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {transaction.categoryName}
                        </Text>
                        <Text
                          style={[
                            styles.bulletSeparator,
                            { color: colors.textSecondary },
                          ]}
                        >
                          ·
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.transactionDate,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {formatTransactionDate(
                            transaction.localDate,
                            language,
                          )}
                        </Text>
                        {transaction.hasReceipt ? (
                          <View
                            style={[
                              styles.receiptBadge,
                              {
                                backgroundColor: isDark
                                  ? colors.surfaceSecondary
                                  : '#EFF6FF',
                              },
                            ]}
                          >
                            <MaterialCommunityIcons
                              color={colors.primary}
                              name="receipt"
                              size={12}
                            />
                            <Text
                              style={[
                                styles.receiptBadgeText,
                                { color: colors.primary },
                              ]}
                            >
                              {t.home.receiptBadge}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.transactionAmountWrapper}>
                      <Text
                        style={
                          transaction.type === 'expense'
                            ? [
                                styles.expenseAmount,
                                { color: colors.textPrimary },
                              ]
                            : [styles.incomeAmount, { color: colors.positive }]
                        }
                      >
                        {transaction.type === 'expense' ? '−' : '+'}
                        {formatMoney(
                          transaction.amountMinor,
                          transaction.currencyCode,
                        )}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  analyticsBanner: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  analyticsBannerLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  analyticsBannerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  analyticsBannerTextWrap: {
    flex: 1,
  },
  analyticsBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  analyticsIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  barFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  barTrack: {
    borderRadius: radius.pill,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  bulletSeparator: {
    fontSize: 12,
  },
  cardDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  cardList: {
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 2,
    marginHorizontal: spacing.lg,
    overflow: 'hidden',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  categoryBudgetNotice: {
    marginTop: 2,
  },
  categoryBudgetText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    elevation: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  categoryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  categoryInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  categoryList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
  },
  categoryTitleGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  centeredState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl + spacing.md,
  },
  emptyAction: {
    marginTop: spacing.md,
    width: '100%',
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
  },
  emptyGoalIconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  emptyGoalPromptCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 1,
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
  },
  emptyGoalSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  emptyGoalTextWrap: {
    flex: 1,
  },
  emptyGoalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 68,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 68,
  },
  emptyRecentCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    elevation: 2,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.xl,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  emptySectionText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  emptySectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  goalCardWrapper: {
    marginHorizontal: spacing.lg,
  },
  greeting: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  habitEmoji: {
    fontSize: 26,
  },
  habitStreakSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  habitStreakTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  habitStreakWidget: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  habitWidgetLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerRightActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  headerTitles: {
    gap: 2,
  },
  settingsHeaderBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    elevation: 3,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  heroHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  heroNetLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  iconCircleExpense: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconCircleIncome: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  incomeAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  month: {
    fontSize: 12,
    fontWeight: '700',
  },
  monthBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  percentBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  receiptBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    flexShrink: 0,
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  receiptBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  stateAction: {
    marginTop: spacing.lg,
    width: '100%',
  },
  stateText: {
    fontSize: typography.body.fontSize,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  stateTitle: {
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  summaryExpenseValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  summaryIncomeValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  summaryRowItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryRowLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryRowLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryRows: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  transactionAmountWrapper: {
    alignItems: 'flex-end',
    flexShrink: 0,
    justifyContent: 'center',
    paddingLeft: spacing.xs,
  },
  transactionCategory: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  transactionDate: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '500',
  },
  transactionMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
    minWidth: 0,
  },
  transactionRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    minHeight: 68,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  transactionRowLast: {
    borderBottomWidth: 0,
  },
  transactionText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
    overflow: 'hidden',
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
