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

import { Screen } from '@/components/ui/screen';
import {
  getAnalyticsData,
  type AnalyticsData,
} from '@/features/analytics/analytics-repository';
import { DonutBreakdownChart } from '@/features/analytics/components/donut-breakdown-chart';
import { WeeklyBarChart } from '@/features/analytics/components/weekly-bar-chart';
import {
  deleteCategoryBudget,
  listCategoryBudgets,
  setCategoryBudget,
  type CategoryBudget,
} from '@/features/budgets/budget-repository';
import { BudgetProgressCard } from '@/features/budgets/components/budget-progress-card';
import { SetBudgetModal } from '@/features/budgets/components/set-budget-modal';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney, formatSignedMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

type TabMode = 'overview' | 'budgets' | 'trends';

export function AnalyticsScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabMode>('overview');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [budgets, setBudgets] = useState<readonly CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Set Budget Modal State
  const [selectedBudgetForEdit, setSelectedBudgetForEdit] =
    useState<CategoryBudget | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const requestId = useRef(0);

  const loadData = useCallback(
    async (mode: 'focus' | 'refresh' = 'focus') => {
      const currentRequest = ++requestId.current;
      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [nextAnalytics, nextBudgets] = await Promise.all([
          getAnalyticsData(database),
          listCategoryBudgets(database),
        ]);

        if (requestId.current === currentRequest) {
          setAnalytics(nextAnalytics);
          setBudgets(nextBudgets);
        }
      } catch (err) {
        if (__DEV__) {
          console.warn('Failed to load analytics data', err);
        }
      } finally {
        if (requestId.current === currentRequest) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [database],
  );

  useFocusEffect(
    useCallback(() => {
      void loadData();
      return () => {
        requestId.current += 1;
      };
    }, [loadData]),
  );

  const handleOpenSetBudget = (budget: CategoryBudget) => {
    setSelectedBudgetForEdit(budget);
    setEditModalVisible(true);
  };

  const handleSaveBudget = async (
    categoryId: number,
    monthlyLimitMinor: number,
  ) => {
    await setCategoryBudget(database, categoryId, monthlyLimitMinor);
    await loadData('refresh');
  };

  const handleDeleteBudget = async (categoryId: number) => {
    await deleteCategoryBudget(database, categoryId);
    await loadData('refresh');
  };

  if (loading && !analytics) {
    return (
      <Screen>
        <View style={styles.centeredState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            {t.analytics.loadingAnalytics}
          </Text>
        </View>
      </Screen>
    );
  }

  const currencyCode = 'IDR';
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
    <Screen>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t.common.back}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            color={colors.textPrimary}
            name="chevron-left"
            size={28}
          />
        </Pressable>

        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: colors.textPrimary }]}
        >
          {t.analytics.title}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* Segmented Filter Pills */}
      <View style={styles.tabsContainer}>
        {(
          [
            { key: 'overview', label: t.analytics.overviewTab },
            { key: 'budgets', label: t.analytics.budgetsTab },
            { key: 'trends', label: t.analytics.trendsTab },
          ] as const
        ).map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <Pressable
              accessibilityRole="button"
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [
                styles.tabPill,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                adjustsFontSizeToFit minimumFontScale={0.85} numberOfLines={1} style={[styles.tabPillText,
                  {
                    color: isSelected ? '#FFFFFF' : colors.textSecondary,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => void loadData('refresh')}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
      >
        {/* TAB 1: OVERVIEW & DONUT BREAKDOWN & WEEKLY BAR */}
        {activeTab === 'overview' && analytics ? (
          <View style={styles.tabContent}>
            {/* Quick Metrics Strip */}
            <View style={styles.metricsStrip}>
              {/* Card 1: Total Expense */}
              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.metricLabel, { color: colors.textSecondary }]}
                >
                  {t.analytics.totalExpense}
                </Text>
                <Text
                  adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={[styles.metricValue, { color: colors.textPrimary }]}
                >
                  {formatMoney(analytics.totalExpenseMinor, currencyCode)}
                </Text>
              </View>

              {/* Card 2: Daily Average */}
              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.metricLabel, { color: colors.textSecondary }]}
                >
                  {t.analytics.dailyAverage}
                </Text>
                <Text
                  adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={[styles.metricValue, { color: colors.primary }]}
                >
                  {formatMoney(
                    analytics.averageDailyExpenseMinor,
                    currencyCode,
                  )}
                </Text>
              </View>
            </View>

            {/* Donut / Segmented Breakdown Chart */}
            {analytics.totalExpenseMinor > 0 ? (
              <DonutBreakdownChart
                currencyCode={currencyCode}
                items={analytics.categoryBreakdown}
                totalExpenseMinor={analytics.totalExpenseMinor}
              />
            ) : (
              <View
                style={[
                  styles.emptyStateCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="chart-arc"
                  size={44}
                />
                <Text
                  style={[styles.emptyTitle, { color: colors.textPrimary }]}
                >
                  {t.analytics.noDataYet}
                </Text>
                <Text
                  style={[styles.emptyDesc, { color: colors.textSecondary }]}
                >
                  {t.analytics.noDataDesc}
                </Text>
              </View>
            )}

            {/* Weekly Comparison Bar Chart */}
            <WeeklyBarChart
              currencyCode={currencyCode}
              weeklyData={analytics.weeklyComparison}
            />
          </View>
        ) : null}

        {/* TAB 2: CATEGORY BUDGETS */}
        {activeTab === 'budgets' ? (
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
                  onPressSetBudget={handleOpenSetBudget}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* TAB 3: MONTHLY CASH FLOW TRENDS */}
        {activeTab === 'trends' && analytics ? (
          <View style={styles.tabContent}>
            <View
              style={[
                styles.cashFlowCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                accessibilityRole="header"
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                {t.analytics.cashFlowTrend}
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {t.analytics.cashFlowSubtitle}
              </Text>

              <View style={styles.cashFlowList}>
                {analytics.monthlyCashFlow.map((flow) => {
                  const maxFlow = Math.max(
                    flow.incomeMinor,
                    flow.expenseMinor,
                    1,
                  );
                  const incomeWidth = Math.max(
                    4,
                    Math.round((flow.incomeMinor / maxFlow) * 100),
                  );
                  const expenseWidth = Math.max(
                    4,
                    Math.round((flow.expenseMinor / maxFlow) * 100),
                  );

                  return (
                    <View key={flow.monthStart} style={styles.cashFlowMonthRow}>
                      <View style={styles.monthHeaderRow}>
                        <Text
                          style={[
                            styles.monthNameText,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {flow.monthLabel}
                        </Text>
                        <Text
                          style={[
                            styles.monthNetText,
                            {
                              color:
                                flow.netMinor >= 0
                                  ? colors.positive
                                  : colors.destructive,
                            },
                          ]}
                        >
                          {formatSignedMoney(flow.netMinor, currencyCode)}
                        </Text>
                      </View>

                      {/* Income Bar */}
                      <View style={styles.flowBarRow}>
                        <Text
                          style={[
                            styles.flowBarLabel,
                            { color: colors.positive },
                          ]}
                        >
                          {t.analytics.incomePrefix}:{' '}
                          {formatMoney(flow.incomeMinor, currencyCode)}
                        </Text>
                        <View
                          style={[
                            styles.flowBarTrack,
                            {
                              backgroundColor: isDark
                                ? colors.surfaceSecondary
                                : '#F1F5F9',
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.flowBarFill,
                              {
                                backgroundColor: colors.positive,
                                width: `${incomeWidth}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {/* Expense Bar */}
                      <View style={styles.flowBarRow}>
                        <Text
                          style={[
                            styles.flowBarLabel,
                            { color: colors.destructive },
                          ]}
                        >
                          {t.analytics.expensePrefix}:{' '}
                          {formatMoney(flow.expenseMinor, currencyCode)}
                        </Text>
                        <View
                          style={[
                            styles.flowBarTrack,
                            {
                              backgroundColor: isDark
                                ? colors.surfaceSecondary
                                : '#F1F5F9',
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.flowBarFill,
                              {
                                backgroundColor: colors.destructive,
                                width: `${expenseWidth}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Set Budget Modal */}
      <SetBudgetModal
        budget={selectedBudgetForEdit}
        currencyCode={currencyCode}
        onClose={() => setEditModalVisible(false)}
        onDelete={handleDeleteBudget}
        onSave={handleSaveBudget}
        visible={editModalVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    marginLeft: -spacing.xs,
    width: 40,
  },
  budgetList: {
    gap: spacing.md,
  },
  cashFlowCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 2,
    padding: spacing.md + 2,
  },
  cashFlowList: {
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  cashFlowMonthRow: {
    gap: 6,
  },
  centeredState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyDesc: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyStateCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  flowBarFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  flowBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  flowBarRow: {
    gap: 2,
  },
  flowBarTrack: {
    borderRadius: radius.pill,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  metricCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    flex: 1,
    gap: 4,
    minWidth: 0,
    padding: spacing.md,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  metricsStrip: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  monthHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  monthNameText: {
    fontSize: 14,
    fontWeight: '800',
  },
  monthNetText: {
    fontSize: 13,
    fontWeight: '800',
  },
  overallBarFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  overallBarTrack: {
    borderRadius: radius.pill,
    height: 8,
    marginTop: spacing.sm,
    overflow: 'hidden',
    width: '100%',
  },
  overallBudgetCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: spacing.md + 2,
  },
  overallHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overallPercentPill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  overallPercentText: {
    fontSize: 13,
    fontWeight: '800',
  },
  overallSpentText: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  overallTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.75,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  stateText: {
    fontSize: 14,
    marginTop: spacing.sm,
  },
  tabContent: {
    gap: spacing.md,
  },
  tabPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  tabPillText: {
    flexShrink: 1,
    fontSize: 13,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
