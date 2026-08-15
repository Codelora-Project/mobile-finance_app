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
import { colors } from '@/theme/colors';
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
    if (loading || loadingMore || !hasMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await listTransactions(database, {
        filters,
        offset: items.length,
        search: debouncedSearch,
      });
      setItems((current) => [...current, ...page.items]);
      setHasMore(page.hasMore);
    } catch (loadError) {
      setError(mapError(loadError, 'DATABASE_WRITE_FAILED').message);
    } finally {
      setLoadingMore(false);
    }
  }, [
    database,
    debouncedSearch,
    filters,
    hasMore,
    items.length,
    loading,
    loadingMore,
  ]);

  const rows = useMemo(() => buildRows(items), [items]);
  const activeFilterCount = Object.keys(filters).length;
  const isFiltering = activeFilterCount > 0 || debouncedSearch.length > 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Transactions
        </Text>
      </View>

      <View style={styles.controls}>
        <AppInput
          autoCapitalize="none"
          label="Search"
          onChangeText={setSearch}
          placeholder="Merchant, source, note, or category"
          returnKeyType="search"
          value={search}
        />
        <AppButton
          label={
            activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'
          }
          onPress={() => setFiltersVisible(true)}
          variant="secondary"
        />
        {feedbackMessage ? (
          <Text accessibilityLiveRegion="polite" style={styles.feedback}>
            {feedbackMessage}
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityLiveRegion="assertive" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateText}>Loading transactions…</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={
            rows.length === 0 ? styles.emptyList : styles.list
          }
          data={rows}
          keyExtractor={(row) => row.key}
          ListEmptyComponent={
            <View style={styles.state}>
              <Text accessibilityRole="header" style={styles.emptyTitle}>
                {isFiltering ? 'No matching transactions' : 'No transactions'}
              </Text>
              <Text style={styles.stateText}>
                {isFiltering
                  ? 'Try changing your search or filters.'
                  : 'Add an expense or income to start your history.'}
              </Text>
              {!isFiltering ? (
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
                <Text style={styles.dateHeader}>
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
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.rowText}>
                  <Text numberOfLines={1} style={styles.rowTitle}>
                    {title}
                  </Text>
                  <Text style={styles.rowMetadata}>
                    {transaction.categoryName}
                    {transaction.hasReceipt ? ' · Receipt' : ''}
                    {transaction.isReimbursable ? ' · Reimbursable' : ''}
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
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.pageTitle.fontSize,
    fontWeight: typography.pageTitle.fontWeight,
    lineHeight: typography.pageTitle.lineHeight,
  },
  controls: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  feedback: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    color: colors.positive,
    padding: spacing.sm,
  },
  error: {
    color: colors.destructive,
    fontSize: typography.secondary.fontSize,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  emptyList: {
    flexGrow: 1,
  },
  dateHeader: {
    backgroundColor: colors.background,
    color: colors.textSecondary,
    fontSize: typography.secondary.fontSize,
    fontWeight: '700',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  transactionRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
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
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  rowMetadata: {
    color: colors.textSecondary,
    fontSize: typography.metadata.fontSize,
    marginTop: spacing.xs,
  },
  expenseAmount: {
    color: colors.destructive,
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
  incomeAmount: {
    color: colors.positive,
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
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.textPrimary,
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
