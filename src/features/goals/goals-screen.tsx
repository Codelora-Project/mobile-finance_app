import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { GoalCard, GOAL_ICONS } from '@/features/goals/components/goal-card';
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
import { formatMoney } from '@/lib/money';
import { parseIntegerInput } from '@/lib/strings';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

const COLOR_OPTIONS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#06B6D4',
  '#EF4444',
  '#14B8A6',
];

const ICON_KEYS = Object.keys(GOAL_ICONS);

export function GoalsScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<readonly SavingsGoal[]>([]);
  const [summary, setSummary] = useState<GoalsSummary | null>(null);
  const [habitStats, setHabitStats] = useState<HabitStats | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed'>(
    'all',
  );
  const [error, setError] = useState<string | null>(null);

  // New Goal Modal State
  const [newGoalModalVisible, setNewGoalModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('target');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Quick Deposit Modal State
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositing, setDepositing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allGoals, goalsSummary, habits] = await Promise.all([
        listSavingsGoals(database),
        getGoalsSummary(database),
        getHabitStats(database),
      ]);
      setGoals(allGoals);
      setSummary(goalsSummary);
      setHabitStats(habits);
    } catch (loadError) {
      setError(mapError(loadError, 'DATABASE_WRITE_FAILED').message);
    } finally {
      setLoading(false);
    }
  }, [database]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filteredGoals = useMemo(
    () =>
      goals.filter((g) => {
        if (filterTab === 'active') return !g.isCompleted;
        if (filterTab === 'completed') return g.isCompleted;
        return true;
      }),
    [goals, filterTab],
  );

  const handleCreateGoal = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError(t.goals.errorNameRequired);
      return;
    }
    const targetMinor = parseIntegerInput(targetAmount);
    if (!targetMinor) {
      setFormError(t.goals.errorTargetRequired);
      return;
    }
    const initMinor = parseIntegerInput(initialDeposit) ?? 0;

    setSaving(true);
    setFormError(null);
    try {
      await createSavingsGoal(database, {
        colorKey: selectedColor,
        iconKey: selectedIcon,
        initialDepositMinor: initMinor,
        name: trimmedName,
        targetAmountMinor: targetMinor,
      });
      setNewGoalModalVisible(false);
      setName('');
      setTargetAmount('');
      setInitialDeposit('');
      await load();
    } catch (createErr) {
      setFormError(mapError(createErr, 'DATABASE_WRITE_FAILED').message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickDeposit = async () => {
    if (!depositGoal) return;
    const amountMinor = parseIntegerInput(depositAmount);
    if (!amountMinor) {
      setDepositError(t.goals.errorDepositInvalid);
      return;
    }

    setDepositing(true);
    setDepositError(null);
    try {
      await addGoalTransaction(database, {
        amountMinor,
        goalId: depositGoal.id,
        note: depositNote.trim() || 'Setoran Tabungan',
        type: 'deposit',
      });
      setDepositGoal(null);
      setDepositAmount('');
      setDepositNote('');
      await load();
    } catch (err) {
      setDepositError(mapError(err, 'DATABASE_WRITE_FAILED').message);
    } finally {
      setDepositing(false);
    }
  };

  const totalProgress =
    summary && summary.totalTargetMinor > 0
      ? Math.min(
          100,
          Math.round(
            (summary.totalSavedMinor / summary.totalTargetMinor) * 100,
          ),
        )
      : 0;

  return (
    <Screen>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AppButton label="Back" onPress={() => router.back()} variant="ghost" />
        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: colors.textPrimary }]}
        >
          {t.goals.title}
        </Text>
        <AppButton
          label={t.goals.newGoal}
          onPress={() => {
            setFormError(null);
            setNewGoalModalVisible(true);
          }}
          variant="primary"
        />
      </View>

      {error ? (
        <View style={styles.errorPanel}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading && goals.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t.goals.loadingGoals}
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredGoals}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#FEF3C7',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color="#D97706"
                  name="piggy-bank-outline"
                  size={44}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {t.goals.noGoalsYet}
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                {t.goals.noGoalsDesc}
              </Text>
              <AppButton
                label={t.goals.createFirstGoal}
                onPress={() => setNewGoalModalVisible(true)}
                variant="primary"
              />
            </View>
          }
          ListHeaderComponent={
            <View style={styles.topSection}>
              {/* 🔥 Habit & Streak Widget */}
              {habitStats ? (
                <View
                  style={[
                    styles.habitStreakCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.habitBadgeCol}>
                    <View style={styles.habitIconRow}>
                      <Text style={styles.streakEmoji}>
                        {habitStats.currentBadge.emoji}
                      </Text>
                      <View>
                        <Text
                          style={[
                            styles.streakCount,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {habitStats.currentStreak} {t.goals.daysUnit}
                        </Text>
                        <Text
                          style={[
                            styles.streakLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t.habits.streakDays}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.badgeTag,
                        {
                          backgroundColor: isDark
                            ? colors.surfaceSecondary
                            : '#FEF3C7',
                        },
                      ]}
                    >
                      <Text style={styles.badgeTagText}>
                        {t.habits.badges[habitStats.currentBadge.key] ??
                          habitStats.currentBadge.key}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.verticalDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />

                  <View style={styles.habitBadgeCol}>
                    <View style={styles.habitIconRow}>
                      <Text style={styles.streakEmoji}>🛡️</Text>
                      <View>
                        <Text
                          style={[
                            styles.streakCount,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {habitStats.noSpendDaysThisMonth} {t.goals.daysUnit}
                        </Text>
                        <Text
                          style={[
                            styles.streakLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t.habits.noSpendDays}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.streakSubNote,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.goals.thisMonth}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* 💰 Total Savings Summary Card */}
              {summary && summary.totalTargetMinor > 0 ? (
                <View
                  style={[
                    styles.summaryCard,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#1E293B',
                    },
                  ]}
                >
                  <View style={styles.summaryTopRow}>
                    <View>
                      <Text style={styles.summarySubLabel}>
                        {t.goals.totalSavingsCollected}
                      </Text>
                      <Text style={styles.summaryTotalValue}>
                        {formatMoney(summary.totalSavedMinor, 'IDR')}
                      </Text>
                    </View>
                    <View style={styles.summaryPercentBadge}>
                      <Text style={styles.summaryPercentText}>
                        {totalProgress}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.summaryTrack}>
                    <View
                      style={[
                        styles.summaryBar,
                        { width: `${totalProgress}%` },
                      ]}
                    />
                  </View>

                  <View style={styles.summaryStatsRow}>
                    <Text style={styles.summaryTargetText}>
                      {t.goals.target}: {formatMoney(summary.totalTargetMinor, 'IDR')}
                    </Text>
                    <Text style={styles.summaryTargetText}>
                      {summary.activeCount} {t.goals.active} · {summary.completedCount}{' '}
                      {t.goals.completed}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Filter Tabs */}
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

      {/* 📝 New Goal Modal */}
      <Modal
        animationType="slide"
        onRequestClose={() => setNewGoalModalVisible(false)}
        presentationStyle="pageSheet"
        visible={newGoalModalVisible}
      >
        <Screen>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <AppButton
              label={t.common.cancel}
              onPress={() => setNewGoalModalVisible(false)}
              variant="ghost"
            />
            <Text
              accessibilityRole="header"
              style={[styles.headerTitle, { color: colors.textPrimary }]}
            >
              {t.goals.newGoal}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalFormContent}>
            {formError ? (
              <View style={styles.errorPanel}>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            {/* Goal Name */}
            <View style={styles.formFieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {t.goals.goalName}
              </Text>
              <TextInput
                autoFocus
                onChangeText={setName}
                placeholder="misal: Beli Laptop Baru, Liburan Bali"
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.formTextInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={name}
              />
            </View>

            {/* Target Amount */}
            <View style={styles.formFieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {t.goals.targetAmount}
              </Text>
              <View
                style={[
                  styles.amountInputRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={styles.amountPrefix}>Rp</Text>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={setTargetAmount}
                  placeholder="5000000"
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.amountTextInput,
                    { color: colors.textPrimary },
                  ]}
                  value={targetAmount}
                />
              </View>
            </View>

            {/* Initial Deposit */}
            <View style={styles.formFieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {t.goals.initialDeposit}
              </Text>
              <View
                style={[
                  styles.amountInputRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={styles.amountPrefix}>Rp</Text>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={setInitialDeposit}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.amountTextInput,
                    { color: colors.textPrimary },
                  ]}
                  value={initialDeposit}
                />
              </View>
            </View>

            {/* Icon Picker */}
            <View style={styles.formFieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                Pilih Ikon
              </Text>
              <View style={styles.iconsGrid}>
                {ICON_KEYS.map((key) => {
                  const isSelected = selectedIcon === key;
                  const iconName = GOAL_ICONS[key] || 'target';
                  return (
                    <Pressable
                      accessibilityLabel={`Ikon ${key}`}
                      accessibilityRole="button"
                      key={key}
                      onPress={() => setSelectedIcon(key)}
                      style={[
                        styles.iconOptionBtn,
                        {
                          backgroundColor: isSelected
                            ? selectedColor
                            : colors.surface,
                          borderColor: isSelected
                            ? selectedColor
                            : colors.border,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={isSelected ? '#FFFFFF' : colors.textPrimary}
                        name={iconName as any}
                        size={22}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Color Picker */}
            <View style={styles.formFieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                Pilih Warna Tema
              </Text>
              <View style={styles.colorsRow}>
                {COLOR_OPTIONS.map((c) => {
                  const isSelected = selectedColor === c;
                  return (
                    <Pressable
                      accessibilityLabel={`Warna ${c}`}
                      accessibilityRole="button"
                      key={c}
                      onPress={() => setSelectedColor(c)}
                      style={[
                        styles.colorOptionBtn,
                        { backgroundColor: c },
                        isSelected ? styles.colorOptionSelected : null,
                      ]}
                    >
                      {isSelected ? (
                        <MaterialCommunityIcons
                          color="#FFFFFF"
                          name="check"
                          size={18}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalSubmitWrap}>
              <AppButton
                disabled={saving || !name.trim() || !targetAmount}
                label={saving ? 'Menyimpan…' : 'Simpan Target Tabungan'}
                loading={saving}
                onPress={() => void handleCreateGoal()}
                variant="primary"
              />
            </View>
          </ScrollView>
        </Screen>
      </Modal>

      {/* 💰 Quick Deposit Modal */}
      <Modal
        animationType="fade"
        onRequestClose={() => setDepositGoal(null)}
        transparent
        visible={depositGoal !== null}
      >
        <Pressable
          onPress={() => setDepositGoal(null)}
          style={styles.depositModalOverlay}
        >
          <View
            style={[
              styles.depositModalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[styles.depositModalTitle, { color: colors.textPrimary }]}
            >
              Nabung untuk {depositGoal?.name}
            </Text>
            <Text
              style={[
                styles.depositModalSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              Target: {formatMoney(depositGoal?.targetAmountMinor ?? 0, 'IDR')}{' '}
              · Terkumpul:{' '}
              {formatMoney(depositGoal?.currentAmountMinor ?? 0, 'IDR')}
            </Text>

            {depositError ? (
              <Text style={styles.depositErrorText}>{depositError}</Text>
            ) : null}

            {/* Quick Shortcut Pills */}
            <View style={styles.depositShortcutsRow}>
              {[50000, 100000, 200000, 500000].map((amt) => (
                <Pressable
                  key={amt}
                  onPress={() => setDepositAmount(String(amt))}
                  style={[
                    styles.depositChip,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#EFF6FF',
                      borderColor: isDark ? colors.border : '#BFDBFE',
                    },
                  ]}
                >
                  <Text
                    style={[styles.depositChipText, { color: colors.primary }]}
                  >
                    +{amt >= 1000 ? `${amt / 1000}k` : amt}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View
              style={[
                styles.amountInputRow,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={styles.amountPrefix}>Rp</Text>
              <TextInput
                autoFocus
                keyboardType="number-pad"
                onChangeText={setDepositAmount}
                placeholder="100000"
                placeholderTextColor={colors.textSecondary}
                style={[styles.amountTextInput, { color: colors.textPrimary }]}
                value={depositAmount}
              />
            </View>

            <TextInput
              onChangeText={setDepositNote}
              placeholder="Catatan setoran (opsional)"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.formTextInput,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  marginTop: spacing.xs,
                },
              ]}
              value={depositNote}
            />

            <View style={styles.depositModalActions}>
              <AppButton
                label={t.common.cancel}
                onPress={() => setDepositGoal(null)}
                variant="ghost"
              />
              <AppButton
                disabled={depositing || !depositAmount}
                label={depositing ? 'Menyetor…' : 'Setor Sekarang'}
                loading={depositing}
                onPress={() => void handleQuickDeposit()}
                variant="primary"
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  amountInputRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  amountPrefix: {
    color: '#64748B',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 6,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
  },
  badgeTag: {
    borderRadius: radius.pill,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeTagText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '800',
  },
  colorOptionBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  colorOptionSelected: {
    borderWidth: 3,
  },
  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  depositChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  depositChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  depositErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  depositModalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  depositModalCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    gap: spacing.sm,
    padding: spacing.lg,
    width: '92%',
  },
  depositModalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  depositModalSubtitle: {
    fontSize: 13,
  },
  depositModalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  depositShortcutsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 280,
    textAlign: 'center',
  },
  emptyIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  errorPanel: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderRadius: radius.md,
    borderWidth: 1,
    margin: spacing.md,
    padding: spacing.md,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterTabBtn: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterTabText: {
    fontSize: 13,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  formFieldGroup: {
    gap: 6,
  },
  formTextInput: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  habitBadgeCol: {
    alignItems: 'center',
    flex: 1,
  },
  habitIconRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  habitStreakCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 2,
    flexDirection: 'row',
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  iconOptionBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  listContent: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalFormContent: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  modalSubmitWrap: {
    marginTop: spacing.md,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: '900',
  },
  streakEmoji: {
    fontSize: 24,
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  streakSubNote: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  summaryBar: {
    backgroundColor: '#10B981',
    borderRadius: radius.pill,
    height: '100%',
  },
  summaryCard: {
    borderRadius: 20,
    elevation: 3,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  summaryPercentBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  summaryPercentText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summarySubLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryTargetText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryTotalValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  summaryTrack: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radius.pill,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  topSection: {
    gap: spacing.md,
  },
  verticalDivider: {
    height: 40,
    width: 1,
  },
});
