import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { AnalyticsBudgetsTab } from '@/features/analytics/components/analytics-budgets-tab';
import { AnalyticsHeader } from '@/features/analytics/components/analytics-header';
import { AnalyticsOverviewTab } from '@/features/analytics/components/analytics-overview-tab';
import {
  AnalyticsTabPills,
  type AnalyticsTabMode,
} from '@/features/analytics/components/analytics-tab-pills';
import { AnalyticsTrendsTab } from '@/features/analytics/components/analytics-trends-tab';
import {
  deleteCategoryBudget,
  listCategoryBudgets,
  setCategoryBudget,
  type CategoryBudget,
} from '@/features/budgets/budget-repository';
import { SetBudgetModal } from '@/features/budgets/components/set-budget-modal';
import { useCurrency } from '@/lib/currency/currency-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function AnalyticsScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { currencyCode } = useCurrency();

  const [activeTab, setActiveTab] = useState<AnalyticsTabMode>('overview');
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

  const handleOpenSetBudget = useCallback((budget: CategoryBudget) => {
    setSelectedBudgetForEdit(budget);
    setEditModalVisible(true);
  }, []);

  const handleSaveBudget = useCallback(
    async (categoryId: number, monthlyLimitMinor: number) => {
      await setCategoryBudget(database, categoryId, monthlyLimitMinor);
      await loadData('refresh');
    },
    [database, loadData],
  );

  const handleDeleteBudget = useCallback(
    async (categoryId: number) => {
      await deleteCategoryBudget(database, categoryId);
      await loadData('refresh');
    },
    [database, loadData],
  );

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

  return (
    <Screen>
      {/* 1. Top Navigation Header */}
      <AnalyticsHeader
        backLabel={t.common.back}
        onBack={() => router.back()}
        title={t.analytics.title}
      />

      {/* 2. Segmented Tab Pills */}
      <AnalyticsTabPills
        activeTab={activeTab}
        budgetsLabel={t.analytics.budgetsTab}
        onSelectTab={setActiveTab}
        overviewLabel={t.analytics.overviewTab}
        trendsLabel={t.analytics.trendsTab}
      />

      {/* 3. Tab Body Container */}
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
        {/* Tab 1: Overview, Donut & Weekly Comparison */}
        {activeTab === 'overview' && analytics ? (
          <AnalyticsOverviewTab
            analytics={analytics}
            currencyCode={currencyCode}
            t={t}
          />
        ) : null}

        {/* Tab 2: Category Budgets */}
        {activeTab === 'budgets' ? (
          <AnalyticsBudgetsTab
            budgets={budgets}
            currencyCode={currencyCode}
            onOpenSetBudget={handleOpenSetBudget}
            t={t}
          />
        ) : null}

        {/* Tab 3: Monthly Cash Flow Trends */}
        {activeTab === 'trends' && analytics ? (
          <AnalyticsTrendsTab
            currencyCode={currencyCode}
            monthlyCashFlow={analytics.monthlyCashFlow}
            t={t}
          />
        ) : null}
      </ScrollView>

      {/* Set Category Budget Modal */}
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
  centeredState: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl + 24,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  stateText: {
    ...typography.metadata,
    fontSize: 13,
  },
});
