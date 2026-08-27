import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { HistoryPeriod } from '@/features/transactions/components/transaction-period-segmented-control';
import {
  exportTransactionsToCsv,
  shareTransactionCsv,
} from '@/features/transactions/transaction-export-service';
import {
  deleteTransactionForUndo,
  listTransactions,
  type TransactionFilters,
  type TransactionListItem,
} from '@/features/transactions/transaction-repository';
import { getTransactionErrorMessage } from '@/features/transactions/transaction-error-messages';
import { useTransactionMutations } from '@/features/transactions/transaction-mutation-context';
import { useReceiptStorage } from '@/features/receipts/receipt-storage-context';
import { useCurrency } from '@/lib/currency/currency-context';
import { formatGroupDate } from '@/lib/dates';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import type { Language, TranslationSchema } from '@/lib/i18n/translations';

const PAGE_SIZE = 50;

export type DateGroup = Readonly<{
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
      if (curr.type === 'income') return acc + curr.amountMinor;
      if (curr.type === 'expense') return acc - curr.amountMinor;
      return acc;
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

function moveDateToMonth(date: Date, year: number, month: number): Date {
  const normalizedMonth = new Date(year, month, 1);
  const targetYear = normalizedMonth.getFullYear();
  const targetMonth = normalizedMonth.getMonth();
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const next = new Date(date);
  next.setDate(1);
  next.setFullYear(targetYear, targetMonth, Math.min(date.getDate(), lastDay));
  return next;
}

export function useTransactionHistoryViewModel() {
  const database = useSQLiteContext();
  const receiptStorage = useReceiptStorage();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { currencyCode } = useCurrency();
  const transactionMutations = useTransactionMutations();

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
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();
  const monthYearLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', {
        month: 'short',
        year: 'numeric',
      }).format(selectedDate),
    [language, selectedDate],
  );

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
          language === 'id' ? 'Ketuk untuk Semua Waktu' : 'Tap for All Time',
      };
    }

    // Monthly default
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
      lastDay,
    ).padStart(2, '0')}`;

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

  const handlePrevMonth = useCallback(() => {
    setIsAllTime(false);
    setSelectedDate((current) =>
      moveDateToMonth(current, current.getFullYear(), current.getMonth() - 1),
    );
  }, []);

  const handleNextMonth = useCallback(() => {
    setIsAllTime(false);
    setSelectedDate((current) =>
      moveDateToMonth(current, current.getFullYear(), current.getMonth() + 1),
    );
  }, []);

  const handleSelectMonth = useCallback((year: number, month: number) => {
    if (!Number.isInteger(year) || month < 0 || month > 11) return;
    setIsAllTime(false);
    setSelectedDate((current) => moveDateToMonth(current, year, month));
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
      void transactionMutations.revision;
      void loadTransactions(effectiveFilters, debouncedSearch, 0, false);
      return () => {
        fetchIdRef.current += 1;
      };
    }, [
      debouncedSearch,
      effectiveFilters,
      loadTransactions,
      transactionMutations.revision,
    ]),
  );

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
      const allMatching: TransactionListItem[] = [];
      let exportOffset = 0;
      let hasMoreToExport = true;

      while (hasMoreToExport) {
        const page = await listTransactions(database, {
          filters: effectiveFilters,
          limit: 100,
          offset: exportOffset,
          search: debouncedSearch.trim() || undefined,
        });
        allMatching.push(...page.items);
        hasMoreToExport = page.hasMore;

        if (hasMoreToExport && page.nextOffset <= exportOffset) {
          throw new Error('Export pagination did not advance.');
        }
        exportOffset = page.nextOffset;
      }

      const { uri } = await exportTransactionsToCsv(allMatching, language);
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
    async (tx: TransactionListItem) => {
      try {
        const snapshot = await deleteTransactionForUndo(
          database,
          tx.id,
          receiptStorage,
        );
        setTransactions((current) =>
          current.filter((item) => item.id !== tx.id),
        );
        transactionMutations.notifyDeleted(snapshot);
      } catch (delErr) {
        Alert.alert(
          t.transactions.title,
          getTransactionErrorMessage(delErr, t),
        );
      }
    },
    [database, receiptStorage, t, transactionMutations],
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

  const handleSelectTypeFilter = useCallback((type?: 'expense' | 'income') => {
    setFilters((prev) => {
      const next = { ...prev };
      if (!type || prev.type === type) {
        delete next.type;
      } else {
        next.type = type;
      }
      return next;
    });
  }, []);

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
      else if (t.type === 'expense') exp += t.amountMinor;
    }
    return { totalExpenseMinor: exp, totalIncomeMinor: inc };
  }, [transactions]);

  const dateGroups = useMemo(
    () => buildDateGroups(transactions, language, t),
    [language, t, transactions],
  );

  return {
    actions: {
      handleAddTransaction,
      handleChangePeriod,
      handleDeleteTransaction,
      handleEditTransaction,
      handleEndReached,
      handleExport,
      handleLongPressTransaction,
      handleNextMonth,
      handleNextPeriod,
      handleOpenDetail,
      handlePrevMonth,
      handlePrevPeriod,
      handleRefresh,
      handleResetFilters,
      handleSelectTypeFilter,
      handleSelectMonth,
      handleToggleAllTime,
      setFilterModalVisible,
      setFilters,
      setSearchQuery,
    },
    state: {
      activeFiltersCount,
      currencyCode,
      dateGroups,
      exporting,
      filterModalVisible,
      filters,
      hasAnyFilterOrSearch,
      hasMore,
      isAllTime,
      language,
      loading,
      loadingMore,
      monthYearLabel,
      period,
      primaryLabel,
      refreshing,
      searchQuery,
      selectedMonth,
      selectedYear,
      secondaryLabel,
      t,
      totalExpenseMinor,
      totalIncomeMinor,
      transactions,
    },
  };
}
