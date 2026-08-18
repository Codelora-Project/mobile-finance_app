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
import { useBottomSheetGesture } from '@/components/ui/use-bottom-sheet-gesture';
import {
  getWalletSummary,
} from '@/features/accounts/account-repository';
import type { WalletSummary } from '@/features/accounts/account-types';
import {
  listCategories,
  type Category,
} from '@/features/categories/category-repository';
import type { HabitStats } from '@/features/habits/habit-repository';
import { getHabitStats } from '@/features/habits/habit-repository';
import { HomeDisplaySettingsModal } from '@/features/home/components/home-display-settings-modal';
import { HomeHeader } from '@/features/home/components/home-header';
import { HomeQuickCategoryLog } from '@/features/home/components/home-quick-category-log';
import { HomeQuickLogModal } from '@/features/home/components/home-quick-log-modal';
import { HomeRecentTransactions } from '@/features/home/components/home-recent-transactions';
import { HomeSummaryCard } from '@/features/home/components/home-summary-card';
import { HomeWalletChipsBar } from '@/features/home/components/home-wallet-chips-bar';
import {
  getHomeSummary,
  type HomePeriod,
  type HomeSummary,
} from '@/features/home/home-repository';
import {
  getHomeDisplayPreferences,
  getQuickLogCategoryIds,
  setHomeDisplayPreferences,
  setQuickLogCategoryIds,
} from '@/features/settings/settings-repository';
import type { TransactionListItem } from '@/features/transactions/transaction-repository';
import { formatGroupDate } from '@/lib/dates';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTabBarVisibility } from '@/lib/navigation/tab-bar-visibility-context';
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
  const { handleScroll } = useTabBarVisibility();

  const [period, setPeriod] = useState<HomePeriod>('monthly');
  const [referenceDate] = useState<Date>(() => new Date());
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [habitStats, setHabitStats] = useState<HabitStats | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [pinnedCategoryIds, setPinnedCategoryIds] = useState<number[]>(
    DEFAULT_QUICK_LOG_IDS,
  );
  const [selectedIdsInModal, setSelectedIdsInModal] = useState<number[]>(
    DEFAULT_QUICK_LOG_IDS,
  );

  // Home Display Preferences
  const [showWalletChips, setShowWalletChips] = useState(true);
  const [showQuickLog, setShowQuickLog] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadSummary = useCallback(
    async (
      activePeriod = period,
      activeDate = referenceDate,
      mode: 'focus' | 'refresh' = 'focus',
      activeWalletId = selectedWalletId,
    ) => {
      const currentRequest = ++requestId.current;
      if (mode === 'refresh') {
        setRefreshing(true);
      }
      setError(null);

      try {
        const [
          nextSummary,
          nextWalletSummary,
          nextHabitStats,
          nextCategories,
          nextQuickLogIds,
          nextDisplayPrefs,
        ] = await Promise.all([
          getHomeSummary(
            database,
            activePeriod,
            activeDate,
            language,
            activeWalletId,
          ),
          getWalletSummary(database),
          getHabitStats(database),
          listCategories(database),
          getQuickLogCategoryIds(database),
          getHomeDisplayPreferences(database),
        ]);

        if (requestId.current !== currentRequest) {
          return;
        }

        setSummary(nextSummary);
        setWalletSummary(nextWalletSummary);
        setHabitStats(nextHabitStats);
        setAllCategories(nextCategories);
        if (nextQuickLogIds && nextQuickLogIds.length > 0) {
          setPinnedCategoryIds(nextQuickLogIds);
        }
        setShowWalletChips(nextDisplayPrefs.showWalletChips);
        setShowQuickLog(nextDisplayPrefs.showQuickLog);
        setHideBalance(nextDisplayPrefs.hideBalance);
      } catch (loadError) {
        if (requestId.current === currentRequest) {
          const mappedError = mapError(loadError, 'DATABASE_WRITE_FAILED');
          const errorMsg =
            loadError instanceof Error ? loadError.message : String(loadError);
          const isClosed =
            errorMsg.includes('closed resource') ||
            errorMsg.includes('closed database') ||
            errorMsg.includes('NativeDatabase');
          if (__DEV__ && !isClosed) {
            console.warn('Home summary load failed.', mappedError.code);
          }
          if (!isClosed) {
            setError(t.home.loadFailed);
          }
        }
      } finally {
        if (requestId.current === currentRequest) {
          setRefreshing(false);
        }
      }
    },
    [database, language, period, referenceDate, selectedWalletId, t.home.loadFailed],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSummary(period, referenceDate, 'focus', selectedWalletId);
    }, [loadSummary, period, referenceDate, selectedWalletId]),
  );

  const handlePeriodChange = useCallback(
    (newPeriod: HomePeriod) => {
      setPeriod(newPeriod);
      void loadSummary(newPeriod, referenceDate, 'focus', selectedWalletId);
    },
    [loadSummary, referenceDate, selectedWalletId],
  );

  const handleSelectWallet = useCallback(
    (walletId: number | null) => {
      setSelectedWalletId(walletId);
      void loadSummary(period, referenceDate, 'focus', walletId);
    },
    [loadSummary, period, referenceDate],
  );

  // Quick Log Customizer Gesture Modal
  const {
    backdropOpacity: quickLogBackdropOpacity,
    close: handleCloseCustomizeModal,
    open: handleOpenCustomizeModalInternal,
    panResponder: quickLogPanResponder,
    panY: quickLogPanY,
    visible: customizeModalVisible,
  } = useBottomSheetGesture();

  // Display Settings Gesture Modal
  const {
    backdropOpacity: displaySettingsBackdropOpacity,
    close: handleCloseDisplaySettingsModal,
    open: handleOpenDisplaySettingsModal,
    panResponder: displaySettingsPanResponder,
    panY: displaySettingsPanY,
    visible: displaySettingsModalVisible,
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
      if (prev.length >= 8) return prev;
      return [...prev, id];
    });
  }, []);

  const handleSaveQuickLogCategories = useCallback(async () => {
    try {
      await setQuickLogCategoryIds(database, selectedIdsInModal);
      setPinnedCategoryIds(selectedIdsInModal);
      handleCloseCustomizeModal();
    } catch (err) {
      if (__DEV__) console.warn('Could not save quick log settings', err);
    }
  }, [database, handleCloseCustomizeModal, selectedIdsInModal]);

  const handleResetQuickLogCategories = useCallback(() => {
    setSelectedIdsInModal(DEFAULT_QUICK_LOG_IDS);
  }, []);

  const handleToggleShowWalletChips = useCallback(
    (val: boolean) => {
      setShowWalletChips(val);
      void setHomeDisplayPreferences(database, { showWalletChips: val });
    },
    [database],
  );

  const handleToggleShowQuickLog = useCallback(
    (val: boolean) => {
      setShowQuickLog(val);
      void setHomeDisplayPreferences(database, { showQuickLog: val });
    },
    [database],
  );

  const handleToggleHideBalance = useCallback(() => {
    setHideBalance((prev) => {
      const next = !prev;
      void setHomeDisplayPreferences(database, { hideBalance: next });
      return next;
    });
  }, [database]);

  const handleSetHideBalance = useCallback(
    (val: boolean) => {
      setHideBalance(val);
      void setHomeDisplayPreferences(database, { hideBalance: val });
    },
    [database],
  );

  const handleSelectQuickLogCategory = useCallback(
    (category: Category) => {
      router.push({
        params: {
          categoryId: String(category.id),
          categoryName: category.name,
          type: category.type,
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

  const activeWallets = walletSummary?.wallets ?? [];

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
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() =>
              void loadSummary(period, referenceDate, 'refresh', selectedWalletId)
            }
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
        scrollEventThrottle={16}
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
              onPress={() =>
                void loadSummary(period, referenceDate, 'focus', selectedWalletId)
              }
              variant="secondary"
            />
          </View>
        ) : null}

        {/* 2.1 Unified Hero Cashflow Card (Catatku Style) */}
        {summary ? (
          <HomeSummaryCard
            hideBalance={hideBalance}
            onOpenDisplaySettings={handleOpenDisplaySettingsModal}
            onPeriodChange={handlePeriodChange}
            onToggleHideBalance={handleToggleHideBalance}
            period={period}
            summary={summary}
            t={t}
          />
        ) : null}

        {/* 2.2 Optional Sleek Horizontal Wallet Filter Chips */}
        {showWalletChips ? (
          <HomeWalletChipsBar
            language={language}
            onAddWalletPress={() => router.push('/wallets')}
            onSelectWallet={handleSelectWallet}
            selectedWalletId={selectedWalletId}
            wallets={activeWallets}
          />
        ) : null}

        {/* 2.3 Fast-Track Quick Category Log (Toggleable) */}
        {showQuickLog ? (
          <HomeQuickCategoryLog
            categories={displayedQuickLogCategories}
            onOpenCustomize={handleOpenCustomizeModal}
            onSelectCategory={handleSelectQuickLogCategory}
            t={t}
          />
        ) : null}

        {/* 2.4 Recent Transactions Timeline */}
        <HomeRecentTransactions
          currencyCode={summary?.currencyCode ?? 'IDR'}
          groupedTimeline={groupedTimeline}
          onPressTransaction={handlePressTransaction}
          onViewAll={handleViewAllTransactions}
          t={t}
        />
      </ScrollView>

      {/* Home Display Settings Bottom Sheet Modal 🎚️ */}
      <HomeDisplaySettingsModal
        backdropOpacity={displaySettingsBackdropOpacity}
        hideBalance={hideBalance}
        onClose={handleCloseDisplaySettingsModal}
        onCustomizeQuickLog={handleOpenCustomizeModal}
        onHideBalanceChange={handleSetHideBalance}
        onShowQuickLogChange={handleToggleShowQuickLog}
        onShowWalletChipsChange={handleToggleShowWalletChips}
        panResponder={displaySettingsPanResponder}
        panY={displaySettingsPanY}
        showQuickLog={showQuickLog}
        showWalletChips={showWalletChips}
        t={t}
        visible={displaySettingsModalVisible}
      />

      {/* Quick Log Customization Bottom Sheet Modal */}
      <HomeQuickLogModal
        allCategories={allCategories}
        backdropOpacity={quickLogBackdropOpacity}
        onClose={handleCloseCustomizeModal}
        onReset={handleResetQuickLogCategories}
        onSave={() => void handleSaveQuickLogCategories()}
        onToggleCategory={handleToggleModalCategory}
        panResponder={quickLogPanResponder}
        panY={quickLogPanY}
        selectedIds={selectedIdsInModal}
        t={t}
        visible={customizeModalVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl + 84,
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
