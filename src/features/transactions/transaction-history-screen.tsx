import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { Screen } from '@/components/ui/screen';
import { TransactionFilterModal } from '@/features/transactions/transaction-filter-modal';
import {
  listTransactions,
  type TransactionFilters,
  type TransactionListItem,
} from '@/features/transactions/transaction-repository';
import { mapError } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type HistoryRow =
  | Readonly<{ key: string; kind: 'header'; localDate: string }>
  | Readonly<{
      key: string;
      kind: 'transaction';
      transaction: TransactionListItem;
    }>;

function formatGroupDate(localDate: string) {
  const [year, month, day] = localDate.split('-').map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = [
    yesterday.getFullYear(),
    String(yesterday.getMonth() + 1).padStart(2, '0'),
    String(yesterday.getDate()).padStart(2, '0'),
  ].join('-');
  if (localDate === todayKey) {
    return 'Today';
  }
  if (localDate === yesterdayKey) {
    return 'Yesterday';
  }
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function buildRows(items: readonly TransactionListItem[]) {
  const rows: HistoryRow[] = [];
  let previousDate: string | null = null;
  for (const transaction of items) {
    if (transaction.localDate !== previousDate) {
      previousDate = transaction.localDate;
      rows.push({
        key: `date-${transaction.localDate}`,
        kind: 'header',
        localDate: transaction.localDate,
      });
    }
    rows.push({
      key: `transaction-${transaction.id}`,
      kind: 'transaction',
      transaction,
    });
  }
  return rows;
}

export function TransactionHistoryScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { colors } = useTheme();
  const { feedback } = useLocalSearchParams<{
    feedback?: string | string[];
  }>();
  const feedbackMessage = Array.isArray(feedback) ? feedback[0] : feedback;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [items, setItems] = useState<readonly TransactionListItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 275);
    return () => clearTimeout(timeout);
  }, [search]);

  const loadFirstPage = useCallback(
    async (mode: 'focus' | 'refresh' = 'focus') => {
      const currentRequest = ++requestId.current;
      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const page = await listTransactions(database, {
          filters,
          search: debouncedSearch,
        });
        if (requestId.current !== currentRequest) {
          return;
        }
        setItems(page.items);
        setHasMore(page.hasMore);
      } catch (loadError) {
        if (requestId.current === currentRequest) {
          setError(mapError(loadError, 'DATABASE_WRITE_FAILED').message);
        }
      } finally {
        if (requestId.current === currentRequest) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [database, debouncedSearch, filters],
  );

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
      return () => {
        requestId.current += 1;
      };
    }, [loadFirstPage]),
  );

  const loadNextPage = useCallback(async () => {
    if (!hasMore || loadingMore || loading || refreshing) {
      return;
    }
    const lastItem = items[items.length - 1];
    if (!lastItem) {
      return;
    }
    const currentRequest = ++requestId.current;
    setLoadingMore(true);
    try {
      const page = await listTransactions(database, {
        filters,
        offset: items.length,
        search: debouncedSearch,
      });
      if (requestId.current !== currentRequest) {
        return;
      }
      setItems((current) => [...current, ...page.items]);
      setHasMore(page.hasMore);
    } catch (loadError) {
      if (requestId.current === currentRequest) {
        setError(mapError(loadError, 'DATABASE_WRITE_FAILED').message);
      }
    } finally {
      if (requestId.current === currentRequest) {
        setLoadingMore(false);
      }
    }
  }, [
    database,
    debouncedSearch,
    filters,
    hasMore,
    items,
    loading,
    loadingMore,
    refreshing,
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categoryId !== undefined) count += 1;
    if (filters.dateFrom !== undefined || filters.dateTo !== undefined)
      count += 1;
    if (filters.isReimbursable !== undefined) count += 1;
    if (filters.paymentMethodId !== undefined) count += 1;
    if (filters.type !== undefined) count += 1;
    return count;
  }, [filters]);

  const rows = useMemo(() => buildRows(items), [items]);

  return (
    <Screen>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.textPrimary }]}
        >
          Transactions
        </Text>
      </View>

      <View style={styles.controls}>
        {feedbackMessage ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.feedback,
              {
                backgroundColor: colors.surfaceSecondary,
                color: colors.positive,
              },
            ]}
          >
            {feedbackMessage}
          </Text>
        ) : null}
        <AppInput
          accessibilityLabel="Search transactions"
          label="Search"
          onChangeText={setSearch}
          placeholder="Filter by counterparty or note"
          value={search}
        />
        <AppButton
          accessibilityLabel={
            activeFilterCount > 0
              ? `Filters (${activeFilterCount} active)`
              : 'Filters'
          }
          label={
            activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'
          }
          onPress={() => setFiltersVisible(true)}
          variant="secondary"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            Loading transactions…
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.list,
            items.length === 0 ? styles.emptyList : null,
          ]}
          data={rows}
          keyExtractor={(row) => row.key}
          ListEmptyComponent={
            <View style={styles.state}>
              <Text
                accessibilityRole="header"
                style={[styles.emptyTitle, { color: colors.textPrimary }]}
              >
                {search.trim().length > 0 || activeFilterCount > 0
                  ? 'No matching transactions'
                  : 'No transactions'}
              </Text>
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                {search.trim().length > 0 || activeFilterCount > 0
                  ? 'Try changing your search or filters.'
                  : 'Start tracking your spending by adding a transaction.'}
              </Text>
              {search.trim().length === 0 && activeFilterCount === 0 ? (
                <View style={styles.emptyAction}>
                  <AppButton
                    label="Add transaction"
                    onPress={() => router.push('/transactions/new')}
                  />
                </View>
              ) : null}
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={colors.primary}
                style={styles.footerLoader}
              />
            ) : null
          }
          onEndReached={() => void loadNextPage()}
          onEndReachedThreshold={0.4}
          onRefresh={() => void loadFirstPage('refresh')}
          refreshing={refreshing}
          renderItem={({ item: row }) => {
            if (row.kind === 'header') {
              return (
                <Text
                  style={[
                    styles.dateHeader,
                    {
                      backgroundColor: colors.background,
                      color: colors.textSecondary,
                    },
                  ]}
                >
                  {formatGroupDate(row.localDate)}
                </Text>
              );
            }
            const transaction = row.transaction;
            const title =
              transaction.counterparty?.trim() || transaction.categoryName;
            return (
              <Pressable
                accessibilityLabel={`${title}, ${formatMoney(
                  transaction.amountMinor,
                  transaction.currencyCode,
                )}`}
                accessibilityRole="button"
                onPress={() => router.push(`/transactions/${transaction.id}`)}
                style={({ pressed }) => [
                  styles.transactionRow,
                  {
                    backgroundColor: colors.surface,
                    borderBottomColor: colors.border,
                  },
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.rowText}>
                  <Text
                    numberOfLines={1}
                    style={[styles.rowTitle, { color: colors.textPrimary }]}
                  >
                    {title}
                  </Text>
                  <Text
                    style={[
                      styles.rowMetadata,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {transaction.categoryName}
                    {transaction.hasReceipt ? ' · Receipt' : ''}
                    {transaction.isReimbursable ? ' · Reimbursable' : ''}
                  </Text>
                </View>
                <Text
                  style={
                    transaction.type === 'expense'
                      ? [styles.expenseAmount, { color: colors.destructive }]
                      : [styles.incomeAmount, { color: colors.positive }]
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
          }}
        />
      )}

      {filtersVisible ? (
        <TransactionFilterModal
          filters={filters}
          onApply={(nextFilters) => {
            setFilters(nextFilters);
            setFiltersVisible(false);
          }}
          onClose={() => setFiltersVisible(false)}
          visible
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: typography.pageTitle.fontSize,
    fontWeight: typography.pageTitle.fontWeight,
    lineHeight: typography.pageTitle.lineHeight,
  },
  controls: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  feedback: {
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  error: {
    color: '#EF4444',
    fontSize: typography.secondary.fontSize,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  emptyList: {
    flexGrow: 1,
  },
  dateHeader: {
    fontSize: typography.secondary.fontSize,
    fontWeight: '700',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  transactionRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  rowMetadata: {
    fontSize: typography.metadata.fontSize,
    marginTop: spacing.xs,
  },
  expenseAmount: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
  incomeAmount: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  stateText: {
    fontSize: typography.body.fontSize,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
  },
  emptyAction: {
    marginTop: spacing.lg,
    width: '100%',
  },
  footerLoader: {
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.72,
  },
});
