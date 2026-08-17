import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';
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
import { GOAL_ICONS } from '@/features/goals/components/goal-card';
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
  shiftPeriodDate,
  type HomePeriod,
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

function parseLocalDate(localDate: string) {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function formatGroupDate(localDate: string, language: Language) {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yy = yesterday.getFullYear();
  const ym = String(yesterday.getMonth() + 1).padStart(2, '0');
  const yd = String(yesterday.getDate()).padStart(2, '0');
  const yesterdayStr = `${yy}-${ym}-${yd}`;

  if (localDate === todayStr) {
    return language === 'id' ? 'Hari ini' : 'Today';
  }
  if (localDate === yesterdayStr) {
    return language === 'id' ? 'Kemarin' : 'Yesterday';
  }

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

  const [period, setPeriod] = useState<HomePeriod>('monthly');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
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
    async (
      activePeriod = period,
      activeDate = referenceDate,
      mode: 'focus' | 'refresh' = 'focus',
    ) => {
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
            getHomeSummary(database, activePeriod, activeDate, language),
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
    [database, language, period, referenceDate, t.home.loadFailed],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSummary(period, referenceDate, 'focus');
    }, [loadSummary, period, referenceDate]),
  );

  const handlePeriodChange = (newPeriod: HomePeriod) => {
    setPeriod(newPeriod);
    void loadSummary(newPeriod, referenceDate, 'focus');
  };

  const handleShiftDate = (delta: number) => {
    const nextDate = shiftPeriodDate(referenceDate, period, delta);
    setReferenceDate(nextDate);
    void loadSummary(period, nextDate, 'focus');
  };

  const handleResetToToday = () => {
    const today = new Date();
    setReferenceDate(today);
    void loadSummary(period, today, 'focus');
  };

  // Group recent transactions by date for Timeline View
  const groupedTimeline = useMemo(() => {
    if (!summary || summary.recentTransactions.length === 0) return [];

    const groups: {
      date: string;
      formattedDate: string;
      netMinor: number;
      items: TransactionListItem[];
    }[] = [];

    const map = new Map<string, TransactionListItem[]>();
    for (const item of summary.recentTransactions) {
      const existing = map.get(item.localDate);
      if (existing) {
        existing.push(item);
      } else {
        map.set(item.localDate, [item]);
      }
    }

    for (const [date, items] of map.entries()) {
      let netMinor = 0;
      for (const it of items) {
        netMinor += it.type === 'income' ? it.amountMinor : -it.amountMinor;
      }
      groups.push({
        date,
        formattedDate: formatGroupDate(date, language),
        items,
        netMinor,
      });
    }

    return groups;
  }, [language, summary]);

  const featuredGoal = goals.find((g) => !g.isCompleted) ?? goals[0] ?? null;
  const headerBg = isDark ? '#0F172A' : '#1D4ED8';
  return (
    <Screen>
      {/* 1. TOP SOLID BLUE HEADER */}
      <View style={[styles.solidHeader, { backgroundColor: headerBg }]}>
        {/* Row 1: Period Navigator (< Bulan >) & Top Actions */}
        <View style={styles.headerTopRow}>
          <View style={styles.periodSwitcher}>
            <Pressable
              accessibilityLabel='Previous period'
              accessibilityRole='button'
              hitSlop={12}
              onPress={() => handleShiftDate(-1)}
              style={({ pressed }) => [
                styles.navArrowBtn,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color='#FFFFFF'
                name='chevron-left'
                size={28}
              />
            </Pressable>

            <Pressable
              accessibilityLabel='Period label'
              onPress={handleResetToToday}
              style={styles.periodLabelWrap}
            >
              <Text numberOfLines={1} style={styles.periodLabelText}>
                {summary?.periodLabel ?? '...'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel='Next period'
              accessibilityRole='button'
              hitSlop={12}
              onPress={() => handleShiftDate(1)}
              style={({ pressed }) => [
                styles.navArrowBtn,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color='#FFFFFF'
                name='chevron-right'
                size={28}
              />
            </Pressable>
          </View>

          {/* Settings Shortcut */}
          <Pressable
            accessibilityLabel={t.tabs.settings}
            accessibilityRole='button'
            hitSlop={8}
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.headerActionBtn,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color='#FFFFFF'
              name='cog-outline'
              size={22}
            />
          </Pressable>
        </View>

        {/* Row 2: Period Filter Segment Tabs (Harian | Mingguan | Bulanan | Tahunan) */}
        <View style={styles.periodTabsRow}>
          {(
            [
              { key: 'daily', label: t.home.periodDaily },
              { key: 'weekly', label: t.home.periodWeekly },
              { key: 'monthly', label: t.home.periodMonthly },
              { key: 'yearly', label: t.home.periodYearly },
            ] as const
          ).map((tab) => {
            const isSelected = period === tab.key;
            return (
              <Pressable
                accessibilityRole='tab'
                accessibilityState={{ selected: isSelected }}
                key={tab.key}
                onPress={() => handlePeriodChange(tab.key)}
                style={[
                  styles.periodTabPill,
                  isSelected
                    ? styles.periodTabPillActive
                    : styles.periodTabPillInactive,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.periodTabText,
                    isSelected
                      ? { color: headerBg, fontWeight: '800' }
                      : { color: '#FFFFFF', fontWeight: '600' },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 2. MAIN SCROLLABLE BODY */}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => void loadSummary(period, referenceDate, 'refresh')}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
      >
        {error ? (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
                borderColor: isDark ? '#991B1B' : '#FCA5A5',
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.destructive}
              name='alert-circle-outline'
              size={24}
            />
            <Text
              style={[styles.errorCardText, { color: colors.destructive }]}
            >
              {error}
            </Text>
            <AppButton
              label={t.home.tryAgain}
              onPress={() => void loadSummary(period, referenceDate, 'focus')}
              variant='secondary'
            />
          </View>
        ) : null}

        {/* 2.1 CLEAN INTEGRATED SUMMARY CARD */}
        {summary ? (
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
            {/* Total Balance / Sisa Saldo Header */}
            <View style={styles.summaryTopRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.summaryCardSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.home.totalBalance}
                </Text>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  numberOfLines={1}
                  style={[
                    styles.summaryNetValue,
                    {
                      color:
                        summary.netMinor >= 0
                          ? colors.textPrimary
                          : colors.destructive,
                    },
                  ]}
                >
                  {formatSignedMoney(summary.netMinor, summary.currencyCode)}
                </Text>
              </View>

              {/* Currency Tag */}
              <View
                style={[
                  styles.currencyTag,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.currencyTagText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {summary.currencyCode}
                </Text>
              </View>
            </View>

            <View
              style={[styles.summaryDivider, { backgroundColor: colors.border }]}
            />

            {/* Income & Expense 2-Column Split */}
            <View style={styles.summaryColsRow}>
              {/* Income */}
              <View style={styles.summaryColItem}>
                <View style={styles.summaryColHeader}>
                  <View
                    style={[
                      styles.iconCircleIncome,
                      {
                        backgroundColor: isDark ? '#14532D' : '#DCFCE7',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={colors.positive}
                      name='arrow-up'
                      size={14}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.summaryColLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.home.income}
                  </Text>
                </View>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  numberOfLines={1}
                  style={[
                    styles.summaryIncomeValue,
                    { color: colors.positive },
                  ]}
                >
                  {formatMoney(summary.incomeMinor, summary.currencyCode)}
                </Text>
              </View>

              <View
                style={[
                  styles.summaryVerticalDivider,
                  { backgroundColor: colors.border },
                ]}
              />

              {/* Expense */}
              <View style={styles.summaryColItem}>
                <View style={styles.summaryColHeader}>
                  <View
                    style={[
                      styles.iconCircleExpense,
                      {
                        backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={colors.destructive}
                      name='arrow-down'
                      size={14}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.summaryColLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.home.expensesThisMonth}
                  </Text>
                </View>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
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
        ) : null}

        {/* 2.2 MINI WIDGETS: STREAK & GOALS */}
        <View style={styles.miniWidgetsRow}>
          {/* Streak Card */}
          <Pressable
            accessibilityLabel='Habit Streak'
            accessibilityRole='button'
            onPress={() => router.push('/goals')}
            style={({ pressed }) => [
              styles.miniWidgetCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.textPrimary,
              },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.miniWidgetHeader}>
              <View
                style={[
                  styles.miniIconCircle,
                  { backgroundColor: isDark ? '#78350F' : '#FEF3C7' },
                ]}
              >
                <MaterialCommunityIcons
                  color='#D97706'
                  name='fire'
                  size={18}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.miniWidgetTitle,
                  { color: colors.textSecondary },
                ]}
              >
                {t.habits.streakTitle}
              </Text>
            </View>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              numberOfLines={1}
              style={[styles.miniWidgetValue, { color: colors.textPrimary }]}
            >
              {habitStats?.currentStreak ?? 0} {t.habits.streakDays}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              numberOfLines={1}
              style={[
                styles.miniWidgetSubtext,
                { color: colors.textSecondary },
              ]}
            >
              {habitStats
                ? (t.habits.noSpendTitle + ': ' + habitStats.noSpendDaysThisMonth + ' ' + t.habits.noSpendDays)
                : t.habits.streakBest}
            </Text>
          </Pressable>

          {/* Goal Card */}
          <Pressable
            accessibilityLabel='Savings Goal'
            accessibilityRole='button'
            onPress={() => router.push('/goals')}
            style={({ pressed }) => [
              styles.miniWidgetCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.textPrimary,
              },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.miniWidgetHeader}>
              <View
                style={[
                  styles.miniIconCircle,
                  { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' },
                ]}
              >
                <MaterialCommunityIcons
                  color='#2563EB'
                  name='piggy-bank-outline'
                  size={18}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.miniWidgetTitle,
                  { color: colors.textSecondary },
                ]}
              >
                {t.goals.title}
              </Text>
            </View>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              numberOfLines={1}
              style={[styles.miniWidgetValue, { color: colors.textPrimary }]}
            >
              {featuredGoal ? featuredGoal.name : t.goals.noGoalsYet}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              numberOfLines={1}
              style={[
                styles.miniWidgetSubtext,
                {
                  color: featuredGoal?.isCompleted
                    ? colors.positive
                    : colors.primary,
                },
              ]}
            >
              {featuredGoal
                ? (featuredGoal.progressPercent + '% ' + t.goals.saved.toLowerCase())
                : t.goals.createFirstGoal}
            </Text>
          </Pressable>
        </View>
        {/* 2.3 CATEGORY SPENDING BREAKDOWN */}
        {summary && summary.categoryTotals.length > 0 ? (
          <View
            style={[
              styles.integratedCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.textPrimary,
              },
            ]}
          >
            <View style={styles.integratedCardHeader}>
              <Text
                numberOfLines={1}
                style={[
                  styles.integratedCardTitle,
                  { color: colors.textPrimary },
                ]}
              >
                {t.home.spendingByCategory}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() => router.push('/budgets')}
                style={({ pressed }) => [
                  styles.cardHeaderLink,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.linkText, { color: colors.primary }]}
                >
                  {t.budgets.manageBudgets}
                </Text>
              </Pressable>
            </View>

            <View style={styles.categoryList}>
              {summary.categoryTotals.map((item) => {
                const meta = getCategoryMeta(item.categoryName, 'expense', isDark);
                const percent =
                  summary.expenseMinor > 0
                    ? Math.round((item.amountMinor / summary.expenseMinor) * 100)
                    : 0;

                const matchingBudget = categoryBudgets.find(
                  (b) => b.categoryId === item.categoryId,
                );

                return (
                  <View key={item.categoryId} style={styles.categoryItemRow}>
                    <View
                      style={[
                        styles.catIconBox,
                        { backgroundColor: meta.backgroundColor },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={meta.color}
                        name={meta.icon}
                        size={18}
                      />
                    </View>

                    <View style={styles.catInfoCol}>
                      <View style={styles.catNameAmountRow}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.catNameText,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {item.categoryName}
                        </Text>
                        <Text
                          style={[
                            styles.catAmountText,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {formatMoney(item.amountMinor, summary.currencyCode)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.catProgressBarTrack,
                          {
                            backgroundColor: isDark
                              ? colors.surfaceSecondary
                              : '#F1F5F9',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.catProgressBarFill,
                            {
                              backgroundColor: meta.color,
                              width: (Math.max(4, Math.min(100, percent)) + '%') as any,
                            },
                          ]}
                        />
                      </View>

                      {matchingBudget && matchingBudget.monthlyLimitMinor != null ? (
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.budgetHintText,
                            {
                              color:
                                matchingBudget.spentMinor >
                                matchingBudget.monthlyLimitMinor
                                  ? colors.destructive
                                  : colors.textSecondary,
                            },
                          ]}
                        >
                          {matchingBudget.spentMinor >
                          matchingBudget.monthlyLimitMinor
                            ? (t.budgets.statusOverbudget + ' (' + formatMoney(
                                matchingBudget.spentMinor -
                                  matchingBudget.monthlyLimitMinor,
                                summary.currencyCode,
                              ) + ')')
                            : (t.budgets.remainingPrefix + ' ' + formatMoney(
                                Math.max(
                                  0,
                                  matchingBudget.monthlyLimitMinor -
                                    matchingBudget.spentMinor,
                                ),
                                summary.currencyCode,
                              ))}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* 2.4 TIMELINE TREE LIST: RECENT TRANSACTIONS */}
        <View
          style={[
            styles.integratedCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.textPrimary,
            },
          ]}
        >
          <View style={styles.integratedCardHeader}>
            <Text
              numberOfLines={1}
              style={[
                styles.integratedCardTitle,
                { color: colors.textPrimary },
              ]}
            >
              {t.home.recentTransactions}
            </Text>
            <Pressable
              hitSlop={8}
              onPress={() => router.push('/transactions')}
              style={({ pressed }) => [
                styles.cardHeaderLink,
                pressed && styles.pressed,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.linkText, { color: colors.primary }]}
              >
                {t.home.viewAll}
              </Text>
            </Pressable>
          </View>

          {groupedTimeline.length === 0 ? (
            <View style={styles.emptyTransactionsWrap}>
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name='receipt-text-plus-outline'
                size={38}
              />
              <Text
                style={[styles.emptyStateTitle, { color: colors.textPrimary }]}
              >
                {t.home.noTransactionsYet}
              </Text>
              <Text
                style={[
                  styles.emptyStateSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {t.home.noTransactionsDesc}
              </Text>
            </View>
          ) : (
            <View style={styles.timelineListContainer}>
              {groupedTimeline.map((group) => (
                <View key={group.date} style={styles.timelineDateGroup}>
                  {/* Date Header Row */}
                  <View style={styles.timelineDateHeaderRow}>
                    <Text
                      style={[
                        styles.timelineDateLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {group.formattedDate}
                    </Text>
                    <Text
                      style={[
                        styles.timelineDailyNet,
                        {
                          color:
                            group.netMinor >= 0
                              ? colors.positive
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {formatSignedMoney(
                        group.netMinor,
                        summary?.currencyCode ?? 'IDR',
                      )}
                    </Text>
                  </View>

                  {/* Transaction Items with Connected Timeline Dots */}
                  <View style={styles.timelineItemsWrap}>
                    {group.items.map((item, idx) => {
                      const isLast = idx === group.items.length - 1;
                      const meta = getCategoryMeta(
                        item.categoryName,
                        item.type,
                        isDark,
                      );
                      const title = transactionTitle(item, language);

                      return (
                        <Pressable
                          accessibilityLabel={title + ', ' + formatMoney(item.amountMinor, item.currencyCode)}
                          accessibilityRole='button'
                          key={item.id}
                          onPress={() =>
                            router.push('/transactions/' + item.id)
                          }
                          style={({ pressed }) => [
                            styles.timelineRow,
                            pressed && styles.pressed,
                          ]}
                        >
                          {/* Timeline Dot & Connecting Line */}
                          <View style={styles.timelineTrackCol}>
                            <View
                              style={[
                                styles.timelineDot,
                                { backgroundColor: meta.color },
                              ]}
                            />
                            {!isLast ? (
                              <View
                                style={[
                                  styles.timelineLine,
                                  { backgroundColor: colors.border },
                                ]}
                              />
                            ) : null}
                          </View>

                          {/* Info */}
                          <View style={styles.timelineContentCol}>
                            <View style={styles.timelineMainRow}>
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.timelineItemTitle,
                                  { color: colors.textPrimary },
                                ]}
                              >
                                {title}
                              </Text>
                              <Text
                                style={[
                                  styles.timelineAmount,
                                  {
                                    color:
                                      item.type === 'expense'
                                        ? colors.destructive
                                        : colors.positive,
                                  },
                                ]}
                              >
                                {item.type === 'expense' ? '-' : '+'}
                                {formatMoney(item.amountMinor, item.currencyCode)}
                              </Text>
                            </View>

                            {/* Category & Badges */}
                            <View style={styles.timelineMetaRow}>
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.timelineCategoryName,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {item.categoryName}
                              </Text>
                              {item.hasReceipt ? (
                                <View
                                  style={[
                                    styles.badgeMiniPill,
                                    {
                                      backgroundColor: isDark
                                        ? '#312E81'
                                        : '#EDE9FE',
                                    },
                                  ]}
                                >
                                  <MaterialCommunityIcons
                                    color='#7C3AED'
                                    name='receipt-outline'
                                    size={10}
                                  />
                                </View>
                              ) : null}
                              {item.isReimbursable ? (
                                <View
                                  style={[
                                    styles.badgeMiniPill,
                                    {
                                      backgroundColor: isDark
                                        ? '#78350F'
                                        : '#FEF3C7',
                                    },
                                  ]}
                                >
                                  <MaterialCommunityIcons
                                    color='#D97706'
                                    name='briefcase-outline'
                                    size={10}
                                  />
                                </View>
                              ) : null}
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  badgeMiniPill: {
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  budgetHintText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  cardHeaderLink: {
    flexShrink: 0,
    paddingVertical: 2,
  },
  catAmountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  catIconBox: {
    alignItems: 'center',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  catInfoCol: {
    flex: 1,
    gap: 4,
  },
  catNameAmountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  catNameText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 8,
  },
  catProgressBarFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  catProgressBarTrack: {
    borderRadius: radius.pill,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  categoryItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  categoryList: {
    gap: 12,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  currencyTag: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  currencyTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyTransactionsWrap: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.lg,
  },
  errorCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    gap: spacing.sm,
    padding: spacing.md,
  },
  errorCardText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerActionBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconCircleExpense: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  iconCircleIncome: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  integratedCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 2,
    gap: spacing.md,
    padding: spacing.md + 2,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  integratedCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  integratedCardTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  miniIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  miniWidgetCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    elevation: 2,
    flex: 1,
    gap: 4,
    minWidth: 0,
    padding: spacing.md,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  miniWidgetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  miniWidgetSubtext: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  miniWidgetTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  miniWidgetValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  miniWidgetsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  navArrowBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  periodLabelText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  periodLabelWrap: {
    paddingHorizontal: 6,
  },
  periodSwitcher: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  periodTabPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 7,
  },
  periodTabPillActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  periodTabPillInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  periodTabText: {
    fontSize: 12,
  },
  periodTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  solidHeader: {
    elevation: 4,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    shadowColor: '#1D4ED8',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 3,
    gap: spacing.md,
    marginTop: -4,
    padding: spacing.md + 2,
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  summaryCardSubtitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryColHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 6,
  },
  summaryColItem: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  summaryColLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryColsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  summaryDivider: {
    height: 1,
    width: '100%',
  },
  summaryExpenseValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  summaryIncomeValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  summaryNetValue: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  summaryTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryVerticalDivider: {
    height: 36,
    width: 1,
  },
  timelineAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  timelineCategoryName: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  timelineContentCol: {
    flex: 1,
    gap: 2,
    paddingBottom: spacing.sm + 2,
  },
  timelineDailyNet: {
    fontSize: 12,
    fontWeight: '700',
  },
  timelineDateGroup: {
    gap: spacing.xs,
  },
  timelineDateHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  timelineDateLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  timelineDot: {
    borderRadius: radius.pill,
    height: 10,
    marginTop: 4,
    width: 10,
  },
  timelineItemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8,
  },
  timelineItemsWrap: {
    gap: 0,
  },
  timelineLine: {
    flex: 1,
    marginTop: 2,
    width: 2,
  },
  timelineListContainer: {
    gap: spacing.md,
  },
  timelineMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineTrackCol: {
    alignItems: 'center',
    width: 14,
  },
});
