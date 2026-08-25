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
import { UndoToastBanner } from '@/components/ui/undo-toast-banner';
import { TransactionDateGroupHeader } from '@/features/transactions/components/transaction-date-group-header';
import { TransactionDateNavigator } from '@/features/transactions/components/transaction-date-navigator';
import { TransactionHistoryEmptyState } from '@/features/transactions/components/transaction-history-empty-state';
import { TransactionHistoryHeader } from '@/features/transactions/components/transaction-history-header';
import { TransactionHistorySearchToolbar } from '@/features/transactions/components/transaction-history-search-toolbar';
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
      {/* 1. Screen title and low-frequency export action */}
      <TransactionHistoryHeader
        activeFiltersCount={state.activeFiltersCount}
        exporting={state.exporting}
        onClearSearch={() => actions.setSearchQuery('')}
        onExport={() => void actions.handleExport()}
        onOpenFilter={() => actions.setFilterModalVisible(true)}
        onSearchChange={actions.setSearchQuery}
        searchQuery={state.searchQuery}
        showSearchAndFilter={false}
        t={state.t}
      />

      {/* 2. Period and date form one decision area. */}
      <View
        style={[
          styles.periodPanel,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <TransactionPeriodSegmentedControl
          activePeriod={state.period}
          embedded
          language={state.language}
          onChangePeriod={actions.handleChangePeriod}
        />
        <TransactionDateNavigator
          embedded
          isAllTime={state.isAllTime}
          language={state.language}
          onNextPeriod={actions.handleNextPeriod}
          onPrevPeriod={actions.handlePrevPeriod}
          onToggleAllTime={actions.handleToggleAllTime}
          period={state.period}
          primaryLabel={state.primaryLabel}
          secondaryLabel={state.secondaryLabel}
        />
      </View>

      {/* 3. Cash-flow summary doubles as a type filter. */}
      {!initialLoading ? (
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
      ) : null}

      {/* 4. Search and advanced filters support the list below. */}
      <TransactionHistorySearchToolbar
        activeFiltersCount={state.activeFiltersCount}
        language={state.language}
        onClearSearch={() => actions.setSearchQuery('')}
        onOpenFilter={() => actions.setFilterModalVisible(true)}
        onSearchChange={actions.setSearchQuery}
        searchQuery={state.searchQuery}
        t={state.t}
      />

      {/* 5. Main Infinite Scroll Transaction Feed */}
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
    alignSelf: 'center',
    gap: spacing.md,
    maxWidth: contentMaxWidth,
    paddingBottom: spacing.xxl + 40,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    width: '100%',
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
  loadingMoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  periodPanel: {
    alignSelf: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.xs,
    maxWidth: contentMaxWidth - spacing.md * 2,
    padding: spacing.sm,
    width: '92%',
  },
  timelineItemsWrap: {
    paddingVertical: spacing.xs,
  },
});
