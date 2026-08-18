import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { UndoToastBanner } from '@/components/ui/undo-toast-banner';
import { TransactionDateGroupHeader } from '@/features/transactions/components/transaction-date-group-header';
import { TransactionHistoryEmptyState } from '@/features/transactions/components/transaction-history-empty-state';
import { TransactionHistoryHeader } from '@/features/transactions/components/transaction-history-header';
import { TransactionHistorySummaryBar } from '@/features/transactions/components/transaction-history-summary-bar';
import { TransactionRowItem } from '@/features/transactions/components/transaction-row-item';
import { useUndoTransaction } from '@/features/transactions/hooks/use-undo-transaction';
import { TransactionFilterModal } from '@/features/transactions/transaction-filter-modal';
import {
  listTransactions,
  type TransactionFilters,
  type TransactionListItem,
} from '@/features/transactions/transaction-repository';
import { formatGroupDate } from '@/lib/dates';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import type { Language, TranslationSchema } from '@/lib/i18n/translations';
import { useTabBarVisibility } from '@/lib/navigation/tab-bar-visibility-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

const PAGE_SIZE = 50;

type DateGroup = Readonly<{
  formattedDate: string;
  key: string;
  localDate: string;
  totalNetMinor: number;
  transactions: TransactionListItem[];
}>;

function buildDateGroups(
  items: readonly TransactionListItem[],
  language: Language,
  t: TranslationSchema,
): DateGroup[] {
  const grouped: Record<string, TransactionListItem[]> = {};
  for (const transaction of items) {
    if (!grouped[transaction.localDate]) {
      grouped[transaction.localDate] = [];
    }
    grouped[transaction.localDate]?.push(transaction);
  }

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return sortedDates.map((date) => {
    const dayTransactions = grouped[date] ?? [];
    const totalNetMinor = dayTransactions.reduce((acc, curr) => {
      return curr.type === 'income'
        ? acc + curr.amountMinor
        : acc - curr.amountMinor;
    }, 0);

    return {
      formattedDate: formatGroupDate(date, language, t),
      key: `date-${date}`,
      localDate: date,
      totalNetMinor,
      transactions: dayTransactions,
    };
  });
}

export function TransactionHistoryScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { colors } = useTheme();
  const { handleScroll } = useTabBarVisibility();

  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const fetchIdRef = useRef(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const loadTransactions = useCallback(
    async (
      activeFilters: TransactionFilters,
      query: string,
      offset = 0,
      append = false,
    ) => {
      const currentFetchId = ++fetchIdRef.current;
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const result = await listTransactions(database, {
          filters: activeFilters,
          limit: PAGE_SIZE,
          offset,
          search: query.trim() || undefined,
        });

        if (currentFetchId !== fetchIdRef.current) return;

        setTransactions((prev) =>
          append ? [...prev, ...result.items] : [...result.items],
        );
        setHasMore(result.hasMore);
        setNextOffset(result.nextOffset);
      } catch (err) {
        if (currentFetchId === fetchIdRef.current) {
          const mapped = mapError(err, 'DATABASE_WRITE_FAILED');
          if (__DEV__) console.warn('Could not load transactions', mapped.message);
        }
      } finally {
        if (currentFetchId === fetchIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [database],
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
      void loadTransactions(filters, debouncedSearch, 0, false);
    },
  });

  useFocusEffect(
    useCallback(() => {
      void loadTransactions(filters, debouncedSearch, 0, false);
    }, [debouncedSearch, filters, loadTransactions]),
  );

  const handleOpenDetail = useCallback(
    (id: number) => {
      router.push(`/transactions/${id}`);
    },
    [router],
  );

  const handleAddTransaction = useCallback(() => {
    router.push('/transactions/new');
  }, [router]);

  const handleResetFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
    setDebouncedSearch('');
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !loading && !loadingMore && nextOffset !== null) {
      void loadTransactions(filters, debouncedSearch, nextOffset, true);
    }
  }, [debouncedSearch, filters, hasMore, loadTransactions, loading, loadingMore, nextOffset]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.type) count++;
    if (filters.categoryId) count++;
    if (filters.paymentMethodId) count++;
    if (filters.hasReceipt !== undefined) count++;
    if (filters.isReimbursable !== undefined) count++;
    if (filters.minAmountMinor !== undefined) count++;
    if (filters.maxAmountMinor !== undefined) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    return count;
  }, [filters]);

  const hasAnyFilterOrSearch = activeFiltersCount > 0 || debouncedSearch.trim().length > 0;

  const { totalExpenseMinor, totalIncomeMinor } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of transactions) {
      if (t.type === 'income') inc += t.amountMinor;
      else exp += t.amountMinor;
    }
    return { totalExpenseMinor: exp, totalIncomeMinor: inc };
  }, [transactions]);

  const dateGroups = useMemo(
    () => buildDateGroups(transactions, language, t),
    [language, t, transactions],
  );

  const renderItem = useCallback(
    ({ item }: { item: DateGroup }) => (
      <View
        style={[
          styles.dateGroupCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.textPrimary,
          },
        ]}
      >
        <TransactionDateGroupHeader
          formattedDate={item.formattedDate}
          totalNetMinor={item.totalNetMinor}
        />
        <View style={styles.timelineItemsWrap}>
          {item.transactions.map((tx, idx) => (
            <TransactionRowItem
              isLast={idx === item.transactions.length - 1}
              key={tx.id}
              onPress={handleOpenDetail}
              receiptBadgeText={t.home.receiptBadge}
              reimbursableBadgeText={
                t.transactions.reimbursementStatus || 'Reimburse'
              }
              transaction={tx}
            />
          ))}
        </View>
      </View>
    ),
    [colors.border, colors.surface, colors.textPrimary, handleOpenDetail, t],
  );

  const keyExtractor = useCallback((item: DateGroup) => item.key, []);

  return (
    <Screen>
      {/* 1. Search Bar & Filter Header */}
      <TransactionHistoryHeader
        activeFiltersCount={activeFiltersCount}
        onClearSearch={() => setSearchQuery('')}
        onOpenFilter={() => setFilterModalVisible(true)}
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
        t={t}
      />

      {/* 2. Top Summary Bar (if transactions exist) */}
      {transactions.length > 0 ? (
        <TransactionHistorySummaryBar
          currencyCode="IDR"
          expenseLabel={t.transactions.expense}
          incomeLabel={t.transactions.income}
          totalExpenseMinor={totalExpenseMinor}
          totalIncomeMinor={totalIncomeMinor}
        />
      ) : null}

      {/* 3. Virtualized Transaction List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={dateGroups}
          initialNumToRender={15}
          keyExtractor={keyExtractor}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <TransactionHistoryEmptyState
              hasFilters={hasAnyFilterOrSearch}
              onAddTransaction={handleAddTransaction}
              onResetFilters={handleResetFilters}
              t={t}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          maxToRenderPerBatch={10}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          updateCellsBatchingPeriod={50}
          windowSize={7}
        />
      )}

      {/* Filter Modal */}
      <TransactionFilterModal
        filters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setFilterModalVisible(false);
        }}
        onClose={() => setFilterModalVisible(false)}
        visible={filterModalVisible}
      />

      {/* Undo Floating Toast */}
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
  centerLoading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  dateGroupCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 2,
    gap: spacing.xs,
    padding: spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  footerLoading: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  listContent: {
    gap: spacing.sm + 2,
    paddingBottom: spacing.xxl + 84,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  timelineItemsWrap: {
    paddingTop: 2,
  },
});