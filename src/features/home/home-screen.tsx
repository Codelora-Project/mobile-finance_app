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
import { formatMoney } from '@/lib/money';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function parseLocalDate(localDate: string) {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function formatMonth(monthStart: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(parseLocalDate(monthStart));
}

function formatTransactionDate(localDate: string) {
  return new Intl.DateTimeFormat('en-US', {
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

function transactionTitle(transaction: TransactionListItem) {
  return (
    transaction.counterparty?.trim() ||
    transaction.categoryName ||
    (transaction.type === 'expense' ? 'Expense' : 'Income')
  );
}

export function HomeScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
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
          setError("We couldn't load your overview. Try again.");
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
          <Text style={styles.stateText}>Loading overview…</Text>
        </View>
      </Screen>
    );
  }

  if (!summary) {
    return (
      <Screen>
        <View style={styles.centeredState}>
          <Text accessibilityRole="header" style={styles.stateTitle}>
            Overview unavailable
          </Text>
          <Text accessibilityLiveRegion="assertive" style={styles.stateText}>
            {error}
          </Text>
          <View style={styles.stateAction}>
            <AppButton label="Try again" onPress={() => void loadSummary()} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => void loadSummary('refresh')}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTitles}>
            <Text style={styles.greeting}>Overview</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Personal Finance
            </Text>
          </View>
          <View style={styles.monthBadge}>
            <MaterialCommunityIcons
              color={colors.primary}
              name="calendar-month-outline"
              size={15}
            />
            <Text style={styles.month}>{formatMonth(summary.monthStart)}</Text>
          </View>
        </View>

        {error ? (
          <Text accessibilityLiveRegion="assertive" style={styles.errorBanner}>
            {error}
          </Text>
        ) : null}

        {/* Hero Financial Overview Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroLabelRow}>
              <View style={styles.heroIconBubble}>
                <MaterialCommunityIcons
                  color={colors.primary}
                  name="wallet-outline"
                  size={16}
                />
              </View>
              <Text style={styles.heroNetLabel}>Net</Text>
            </View>
          </View>

          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[
              styles.heroAmount,
              summary.netMinor < 0
                ? styles.heroAmountNegative
                : styles.heroAmountPositive,
            ]}
          >
            {formatNet(summary.netMinor, summary.currencyCode)}
          </Text>

          <View style={styles.statChipsRow}>
            {/* Income Stat Chip */}
            <View style={styles.statChipIncome}>
              <View style={styles.statIconIncome}>
                <MaterialCommunityIcons
                  color={colors.positive}
                  name="arrow-bottom-left"
                  size={16}
                />
              </View>
              <View style={styles.statChipContent}>
                <Text style={styles.statChipLabelIncome}>Income</Text>
                <Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={styles.statChipValueIncome}
                >
                  {formatMoney(summary.incomeMinor, summary.currencyCode)}
                </Text>
              </View>
            </View>

            {/* Expense Stat Chip */}
            <View style={styles.statChipExpense}>
              <View style={styles.statIconExpense}>
                <MaterialCommunityIcons
                  color={colors.destructive}
                  name="arrow-top-right"
                  size={16}
                />
              </View>
              <View style={styles.statChipContent}>
                <Text numberOfLines={1} style={styles.statChipLabelExpense}>
                  Expenses this month
                </Text>
                <Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={styles.statChipValueExpense}
                >
                  {formatMoney(summary.expenseMinor, summary.currencyCode)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Spending by Category Section */}
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Spending by category
          </Text>
          {summary.categoryTotals.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptySectionText}>
                No expenses this month.
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              {summary.categoryTotals.map((category) => {
                const meta = getCategoryMeta(category.categoryName, 'expense');
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
                    )}, ${percentage}% of expenses`}
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
                        size={18}
                      />
                    </View>
                    <View style={styles.categoryInfo}>
                      <View style={styles.categoryLabels}>
                        <View style={styles.categoryTitleGroup}>
                          <Text numberOfLines={1} style={styles.categoryName}>
                            {category.categoryName}
                          </Text>
                          <View style={styles.percentBadge}>
                            <Text style={styles.percentText}>
                              {percentage}%
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.categoryAmount}>
                          {formatMoney(
                            category.amountMinor,
                            summary.currencyCode,
                          )}
                        </Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              backgroundColor: meta.color,
                              width: `${Math.max(percentage, 2)}%`,
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
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Recent transactions
            </Text>
            {summary.recentTransactions.length > 0 ? (
              <AppButton
                label="View all"
                onPress={() => router.push('/transactions')}
                variant="ghost"
              />
            ) : null}
          </View>
          {summary.recentTransactions.length === 0 ? (
            <View style={styles.emptyRecentCard}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="receipt-text-plus-outline"
                  size={32}
                />
              </View>
              <Text style={styles.emptySectionTitle}>No transactions yet</Text>
              <Text style={styles.emptySectionText}>
                Add an expense or income to see your monthly overview.
              </Text>
              <View style={styles.emptyAction}>
                <AppButton
                  label="Add your first transaction"
                  onPress={() => router.push('/transactions/new')}
                  variant="secondary"
                />
              </View>
            </View>
          ) : (
            <View style={styles.cardList}>
              {summary.recentTransactions.map((transaction, index) => {
                const title = transactionTitle(transaction);
                const meta = getCategoryMeta(
                  transaction.categoryName,
                  transaction.type,
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
                        size={20}
                      />
                    </View>
                    <View style={styles.transactionText}>
                      <Text numberOfLines={1} style={styles.transactionTitle}>
                        {title}
                      </Text>
                      <View style={styles.transactionMetaRow}>
                        <Text style={styles.transactionMetadata}>
                          {transaction.categoryName} ·{' '}
                          {formatTransactionDate(transaction.localDate)}
                        </Text>
                        {transaction.hasReceipt ? (
                          <MaterialCommunityIcons
                            color={colors.textSecondary}
                            name="paperclip"
                            size={12}
                            style={styles.receiptIcon}
                          />
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.transactionAmountWrapper}>
                      <Text
                        style={
                          transaction.type === 'expense'
                            ? styles.expenseAmount
                            : styles.incomeAmount
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
                      color="#CBD5E1"
                      name="chevron-right"
                      size={18}
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
    paddingBottom: spacing.xxl,
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
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.pageTitle.fontSize,
    fontWeight: typography.pageTitle.fontWeight,
    lineHeight: typography.pageTitle.lineHeight,
    marginTop: 2,
  },
  monthBadge: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderColor: '#E0E7FF',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  month: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FEF3F2',
    borderColor: '#FEE4E2',
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.destructive,
    fontSize: typography.secondary.fontSize,
    fontWeight: '500',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.sm + 2,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  heroHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  heroIconBubble: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: radius.pill,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  heroNetLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  heroAmount: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: spacing.xs + 2,
  },
  heroAmountPositive: {
    color: colors.textPrimary,
  },
  heroAmountNegative: {
    color: colors.destructive,
  },
  statChipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statChipIncome: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    padding: spacing.sm + 2,
  },
  statIconIncome: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  statChipExpense: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    padding: spacing.sm + 2,
  },
  statIconExpense: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  statChipContent: {
    flex: 1,
  },
  statChipLabelIncome: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '600',
  },
  statChipValueIncome: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  statChipLabelExpense: {
    color: '#B42318',
    fontSize: 11,
    fontWeight: '600',
  },
  statChipValueExpense: {
    color: '#B42318',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 40,
    paddingRight: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
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
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
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
    gap: 6,
  },
  categoryName: {
    color: colors.textPrimary,
    fontSize: typography.secondary.fontSize,
    fontWeight: '600',
  },
  percentBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  percentText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  categoryAmount: {
    color: colors.textPrimary,
    fontSize: typography.secondary.fontSize,
    fontWeight: '700',
  },
  barTrack: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill,
    height: 6,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  cardList: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  transactionRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  transactionRowLast: {
    borderBottomWidth: 0,
  },
  avatarBadge: {
    alignItems: 'center',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  transactionText: {
    flex: 1,
  },
  transactionTitle: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  transactionMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  transactionMetadata: {
    color: colors.textSecondary,
    fontSize: typography.metadata.fontSize,
  },
  receiptIcon: {
    marginLeft: 2,
  },
  transactionAmountWrapper: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    color: colors.destructive,
    fontSize: typography.secondary.fontSize,
    fontWeight: '700',
  },
  incomeAmount: {
    color: colors.positive,
    fontSize: typography.secondary.fontSize,
    fontWeight: '700',
  },
  emptyRecentCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.xl,
    shadowColor: '#0F172A',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.pill,
    height: 60,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 60,
  },
  emptySectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
  emptySectionText: {
    color: colors.textSecondary,
    fontSize: typography.secondary.fontSize,
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
    color: colors.textPrimary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  stateAction: {
    marginTop: spacing.lg,
    width: '100%',
  },
  pressed: {
    opacity: 0.72,
  },
});
