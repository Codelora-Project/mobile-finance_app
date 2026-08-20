import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import { TransactionDateGroupHeader } from '@/features/transactions/components/transaction-date-group-header';
import { TransactionDateNavigator } from '@/features/transactions/components/transaction-date-navigator';
import { TransactionHistoryEmptyState } from '@/features/transactions/components/transaction-history-empty-state';
import { TransactionHistoryHeader } from '@/features/transactions/components/transaction-history-header';
import { TransactionHistorySummaryBar } from '@/features/transactions/components/transaction-history-summary-bar';
import {
  type HistoryPeriod,
  TransactionPeriodSegmentedControl,
} from '@/features/transactions/components/transaction-period-segmented-control';
import { TransactionQuickFilterChips } from '@/features/transactions/components/transaction-quick-filter-chips';
import { TransactionRowItem } from '@/features/transactions/components/transaction-row-item';
import {
  exportTransactionsToCsv,
  shareTransactionCsv,
} from '@/features/transactions/transaction-export-service';
import { TransactionFilterModal } from '@/features/transactions/transaction-filter-modal';
import {
  deleteTransaction,
  listTransactions,
  type TransactionFilters,
  type TransactionListItem,
} from '@/features/transactions/transaction-repository';
import { useCurrency } from '@/lib/currency/currency-context';
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

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function TransactionHistoryScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { colors } = useTheme();
  const { currencyCode } = useCurrency();
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

  // Period & Navigation state
  const [period, setPeriod] = useState<HistoryPeriod>('monthly');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isAllTime, setIsAllTime] = useState(false);

  const fetchIdRef = useRef(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate start and end date of active period
  const { dateFrom, dateTo, primaryLabel, secondaryLabel } = useMemo(() => {
    const locale = language === 'id' ? 'id-ID' : 'en-US';
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    if (period === 'daily') {
      const dateStr = formatDateStr(selectedDate);
      const primary = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
      }).format(selectedDate);
      const secondary = new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        year: 'numeric',
      }).format(selectedDate);

      return {
        dateFrom: dateStr,
        dateTo: dateStr,
        primaryLabel: primary,
        secondaryLabel: secondary,
      };
    }

    if (period === 'weekly') {
      // Find Monday of current week
      const dayOfWeek = selectedDate.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(selectedDate);
      monday.setDate(selectedDate.getDate() + diffToMonday);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const startStr = formatDateStr(monday);
      const endStr = formatDateStr(sunday);

      const startMonth = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
      }).format(monday);
      const endMonth = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(sunday);

      return {
        dateFrom: startStr,
        dateTo: endStr,
        primaryLabel: `${startMonth} – ${endMonth}`,
        secondaryLabel:
          language === 'id'
            ? 'Ketuk untuk Semua Waktu'
            : 'Tap for All Time',
      };
    }

    // Monthly default
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
      lastDay,
    ).padStart(2, '0')}`;

    const monthName = new Intl.DateTimeFormat(locale, {
      month: 'long',
    }).format(selectedDate);
    const monthYear = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(selectedDate);

    return {
      dateFrom: startStr,
      dateTo: endStr,
      primaryLabel: monthYear,
      secondaryLabel:
        language === 'id' ? 'Ketuk untuk Semua Waktu' : 'Tap for All Time',
    };
  }, [language, period, selectedDate]);

  // Calculate effective filters combining period range and custom filters
  const effectiveFilters = useMemo<TransactionFilters>(() => {
    if (isAllTime) {
      return filters;
    }
    return {
      ...filters,
      dateFrom: filters.dateFrom ?? dateFrom,
      dateTo: filters.dateTo ?? dateTo,
    };
  }, [dateFrom, dateTo, filters, isAllTime]);

  // Period navigation controls
  const handlePrevPeriod = useCallback(() => {
    if (isAllTime) {
      setIsAllTime(false);
      return;
    }
    setSelectedDate((prev) => {
      const next = new Date(prev);
      if (period === 'daily') {
        next.setDate(prev.getDate() - 1);
      } else if (period === 'weekly') {
        next.setDate(prev.getDate() - 7);
      } else {
        next.setMonth(prev.getMonth() - 1);
      }
      return next;
    });
  }, [isAllTime, period]);

  const handleNextPeriod = useCallback(() => {
    if (isAllTime) {
      setIsAllTime(false);
      return;
    }
    setSelectedDate((prev) => {
      const next = new Date(prev);
      if (period === 'daily') {
        next.setDate(prev.getDate() + 1);
      } else if (period === 'weekly') {
        next.setDate(prev.getDate() + 7);
      } else {
        next.setMonth(prev.getMonth() + 1);
      }
      return next;
    });
  }, [isAllTime, period]);

  const handleToggleAllTime = useCallback(() => {
    setIsAllTime((prev) => !prev);
  }, []);

  const handleChangePeriod = useCallback((newPeriod: HistoryPeriod) => {
    setPeriod(newPeriod);
    setIsAllTime(false);
  }, []);

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
          if (__DEV__)
            console.warn('Could not load transactions', mapped.message);
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

  useFocusEffect(
    useCallback(() => {
      void loadTransactions(effectiveFilters, debouncedSearch, 0, false);
    }, [debouncedSearch, effectiveFilters, loadTransactions]),
  );

  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTransactions(effectiveFilters, debouncedSearch, 0, false);
    } finally {
      setRefreshing(false);
    }
  }, [debouncedSearch, effectiveFilters, loadTransactions]);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    if (transactions.length === 0) {
      Alert.alert(
        language === 'id' ? 'Ekspor Transaksi' : 'Export Transactions',
        language === 'id'
          ? 'Tidak ada transaksi yang cocok untuk diekspor.'
          : 'No matching transactions to export.',
      );
      return;
    }

    setExporting(true);
    try {
      const allMatching = await listTransactions(database, {
        filters: effectiveFilters,
        limit: 10000,
        search: debouncedSearch.trim() || undefined,
      });

      const { uri } = await exportTransactionsToCsv(
        allMatching.items,
        language,
      );
      await shareTransactionCsv(
        uri,
        language === 'id'
          ? 'Ekspor Riwayat Transaksi'
          : 'Export Transaction History',
      );
    } catch (err) {
      const mapped = mapError(err, 'FILE_OPERATION_FAILED');
      Alert.alert(
        language === 'id' ? 'Gagal Mengekspor' : 'Export Failed',
        mapped.message,
      );
    } finally {
      setExporting(false);
    }
  }, [
    database,
    debouncedSearch,
    effectiveFilters,
    exporting,
    language,
    transactions.length,
  ]);

  const handleEditTransaction = useCallback(
    (tx: TransactionListItem) => {
      router.push(`/transactions/${tx.id}/edit`);
    },
    [router],
  );

  const handleDeleteTransaction = useCallback(
    (tx: TransactionListItem) => {
      Alert.alert(
        language === 'id' ? 'Hapus Transaksi' : 'Delete Transaction',
        language === 'id'
          ? `Hapus transaksi "${tx.counterparty || tx.categoryName}"? Saldo dompet akan disesuaikan kembali.`
          : `Delete transaction "${tx.counterparty || tx.categoryName}"? Wallet balance will be adjusted.`,
        [
          {
            text: language === 'id' ? 'Batal' : 'Cancel',
            style: 'cancel',
          },
          {
            text: language === 'id' ? 'Hapus' : 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteTransaction(database, tx.id);
                await loadTransactions(
                  effectiveFilters,
                  debouncedSearch,
                  0,
                  false,
                );
              } catch (delErr) {
                const mapped = mapError(delErr, 'DATABASE_WRITE_FAILED');
                Alert.alert('Error', mapped.message);
              }
            },
          },
        ],
      );
    },
    [database, debouncedSearch, effectiveFilters, language, loadTransactions],
  );

  const handleLongPressTransaction = useCallback(
    (tx: TransactionListItem) => {
      Alert.alert(
        tx.counterparty || tx.categoryName,
        language === 'id'
          ? 'Pilih aksi untuk transaksi ini:'
          : 'Choose an action for this transaction:',
        [
          {
            text: language === 'id' ? 'Batal' : 'Cancel',
            style: 'cancel',
          },
          {
            text: language === 'id' ? 'Edit Transaksi' : 'Edit Transaction',
            onPress: () => router.push(`/transactions/${tx.id}/edit`),
          },
          {
            text: language === 'id' ? 'Hapus' : 'Delete',
            style: 'destructive',
            onPress: () => handleDeleteTransaction(tx),
          },
        ],
      );
    },
    [handleDeleteTransaction, language, router],
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
    setIsAllTime(false);
    setSearchQuery('');
    setDebouncedSearch('');
  }, []);

  const handleSelectTypeFilter = useCallback(
    (type?: 'expense' | 'income') => {
      setFilters((prev) => {
        const next = { ...prev };
        if (!type || prev.type === type) {
          delete next.type;
        } else {
          next.type = type;
        }
        return next;
      });
    },
    [],
  );

  const handleEndReached = useCallback(() => {
    if (hasMore && !loading && !loadingMore && nextOffset !== null) {
      void loadTransactions(
        effectiveFilters,
        debouncedSearch,
        nextOffset,
        true,
      );
    }
  }, [
    debouncedSearch,
    effectiveFilters,
    hasMore,
    loadTransactions,
    loading,
    loadingMore,
    nextOffset,
  ]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.type) count++;
    if (filters.paymentMethodId) count++;
    if (filters.categoryId) count++;
    if (filters.hasReceipt !== undefined) count++;
    if (filters.isReimbursable !== undefined) count++;
    if (
      filters.minAmountMinor !== undefined ||
      filters.maxAmountMinor !== undefined
    )
      count++;
    return count;
  }, [filters]);

  const hasAnyFilterOrSearch =
    activeFiltersCount > 0 || debouncedSearch.trim().length > 0;

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
              onDelete={handleDeleteTransaction}
              onEdit={handleEditTransaction}
              onLongPress={handleLongPressTransaction}
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
    [
      colors.border,
      colors.surface,
      colors.textPrimary,
      handleDeleteTransaction,
      handleEditTransaction,
      handleLongPressTransaction,
      handleOpenDetail,
      t,
    ],
  );

  const renderListHeader = useCallback(
    () => (
      <View style={styles.listHeaderWrap}>
        {/* 2. Period Tabs: [ Harian | Mingguan | Bulanan ] */}
        <TransactionPeriodSegmentedControl
          activePeriod={period}
          language={language}
          onChangePeriod={handleChangePeriod}
        />

        {/* 3. Period Date Navigator: ‹  Agustus 2026  › */}
        <TransactionDateNavigator
          isAllTime={isAllTime}
          language={language}
          onNextPeriod={handleNextPeriod}
          onPrevPeriod={handlePrevPeriod}
          onToggleAllTime={handleToggleAllTime}
          period={period}
          primaryLabel={primaryLabel}
          secondaryLabel={secondaryLabel}
        />

        {/* 4. Quick Filter Chips: [ Semua | Keluar | Masuk | Transfer | Ada Struk | Reimburse ] */}
        <TransactionQuickFilterChips
          filters={filters}
          onFilterChange={setFilters}
          t={t}
        />

        {/* 5. Summary Bar: [ Keluar | Masuk | Saldo ] */}
        {transactions.length > 0 ? (
          <TransactionHistorySummaryBar
            activeTypeFilter={filters.type}
            currencyCode={currencyCode}
            expenseLabel={t.transactions.expense}
            incomeLabel={t.transactions.income}
            netLabel={language === 'id' ? 'Saldo' : 'Balance'}
            onSelectTypeFilter={handleSelectTypeFilter}
            totalExpenseMinor={totalExpenseMinor}
            totalIncomeMinor={totalIncomeMinor}
          />
        ) : null}
      </View>
    ),
    [
      currencyCode,
      filters,
      handleChangePeriod,
      handleNextPeriod,
      handlePrevPeriod,
      handleSelectTypeFilter,
      handleToggleAllTime,
      isAllTime,
      language,
      period,
      primaryLabel,
      secondaryLabel,
      t,
      totalExpenseMinor,
      totalIncomeMinor,
      transactions.length,
    ],
  );

  const keyExtractor = useCallback((item: DateGroup) => item.key, []);

  return (
    <Screen>
      {/* 1. Header: Screen Title "Riwayat" + Action Icons (Search, Filter, Export) */}
      <TransactionHistoryHeader
        activeFiltersCount={activeFiltersCount}
        onClearSearch={() => setSearchQuery('')}
        onExport={handleExport}
        onOpenFilter={() => setFilterModalVisible(true)}
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
        t={t}
      />

      {/* Virtualized Transaction List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          {renderListHeader()}
          <View style={styles.centerLoading}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={dateGroups}
          initialNumToRender={15}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderListHeader}
          onScroll={handleScroll}
          refreshControl={
            <RefreshControl
              colors={[colors.primary]}
              onRefresh={handleRefresh}
              progressBackgroundColor={colors.surface}
              refreshing={refreshing}
              tintColor={colors.primary}
            />
          }
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerLoading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
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
    paddingTop: spacing.xs,
  },
  listHeaderWrap: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
    marginHorizontal: -spacing.md,
  },
  loadingContainer: {
    flex: 1,
  },
  timelineItemsWrap: {
    paddingTop: 2,
  },
});