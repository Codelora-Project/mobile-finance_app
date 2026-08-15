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
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" style={styles.title}>
              Personal Finance
            </Text>
            <Text style={styles.month}>{formatMonth(summary.monthStart)}</Text>
          </View>
          <AppButton
            label="Add transaction"
            onPress={() => router.push('/add')}
          />
        </View>

        {error ? (
          <Text accessibilityLiveRegion="assertive" style={styles.errorBanner}>
            {error}
          </Text>
        ) : null}

        <View style={styles.summaryPanel}>
          <View style={styles.primaryMetric}>
            <Text style={styles.metricLabel}>Expenses this month</Text>
            <Text style={styles.expenseTotal}>
              {formatMoney(summary.expenseMinor, summary.currencyCode)}
            </Text>
          </View>
          <View style={styles.secondaryMetrics}>
            <View style={styles.secondaryMetric}>
              <Text style={styles.metricLabel}>Income</Text>
              <Text style={styles.incomeTotal}>
                {formatMoney(summary.incomeMinor, summary.currencyCode)}
              </Text>
            </View>
            <View style={styles.secondaryMetric}>
              <Text style={styles.metricLabel}>Net</Text>
              <Text
                style={
                  summary.netMinor < 0
                    ? styles.expenseTotal
                    : styles.incomeTotal
                }
              >
                {formatNet(summary.netMinor, summary.currencyCode)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Spending by category
          </Text>
          {summary.categoryTotals.length === 0 ? (
            <Text style={styles.emptySectionText}>No expenses this month.</Text>
          ) : (
            <View style={styles.categoryList}>
              {summary.categoryTotals.map((category) => {
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
                    <View style={styles.categoryLabels}>
                      <Text numberOfLines={1} style={styles.categoryName}>
                        {category.categoryName}
                      </Text>
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
                          { width: `${Math.max(percentage, 2)}%` },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

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
            <View style={styles.emptyRecent}>
              <Text style={styles.emptySectionTitle}>No transactions yet</Text>
              <Text style={styles.emptySectionText}>
                Add an expense or income to see your monthly overview.
              </Text>
              <View style={styles.emptyAction}>
                <AppButton
                  label="Add your first transaction"
                  onPress={() => router.push('/add')}
                  variant="secondary"
                />
              </View>
            </View>
          ) : (
            <View style={styles.recentList}>
              {summary.recentTransactions.map((transaction) => {
                const title = transactionTitle(transaction);
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
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      style={[
                        styles.transactionMarker,
                        transaction.type === 'expense'
                          ? styles.expenseMarker
                          : styles.incomeMarker,
                      ]}
                    />
                    <View style={styles.transactionText}>
                      <Text numberOfLines={1} style={styles.transactionTitle}>
                        {title}
                      </Text>
                      <Text style={styles.transactionMetadata}>
                        {transaction.categoryName} ·{' '}
                        {formatTransactionDate(transaction.localDate)}
                      </Text>
                    </View>
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
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.manageActions}>
          <AppButton
            label="Claims"
            onPress={() => router.push('/claims')}
            variant="ghost"
          />
          <AppButton
            label="Categories"
            onPress={() => router.push('/categories')}
            variant="ghost"
          />
          <AppButton
            label="Payment methods"
            onPress={() => router.push('/payment-methods')}
            variant="ghost"
          />
          <AppButton
            label="Settings"
            onPress={() => router.push('/settings')}
            variant="ghost"
          />
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
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.pageTitle.fontSize,
    fontWeight: typography.pageTitle.fontWeight,
    lineHeight: typography.pageTitle.lineHeight,
  },
  month: {
    color: colors.textSecondary,
    fontSize: typography.secondary.fontSize,
    marginTop: spacing.xs,
  },
  errorBanner: {
    backgroundColor: '#FEF3F2',
    color: colors.destructive,
    marginHorizontal: spacing.lg,
    padding: spacing.sm,
  },
  summaryPanel: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.lg,
  },
  primaryMetric: {
    paddingBottom: spacing.md,
  },
  secondaryMetrics: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingTop: spacing.md,
  },
  secondaryMetric: {
    flex: 1,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: typography.secondary.fontSize,
  },
  expenseTotal: {
    color: colors.destructive,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  incomeTotal: {
    color: colors.positive,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingRight: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    paddingHorizontal: spacing.lg,
  },
  categoryList: {
    gap: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  categoryRow: {
    gap: spacing.sm,
  },
  categoryLabels: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  categoryName: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.secondary.fontSize,
    fontWeight: '600',
  },
  categoryAmount: {
    color: colors.textPrimary,
    fontSize: typography.secondary.fontSize,
    fontWeight: '600',
  },
  barTrack: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill,
    height: 8,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: '100%',
  },
  recentList: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  transactionRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  transactionMarker: {
    borderRadius: radius.pill,
    height: 10,
    width: 10,
  },
  expenseMarker: {
    backgroundColor: colors.destructive,
  },
  incomeMarker: {
    backgroundColor: colors.positive,
  },
  transactionText: {
    flex: 1,
  },
  transactionTitle: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  transactionMetadata: {
    color: colors.textSecondary,
    fontSize: typography.metadata.fontSize,
    marginTop: spacing.xs,
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
  emptyRecent: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  emptySectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  emptySectionText: {
    color: colors.textSecondary,
    fontSize: typography.secondary.fontSize,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: spacing.md,
    width: '100%',
  },
  manageActions: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
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
