import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { getCategoryMeta } from '@/features/categories/category-meta';
import { TransactionDateGroupHeader } from '@/features/transactions/components/transaction-date-group-header';
import { TransactionRowItem } from '@/features/transactions/components/transaction-row-item';
import { TransactionFilterModal } from '@/features/transactions/transaction-filter-modal';
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  type SaveTransactionInput,
  type TransactionFilters,
  type TransactionListItem,
} from '@/features/transactions/transaction-repository';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import type { Language, TranslationSchema } from '@/lib/i18n/translations';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

type HistoryRow =
  | Readonly<{
      key: string;
      kind: 'header';
      localDate: string;
      totalNetMinor: number;
    }>
  | Readonly<{
      key: string;
      kind: 'transaction';
      transaction: TransactionListItem;
    }>;

function formatGroupDate(
  localDate: string,
  language: Language,
  t: TranslationSchema,
) {
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
    return t.transactions.today;
  }
  if (localDate === yesterdayKey) {
    return t.transactions.yesterday;
  }
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function buildRows(items: readonly TransactionListItem[]) {
  const rows: HistoryRow[] = [];
  const grouped: Record<string, TransactionListItem[]> = {};
  for (const transaction of items) {
    if (!grouped[transaction.localDate]) {
      grouped[transaction.localDate] = [];
    }
    grouped[transaction.localDate]!.push(transaction);
  }

  for (const [date, txList] of Object.entries(grouped)) {
    const totalNetMinor = txList.reduce((acc, tx) => {
      return tx.type === 'income' ? acc + tx.amountMinor : acc - tx.amountMinor;
    }, 0);

    rows.push({
      key: `date-${date}`,
      kind: 'header',
      localDate: date,
      totalNetMinor,
    });

    for (const transaction of txList) {
      rows.push({
        key: `transaction-${transaction.id}`,
        kind: 'transaction',
        transaction,
      });
    }
  }

  return rows;
}

export function TransactionHistoryScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { colors, isDark } = useTheme();
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
    if (filters.hasReceipt !== undefined) count += 1;
    if (filters.isNonCash !== undefined) count += 1;
    if (filters.minAmountMinor !== undefined) count += 1;
    return count;
  }, [filters]);

  const rows = useMemo(() => buildRows(items), [items]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setFilters({});
  };

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
      void loadFirstPage('refresh');
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastVisible(false);
      }, 2500);
    } catch (err) {
      if (__DEV__) console.warn('Could not execute undo action', err);
    } finally {
      setIsUndoing(false);
    }
  }, [database, isUndoing, language, loadFirstPage, undoCreatedTransactionId, undoDeletedPayload]);

  const handleToggleQuickType = (type: 'expense' | 'income' | 'all') => {
    setFilters((prev) => {
      if (type === 'all') {
        const { type: _, ...rest } = prev;
        return rest;
      }
      if (prev.type === type) {
        const { type: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, type };
    });
  };

  const handleToggleQuickReceipt = () => {
    setFilters((prev) => {
      if (prev.hasReceipt === true) {
        const { hasReceipt: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, hasReceipt: true };
    });
  };

  const handleToggleQuickReimbursable = () => {
    setFilters((prev) => {
      if (prev.isReimbursable === true) {
        const { isReimbursable: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, isReimbursable: true };
    });
  };

  const handleToggleQuickNonCash = () => {
    setFilters((prev) => {
      if (prev.isNonCash === true) {
        const { isNonCash: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, isNonCash: true };
    });
  };

  const handleToggleQuickHighAmount = () => {
    setFilters((prev) => {
      if (prev.minAmountMinor === 100_000) {
        const { minAmountMinor: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, minAmountMinor: 100_000 };
    });
  };

  const handleOpenTransaction = useCallback(
    (id: number) => {
      router.push(`/transactions/${id}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item: row }: { item: HistoryRow }) => {
      if (row.kind === 'header') {
        const formattedDate = formatGroupDate(row.localDate, language, t);
        return (
          <TransactionDateGroupHeader
            formattedDate={formattedDate}
            totalNetMinor={row.totalNetMinor}
          />
        );
      }

      const idx = rows.findIndex((r) => r.key === row.key);
      const isLast =
        idx === rows.length - 1 || rows[idx + 1]?.kind === 'header';

      return (
        <TransactionRowItem
          isLast={isLast}
          onPress={handleOpenTransaction}
          receiptBadgeText={t.home.receiptBadge}
          reimbursableBadgeText={t.transactions.reimbursableBadge}
          transaction={row.transaction}
        />
      );
    },
    [
      handleOpenTransaction,
      language,
      rows,
      t.home.receiptBadge,
      t.transactions.reimbursableBadge,
    ],
  );

  const headerBg = isDark ? '#0F172A' : '#1D4ED8';

  return (
    <Screen>
      {/* TOP SOLID BLUE HEADER */}
      <View style={[styles.solidHeader, { backgroundColor: headerBg }]}>
        {/* Row 1: Title + Filter button */}
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <Text
              accessibilityRole="header"
              style={styles.headerTitle}
            >
              {t.transactions.title}
            </Text>
            <Text style={styles.headerSubtitle}>
              {t.transactions.subtitle}
            </Text>
          </View>

          <Pressable
            accessibilityLabel={
              activeFilterCount > 0
                ? `${t.transactions.filters} (${activeFilterCount})`
                : t.transactions.filters
            }
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setFiltersVisible(true)}
            style={({ pressed }) => [
              styles.filterHeaderBtn,
              activeFilterCount > 0
                ? { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: '#FFFFFF' }
                : { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.35)' },
              pressed ? styles.pressed : null,
            ]}
          >
            <MaterialCommunityIcons
              color='#FFFFFF'
              name='tune-variant'
              size={20}
            />
            {activeFilterCount > 0 ? (
              <View
                style={[
                  styles.filterBadgePill,
                  { backgroundColor: '#FFFFFF' },
                ]}
              >
                <Text style={[styles.filterBadgeText, { color: headerBg }]}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* Row 2: Search bar embedded in header */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.25)' },
          ]}
        >
          <MaterialCommunityIcons
            color='rgba(255,255,255,0.7)'
            name='magnify'
            size={20}
          />
          <TextInput
            accessibilityLabel={t.transactions.searchPlaceholder}
            onChangeText={setSearch}
            placeholder={t.transactions.searchPlaceholder}
            placeholderTextColor='rgba(255,255,255,0.55)'
            style={[styles.searchInput, { color: '#FFFFFF' }]}
            value={search}
          />
          {search.length > 0 ? (
            <Pressable
              accessibilityLabel='Clear search'
              hitSlop={8}
              onPress={() => setSearch('')}
            >
              <MaterialCommunityIcons
                color='rgba(255,255,255,0.7)'
                name='close-circle'
                size={18}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
      {/* Quick Filters */}
      <View style={[styles.controls, { backgroundColor: colors.background }]}>
        {/* Quick Filter Chips Horizontal Scroll */}
        <ScrollView
          contentContainerStyle={styles.quickFiltersTrack}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {/* Chip 1: Semua (All) */}
          <Pressable
            accessibilityRole="button"
            onPress={() => handleToggleQuickType('all')}
            style={({ pressed }) => [
              styles.quickChip,
              {
                backgroundColor:
                  filters.type === undefined &&
                  !filters.hasReceipt &&
                  !filters.isReimbursable &&
                  !filters.isNonCash &&
                  filters.minAmountMinor === undefined
                    ? colors.primary
                    : isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                borderColor:
                  filters.type === undefined &&
                  !filters.hasReceipt &&
                  !filters.isReimbursable &&
                  !filters.isNonCash &&
                  filters.minAmountMinor === undefined
                    ? colors.primary
                    : colors.border,
              },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              style={[
                styles.quickChipText,
                {
                  color:
                    filters.type === undefined &&
                    !filters.hasReceipt &&
                    !filters.isReimbursable &&
                    !filters.isNonCash &&
                    filters.minAmountMinor === undefined
                      ? '#FFFFFF'
                      : colors.textPrimary,
                },
              ]}
            >
              {t.transactions.all}
            </Text>
          </Pressable>

          {/* Chip 2: 📎 Ada Struk (Has Receipt) */}
          <Pressable
            accessibilityRole="button"
            onPress={handleToggleQuickReceipt}
            style={({ pressed }) => [
              styles.quickChip,
              {
                backgroundColor:
                  filters.hasReceipt === true
                    ? isDark
                      ? '#312E81'
                      : '#EDE9FE'
                    : isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                borderColor:
                  filters.hasReceipt === true ? '#7C3AED' : colors.border,
              },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              style={[
                styles.quickChipText,
                {
                  color:
                    filters.hasReceipt === true
                      ? '#7C3AED'
                      : colors.textPrimary,
                },
              ]}
            >
              📎 {t.transactions.withReceipt}
            </Text>
          </Pressable>

          {/* Chip 3: 💼 Klaim Kantor (Reimbursable) */}
          <Pressable
            accessibilityRole="button"
            onPress={handleToggleQuickReimbursable}
            style={({ pressed }) => [
              styles.quickChip,
              {
                backgroundColor:
                  filters.isReimbursable === true
                    ? isDark
                      ? '#78350F'
                      : '#FEF3C7'
                    : isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                borderColor:
                  filters.isReimbursable === true ? '#D97706' : colors.border,
              },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              style={[
                styles.quickChipText,
                {
                  color:
                    filters.isReimbursable === true
                      ? '#D97706'
                      : colors.textPrimary,
                },
              ]}
            >
              💼 {t.transactions.reimbursable}
            </Text>
          </Pressable>

          {/* Chip 4: 💳 Non-Tunai (Non-Cash) */}
          <Pressable
            accessibilityRole="button"
            onPress={handleToggleQuickNonCash}
            style={({ pressed }) => [
              styles.quickChip,
              {
                backgroundColor:
                  filters.isNonCash === true
                    ? isDark
                      ? '#0E7490'
                      : '#CFFAFE'
                    : isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                borderColor:
                  filters.isNonCash === true ? '#0891B2' : colors.border,
              },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              style={[
                styles.quickChipText,
                {
                  color:
                    filters.isNonCash === true
                      ? '#0891B2'
                      : colors.textPrimary,
                },
              ]}
            >
              💳 {t.transactions.nonCash}
            </Text>
          </Pressable>

          {/* Chip 5: 💰 > Rp 100k (> 100k) */}
          <Pressable
            accessibilityRole="button"
            onPress={handleToggleQuickHighAmount}
            style={({ pressed }) => [
              styles.quickChip,
              {
                backgroundColor:
                  filters.minAmountMinor === 100_000
                    ? isDark
                      ? '#831843'
                      : '#FCE7F3'
                    : isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                borderColor:
                  filters.minAmountMinor === 100_000
                    ? '#DB2777'
                    : colors.border,
              },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              style={[
                styles.quickChipText,
                {
                  color:
                    filters.minAmountMinor === 100_000
                      ? '#DB2777'
                      : colors.textPrimary,
                },
              ]}
            >
              💰 {t.transactions.above100k}
            </Text>
          </Pressable>

          {/* Chip 6: 💸 Pengeluaran (Expense) */}
          <Pressable
            accessibilityRole="button"
            onPress={() => handleToggleQuickType('expense')}
            style={({ pressed }) => [
              styles.quickChip,
              {
                backgroundColor:
                  filters.type === 'expense'
                    ? isDark
                      ? '#7F1D1D'
                      : '#FEE2E2'
                    : isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                borderColor:
                  filters.type === 'expense'
                    ? colors.destructive
                    : colors.border,
              },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              style={[
                styles.quickChipText,
                {
                  color:
                    filters.type === 'expense'
                      ? colors.destructive
                      : colors.textPrimary,
                },
              ]}
            >
              💸 {t.transactions.expense}
            </Text>
          </Pressable>

          {/* Chip 7: 💵 Pemasukan (Income) */}
          <Pressable
            accessibilityRole="button"
            onPress={() => handleToggleQuickType('income')}
            style={({ pressed }) => [
              styles.quickChip,
              {
                backgroundColor:
                  filters.type === 'income'
                    ? isDark
                      ? '#14532D'
                      : '#DCFCE7'
                    : isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                borderColor:
                  filters.type === 'income' ? colors.positive : colors.border,
              },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              style={[
                styles.quickChipText,
                {
                  color:
                    filters.type === 'income'
                      ? colors.positive
                      : colors.textPrimary,
                },
              ]}
            >
              💵 {t.transactions.income}
            </Text>
          </Pressable>
        </ScrollView>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {/* Main List */}
      {loading && items.length === 0 ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            {t.transactions.loading}
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
                  name={
                    search.trim().length > 0 || activeFilterCount > 0
                      ? 'filter-remove-outline'
                      : 'receipt-text-plus-outline'
                  }
                  size={42}
                />
              </View>
              <Text
                accessibilityRole="header"
                style={[styles.emptyTitle, { color: colors.textPrimary }]}
              >
                {search.trim().length > 0 || activeFilterCount > 0
                  ? t.transactions.noMatchingTitle
                  : t.transactions.noTransactionsTitle}
              </Text>
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                {search.trim().length > 0 || activeFilterCount > 0
                  ? t.transactions.noMatchingDesc
                  : t.transactions.noTransactionsDesc}
              </Text>
              <View style={styles.emptyAction}>
                {search.trim().length > 0 || activeFilterCount > 0 ? (
                  <AppButton
                    label={t.transactions.resetFilter}
                    onPress={handleResetFilters}
                    variant="secondary"
                  />
                ) : (
                  <AppButton
                    label={t.transactions.addTransaction}
                    onPress={() => router.push('/transactions/new')}
                    variant="primary"
                  />
                )}
              </View>
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
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          onEndReached={() => void loadNextPage()}
          onEndReachedThreshold={0.4}
          onRefresh={() => void loadFirstPage('refresh')}
          refreshing={refreshing}
          removeClippedSubviews={true}
          renderItem={renderItem}
          updateCellsBatchingPeriod={50}
          windowSize={5}
        />
      )}

      {/* Filter Modal */}
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

      {/* Modern Floating Undo Toast */}
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

  controls: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  dateHeaderNet: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateHeaderPill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dateHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md + 4,
  },
  dateHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyAction: {
    marginTop: spacing.lg,
    width: '100%',
  },
  emptyIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 76,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 76,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  error: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 2,
  },

  feedbackBanner: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterBadgePill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 18,
    justifyContent: 'center',
    marginLeft: 2,
    paddingHorizontal: 5,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  filterHeaderBtn: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 4,
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  footerLoader: {
    padding: spacing.lg,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 12,
    fontWeight: '500',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  list: {
    paddingBottom: 130,
    paddingTop: spacing.xs,
  },
  pressed: {
    opacity: 0.78,
  },
  solidHeader: {
    elevation: 4,
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    shadowColor: '#1D4ED8',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  quickChip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickFiltersTrack: {
    gap: spacing.xs + 2,
    paddingVertical: 2,
  },
  receiptPill: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  receiptPillText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '700',
  },
  reimbursablePill: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  reimbursablePillText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },

  searchContainer: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  timelineAmount: {
    flexShrink: 0,
    fontSize: 14,
    fontWeight: '800',
  },
  timelineCategoryName: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  timelineContentCol: {
    flex: 1,
    gap: 3,
    minWidth: 0,
    paddingBottom: 10,
    paddingTop: 2,
  },
  timelineDot: {
    borderRadius: radius.pill,
    height: 10,
    marginTop: 6,
    width: 10,
  },
  timelineItemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8,
  },
  timelineLine: {
    flex: 1,
    marginTop: 2,
    width: 2,
  },
  timelineMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
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