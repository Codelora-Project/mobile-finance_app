import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { CreateGoalModal } from '@/features/goals/components/create-goal-modal';
import { DepositGoalModal } from '@/features/goals/components/deposit-goal-modal';
import { GoalCard } from '@/features/goals/components/goal-card';
import { GoalsHeader } from '@/features/goals/components/goals-header';
import { GoalsSummaryCard } from '@/features/goals/components/goals-summary-card';
import {
  useGoalsViewModel,
  type GoalsFilterTab,
} from '@/features/goals/hooks/use-goals-view-model';
import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function GoalsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { actions, state } = useGoalsViewModel();

  return (
    <Screen>
      {/* 1. Page Header */}
      <GoalsHeader
        backLabel={state.t.common.back}
        onBack={() => router.back()}
        onOpenCreateGoal={actions.openCreateModal}
        t={state.t}
      />

      {state.error ? (
        <View accessibilityLiveRegion="assertive" style={styles.errorPanel}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {state.error}
          </Text>
          <AppButton
            label={state.t.common.tryAgain}
            onPress={() => void actions.load()}
          />
        </View>
      ) : null}

      {state.loading && state.goals.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={state.filteredGoals}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="bullseye-arrow"
                size={56}
              />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {state.t.goals.noGoalsYet}
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                {state.t.goals.noGoalsDesc}
              </Text>
              <View style={styles.emptyBtnWrap}>
                <AppButton
                  label={state.t.goals.createFirstGoal}
                  onPress={actions.openCreateModal}
                  variant="primary"
                />
              </View>
            </View>
          }
          ListHeaderComponent={
            <View style={styles.headerStack}>
              {/* Savings Summary Hero Card */}
              {state.summary && state.summary.totalTargetMinor > 0 ? (
                <GoalsSummaryCard summary={state.summary} t={state.t} />
              ) : null}

              {/* Status Filter Tabs */}
              <View style={styles.filterTabsRow}>
                {(
                  [
                    { key: 'all', label: state.t.goals.all },
                    { key: 'active', label: state.t.goals.active },
                    { key: 'completed', label: state.t.goals.completed },
                  ] as const
                ).map((tab) => {
                  const isSelected = state.filterTab === tab.key;
                  return (
                    <Pressable
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isSelected }}
                      key={tab.key}
                      onPress={() =>
                        actions.setFilterTab(tab.key as GoalsFilterTab)
                      }
                      style={[
                        styles.filterTabBtn,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : colors.surface,
                          borderColor: isSelected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterTabText,
                          {
                            color: isSelected
                              ? colors.onPrimary
                              : colors.textSecondary,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          }
          onRefresh={() => void actions.load()}
          refreshing={state.loading}
          renderItem={({ item: goal }) => (
            <GoalCard
              goal={goal}
              onDepositPress={() => actions.openDepositModal(goal)}
              onPress={() => actions.navigateToDetail(goal.id)}
            />
          )}
        />
      )}

      {/* 2. New Goal Modal */}
      <CreateGoalModal
        formError={state.formError}
        initialDeposit={state.initialDeposit}
        name={state.name}
        onChangeInitialDeposit={actions.setInitialDeposit}
        onChangeName={actions.setName}
        onChangeSelectedColor={actions.setSelectedColor}
        onChangeSelectedIcon={actions.setSelectedIcon}
        onChangeTargetAmount={actions.setTargetAmount}
        onClose={actions.closeCreateModal}
        onSubmit={() => void actions.handleCreateGoal()}
        saving={state.saving}
        selectedColor={state.selectedColor}
        selectedIcon={state.selectedIcon}
        t={state.t}
        targetAmount={state.targetAmount}
        visible={state.newGoalModalVisible}
      />

      {/* 3. Quick Deposit Modal */}
      <DepositGoalModal
        depositAmount={state.depositAmount}
        depositError={state.depositError}
        depositGoal={state.depositGoal}
        depositNote={state.depositNote}
        onChangeAmount={actions.setDepositAmount}
        onChangeNote={actions.setDepositNote}
        onClose={actions.closeDepositModal}
        onSubmit={() => void actions.handleDeposit()}
        saving={state.saving}
        t={state.t}
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
  emptyBtnWrap: {
    marginTop: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptySubtitle: {
    ...typography.metadata,
    maxWidth: 260,
    textAlign: 'center',
  },
  emptyTitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  errorPanel: {
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  errorText: {
    ...typography.metadata,
  },
  filterTabBtn: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  filterTabText: {
    ...typography.metadata,
    fontSize: 12,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  headerStack: {
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  listContent: {
    alignSelf: 'center',
    gap: spacing.md,
    maxWidth: contentMaxWidth,
    paddingBottom: spacing.xxl + 24,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    width: '100%',
  },
});
