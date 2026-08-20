import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import { UndoToastBanner } from '@/components/ui/undo-toast-banner';
import { TransactionDateGroupHeader } from '@/features/transactions/components/transaction-date-group-header';
import { TransactionDateNavigator } from '@/features/transactions/components/transaction-date-navigator';
import { TransactionHistoryEmptyState } from '@/features/transactions/components/transaction-history-empty-state';
import { TransactionHistoryHeader } from '@/features/transactions/components/transaction-history-header';
import { TransactionHistorySummaryBar } from '@/features/transactions/components/transaction-history-summary-bar';
import { TransactionPeriodSegmentedControl } from '@/features/transactions/components/transaction-period-segmented-control';
import { TransactionRowItem } from '@/features/transactions/components/transaction-row-item';
import {
  useTransactionHistoryViewModel,
  type DateGroup,
} from '@/features/transactions/hooks/use-transaction-history-view-model';
import { TransactionFilterModal } from '@/features/transactions/transaction-filter-modal';
import { useTabBarVisibility } from '@/lib/navigation/tab-bar-visibility-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

export function TransactionHistoryScreen() {
  const { colors } = useTheme();
  const { handleScroll } = useTabBarVisibility();
  const { actions, state } = useTransactionHistoryViewModel();

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
              onDelete={actions.handleDeleteTransaction}
              onEdit={actions.handleEditTransaction}
              onLongPress={actions.handleLongPressTransaction}
              onPress={actions.handleOpenDetail}
              receiptBadgeText={state.t.home.receiptBadge}
              reimbursableBadgeText={
                state.t.transactions.reimbursementStatus || 'Reimburse'
              }
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
      {/* 1. Header Toolbar with search bar */}
      <TransactionHistoryHeader
        activeFiltersCount={state.activeFiltersCount}
        onClearSearch={() => actions.setSearchQuery('')}
        onExport={() => void actions.handleExport()}
        onOpenFilter={() => actions.setFilterModalVisible(true)}
        onSearchChange={actions.setSearchQuery}
        searchQuery={state.searchQuery}
        t={state.t}
      />

      {/* 2. Top Segmented Period Picker (Daily / Weekly / Monthly) */}
      <TransactionPeriodSegmentedControl
        activePeriod={state.period}
        language={state.language}
        onChangePeriod={actions.handleChangePeriod}
      />

      {/* 3. Date & Period Navigator Bar */}
      <TransactionDateNavigator
        isAllTime={state.isAllTime}
        language={state.language}
        onNextPeriod={actions.handleNextPeriod}
        onPrevPeriod={actions.handlePrevPeriod}
        onToggleAllTime={actions.handleToggleAllTime}
        period={state.period}
        primaryLabel={state.primaryLabel}
        secondaryLabel={state.secondaryLabel}
      />

      {/* 4. Income / Expense / Net Summary also acts as the quick type filter. */}
      <TransactionHistorySummaryBar
        activeTypeFilter={state.filters.type}
        currencyCode={state.currencyCode}
        expenseLabel={state.t.transactions.expense}
        incomeLabel={state.t.transactions.income}
        netLabel={state.language === 'id' ? 'Arus Bersih' : 'Net Flow'}
        onSelectTypeFilter={actions.handleSelectTypeFilter}
        totalExpenseMinor={state.totalExpenseMinor}
        totalIncomeMinor={state.totalIncomeMinor}
      />

      {/* 5. Main Infinite Scroll Transaction Feed */}
      <FlatList
        contentContainerStyle={styles.listContent}
        data={state.dateGroups}
        keyExtractor={(group) => group.key}
        ListEmptyComponent={
          !state.loading ? (
            <TransactionHistoryEmptyState
              hasFilters={state.hasAnyFilterOrSearch}
              onAddTransaction={actions.handleAddTransaction}
              onResetFilters={actions.handleResetFilters}
              t={state.t}
            />
          ) : null
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

      {/* 6. Comprehensive Filter Modal Sheet */}
      <TransactionFilterModal
        filters={state.filters}
        onApply={(f) => {
          actions.setFilters(f);
          actions.setFilterModalVisible(false);
        }}
        onClose={() => actions.setFilterModalVisible(false)}
        visible={state.filterModalVisible}
      />

      <UndoToastBanner
        canUndo={state.undoCanUndo}
        isUndoing={state.undoIsRunning}
        message={state.undoMessage}
        onClose={actions.dismissUndo}
        onUndo={() => void actions.undo()}
        visible={state.undoVisible}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateGroupCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 2,
    overflow: 'hidden',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl + 40,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  loadingMoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  timelineItemsWrap: {
    paddingVertical: spacing.xs,
  },
});
