import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  createTransaction,
  deleteTransaction,
  type SaveTransactionInput,
  type TransactionListItem,
} from '@/features/transactions/transaction-repository';
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

  const { feedback, undoCreatedId, undoPayload } = useLocalSearchParams<{
    feedback?: string | string[];
    undoCreatedId?: string;
    undoPayload?: string;
  }>();
  const feedbackMessage = Array.isArray(feedback) ? feedback[0] : feedback;

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [undoCreatedTransactionId, setUndoCreatedTransactionId] = useState<number | null>(null);
  const [undoDeletedPayload, setUndoDeletedPayload] = useState<SaveTransactionInput | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (feedbackMessage) {
      setToastMessage(feedbackMessage);
      if (undoCreatedId) {
        setUndoCreatedTransactionId(Number(undoCreatedId));
        setUndoDeletedPayload(null);
      } else if (undoPayload) {
        try {
          const parsed = JSON.parse(undoPayload) as SaveTransactionInput;
          setUndoDeletedPayload(parsed);
          setUndoCreatedTransactionId(null);
        } catch {
          setUndoDeletedPayload(null);
        }
      } else {
        setUndoCreatedTransactionId(null);
        setUndoDeletedPayload(null);
      }
      setToastVisible(true);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastVisible(false);
      }, 5000);
    }
  }, [feedbackMessage, undoCreatedId, undoPayload]);

  const handleUndo = useCallback(async () => {
    if (isUndoing) return;
    setIsUndoing(true);
    try {
      if (undoCreatedTransactionId) {
        await deleteTransaction(database, undoCreatedTransactionId);
        setUndoCreatedTransactionId(null);
        setToastMessage(
          language === 'id'
            ? 'Penambahan transaksi dibatalkan'
            : 'Transaction addition undone',
        );
      } else if (undoDeletedPayload) {
        await createTransaction(database, undoDeletedPayload);
        setUndoDeletedPayload(null);
        setToastMessage(
          language === 'id'
            ? 'Transaksi berhasil dipulihkan'
            : 'Transaction restored',
        );
      }
      void loadSummary(period, referenceDate, 'refresh');
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastVisible(false);
      }, 2500);
    } catch (err) {
      if (__DEV__) console.warn('Could not execute undo action', err);
    } finally {
      setIsUndoing(false);
    }
  }, [database, isUndoing, language, loadSummary, period, referenceDate, undoCreatedTransactionId, undoDeletedPayload]);

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
              style={[styles.summaryDivider, { backgroundColor: colors.border }]}
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
                    : `− ${formatMoney(Math.abs(summary.netMinor), summary.currencyCode)}`}
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
                {language === 'id' ? 'Catat Cepat' : 'Quick Log'}
              </Text>
            </View>
            <Text
              style={[
                styles.quickLogSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              {language === 'id'
                ? 'Pilih kategori untuk langsung catat'
                : 'Tap to record instantly'}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.quickLogList}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {[
              {
                id: 1,
                label: language === 'id' ? 'Makan' : 'Food',
                name: 'Food & Drink',
              },
              {
                id: 2,
                label: language === 'id' ? 'Transport' : 'Transport',
                name: 'Transportation',
              },
              {
                id: 3,
                label: language === 'id' ? 'Belanja' : 'Shopping',
                name: 'Shopping',
              },
              {
                id: 4,
                label: language === 'id' ? 'Tagihan' : 'Bills',
                name: 'Bills',
              },
              {
                id: 5,
                label: language === 'id' ? 'Hiburan' : 'Fun',
                name: 'Entertainment',
              },
            ].map((cat) => {
              const meta = getCategoryMeta(cat.name, 'expense', isDark);
              return (
                <Pressable
                  accessibilityLabel={`Catat ${cat.label}`}
                  accessibilityRole='button'
                  key={cat.name}
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
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}

            {/* Custom / Lainnya */}
            <Pressable
              accessibilityLabel={language === 'id' ? 'Catat Lainnya' : 'Other'}
              accessibilityRole='button'
              onPress={() => router.push('/transactions/new')}
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
                  name='plus'
                  size={22}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.quickLogLabel,
                  { color: colors.primary, fontWeight: '700' },
                ]}
              >
                {language === 'id' ? '+ Lainnya' : '+ Other'}
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

        {/* 2.4 MINI WIDGETS: STREAK & GOALS */}
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

        {/* 2.5 CATEGORY SPENDING BREAKDOWN */}
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
      </ScrollView>

      {/* Modern Floating Undo Toast on Home */}
      {toastVisible && toastMessage ? (
        <View
          style={[
            styles.floatingUndoToast,
            {
              backgroundColor: isDark ? '#1E293B' : '#0F172A',
              borderColor: isDark ? '#334155' : '#1E293B',
            },
          ]}
        >
          <View style={styles.undoToastLeft}>
            <MaterialCommunityIcons
              color='#38BDF8'
              name='information-outline'
              size={20}
            />
            <Text
              accessibilityLiveRegion='polite'
              numberOfLines={1}
              style={styles.undoToastText}
            >
              {toastMessage}
            </Text>
          </View>

          {undoCreatedTransactionId || undoDeletedPayload ? (
            <Pressable
              accessibilityLabel='Undo action'
              accessibilityRole='button'
              disabled={isUndoing}
              hitSlop={8}
              onPress={() => void handleUndo()}
              style={({ pressed }) => [
                styles.undoButton,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color='#FBBF24'
                name='undo-variant'
                size={16}
              />
              <Text style={styles.undoButtonText}>
                {language === 'id' ? 'BATALKAN' : 'UNDO'}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityLabel='Close notification'
            accessibilityRole='button'
            hitSlop={8}
            onPress={() => setToastVisible(false)}
            style={styles.closeToastBtn}
          >
            <MaterialCommunityIcons
              color='#94A3B8'
              name='close'
              size={18}
            />
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  quickLogCard: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
    borderRadius: 18,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  quickLogItem: {
    alignItems: 'center',
    gap: 6,
    width: 62,
  },
  quickLogLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickLogList: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingVertical: 2,
  },
  quickLogSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  quickLogTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  quickLogTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
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
    paddingBottom: 130,
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
  cleanHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  pressed: {
    opacity: 0.75,
  },
  settingsButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  summaryPeriodLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
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
  closeToastBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
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