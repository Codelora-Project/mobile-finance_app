import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Pressable,
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
import type { CategoryBudget } from '@/features/budgets/budget-repository';
import { listCategoryBudgets } from '@/features/budgets/budget-repository';
import { getCategoryMeta } from '@/features/categories/category-meta';
import {
  listCategories,
  type Category,
} from '@/features/categories/category-repository';
import type { SavingsGoal } from '@/features/goals/goals-repository';
import { listSavingsGoals } from '@/features/goals/goals-repository';
import type { HabitStats } from '@/features/habits/habit-repository';
import { getHabitStats } from '@/features/habits/habit-repository';
import {
  getHomeSummary,
  shiftPeriodDate,
  type HomePeriod,
  type HomeSummary,
} from '@/features/home/home-repository';
import {
  getQuickLogCategoryIds,
  setQuickLogCategoryIds,
} from '@/features/settings/settings-repository';
import { useUndoTransaction } from '@/features/transactions/hooks/use-undo-transaction';
import {
  type TransactionListItem,
} from '@/features/transactions/transaction-repository';

import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney, formatSignedMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

function formatGroupDate(localDate: string, language: string) {
  const [year, month, day] = localDate.split('-').map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  return date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
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
  const [allCategories, setAllCategories] = useState<readonly Category[]>([
    {
      createdAt: Date.now(),
      iconKey: null,
      id: 1,
      isDefault: true,
      isFallback: false,
      name: 'Food & Drink',
      sortOrder: 1,
      systemKey: 'expense_food',
      type: 'expense',
      updatedAt: Date.now(),
    },
    {
      createdAt: Date.now(),
      iconKey: null,
      id: 2,
      isDefault: true,
      isFallback: false,
      name: 'Transportation',
      sortOrder: 2,
      systemKey: 'expense_transportation',
      type: 'expense',
      updatedAt: Date.now(),
    },
    {
      createdAt: Date.now(),
      iconKey: null,
      id: 3,
      isDefault: true,
      isFallback: false,
      name: 'Shopping',
      sortOrder: 3,
      systemKey: 'expense_shopping',
      type: 'expense',
      updatedAt: Date.now(),
    },
    {
      createdAt: Date.now(),
      iconKey: null,
      id: 4,
      isDefault: true,
      isFallback: false,
      name: 'Bills',
      sortOrder: 4,
      systemKey: 'expense_bills',
      type: 'expense',
      updatedAt: Date.now(),
    },
    {
      createdAt: Date.now(),
      iconKey: null,
      id: 5,
      isDefault: true,
      isFallback: false,
      name: 'Entertainment',
      sortOrder: 5,
      systemKey: 'expense_entertainment',
      type: 'expense',
      updatedAt: Date.now(),
    },
  ]);
  const [pinnedCategoryIds, setPinnedCategoryIds] = useState<number[]>([
    1, 2, 3, 4, 5,
  ]);
  const [selectedIdsInModal, setSelectedIdsInModal] = useState<number[]>([
    1, 2, 3, 4, 5,
  ]);
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
        const [
          nextSummary,
          nextGoals,
          nextHabits,
          nextBudgets,
          nextCategories,
          nextQuickLogIds,
        ] = await Promise.all([
          getHomeSummary(database, activePeriod, activeDate, language),
          listSavingsGoals(database).catch(() => []),
          getHabitStats(database).catch(() => null),
          listCategoryBudgets(database).catch(() => []),
          listCategories(database, 'expense').catch(() => []),
          getQuickLogCategoryIds(database).catch(() => [1, 2, 3, 4, 5]),
        ]);

        if (requestId.current === currentRequest) {
          setSummary(nextSummary);
          setGoals(nextGoals);
          setHabitStats(nextHabits);
          setCategoryBudgets(nextBudgets);
          if (nextCategories && nextCategories.length > 0) {
            setAllCategories(nextCategories);
          }
          if (nextQuickLogIds && nextQuickLogIds.length > 0) {
            setPinnedCategoryIds(nextQuickLogIds);
          }
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

  const handlePeriodChange = (newPeriod: HomePeriod) => {
    setPeriod(newPeriod);
    void loadSummary(newPeriod, referenceDate, 'focus');
  };

  const {
    backdropOpacity,
    close: handleCloseCustomizeModal,
    open: handleOpenCustomizeModalInternal,
    panResponder,
    panY,
    visible: customizeModalVisible,
  } = useBottomSheetGesture();

  const handleOpenCustomizeModal = () => {
    setSelectedIdsInModal(pinnedCategoryIds);
    handleOpenCustomizeModalInternal();
  };

  const handleToggleModalCategory = (id: number) => {
    setSelectedIdsInModal((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  const handleSaveQuickLogCategories = async () => {
    try {
      await setQuickLogCategoryIds(database, selectedIdsInModal);
      setPinnedCategoryIds(selectedIdsInModal);
      handleCloseCustomizeModal();
    } catch (err) {
      if (__DEV__) console.warn('Could not save quick log categories', err);
    }
  };

  const handleResetQuickLogCategories = () => {
    const defaultIds = [1, 2, 3, 4, 5];
    setSelectedIdsInModal(defaultIds);
  };

  const displayedQuickLogCategories = useMemo(() => {
    const map = new Map(allCategories.map((c) => [c.id, c]));
    const list: Category[] = [];
    for (const id of pinnedCategoryIds) {
      const found = map.get(id);
      if (found) list.push(found);
    }
    return list.length > 0 ? list : allCategories.slice(0, 5);
  }, [allCategories, pinnedCategoryIds]);

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

  return (
    <Screen>
      {/* 1. CLEAN MODERN TOP HEADER */}
      <View
        style={[
          styles.cleanHeader,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text
            style={[styles.headerGreeting, { color: colors.textSecondary }]}
          >
            {t.home.greeting}
          </Text>
          <Text
            accessibilityRole='header'
            style={[styles.headerTitle, { color: colors.textPrimary }]}
          >
            {t.home.appTitle}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          {/* Flame Streak Badge */}
          <View
            style={[
              styles.streakBadge,
              {
                backgroundColor: isDark ? '#78350F' : '#FEF3C7',
                borderColor: isDark ? '#92400E' : '#FDE68A',
              },
            ]}
          >
            <MaterialCommunityIcons
              color='#F59E0B'
              name='fire'
              size={18}
            />
            <Text
              style={[
                styles.streakBadgeText,
                { color: isDark ? '#FDE68A' : '#B45309' },
              ]}
            >
              {habitStats?.currentStreak ?? 0} {t.habits.streakDays}
            </Text>
          </View>

          <Pressable
            accessibilityLabel={t.tabs.settings}
            accessibilityRole='button'
            hitSlop={8}
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.settingsButton,
              {
                backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
                borderColor: colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name='cog-outline'
              size={22}
            />
          </Pressable>
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
            {/* Hero: Total Expenses + Card-Level Period Toggle */}
            <View style={styles.summaryTopRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.summaryCardSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.home.expensesThisMonth}
                </Text>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  numberOfLines={1}
                  style={[
                    styles.summaryNetValue,
                    { color: colors.textPrimary },
                  ]}
                >
                  {formatMoney(summary.expenseMinor, summary.currencyCode)}
                </Text>
                <Text
                  style={[
                    styles.summaryPeriodLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {summary.periodLabel}
                </Text>
              </View>

              {/* Compact Period Switcher [Harian | Bulanan] */}
              <View
                style={[
                  styles.cardPeriodToggle,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                    borderColor: colors.border,
                  },
                ]}
              >
                {(
                  [
                    { key: 'daily', label: t.home.periodDaily },
                    { key: 'monthly', label: t.home.periodMonthly },
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
                        styles.cardPeriodBtn,
                        isSelected
                          ? [
                              styles.cardPeriodBtnActive,
                              {
                                backgroundColor: colors.primary,
                              },
                            ]
                          : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cardPeriodBtnText,
                          {
                            color: isSelected
                              ? '#FFFFFF'
                              : colors.textSecondary,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View
              style={[
                styles.summaryDivider,
                { backgroundColor: colors.border },
              ]}
            />

            {/* Income & Total Net 2-Column Split */}
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

              {/* Total Balance / Sisa Saldo */}
              <View style={styles.summaryColItem}>
                <View style={styles.summaryColHeader}>
                  <View
                    style={[
                      styles.iconCircleExpense,
                      {
                        backgroundColor: isDark
                          ? summary.netMinor >= 0
                            ? '#1E3A8A'
                            : '#7F1D1D'
                          : summary.netMinor >= 0
                            ? '#EFF6FF'
                            : '#FEE2E2',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={
                        summary.netMinor >= 0
                          ? colors.primary
                          : colors.destructive
                      }
                      name='scale-balance'
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
                    {t.home.totalBalance}
                  </Text>
                </View>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  numberOfLines={1}
                  style={[
                    styles.summaryExpenseValue,
                    {
                      color:
                        summary.netMinor >= 0
                          ? colors.textPrimary
                          : colors.destructive,
                    },
                  ]}
                >
                  {summary.netMinor >= 0
                    ? formatMoney(summary.netMinor, summary.currencyCode)
                    : `−${formatMoney(
                        Math.abs(summary.netMinor),
                        summary.currencyCode,
                      )}`}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* 2.2 QUICK CATEGORY LOG (Fast-Track Recording) */}
        <View
          style={[
            styles.quickLogCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.textPrimary,
            },
          ]}
        >
          <View style={styles.quickLogHeader}>
            <View style={styles.quickLogTitleCol}>
              <View style={styles.quickLogTitleRow}>
                <MaterialCommunityIcons
                  color={colors.primary}
                  name='lightning-bolt'
                  size={18}
                />
                <Text
                  style={[
                    styles.quickLogTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t.home.quickLogTitle}
                </Text>
              </View>
              <Text
                style={[
                  styles.quickLogSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {t.home.quickLogSubtitle}
              </Text>
            </View>

            {/* Customize / Atur Button */}
            <Pressable
              accessibilityLabel={t.home.quickLogCustomize}
              accessibilityRole='button'
              hitSlop={8}
              onPress={handleOpenCustomizeModal}
              style={({ pressed }) => [
                styles.customizeQuickLogBtn,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
                  borderColor: colors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={colors.primary}
                name='tune-variant'
                size={14}
              />
              <Text
                style={[
                  styles.customizeQuickLogText,
                  { color: colors.primary },
                ]}
              >
                {t.home.quickLogCustomize}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.quickLogList}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {displayedQuickLogCategories.map((cat) => {
              const meta = getCategoryMeta(cat.name, 'expense', isDark);
              return (
                <Pressable
                  accessibilityLabel={`Catat ${cat.name}`}
                  accessibilityRole='button'
                  key={cat.id}
                  onPress={() =>
                    router.push({
                      params: {
                        categoryId: String(cat.id),
                        categoryName: cat.name,
                        type: 'expense',
                      },
                      pathname: '/transactions/new',
                    })
                  }
                  style={({ pressed }) => [
                    styles.quickLogItem,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.quickLogIconCircle,
                      { backgroundColor: meta.backgroundColor },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={meta.color}
                      name={meta.icon}
                      size={22}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.quickLogLabel,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}

            {/* + Atur / Customize Chip */}
            <Pressable
              accessibilityLabel={t.home.quickLogCustomize}
              accessibilityRole='button'
              onPress={handleOpenCustomizeModal}
              style={({ pressed }) => [
                styles.quickLogItem,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.quickLogIconCircle,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                    borderColor: isDark ? colors.border : '#CBD5E1',
                    borderStyle: 'dashed',
                    borderWidth: 1.5,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.primary}
                  name='cog-outline'
                  size={20}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.quickLogLabel,
                  { color: colors.primary, fontWeight: '700' },
                ]}
              >
                {t.home.quickLogCustomize}
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* 2.3 TIMELINE TREE LIST: RECENT TRANSACTIONS */}
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
                      const title =
                        item.counterparty?.trim() || item.categoryName;

                      return (
                        <Pressable
                          accessibilityLabel={`${title}, ${formatMoney(
                            item.amountMinor,
                            item.currencyCode,
                          )}`}
                          accessibilityRole='button'
                          key={item.id}
                          onPress={() =>
                            router.push(`/transactions/${item.id}`)
                          }
                          style={({ pressed }) => [
                            styles.timelineRow,
                            pressed && styles.pressed,
                          ]}
                        >
                          {/* Timeline Dot & Line */}
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

                          {/* Content */}
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
                                {item.type === 'expense' ? '−' : '+'}
                                {formatMoney(
                                  item.amountMinor,
                                  item.currencyCode,
                                )}
                              </Text>
                            </View>

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
                                    styles.receiptPill,
                                    {
                                      backgroundColor: isDark
                                        ? '#312E81'
                                        : '#EDE9FE',
                                      borderColor: isDark
                                        ? '#4338CA'
                                        : '#DDD6FE',
                                    },
                                  ]}
                                >
                                  <MaterialCommunityIcons
                                    color='#7C3AED'
                                    name='receipt-outline'
                                    size={10}
                                  />
                                  <Text style={styles.receiptPillText}>
                                    {t.home.receiptBadge}
                                  </Text>
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

      {/* Quick Log Customization Bottom Sheet Modal */}
      <Modal
        animationType='none'
        onRequestClose={handleCloseCustomizeModal}
        transparent
        visible={customizeModalVisible}
      >
        <View style={styles.modalRoot}>
          {/* Static Fade Backdrop (fades away without sliding down) */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.modalBackdrop,
              {
                opacity: backdropOpacity,
              },
            ]}
          >
            <Pressable
              accessibilityLabel='Close modal'
              onPress={handleCloseCustomizeModal}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Animated Sliding Bottom Sheet */}
          <Animated.View
            style={[
              styles.customizeModalSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                transform: [{ translateY: panY }],
              },
            ]}
          >
            {/* Sheet Handle (Drag to dismiss area) */}
            <View
              {...panResponder.panHandlers}
              style={styles.sheetHandleWrap}
            >
              <View
                style={[
                  styles.sheetHandle,
                  { backgroundColor: isDark ? '#475569' : '#CBD5E1' },
                ]}
              />
            </View>

            {/* Modal Header (Drag to dismiss area) */}
            <View
              {...panResponder.panHandlers}
              style={styles.customizeModalHeader}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.customizeModalTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t.home.quickLogModalTitle}
                </Text>
                <Text
                  style={[
                    styles.customizeModalSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.home.quickLogModalDesc}
                </Text>
              </View>
              <Pressable
                accessibilityLabel='Close modal'
                hitSlop={8}
                onPress={handleCloseCustomizeModal}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name='close'
                  size={22}
                />
              </Pressable>
            </View>

            {/* Category Checkbox List */}
            <ScrollView
              contentContainerStyle={styles.categorySelectList}
              style={{ maxHeight: 320 }}
            >
              {allCategories.map((cat) => {
                const isSelected = selectedIdsInModal.includes(cat.id);
                const meta = getCategoryMeta(cat.name, 'expense', isDark);

                return (
                  <Pressable
                    accessibilityRole='checkbox'
                    accessibilityState={{ checked: isSelected }}
                    key={cat.id}
                    onPress={() => handleToggleModalCategory(cat.id)}
                    style={({ pressed }) => [
                      styles.categorySelectRow,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? '#1E3A8A'
                            : '#EFF6FF'
                          : isDark
                            ? colors.surfaceSecondary
                            : '#F8FAFC',
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.categorySelectLeft}>
                      <View
                        style={[
                          styles.categorySelectIcon,
                          { backgroundColor: meta.backgroundColor },
                        ]}
                      >
                        <MaterialCommunityIcons
                          color={meta.color}
                          name={meta.icon}
                          size={20}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categorySelectName,
                          {
                            color: isSelected
                              ? colors.primary
                              : colors.textPrimary,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </View>

                    <MaterialCommunityIcons
                      color={isSelected ? colors.primary : colors.textSecondary}
                      name={
                        isSelected
                          ? 'checkbox-marked-circle'
                          : 'checkbox-blank-circle-outline'
                      }
                      size={24}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <Pressable
                accessibilityRole='button'
                onPress={handleResetQuickLogCategories}
                style={[styles.modalResetBtn, { borderColor: colors.border }]}
              >
                <Text
                  style={[
                    styles.modalResetBtnText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.home.quickLogModalReset}
                </Text>
              </Pressable>

              <View style={{ flex: 1 }}>
                <AppButton
                  label={t.home.quickLogModalSave}
                  onPress={() => void handleSaveQuickLogCategories()}
                  variant='primary'
                />
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Modern Floating Undo Toast on Home */}
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
  cardHeaderLink: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  cardPeriodBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cardPeriodBtnActive: {
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardPeriodBtnText: {
    fontSize: 11,
  },
  cardPeriodToggle: {
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 2,
    padding: 3,
  },
  categorySelectIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  categorySelectLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categorySelectList: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categorySelectName: {
    fontSize: 14,
  },
  categorySelectRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  cleanHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  closeToastBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: 130,
  },
  customizeModalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  customizeModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    width: '100%',
  },
  customizeModalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  customizeModalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  customizeQuickLogBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  customizeQuickLogText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyStateSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyTransactionsWrap: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.lg,
  },
  errorCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  errorCardText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  floatingUndoToast: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: spacing.lg,
    elevation: 8,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    left: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    position: 'absolute',
    right: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    zIndex: 999,
  },
  headerGreeting: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerRightActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
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
    borderRadius: 20,
    borderWidth: 1,
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
    justifyContent: 'space-between',
  },
  integratedCardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalActionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalResetBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  modalResetBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
  quickLogCard: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    gap: spacing.sm + 2,
    padding: spacing.md,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  quickLogHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickLogIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  quickLogItem: {
    alignItems: 'center',
    gap: 6,
    width: 68,
  },
  quickLogLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickLogList: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  quickLogSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  quickLogTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  quickLogTitleCol: {
    flex: 1,
  },
  quickLogTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  receiptPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  receiptPillText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '700',
  },
  settingsButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  sheetHandle: {
    borderRadius: radius.pill,
    height: 4,
    width: 36,
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  streakBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    gap: spacing.md,
    marginTop: 0,
    padding: spacing.md + 2,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  summaryCardSubtitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryColHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  summaryColItem: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  summaryColLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryColsRow: {
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
  summaryPeriodLabel: {
    fontSize: 12,
    fontWeight: '600',
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
  undoButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  undoButtonText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  undoToastLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs + 2,
    minWidth: 0,
  },
  undoToastText: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
});
