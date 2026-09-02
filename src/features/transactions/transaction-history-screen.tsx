import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import { TransactionDateGroupHeader } from '@/features/transactions/components/transaction-date-group-header';
import { TransactionHistoryEmptyState } from '@/features/transactions/components/transaction-history-empty-state';
import { TransactionHistoryHeader } from '@/features/transactions/components/transaction-history-header';
import { TransactionHistorySearchToolbar } from '@/features/transactions/components/transaction-history-search-toolbar';
import { TransactionHistorySummaryBar } from '@/features/transactions/components/transaction-history-summary-bar';
import { TransactionRowItem } from '@/features/transactions/components/transaction-row-item';
import {
  useTransactionHistoryViewModel,
  type DateGroup,
} from '@/features/transactions/hooks/use-transaction-history-view-model';
import { TransactionFilterModal } from '@/features/transactions/transaction-filter-modal';
import { useTabBarVisibility } from '@/lib/navigation/tab-bar-visibility-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { contentMaxWidth } from '@/theme/layout';
import { spacing } from '@/theme/spacing';

export function TransactionHistoryScreen() {
  const { colors } = useTheme();
  const { handleScroll } = useTabBarVisibility();
  const { actions, state } = useTransactionHistoryViewModel();
  const initialLoading = state.loading && state.dateGroups.length === 0;

  const renderItem = useCallback(
    ({ item }: { item: DateGroup }) => (
      <View
        style={[
          styles.dateGroupCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadow,
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
              onDelete={actions.handleDeleteTransaction}
              onEdit={actions.handleEditTransaction}
              onLongPress={actions.handleLongPressTransaction}
              onPress={actions.handleOpenDetail}
              receiptBadgeText={state.t.home.receiptBadge}
              reimbursableBadgeText={state.t.transactions.reimbursementStatus}
              transaction={tx}
            />
          ))}
        </View>
      </View>
    ),
    [actions, colors, state.t],
  );

  return (
    <Screen>
      <View style={styles.topControlsStack}>
        {/* 1. Month navigation and period tabs */}
        <TransactionHistoryHeader
          activePeriod={state.period}
          exporting={state.exporting}
          language={state.language}
          monthLabel={state.monthYearLabel}
          onChangePeriod={actions.handleChangePeriod}
          onExport={() => void actions.handleExport()}
          onNextMonth={actions.handleNextMonth}
          onPrevMonth={actions.handlePrevMonth}
          onSelectMonth={actions.handleSelectMonth}
          selectedMonth={state.selectedMonth}
          selectedYear={state.selectedYear}
        />

        {/* 2. Cash-flow summary bar */}
        {!initialLoading ? (
          <TransactionHistorySummaryBar
            activeTypeFilter={state.filters.type}
            currencyCode={state.currencyCode}
            expenseLabel={state.t.transactions.expense}
            incomeLabel={state.t.transactions.income}
            netLabel={state.t.analytics.netFlow}
            onSelectTypeFilter={actions.handleSelectTypeFilter}
            totalExpenseMinor={state.totalExpenseMinor}
            totalIncomeMinor={state.totalIncomeMinor}
          />
        ) : null}

        {/* 3. Search and advanced filters */}
        <TransactionHistorySearchToolbar
          activeFiltersCount={state.activeFiltersCount}
          language={state.language}
          onClearSearch={() => actions.setSearchQuery('')}
          onOpenFilter={() => actions.setFilterModalVisible(true)}
          onSearchChange={actions.setSearchQuery}
          searchQuery={state.searchQuery}
          t={state.t}
        />
      </View>

      {/* 4. Main Infinite Scroll Transaction Feed */}
      <FlatList
        contentContainerStyle={styles.listContent}
        data={state.dateGroups}
        keyExtractor={(group) => group.key}
        ListEmptyComponent={
          initialLoading ? (
            <View accessibilityLiveRegion="polite" style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text
                style={[styles.loadingText, { color: colors.textSecondary }]}
              >
                {state.t.transactions.loading}
              </Text>
            </View>
          ) : (
            <TransactionHistoryEmptyState
              hasFilters={state.hasAnyFilterOrSearch}
              onAddTransaction={actions.handleAddTransaction}
              onResetFilters={actions.handleResetFilters}
              t={state.t}
            />
          )
        }
        ListFooterComponent={
          state.loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : null
        }
        onEndReached={actions.handleEndReached}
        onEndReachedThreshold={0.3}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => void actions.handleRefresh()}
            refreshing={state.refreshing}
            tintColor={colors.primary}
          />
        }
        renderItem={renderItem}
        scrollEventThrottle={16}
      />

      {/* 5. Comprehensive Filter Modal Sheet */}
      <TransactionFilterModal
        filters={state.filters}
        onApply={(f) => {
          actions.setFilters(f);
          actions.setFilterModalVisible(false);
        }}
        onClose={() => actions.setFilterModalVisible(false)}
        visible={state.filterModalVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateGroupCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    overflow: 'hidden',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  listContent: {
    alignSelf: 'center',
    gap: spacing.md,
    maxWidth: contentMaxWidth,
    paddingBottom: spacing.xxl + 40,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    width: '100%',
  },
  loadingMoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  loadingState: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 220,
  },
  loadingText: {
    fontSize: 14,
  },
  timelineItemsWrap: {
    paddingVertical: spacing.xs,
  },
  topControlsStack: {
    gap: spacing.sm + 2,
    paddingBottom: 2,
  },
});
