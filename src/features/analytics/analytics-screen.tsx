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
import { AppButton } from '@/components/ui/app-button';
import {
  getAnalyticsData,
  type AnalyticsData,
} from '@/features/analytics/analytics-repository';
import { AnalyticsBudgetsTab } from '@/features/analytics/components/analytics-budgets-tab';
import { AnalyticsHeader } from '@/features/analytics/components/analytics-header';
import { AnalyticsOverviewTab } from '@/features/analytics/components/analytics-overview-tab';
import { AnalyticsPeriodSummary } from '@/features/analytics/components/analytics-period-summary';
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
import { useTabBarVisibility } from '@/lib/navigation/tab-bar-visibility-context';
import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type AnalyticsScreenProps = {
  hideBackButton?: boolean;
};

export function AnalyticsScreen({
  hideBackButton = false,
}: AnalyticsScreenProps = {}) {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { colors } = useTheme();
  const { currencyCode } = useCurrency();
  const { handleScroll } = useTabBarVisibility();

  const [activeTab, setActiveTab] = useState<AnalyticsTabMode>('overview');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [budgets, setBudgets] = useState<readonly CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

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
          setError(null);
          setLastUpdatedAt(Date.now());
        }
      } catch (err) {
        if (requestId.current === currentRequest) {
          setError(
            language === 'id'
              ? 'Analitik belum dapat dimuat. Periksa data lalu coba lagi.'
              : 'Analytics could not be loaded. Check your data and try again.',
          );
        }
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
    [database, language],
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

  if (error && !analytics) {
    return (
      <Screen>
        <AnalyticsHeader
          backLabel={t.common.back}
          onBack={hideBackButton ? undefined : () => router.back()}
          title={t.analytics.title}
        />
        <View style={styles.centeredState}>
          <MaterialCommunityIcons
            color={colors.destructive}
            name="chart-box-outline"
            size={42}
          />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            {error}
          </Text>
          <AppButton
            label={t.common.tryAgain}
            onPress={() => void loadData()}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* 1. Top Navigation Header */}
      <AnalyticsHeader
        backLabel={t.common.back}
        onBack={hideBackButton ? undefined : () => router.back()}
        title={t.analytics.title}
      />

      {error ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void loadData('refresh')}
          style={[
            styles.errorBanner,
            {
              backgroundColor: colors.expenseBackground,
              borderColor: colors.destructive,
            },
          ]}
        >
          <Text style={[styles.errorBannerText, { color: colors.destructive }]}>
            {error} {t.common.tryAgain}
          </Text>
        </Pressable>
      ) : lastUpdatedAt ? (
        <Text style={[styles.updatedText, { color: colors.textMuted }]}>
          {language === 'id' ? 'Diperbarui' : 'Updated'}{' '}
          {new Date(lastUpdatedAt).toLocaleTimeString(
            language === 'id' ? 'id-ID' : 'en-US',
            { hour: '2-digit', minute: '2-digit' },
          )}
        </Text>
      ) : null}

      {/* 2. Period context and primary KPIs stay visible across tabs. */}
      {analytics ? (
        <View style={styles.summaryWrap}>
          <AnalyticsPeriodSummary
            analytics={analytics}
            currencyCode={currencyCode}
            language={language}
            t={t}
          />
        </View>
      ) : null}

      {/* 3. Segmented Tab Pills */}
      <AnalyticsTabPills
        activeTab={activeTab}
        budgetsLabel={t.analytics.budgetsTab}
        onSelectTab={setActiveTab}
        overviewLabel={t.analytics.overviewTab}
        trendsLabel={t.analytics.trendsTab}
      />

      {/* 4. Tab Body Container */}
      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => void loadData('refresh')}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
        scrollEventThrottle={16}
      >
        {/* Tab 1: Overview, Donut & Weekly Comparison */}
        {activeTab === 'overview' && analytics ? (
          <AnalyticsOverviewTab
            analytics={analytics}
            currencyCode={currencyCode}
            t={t}
          />
        ) : null}

        {/* Tab 2: Category Budgets Management */}
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
  errorBanner: {
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    padding: spacing.sm,
  },
  errorBannerText: { ...typography.metadata, fontWeight: '700' },
  errorTitle: { ...typography.body, maxWidth: 320, textAlign: 'center' },
  content: {
    alignSelf: 'center',
    gap: spacing.md,
    maxWidth: contentMaxWidth,
    paddingBottom: spacing.xxl + 84,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    width: '100%',
  },
  stateText: {
    ...typography.metadata,
    fontSize: 13,
  },
  summaryWrap: {
    alignSelf: 'center',
    maxWidth: contentMaxWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    width: '100%',
  },
  updatedText: {
    ...typography.metadata,
    paddingHorizontal: spacing.md,
    textAlign: 'right',
  },
});
