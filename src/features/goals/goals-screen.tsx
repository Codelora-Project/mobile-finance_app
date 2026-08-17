import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
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
  addGoalTransaction,
  createSavingsGoal,
  getGoalsSummary,
  listSavingsGoals,
  type GoalsSummary,
  type SavingsGoal,
} from '@/features/goals/goals-repository';
import {
  getHabitStats,
  type HabitStats,
} from '@/features/habits/habit-repository';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { parseIntegerInput } from '@/lib/strings';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function GoalsScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<readonly SavingsGoal[]>([]);
  const [summary, setSummary] = useState<GoalsSummary | null>(null);
  const [habitStats, setHabitStats] = useState<HabitStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'active' | 'all' | 'completed'>(
    'all',
  );

  // New Goal Modal State
  const [newGoalModalVisible, setNewGoalModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('target');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Deposit Modal State
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [depositError, setDepositError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalsList, sum, habits] = await Promise.all([
        listSavingsGoals(database),
        getGoalsSummary(database),
        getHabitStats(database),
      ]);
      setGoals(goalsList);
      setSummary(sum);
      setHabitStats(habits);
    } catch (err) {
      const mapped = mapError(err, 'DATABASE_WRITE_FAILED');
      setError(mapped.message);
    } finally {
      setLoading(false);
    }
  }, [database]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleCreateGoal = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError(t.goals.errorNameRequired);
      return;
    }
    const targetMinor = parseIntegerInput(targetAmount);
    if (!targetMinor || targetMinor <= 0) {
      setFormError(t.goals.errorTargetRequired);
      return;
    }
    const depositMinor = initialDeposit.trim()
      ? parseIntegerInput(initialDeposit) ?? 0
      : 0;

    setSaving(true);
    setFormError(null);
    try {
      await createSavingsGoal(database, {
        colorKey: selectedColor,
        iconKey: selectedIcon,
        initialDepositMinor: depositMinor > 0 ? depositMinor : undefined,
        name: trimmedName,
        targetAmountMinor: targetMinor,
      });

      setName('');
      setTargetAmount('');
      setInitialDeposit('');
      setSelectedIcon('target');
      setSelectedColor('#3B82F6');
      setNewGoalModalVisible(false);
      await load();
    } catch (err) {
      const mapped = mapError(err, 'DATABASE_WRITE_FAILED');
      setFormError(mapped.message);
    } finally {
      setSaving(false);
    }
  }, [
    database,
    initialDeposit,
    load,
    name,
    selectedColor,
    selectedIcon,
    t.goals,
    targetAmount,
  ]);

  const handleDeposit = useCallback(async () => {
    if (!depositGoal) return;
    const amountMinor = parseIntegerInput(depositAmount);
    if (!amountMinor || amountMinor <= 0) {
      setDepositError(t.goals.errorAmountInvalid);
      return;
    }

    setSaving(true);
    setDepositError(null);
    try {
      await addGoalTransaction(database, {
        amountMinor,
        goalId: depositGoal.id,
        note: depositNote.trim() || undefined,
        type: 'deposit',
      });
      setDepositGoal(null);
      setDepositAmount('');
      setDepositNote('');
      await load();
    } catch (err) {
      const mapped = mapError(err, 'DATABASE_WRITE_FAILED');
      setDepositError(mapped.message);
    } finally {
      setSaving(false);
    }
  }, [database, depositAmount, depositGoal, depositNote, load, t.goals]);

  const filteredGoals = useMemo(() => {
    if (filterTab === 'active') {
      return goals.filter((g) => !g.isCompleted);
    }
    if (filterTab === 'completed') {
      return goals.filter((g) => g.isCompleted);
    }
    return goals;
  }, [filterTab, goals]);

  return (
    <Screen>
      {/* 1. Page Header */}
      <GoalsHeader
        language={language}
        onOpenCreateGoal={() => {
          setFormError(null);
          setNewGoalModalVisible(true);
        }}
        streakCount={habitStats?.currentStreak ?? 0}
        t={t}
      />

      {error ? (
        <View style={styles.errorPanel}>
          <Text style={styles.errorText}>{error}</Text>
          <AppButton label={t.common.tryAgain} onPress={() => void load()} />
        </View>
      ) : null}

      {loading && goals.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredGoals}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="bullseye-arrow"
                size={56}
              />
              <Text
                style={[styles.emptyTitle, { color: colors.textPrimary }]}
              >
                {t.goals.noGoalsYet}
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {t.goals.noGoalsDesc}
              </Text>
              <View style={styles.emptyBtnWrap}>
                <AppButton
                  label={t.goals.createFirstGoal}
                  onPress={() => {
                    setFormError(null);
                    setNewGoalModalVisible(true);
                  }}
                  variant="primary"
                />
              </View>
            </View>
          }
          ListHeaderComponent={
            <View style={styles.headerStack}>
              {/* Savings Summary Hero Card */}
              {summary && summary.totalTargetMinor > 0 ? (
                <GoalsSummaryCard summary={summary} t={t} />
              ) : null}

              {/* Status Filter Tabs */}
              <View style={styles.filterTabsRow}>
                {(
                  [
                    { key: 'all', label: t.goals.all },
                    { key: 'active', label: t.goals.active },
                    { key: 'completed', label: t.goals.completed },
                  ] as const
                ).map((tab) => {
                  const isSelected = filterTab === tab.key;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={tab.key}
                      onPress={() => setFilterTab(tab.key)}
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
                              ? '#FFFFFF'
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
          onRefresh={() => void load()}
          refreshing={loading}
          renderItem={({ item: goal }) => (
            <GoalCard
              goal={goal}
              onDepositPress={() => {
                setDepositGoal(goal);
                setDepositError(null);
                setDepositAmount('');
                setDepositNote('');
              }}
              onPress={() => router.push(`/goals/${goal.id}`)}
            />
          )}
        />
      )}

      {/* 2. New Goal Modal */}
      <CreateGoalModal
        formError={formError}
        initialDeposit={initialDeposit}
        name={name}
        onChangeInitialDeposit={setInitialDeposit}
        onChangeName={setName}
        onChangeSelectedColor={setSelectedColor}
        onChangeSelectedIcon={setSelectedIcon}
        onChangeTargetAmount={setTargetAmount}
        onClose={() => setNewGoalModalVisible(false)}
        onSubmit={() => void handleCreateGoal()}
        saving={saving}
        selectedColor={selectedColor}
        selectedIcon={selectedIcon}
        t={t}
        targetAmount={targetAmount}
        visible={newGoalModalVisible}
      />

      {/* 3. Quick Deposit Modal */}
      <DepositGoalModal
        depositAmount={depositAmount}
        depositError={depositError}
        depositGoal={depositGoal}
        depositNote={depositNote}
        onChangeAmount={setDepositAmount}
        onChangeNote={setDepositNote}
        onClose={() => setDepositGoal(null)}
        onSubmit={() => void handleDeposit()}
        saving={saving}
        t={t}
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
    color: '#EF4444',
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
    gap: spacing.md,
    paddingBottom: spacing.xxl + 24,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
});
