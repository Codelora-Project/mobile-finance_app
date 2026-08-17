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
      void loadSummary('focus');
    }, [loadSummary]),
  );

  if (loading && !summary) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            {t.home.loading}
          </Text>
        </View>
      </Screen>
    );
  }

  if (error && !summary) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
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

  if (!summary) return null;

  const isPositiveNet = summary.netMinor >= 0;
  const primaryGoal = goals[0] ?? null;
  const goalProgress = primaryGoal
    ? Math.min(100, Math.max(0, primaryGoal.progressPercent))
    : 0;

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
        {/* ── Top App Bar / Header ────────────────────────── */}
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
                pressed && styles.pressed,
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

        {/* ── Hero Balance Card ───────────────────────────── */}
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

          <View style={styles.summaryColRow}>
            {/* Income Column */}
            <View style={styles.summaryColItem}>
              <View style={styles.summaryColHeader}>
                <View
                  style={[
                    styles.iconCircleIncome,
                    { backgroundColor: colors.incomeBackground },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.positive}
                    name="arrow-bottom-left"
                    size={16}
                  />
                </View>
                <Text
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
                numberOfLines={1}
                style={[styles.summaryIncomeValue, { color: colors.positive }]}
              >
                {formatMoney(summary.incomeMinor, summary.currencyCode)}
              </Text>
            </View>

            {/* Expense Column */}
            <View style={styles.summaryColItem}>
              <View style={styles.summaryColHeader}>
                <View
                  style={[
                    styles.iconCircleExpense,
                    { backgroundColor: colors.expenseBackground },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.destructive}
                    name="arrow-top-right"
                    size={16}
                  />
                </View>
                <Text
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

        {/* ── 2-Column Daily Pulse Grid (Streak & Goal) ─────── */}
        <View style={styles.dailyGridRow}>
          {/* Left Mini Card: Streak */}
          <Pressable
            accessibilityRole="button"
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
            <View
              style={[
                styles.miniIconCircle,
                {
                  backgroundColor: isDark ? '#78350F' : '#FEF3C7',
                },
              ]}
            >
              <Text style={styles.miniEmoji}>
                {habitStats?.currentBadge.emoji ?? '🔥'}
              </Text>
            </View>
            <View style={styles.miniTextContent}>
              <Text
                numberOfLines={1}
                style={[styles.miniTitle, { color: colors.textPrimary }]}
              >
                {habitStats
                  ? `${habitStats.currentStreak} ${t.habits.streakDays}`
                  : `0 ${t.habits.streakDays}`}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.miniSubtitle, { color: colors.textSecondary }]}
              >
                {habitStats
                  ? t.habits.badges[habitStats.currentBadge.key] ??
                    habitStats.currentBadge.key
                  : t.habits.streakTitle}
              </Text>
            </View>
          </Pressable>

          {/* Right Mini Card: Celengan / Savings Goal */}
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push(
                primaryGoal ? `/goals/${primaryGoal.id}` : '/goals',
              )
            }
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
            {primaryGoal ? (
              <>
                <View style={styles.miniGoalTopRow}>
                  <View
                    style={[
                      styles.miniIconCircle,
                      {
                        backgroundColor: isDark
                          ? `${primaryGoal.colorKey}33`
                          : `${primaryGoal.colorKey}20`,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={primaryGoal.colorKey}
                      name={
                        (GOAL_ICONS[primaryGoal.iconKey] || 'target') as any
                      }
                      size={18}
                    />
                  </View>
                  <View
                    style={[
                      styles.miniPercentBadge,
                      {
                        backgroundColor: isDark ? '#064E3B' : '#DCFCE7',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.miniPercentText,
                        { color: colors.positive },
                      ]}
                    >
                      {goalProgress}%
                    </Text>
                  </View>
                </View>
                <View style={styles.miniTextContent}>
                  <Text
                    numberOfLines={1}
                    style={[styles.miniTitle, { color: colors.textPrimary }]}
                  >
                    {primaryGoal.name}
                  </Text>
                  <View
                    style={[
                      styles.miniProgressBarTrack,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceSecondary
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.miniProgressBarFill,
                        {
                          backgroundColor: primaryGoal.isCompleted
                            ? colors.positive
                            : primaryGoal.colorKey,
                          width: `${goalProgress}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.miniSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {formatMoney(
                      primaryGoal.currentAmountMinor,
                      summary.currencyCode,
                    )}{' '}
                    /{' '}
                    {formatMoney(
                      primaryGoal.targetAmountMinor,
                      summary.currencyCode,
                    )}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.miniIconCircle,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#EFF6FF',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.primary}
                    name="target"
                    size={20}
                  />
                </View>
                <View style={styles.miniTextContent}>
                  <Text
                    numberOfLines={1}
                    style={[styles.miniTitle, { color: colors.textPrimary }]}
                  >
                    {t.goals.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.miniSubtitle, { color: colors.primary }]}
                  >
                    + {t.goals.createFirstGoal}
                  </Text>
                </View>
              </>
            )}
          </Pressable>
        </View>

        {/* ── Spending by Category Card ──────────────────── */}
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
              accessibilityRole="header"
              style={[
                styles.integratedCardTitle,
                { color: colors.textPrimary },
              ]}
            >
              {t.home.spendingByCategory}
            </Text>
            <Pressable hitSlop={8} onPress={() => router.push('/analytics')}>
              <View style={styles.cardHeaderLink}>
                <Text
                  style={[
                    styles.cardHeaderLinkText,
                    { color: colors.primary },
                  ]}
                >
                  {t.budgets.manageBudgets}
                </Text>
                <MaterialCommunityIcons
                  color={colors.primary}
                  name="chevron-right"
                  size={16}
                />
              </View>
            </Pressable>
          </View>

          {summary.categoryTotals.length === 0 ? (
            <Text
              style={[
                styles.emptySectionText,
                { color: colors.textSecondary, paddingVertical: spacing.md },
              ]}
            >
              {t.home.noExpensesThisMonth}
            </Text>
          ) : (
            <View style={styles.integratedCategoryList}>
              {summary.categoryTotals.slice(0, 4).map((category) => {
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
                    style={styles.categoryItemWrap}
                  >
                    <View style={styles.categoryItemRow}>
                      <View style={styles.categoryLeftPart}>
                        <View
                          style={[
                            styles.categoryIconCircle,
                            { backgroundColor: meta.backgroundColor },
                          ]}
                        >
                          <MaterialCommunityIcons
                            color={meta.color}
                            name={meta.icon}
                            size={18}
                          />
                        </View>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.categoryItemName,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {category.categoryName}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.categoryItemAmount,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {formatMoney(
                          category.amountMinor,
                          summary.currencyCode,
                        )}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.categoryProgressTrack,
                        {
                          backgroundColor: isDark
                            ? colors.surfaceSecondary
                            : '#F1F5F9',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.categoryProgressBar,
                          {
                            backgroundColor:
                              catBudget?.status === 'overbudget'
                                ? colors.destructive
                                : meta.color,
                            width: `${Math.max(percentage, 4)}%`,
                          },
                        ]}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Recent Transactions Card ────────────────────── */}
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
              accessibilityRole="header"
              style={[
                styles.integratedCardTitle,
                { color: colors.textPrimary },
              ]}
            >
              {t.home.recentTransactions}
            </Text>
            {summary.recentTransactions.length > 0 ? (
              <Pressable hitSlop={8} onPress={() => router.push('/transactions')}>
                <View style={styles.cardHeaderLink}>
                  <Text
                    style={[
                      styles.cardHeaderLinkText,
                      { color: colors.primary },
                    ]}
                  >
                    {t.home.viewAll}
                  </Text>
                  <MaterialCommunityIcons
                    color={colors.primary}
                    name="chevron-right"
                    size={16}
                  />
                </View>
              </Pressable>
            ) : null}
          </View>

          {summary.recentTransactions.length === 0 ? (
            <View style={styles.emptyRecentInside}>
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="receipt-text-plus-outline"
                size={32}
              />
              <Text
                style={[
                  styles.emptySectionText,
                  { color: colors.textSecondary, marginTop: spacing.xs },
                ]}
              >
                {t.home.noTransactionsYet}
              </Text>
              <View style={styles.emptyActionSmall}>
                <AppButton
                  label={t.home.addFirstTransaction}
                  onPress={() => router.push('/transactions/new')}
                  variant="secondary"
                />
              </View>
            </View>
          ) : (
            <View style={styles.recentListWrap}>
              {summary.recentTransactions.map((transaction) => {
                const title = transactionTitle(transaction, language);
                const meta = getCategoryMeta(
                  transaction.categoryName,
                  transaction.type,
                  isDark,
                );
                const isExpense = transaction.type === 'expense';

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
                      styles.recentRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.recentIconCircle,
                        { backgroundColor: meta.backgroundColor },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={meta.color}
                        name={meta.icon}
                        size={20}
                      />
                    </View>

                    <View style={styles.recentInfo}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.recentTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {title}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.recentSubtext,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {formatTransactionDate(
                          transaction.localDate,
                          language,
                        )}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.recentAmount,
                        {
                          color: isExpense
                            ? colors.textPrimary
                            : colors.positive,
                        },
                      ]}
                    >
                      {isExpense ? '−' : '+'}
                      {formatMoney(
                        transaction.amountMinor,
                        transaction.currencyCode,
                      )}
                    </Text>
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
  cardDivider: {
    height: 1,
    marginVertical: spacing.sm,
    width: '100%',
  },
  cardHeaderLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  cardHeaderLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  categoryItemAmount: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  categoryItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  categoryItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryItemWrap: {
    gap: 6,
  },
  categoryLeftPart: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  categoryProgressBar: {
    borderRadius: radius.pill,
    height: '100%',
  },
  categoryProgressTrack: {
    borderRadius: radius.pill,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  content: {
    gap: spacing.md + 2,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  dailyGridRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
  },
  emptyActionSmall: {
    marginTop: spacing.sm,
    width: '80%',
  },
  emptyRecentInside: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptySectionText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  greeting: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
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
    gap: spacing.sm,
  },
  headerTitles: {
    gap: 2,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  heroBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 3,
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    padding: spacing.md + 2,
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  heroHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroNetLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  iconCircleExpense: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  iconCircleIncome: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  integratedCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 2,
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md + 2,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  integratedCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  integratedCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  integratedCategoryList: {
    gap: spacing.md,
  },
  miniEmoji: {
    fontSize: 20,
  },
  miniGoalTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  miniIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  miniPercentBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  miniPercentText: {
    fontSize: 11,
    fontWeight: '800',
  },
  miniProgressBarFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  miniProgressBarTrack: {
    borderRadius: radius.pill,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  miniSubtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  miniTextContent: {
    gap: 3,
    marginTop: spacing.xs,
  },
  miniTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  miniWidgetCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 2,
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.md,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
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
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.75,
  },
  recentAmount: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  recentIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  recentInfo: {
    flex: 1,
    gap: 2,
  },
  recentListWrap: {
    gap: spacing.sm + 2,
  },
  recentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  recentSubtext: {
    fontSize: 12,
    fontWeight: '500',
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  settingsHeaderBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  stateAction: {
    marginTop: spacing.lg,
    width: '100%',
  },
  stateContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  stateText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  summaryColHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  summaryColItem: {
    flex: 1,
    gap: 2,
  },
  summaryColLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  summaryExpenseValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  summaryIncomeValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
});
