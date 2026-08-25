import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  exportAnalyticsReportToCsv,
  shareAnalyticsReportCsv,
} from '@/features/analytics/analytics-export-service';
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
import { getTimezoneOffsetMinutes, toLocalDate } from '@/lib/dates';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTabBarVisibility } from '@/lib/navigation/tab-bar-visibility-context';
import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type AnalyticsScreenProps = {
  hideBackButton?: boolean;
};

type ReportPeriod = Readonly<{ month: number; year: number }>;

function getCurrentReportPeriod() {
  const localDate = toLocalDate(Date.now(), getTimezoneOffsetMinutes());
  const [year, month] = localDate.split('-').map(Number);
  return {
    localDate,
    period: { month: (month ?? 1) - 1, year: year ?? 2000 },
  };
}

function buildReferenceDate(
  period: ReportPeriod,
  current: ReturnType<typeof getCurrentReportPeriod>,
) {
  if (
    period.year === current.period.year &&
    period.month === current.period.month
  ) {
    return current.localDate;
  }

  const lastDay = new Date(
    Date.UTC(period.year, period.month + 1, 0),
  ).getUTCDate();
  return `${period.year}-${String(period.month + 1).padStart(2, '0')}-${String(
    lastDay,
  ).padStart(2, '0')}`;
}

export function AnalyticsScreen({
  hideBackButton = false,
}: AnalyticsScreenProps = {}) {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { colors } = useTheme();
  const { currencyCode } = useCurrency();
  const { handleScroll } = useTabBarVisibility();

  const [currentPeriod] = useState(getCurrentReportPeriod);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>(
    currentPeriod.period,
  );

  const [activeTab, setActiveTab] = useState<AnalyticsTabMode>('overview');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [budgets, setBudgets] = useState<readonly CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set Budget Modal State
  const [selectedBudgetForEdit, setSelectedBudgetForEdit] =
    useState<CategoryBudget | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const requestId = useRef(0);
  const referenceDate = buildReferenceDate(selectedPeriod, currentPeriod);
  const monthLabel = new Intl.DateTimeFormat(
    language === 'id' ? 'id-ID' : 'en-US',
    { month: 'long', year: 'numeric' },
  ).format(new Date(selectedPeriod.year, selectedPeriod.month, 1));
  const nextMonthDisabled =
    selectedPeriod.year > currentPeriod.period.year ||
    (selectedPeriod.year === currentPeriod.period.year &&
      selectedPeriod.month >= currentPeriod.period.month);

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
          getAnalyticsData(database, referenceDate),
          listCategoryBudgets(database, referenceDate),
        ]);

        if (requestId.current === currentRequest) {
          setAnalytics(nextAnalytics);
          setBudgets(nextBudgets);
          setError(null);
        }
      } catch (err) {
        if (requestId.current === currentRequest) {
          setError(t.analytics.loadFailed);
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
    [database, referenceDate, t.analytics.loadFailed],
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

  const handlePreviousMonth = useCallback(() => {
    setSelectedPeriod((period) => {
      const date = new Date(period.year, period.month - 1, 1);
      return { month: date.getMonth(), year: date.getFullYear() };
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    if (nextMonthDisabled) return;
    setSelectedPeriod((period) => {
      const date = new Date(period.year, period.month + 1, 1);
      return { month: date.getMonth(), year: date.getFullYear() };
    });
  }, [nextMonthDisabled]);

  const handleSelectMonth = useCallback((year: number, month: number) => {
    setSelectedPeriod({ month, year });
  }, []);

  const handleExport = useCallback(async () => {
    if (!analytics || exporting) return;
    setExporting(true);
    try {
      const report = await exportAnalyticsReportToCsv(
        analytics,
        currencyCode,
        language,
      );
      await shareAnalyticsReportCsv(report.uri, t.analytics.exportShareTitle);
    } catch (exportError) {
      if (__DEV__)
        console.warn('Failed to export analytics report', exportError);
      Alert.alert(t.analytics.exportFailed);
    } finally {
      setExporting(false);
    }
  }, [
    analytics,
    currencyCode,
    exporting,
    language,
    t.analytics.exportFailed,
    t.analytics.exportShareTitle,
  ]);

  if (loading && !analytics) {
    return (
      <Screen>
        <AnalyticsHeader
          backLabel={t.common.back}
          language={language}
          maximumValue={currentPeriod.period}
          monthLabel={monthLabel}
          nextMonthDisabled={nextMonthDisabled}
          onBack={hideBackButton ? undefined : () => router.back()}
          onNextMonth={handleNextMonth}
          onPreviousMonth={handlePreviousMonth}
          onSelectMonth={handleSelectMonth}
          selectedMonth={selectedPeriod.month}
          selectedYear={selectedPeriod.year}
        />
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
          language={language}
          maximumValue={currentPeriod.period}
          monthLabel={monthLabel}
          nextMonthDisabled={nextMonthDisabled}
          onBack={hideBackButton ? undefined : () => router.back()}
          onNextMonth={handleNextMonth}
          onPreviousMonth={handlePreviousMonth}
          onSelectMonth={handleSelectMonth}
          selectedMonth={selectedPeriod.month}
          selectedYear={selectedPeriod.year}
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
        exporting={exporting}
        language={language}
        maximumValue={currentPeriod.period}
        monthLabel={monthLabel}
        nextMonthDisabled={nextMonthDisabled}
        onBack={hideBackButton ? undefined : () => router.back()}
        onExport={() => void handleExport()}
        onNextMonth={handleNextMonth}
        onPreviousMonth={handlePreviousMonth}
        onSelectMonth={handleSelectMonth}
        selectedMonth={selectedPeriod.month}
        selectedYear={selectedPeriod.year}
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
      ) : null}

      {/* 2. Primary report sections sit directly below the period header. */}
      <AnalyticsTabPills
        activeTab={activeTab}
        budgetsLabel={t.analytics.budgetsTab}
        onSelectTab={setActiveTab}
        overviewLabel={t.analytics.overviewTab}
        trendsLabel={t.analytics.trendsTab}
      />

      {/* 3. Primary KPIs stay visible across report sections. */}
      {analytics ? (
        <View style={styles.summaryWrap}>
          <AnalyticsPeriodSummary
            analytics={analytics}
            currencyCode={currencyCode}
            t={t}
          />
        </View>
      ) : null}

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
            budgets={budgets}
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
            language={language}
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
});
