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
import { TransactionFilterModal } from '@/features/transactions/transaction-filter-modal';
import {
  listTransactions,
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
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const { language, t } = useLanguage();
  const { colors, isDark } = useTheme();
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
    if (filters.hasReceipt !== undefined) count += 1;
    return count;
  }, [filters]);

  const rows = useMemo(() => buildRows(items), [items]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setFilters({});
  };

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

  return (
    <Screen>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.textPrimary }]}
          >
            {t.transactions.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
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
            {
              backgroundColor:
                activeFilterCount > 0
                  ? isDark
                    ? '#1E3A8A'
                    : '#EFF6FF'
                  : isDark
                    ? colors.surfaceSecondary
                    : '#F1F5F9',
              borderColor:
                activeFilterCount > 0
                  ? colors.primary
                  : isDark
                    ? colors.border
                    : '#E2E8F0',
            },
            pressed ? styles.pressed : null,
          ]}
        >
          <MaterialCommunityIcons
            color={activeFilterCount > 0 ? colors.primary : colors.textPrimary}
            name="tune-variant"
            size={20}
          />
          {activeFilterCount > 0 ? (
            <View
              style={[
                styles.filterBadgePill,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Search & Quick Filter Section */}
      <View style={styles.controls}>
        {feedbackMessage ? (
          <View
            style={[
              styles.feedbackBanner,
              {
                backgroundColor: isDark ? '#064E3B' : '#DCFCE7',
                borderColor: isDark ? '#065F46' : '#BBF7D0',
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.positive}
              name="check-circle"
              size={18}
            />
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.feedbackText, { color: colors.positive }]}
            >
              {feedbackMessage}
            </Text>
          </View>
        ) : null}

        {/* Modern Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.textPrimary,
            },
          ]}
        >
          <MaterialCommunityIcons
            color={colors.textSecondary}
            name="magnify"
            size={20}
          />
          <TextInput
            accessibilityLabel={t.transactions.searchPlaceholder}
            onChangeText={setSearch}
            placeholder={t.transactions.searchPlaceholder}
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={search}
          />
          {search.length > 0 ? (
            <Pressable
              accessibilityLabel="Clear search"
              hitSlop={8}
              onPress={() => setSearch('')}
            >
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="close-circle"
                size={18}
              />
            </Pressable>
          ) : null}
        </View>

        {/* Quick Filter Chips Horizontal Scroll */}
        <ScrollView
          contentContainerStyle={styles.quickFiltersTrack}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => handleToggleQuickType('all')}
            style={({ pressed }) => [
              styles.quickChip,
              {
                backgroundColor:
                  filters.type === undefined &&
                  !filters.hasReceipt &&
                  !filters.isReimbursable
                    ? colors.primary
                    : isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                borderColor:
                  filters.type === undefined &&
                  !filters.hasReceipt &&
                  !filters.isReimbursable
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
                    !filters.isReimbursable
                      ? '#FFFFFF'
                      : colors.textPrimary,
                },
              ]}
            >
              {t.transactions.all}
            </Text>
          </Pressable>

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
              💰 {t.transactions.income}
            </Text>
          </Pressable>

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
          onEndReached={() => void loadNextPage()}
          onEndReachedThreshold={0.4}
          onRefresh={() => void loadFirstPage('refresh')}
          refreshing={refreshing}
          renderItem={({ item: row }) => {
            if (row.kind === 'header') {
              const formattedDate = formatGroupDate(row.localDate, language, t);
              const formattedDaily =
                row.totalNetMinor >= 0
                  ? `+${formatMoney(row.totalNetMinor, 'IDR')}`
                  : `−${formatMoney(Math.abs(row.totalNetMinor), 'IDR')}`;

              return (
                <View style={styles.dateHeaderRow}>
                  <Text
                    style={[
                      styles.dateHeaderTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {formattedDate}
                  </Text>
                  <Text
                    style={[
                      styles.dateHeaderNet,
                      {
                        color:
                          row.totalNetMinor >= 0
                            ? colors.positive
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {formattedDaily}
                  </Text>
                </View>
              );
            }

            const transaction = row.transaction;
            const meta = getCategoryMeta(
              transaction.categoryName,
              transaction.type,
              isDark,
            );
            const title =
              transaction.counterparty?.trim() || transaction.categoryName;

            return (
              <View
                style={[
                  styles.cardContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    shadowColor: colors.textPrimary,
                  },
                ]}
              >
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
                  {/* Category Avatar Badge */}
                  <View
                    style={[
                      styles.avatarBadge,
                      { backgroundColor: meta.backgroundColor },
                    ]}
                  >
                    <MaterialCommunityIcons
                      accessibilityElementsHidden
                      color={meta.color}
                      importantForAccessibility="no-hide-descendants"
                      name={meta.icon}
                      size={24}
                    />
                  </View>

                  {/* Info Column */}
                  <View style={styles.rowText}>
                    <Text
                      numberOfLines={1}
                      style={[styles.rowTitle, { color: colors.textPrimary }]}
                    >
                      {title}
                    </Text>

                    <View style={styles.rowMetadataWrap}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.rowMetadata,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {transaction.categoryName}
                      </Text>

                      {transaction.hasReceipt ? (
                        <View
                          style={[
                            styles.receiptPill,
                            {
                              backgroundColor: isDark ? '#312E81' : '#EDE9FE',
                              borderColor: isDark ? '#4338CA' : '#DDD6FE',
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            color="#7C3AED"
                            name="receipt-outline"
                            size={10}
                          />
                          <Text style={styles.receiptPillText}>
                            {t.home.receiptBadge}
                          </Text>
                        </View>
                      ) : null}

                      {transaction.isReimbursable ? (
                        <View
                          style={[
                            styles.reimbursablePill,
                            {
                              backgroundColor: isDark ? '#78350F' : '#FEF3C7',
                              borderColor: isDark ? '#92400E' : '#FDE68A',
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            color="#D97706"
                            name="briefcase-outline"
                            size={10}
                          />
                          <Text style={styles.reimbursablePillText}>
                            {t.transactions.reimbursableBadge}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Amount Column */}
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
              </View>
            );
          }}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarBadge: {
    alignItems: 'center',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 2,
    marginHorizontal: spacing.md,
    marginVertical: 4,
    overflow: 'hidden',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  controls: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  dateHeaderNet: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  dateHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
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
  expenseAmount: {
    flexShrink: 0,
    fontSize: 15,
    fontWeight: '800',
    paddingLeft: spacing.xs,
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
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  incomeAmount: {
    flexShrink: 0,
    fontSize: 15,
    fontWeight: '800',
    paddingLeft: spacing.xs,
  },
  list: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.xs,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
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
  rowMetadata: {
    fontSize: 12,
    fontWeight: '500',
  },
  rowMetadataWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  rowText: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  searchContainer: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 2,
    flexDirection: 'row',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
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
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  transactionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
});
