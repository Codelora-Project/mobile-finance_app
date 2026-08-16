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
import { getCategoryMeta } from '@/features/categories/category-meta';
import {
  getHomeSummary,
  type HomeSummary,
} from '@/features/home/home-repository';
import type { TransactionListItem } from '@/features/transactions/transaction-repository';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import type { Language } from '@/lib/i18n/translations';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

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

function formatNet(amountMinor: number, currencyCode: string) {
  if (amountMinor < 0) {
    return `−${formatMoney(Math.abs(amountMinor), currencyCode)}`;
  }
  if (amountMinor > 0) {
    return `+${formatMoney(amountMinor, currencyCode)}`;
  }
  return formatMoney(0, currencyCode);
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
        const nextSummary = await getHomeSummary(database);
        if (requestId.current === currentRequest) {
          setSummary(nextSummary);
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
      void loadSummary();
      return () => {
        requestId.current += 1;
      };
    }, [loadSummary]),
  );

  if (loading && !summary) {
    return (
      <Screen>
        <View style={styles.centeredState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            {t.home.loading}
          </Text>
        </View>
      </Screen>
    );
  }

  if (!summary) {
    return (
      <Screen>
        <View style={styles.centeredState}>
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

  const isPositiveNet = summary.netMinor >= 0;

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
        {/* Header Section */}
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
              size={18}
            />
            <Text style={[styles.month, { color: colors.primary }]}>
              {formatMonth(summary.monthStart, language)}
            </Text>
          </View>
        </View>

        {error ? (
          <Text
            accessibilityLiveRegion="assertive"
            style={[
              styles.errorBanner,
              {
                backgroundColor: isDark ? '#450A0A' : '#FEF3F2',
                borderColor: isDark ? '#7F1D1D' : '#FECDCA',
                color: colors.destructive,
              },
            ]}
          >
            {error}
          </Text>
        ) : null}

        {/* Hero Card: Financial Balance & Income/Expense Pill */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.textPrimary,
            },
          ]}
        >
          <View style={styles.heroHeader}>
            <View style={styles.heroLabelRow}>
              <View
                style={[
                  styles.heroIconBubble,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#EFF6FF',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.primary}
                  name="wallet-outline"
                  size={18}
                />
              </View>
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
            {formatNet(summary.netMinor, summary.currencyCode)}
          </Text>

          <View
            style={[styles.cardDivider, { backgroundColor: colors.border }]}
          />

          <View style={styles.summaryRows}>
            {/* Income Row */}
            <View style={styles.summaryRowItem}>
              <View style={styles.summaryRowLeft}>
                <View
                  style={[
                    styles.iconCircleIncome,
                    { backgroundColor: isDark ? '#14532D' : '#DCFCE7' },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.positive}
                    name="arrow-bottom-left"
                    size={20}
                  />
                </View>
                <Text
                  style={[
                    styles.summaryRowLabel,
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

            {/* Expense Row */}
            <View style={styles.summaryRowItem}>
              <View style={styles.summaryRowLeft}>
                <View
                  style={[
                    styles.iconCircleExpense,
                    { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.destructive}
                    name="arrow-top-right"
                    size={20}
                  />
                </View>
                <Text
                  style={[
                    styles.summaryRowLabel,
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

        {/* Quick Action Buttons */}
        <View style={styles.quickActionsContainer}>
          <Pressable
            accessibilityLabel={t.home.quickAddTransaction}
            accessibilityRole="button"
            onPress={() => router.push('/transactions/new')}
            style={({ pressed }) => [
              styles.quickActionButtonPrimary,
              { backgroundColor: colors.primary },
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.quickActionIconCirclePrimary}>
              <MaterialCommunityIcons color="#FFFFFF" name="plus" size={22} />
            </View>
            <Text style={styles.quickActionTextPrimary}>
              {t.home.quickAddTransaction}
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel={t.home.quickScanReceipt}
            accessibilityRole="button"
            onPress={() => router.push('/receipt/camera')}
            style={({ pressed }) => [
              styles.quickActionButtonSecondary,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              pressed ? styles.pressed : null,
            ]}
          >
            <View
              style={[
                styles.quickActionIconCircleSecondary,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#EFF6FF',
                },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.primary}
                name="camera-outline"
                size={20}
              />
            </View>
            <Text
              style={[
                styles.quickActionTextSecondary,
                { color: colors.textPrimary },
              ]}
            >
              {t.home.quickScanReceipt}
            </Text>
          </Pressable>
        </View>

        {/* Spending by Category Section */}
        <View style={styles.section}>
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: colors.textPrimary }]}
          >
            {t.home.spendingByCategory}
          </Text>
          {summary.categoryTotals.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptySectionText,
                  { color: colors.textSecondary },
                ]}
              >
                {t.home.noExpensesThisMonth}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: colors.textPrimary,
                },
              ]}
            >
              {summary.categoryTotals.map((category) => {
                const meta = getCategoryMeta(
                  category.categoryName,
                  'expense',
                  isDark,
                );
                const percentage =
                  summary.expenseMinor === 0
                    ? 0
                    : Math.round(
                        (category.amountMinor / summary.expenseMinor) * 100,
                      );
                return (
                  <View
                    accessibilityLabel={`${category.categoryName}, ${formatMoney(
                      category.amountMinor,
                      summary.currencyCode,
                    )}, ${percentage}% ${t.home.ofExpenses}`}
                    accessible
                    key={category.categoryId}
                    style={styles.categoryRow}
                  >
                    <View
                      style={[
                        styles.categoryIconBadge,
                        { backgroundColor: meta.backgroundColor },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={meta.color}
                        name={meta.icon}
                        size={22}
                      />
                    </View>
                    <View style={styles.categoryInfo}>
                      <View style={styles.categoryLabels}>
                        <View style={styles.categoryTitleGroup}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.categoryName,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {category.categoryName}
                          </Text>
                          <View
                            style={[
                              styles.percentBadge,
                              {
                                backgroundColor: isDark
                                  ? colors.surfaceSecondary
                                  : '#E2E8F0',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.percentText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {percentage}%
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.categoryAmount,
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
                          styles.barTrack,
                          {
                            backgroundColor: isDark
                              ? colors.surfaceSecondary
                              : '#F1F5F9',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.barFill,
                            {
                              backgroundColor: meta.color,
                              width: `${Math.max(percentage, 4)}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              accessibilityRole="header"
              style={[styles.sectionTitle, { color: colors.textPrimary }]}
            >
              {t.home.recentTransactions}
            </Text>
            {summary.recentTransactions.length > 0 ? (
              <AppButton
                label={t.home.viewAll}
                onPress={() => router.push('/transactions')}
                variant="ghost"
              />
            ) : null}
          </View>
          {summary.recentTransactions.length === 0 ? (
            <View
              style={[
                styles.emptyRecentCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: colors.textPrimary,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="receipt-text-plus-outline"
                  size={36}
                />
              </View>
              <Text
                style={[
                  styles.emptySectionTitle,
                  { color: colors.textPrimary },
                ]}
              >
                {t.home.noTransactionsYet}
              </Text>
              <Text
                style={[
                  styles.emptySectionText,
                  { color: colors.textSecondary },
                ]}
              >
                {t.home.noTransactionsDesc}
              </Text>
              <View style={styles.emptyAction}>
                <AppButton
                  label={t.home.addFirstTransaction}
                  onPress={() => router.push('/transactions/new')}
                  variant="secondary"
                />
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.cardList,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: colors.textPrimary,
                },
              ]}
            >
              {summary.recentTransactions.map((transaction, index) => {
                const title = transactionTitle(transaction, language);
                const meta = getCategoryMeta(
                  transaction.categoryName,
                  transaction.type,
                  isDark,
                );
                const isLast = index === summary.recentTransactions.length - 1;

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
                      styles.transactionRow,
                      {
                        backgroundColor: colors.surface,
                        borderBottomColor: colors.border,
                      },
                      isLast ? styles.transactionRowLast : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.avatarBadge,
                        { backgroundColor: meta.backgroundColor },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={meta.color}
                        name={meta.icon}
                        size={22}
                      />
                    </View>
                    <View style={styles.transactionText}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.transactionTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {title}
                      </Text>
                      <View style={styles.transactionMetaRow}>
                        <Text
                          style={[
                            styles.transactionMetadata,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {transaction.categoryName} ·{' '}
                          {formatTransactionDate(
                            transaction.localDate,
                            language,
                          )}
                        </Text>
                        {transaction.hasReceipt ? (
                          <View
                            style={[
                              styles.receiptBadge,
                              {
                                backgroundColor: isDark
                                  ? colors.surfaceSecondary
                                  : '#EFF6FF',
                                borderColor: isDark ? colors.border : '#DBEAFE',
                              },
                            ]}
                          >
                            <MaterialCommunityIcons
                              color={colors.primary}
                              name="paperclip"
                              size={12}
                            />
                            <Text
                              style={[
                                styles.receiptBadgeText,
                                { color: colors.primary },
                              ]}
                            >
                              {t.home.receiptBadge}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.transactionAmountWrapper}>
                      <Text
                        style={
                          transaction.type === 'expense'
                            ? [
                                styles.expenseAmount,
                                { color: colors.destructive },
                              ]
                            : [styles.incomeAmount, { color: colors.positive }]
                        }
                      >
                        {transaction.type === 'expense' ? '−' : '+'}
                        {formatMoney(
                          transaction.amountMinor,
                          transaction.currencyCode,
                        )}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      color={colors.textSecondary}
                      name="chevron-right"
                      size={22}
                    />
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
  content: {
    paddingBottom: spacing.xxl + spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerTitles: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    marginTop: 2,
  },
  monthBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
  },
  month: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorBanner: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.sm + 4,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 3,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  heroHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  heroIconBubble: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  heroNetLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: spacing.xs + 4,
  },
  cardDivider: {
    height: 1.5,
    marginVertical: spacing.sm + 2,
  },
  summaryRows: {
    gap: spacing.sm + 4,
    marginTop: spacing.xs,
  },
  summaryRowItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryRowLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 10,
  },
  iconCircleIncome: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  iconCircleExpense: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  summaryRowLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryIncomeValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  summaryExpenseValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  quickActionButtonPrimary: {
    alignItems: 'center',
    borderRadius: 14,
    elevation: 2,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  quickActionIconCirclePrimary: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  quickActionTextPrimary: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  quickActionButtonSecondary: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    elevation: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  quickActionIconCircleSecondary: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  quickActionTextSecondary: {
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginTop: spacing.lg + spacing.xs,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: spacing.lg,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    elevation: 2,
    gap: spacing.md + 2,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md + 2,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  categoryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  categoryIconBadge: {
    alignItems: 'center',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  categoryInfo: {
    flex: 1,
    gap: 6,
  },
  categoryLabels: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryTitleGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 8,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
  },
  percentBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '800',
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  barTrack: {
    borderRadius: radius.pill,
    height: 10,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  cardList: {
    borderRadius: 18,
    borderWidth: 1.5,
    elevation: 2,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    overflow: 'hidden',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  transactionRow: {
    alignItems: 'center',
    borderBottomWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    minHeight: 76,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 4,
  },
  transactionRowLast: {
    borderBottomWidth: 0,
  },
  avatarBadge: {
    alignItems: 'center',
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  transactionText: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  transactionMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 3,
  },
  transactionMetadata: {
    fontSize: 13,
    fontWeight: '500',
  },
  receiptBadge: {
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  receiptBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  transactionAmountWrapper: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  incomeAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyRecentCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    elevation: 2,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.xl,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  emptyIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 68,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 68,
  },
  emptySectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptySectionText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: spacing.md,
    width: '100%',
  },
  centeredState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  stateTitle: {
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  stateText: {
    fontSize: typography.body.fontSize,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  stateAction: {
    marginTop: spacing.lg,
    width: '100%',
  },
  pressed: {
    opacity: 0.75,
  },
});
