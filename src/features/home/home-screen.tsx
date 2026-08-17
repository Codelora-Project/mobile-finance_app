import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { UndoToastBanner } from '@/components/ui/undo-toast-banner';
import { useBottomSheetGesture } from '@/components/ui/use-bottom-sheet-gesture';
import {
  listCategories,
  type Category,
} from '@/features/categories/category-repository';
import type { HabitStats } from '@/features/habits/habit-repository';
import { getHabitStats } from '@/features/habits/habit-repository';
import { HomeHeader } from '@/features/home/components/home-header';
import { HomeQuickCategoryLog } from '@/features/home/components/home-quick-category-log';
import { HomeQuickLogModal } from '@/features/home/components/home-quick-log-modal';
import { HomeRecentTransactions } from '@/features/home/components/home-recent-transactions';
import { HomeSummaryCard } from '@/features/home/components/home-summary-card';
import {
  getHomeSummary,
  type HomePeriod,
  type HomeSummary,
} from '@/features/home/home-repository';
import {
  getQuickLogCategoryIds,
  setQuickLogCategoryIds,
} from '@/features/settings/settings-repository';
import { useUndoTransaction } from '@/features/transactions/hooks/use-undo-transaction';
import type { TransactionListItem } from '@/features/transactions/transaction-repository';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatGroupDate } from '@/lib/dates';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const DEFAULT_QUICK_LOG_IDS = [1, 2, 3, 4, 5];

export function HomeScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { colors, isDark } = useTheme();

  const [period, setPeriod] = useState<HomePeriod>('monthly');
  const [referenceDate] = useState<Date>(() => new Date());
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [habitStats, setHabitStats] = useState<HabitStats | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [pinnedCategoryIds, setPinnedCategoryIds] = useState<number[]>(
    DEFAULT_QUICK_LOG_IDS,
  );
  const [selectedIdsInModal, setSelectedIdsInModal] = useState<number[]>(
    DEFAULT_QUICK_LOG_IDS,
  );
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
      }
      setError(null);

      try {
        const [nextSummary, nextHabitStats, nextCategories, nextQuickLogIds] =
          await Promise.all([
            getHomeSummary(database, activePeriod, activeDate, language),
            getHabitStats(database),
            listCategories(database),
            getQuickLogCategoryIds(database),
          ]);

        if (requestId.current !== currentRequest) {
          return;
        }

        setSummary(nextSummary);
        setHabitStats(nextHabitStats);
        setAllCategories(nextCategories);
        if (nextQuickLogIds && nextQuickLogIds.length > 0) {
          setPinnedCategoryIds(nextQuickLogIds);
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
          setRefreshing(false);
        }
      }
    },
    [database, language, period, referenceDate, t.home.loadFailed],
  );

  const {
    canUndo,
    dismissToast,
    handleUndo,
    isUndoing,
    toastMessage,
    toastVisible,
  } = useUndoTransaction({
    onSuccess: () => {
      void loadSummary(period, referenceDate, 'refresh');
    },
  });

  useFocusEffect(
    useCallback(() => {
      void loadSummary(period, referenceDate, 'focus');
    }, [loadSummary, period, referenceDate]),
  );

  const handlePeriodChange = useCallback(
    (newPeriod: HomePeriod) => {
      setPeriod(newPeriod);
      void loadSummary(newPeriod, referenceDate, 'focus');
    },
    [loadSummary, referenceDate],
  );

  const {
    backdropOpacity,
    close: handleCloseCustomizeModal,
    open: handleOpenCustomizeModalInternal,
    panResponder,
    panY,
    visible: customizeModalVisible,
  } = useBottomSheetGesture();

  const handleOpenCustomizeModal = useCallback(() => {
    setSelectedIdsInModal(pinnedCategoryIds);
    handleOpenCustomizeModalInternal();
  }, [handleOpenCustomizeModalInternal, pinnedCategoryIds]);

  const handleToggleModalCategory = useCallback((id: number) => {
    setSelectedIdsInModal((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  }, []);

  const handleSaveQuickLogCategories = useCallback(async () => {
    try {
      await setQuickLogCategoryIds(database, selectedIdsInModal);
      setPinnedCategoryIds(selectedIdsInModal);
      handleCloseCustomizeModal();
    } catch (err) {
      if (__DEV__) console.warn('Could not save quick log categories', err);
    }
  }, [database, handleCloseCustomizeModal, selectedIdsInModal]);

  const handleResetQuickLogCategories = useCallback(() => {
    setSelectedIdsInModal(DEFAULT_QUICK_LOG_IDS);
  }, []);

  const handleSelectQuickLogCategory = useCallback(
    (cat: Category) => {
      router.push({
        params: {
          categoryId: String(cat.id),
          categoryName: cat.name,
          type: 'expense',
        },
        pathname: '/transactions/new',
      });
    },
    [router],
  );

  const handlePressTransaction = useCallback(
    (id: number) => {
      router.push(`/transactions/${id}`);
    },
    [router],
  );

  const handleViewAllTransactions = useCallback(() => {
    router.push('/transactions');
  }, [router]);

  const handlePressSettings = useCallback(() => {
    router.push('/settings');
  }, [router]);

  const displayedQuickLogCategories = useMemo(() => {
    const map = new Map(allCategories.map((c) => [c.id, c]));
    const list: Category[] = [];
    for (const id of pinnedCategoryIds) {
      const found = map.get(id);
      if (found) list.push(found);
    }
    return list.length > 0 ? list : allCategories.slice(0, 5);
  }, [allCategories, pinnedCategoryIds]);

  const groupedTimeline = useMemo(() => {
    if (!summary || summary.recentTransactions.length === 0) return [];

    const map = new Map<string, TransactionListItem[]>();
    for (const item of summary.recentTransactions) {
      const existing = map.get(item.localDate);
      if (existing) {
        existing.push(item);
      } else {
        map.set(item.localDate, [item]);
      }
    }

    const groups: {
      date: string;
      formattedDate: string;
      items: TransactionListItem[];
      netMinor: number;
    }[] = [];

    for (const [date, items] of map.entries()) {
      const netMinor = items.reduce(
        (sum, item) =>
          item.type === 'income'
            ? sum + item.amountMinor
            : sum - item.amountMinor,
        0,
      );

      groups.push({
        date,
        formattedDate: formatGroupDate(date, language, t),
        items,
        netMinor,
      });
    }

    return groups;
  }, [language, summary, t]);

  return (
    <Screen>
      {/* 1. Header with Greeting, Streak Badge & Settings Button */}
      <HomeHeader
        appTitle={t.home.appTitle}
        greeting={t.home.greeting}
        onPressSettings={handlePressSettings}
        settingsLabel={t.tabs.settings}
        streakCount={habitStats?.currentStreak ?? 0}
        streakDaysLabel={t.habits.streakDays}
      />

      {/* 2. Scrollable Dashboard Body */}
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
              name="alert-circle-outline"
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
              variant="secondary"
            />
          </View>
        ) : null}

        {/* 2.1 Hero Summary & Balance Card */}
        {summary ? (
          <HomeSummaryCard
            onPeriodChange={handlePeriodChange}
            period={period}
            summary={summary}
            t={t}
          />
        ) : null}

        {/* 2.2 Fast-Track Quick Category Log */}
        <HomeQuickCategoryLog
          categories={displayedQuickLogCategories}
          onOpenCustomize={handleOpenCustomizeModal}
          onSelectCategory={handleSelectQuickLogCategory}
          t={t}
        />

        {/* 2.3 Recent Transactions Timeline */}
        <HomeRecentTransactions
          currencyCode={summary?.currencyCode ?? 'IDR'}
          groupedTimeline={groupedTimeline}
          onPressTransaction={handlePressTransaction}
          onViewAll={handleViewAllTransactions}
          t={t}
        />
      </ScrollView>

      {/* Quick Log Customization Bottom Sheet Modal */}
      <HomeQuickLogModal
        allCategories={allCategories}
        backdropOpacity={backdropOpacity}
        onClose={handleCloseCustomizeModal}
        onReset={handleResetQuickLogCategories}
        onSave={() => void handleSaveQuickLogCategories()}
        onToggleCategory={handleToggleModalCategory}
        panResponder={panResponder}
        panY={panY}
        selectedIds={selectedIdsInModal}
        t={t}
        visible={customizeModalVisible}
      />

      {/* Floating Undo Toast on Home */}
      <UndoToastBanner
        canUndo={canUndo}
        isUndoing={isUndoing}
        message={toastMessage}
        onClose={dismissToast}
        onUndo={() => void handleUndo()}
        visible={toastVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl + 24,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  errorCard: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  errorCardText: {
    ...typography.body,
    fontWeight: '600',
    textAlign: 'center',
  },
});
