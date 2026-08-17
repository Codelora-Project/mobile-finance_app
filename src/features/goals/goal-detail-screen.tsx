import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { GOAL_ICONS } from '@/features/goals/components/goal-card';
import {
  addGoalTransaction,
  deleteSavingsGoal,
  getSavingsGoal,
  type GoalTransaction,
  type SavingsGoal,
} from '@/features/goals/goals-repository';
import { isCodedError, mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { parseIntegerInput } from '@/lib/strings';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

function formatTxDate(timestamp: number, language: string) {
  return new Date(timestamp).toLocaleDateString(
    language === 'id' ? 'id-ID' : 'en-US',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  );
}

type GoalDetailScreenProps = {
  goalId: number;
};

export function GoalDetailScreen({ goalId }: GoalDetailScreenProps) {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<SavingsGoal | null>(null);
  const [transactions, setTransactions] = useState<readonly GoalTransaction[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);

  // Transaction Modal State
  const [modalType, setModalType] = useState<'deposit' | 'withdraw' | null>(
    null,
  );
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSavingsGoal(database, goalId);
      if (!data) {
        setError(t.goals.targetNotFound);
        return;
      }
      setGoal(data.goal);
      setTransactions(data.transactions);
    } catch (loadError) {
      setError(mapError(loadError, 'DATABASE_WRITE_FAILED').message);
    } finally {
      setLoading(false);
    }
  }, [database, goalId, t.goals.targetNotFound]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleDeleteGoal = () => {
    Alert.alert(t.goals.deleteGoal, t.goals.deleteConfirm, [
      { style: 'cancel', text: t.common.cancel },
      {
        onPress: async () => {
          try {
            await deleteSavingsGoal(database, goalId);
            router.back();
          } catch (err) {
            Alert.alert(
              'Gagal',
              mapError(err, 'DATABASE_WRITE_FAILED').message,
            );
          }
        },
        style: 'destructive',
        text: t.common.delete,
      },
    ]);
  };

  const handleSubmitTransaction = async () => {
    if (!modalType || !goal) return;
    const amountMinor = parseIntegerInput(amount);
    if (!amountMinor) {
      setModalError(t.goals.errorAmountInvalid);
      return;
    }
    if (modalType === 'withdraw' && amountMinor > goal.currentAmountMinor) {
      setModalError(t.goals.errorDepositInvalid);
      return;
    }

    setSubmitting(true);
    setModalError(null);
    try {
      await addGoalTransaction(database, {
        amountMinor,
        goalId,
        note:
          note.trim() ||
          (modalType === 'deposit' ? 'Setoran Tabungan' : 'Penarikan Dana'),
        type: modalType,
      });
      setModalType(null);
      setAmount('');
      setNote('');
      await load();
    } catch (err) {
      const msg = isCodedError(err)
        ? err.message
        : mapError(err, 'DATABASE_WRITE_FAILED').message;
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const iconName = goal ? GOAL_ICONS[goal.iconKey] || 'target' : 'target';

  return (
    <Screen>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AppButton label="Back" onPress={() => router.back()} variant="ghost" />
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[styles.headerTitle, { color: colors.textPrimary }]}
        >
          {goal?.name ?? 'Detail Target'}
        </Text>
        <AppButton
          accessibilityLabel="Hapus Target"
          label={t.common.delete}
          onPress={handleDeleteGoal}
          variant="destructive"
        />
      </View>

      {error ? (
        <View style={styles.errorPanel}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading && !goal ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : goal ? (
        <FlatList
          contentContainerStyle={styles.content}
          data={transactions}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            <View style={styles.emptyTransactions}>
              <Text
                style={[
                  styles.emptyTransactionsText,
                  { color: colors.textSecondary },
                ]}
              >
                Belum ada riwayat setoran atau penarikan.
              </Text>
            </View>
          }
          ListHeaderComponent={
            <View style={styles.headerSection}>
              {/* Hero Progress Card */}
              <View
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: goal.isCompleted
                      ? isDark
                        ? '#065F46'
                        : '#A7F3D0'
                      : colors.border,
                  },
                ]}
              >
                <View style={styles.heroTopRow}>
                  <View
                    style={[
                      styles.heroIconCircle,
                      {
                        backgroundColor: isDark
                          ? `${goal.colorKey}33`
                          : `${goal.colorKey}20`,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={goal.colorKey}
                      name={iconName as any}
                      size={32}
                    />
                  </View>
                  <View style={styles.heroTitles}>
                    <Text
                      style={[
                        styles.heroGoalName,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {goal.name}
                    </Text>
                    <Text
                      style={[
                        styles.heroTargetText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.goals.target}:{' '}
                      {formatMoney(goal.targetAmountMinor, 'IDR')}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.heroPercentBadge,
                      {
                        backgroundColor: goal.isCompleted
                          ? isDark
                            ? '#064E3B'
                            : '#D1FAE5'
                          : isDark
                            ? colors.surfaceSecondary
                            : '#EFF6FF',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.heroPercentText,
                        {
                          color: goal.isCompleted
                            ? colors.positive
                            : colors.primary,
                        },
                      ]}
                    >
                      {goal.progressPercent}%
                    </Text>
                  </View>
                </View>

                {/* Progress Track */}
                <View
                  style={[
                    styles.heroProgressTrack,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#F1F5F9',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.heroProgressBar,
                      {
                        backgroundColor: goal.isCompleted
                          ? colors.positive
                          : goal.colorKey,
                        width: `${Math.min(100, Math.max(0, goal.progressPercent))}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.heroStatsGrid}>
                  <View>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.goals.saved}:
                    </Text>
                    <Text
                      style={[
                        styles.statValue,
                        {
                          color: goal.isCompleted
                            ? colors.positive
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {formatMoney(goal.currentAmountMinor, 'IDR')}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {goal.isCompleted ? 'Status:' : `${t.goals.remaining}:`}
                    </Text>
                    <Text
                      style={[
                        styles.statValue,
                        {
                          color: goal.isCompleted ? colors.positive : '#EF4444',
                        },
                      ]}
                    >
                      {goal.isCompleted
                        ? t.goals.completed
                        : formatMoney(
                            goal.targetAmountMinor - goal.currentAmountMinor,
                            'IDR',
                          )}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons: Setor & Tarik */}
              <View style={styles.actionButtonsRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setModalType('deposit');
                    setAmount('');
                    setNote('');
                    setModalError(null);
                  }}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <MaterialCommunityIcons
                    color="#FFFFFF"
                    name="plus-circle"
                    size={20}
                  />
                  <Text style={styles.actionBtnText}>+ {t.goals.deposit}</Text>
                </Pressable>

                {goal.currentAmountMinor > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setModalType('withdraw');
                      setAmount('');
                      setNote('');
                      setModalError(null);
                    }}
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceSecondary
                          : '#F1F5F9',
                        borderColor: colors.border,
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={colors.textPrimary}
                      name="minus-circle-outline"
                      size={20}
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      - {t.goals.withdraw}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {/* History Title */}
              <Text
                style={[
                  styles.historySectionTitle,
                  { color: colors.textPrimary },
                ]}
              >
                {t.goals.history}
              </Text>
            </View>
          }
          renderItem={({ item: tx }) => (
            <View
              style={[
                styles.txItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.txLeft}>
                <View
                  style={[
                    styles.txIconBadge,
                    {
                      backgroundColor:
                        tx.type === 'deposit'
                          ? isDark
                            ? '#14532D'
                            : '#DCFCE7'
                          : isDark
                            ? '#7F1D1D'
                            : '#FEE2E2',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={tx.type === 'deposit' ? colors.positive : '#EF4444'}
                    name={
                      tx.type === 'deposit'
                        ? 'arrow-down-left'
                        : 'arrow-up-right'
                    }
                    size={20}
                  />
                </View>
                <View>
                  <Text style={[styles.txNote, { color: colors.textPrimary }]}>
                    {tx.note ||
                      (tx.type === 'deposit'
                        ? t.goals.deposit
                        : t.goals.withdraw)}
                  </Text>
                  <Text
                    style={[styles.txDate, { color: colors.textSecondary }]}
                  >
                    {formatTxDate(tx.occurredAt, language)}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.txAmount,
                  {
                    color: tx.type === 'deposit' ? colors.positive : '#EF4444',
                  },
                ]}
              >
                {tx.type === 'deposit' ? '+' : '−'}
                {formatMoney(tx.amountMinor, 'IDR')}
              </Text>
            </View>
          )}
        />
      ) : null}

      {/* 💳 Modal Setor / Tarik Tabungan */}
      <Modal
        animationType="fade"
        onRequestClose={() => setModalType(null)}
        transparent
        visible={modalType !== null}
      >
        <Pressable
          onPress={() => setModalType(null)}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {modalType === 'deposit'
                ? 'Nabung ke Target'
                : 'Tarik dari Target'}
            </Text>
            <Text
              style={[styles.modalSubtitle, { color: colors.textSecondary }]}
            >
              {goal?.name} · Saldo:{' '}
              {formatMoney(goal?.currentAmountMinor ?? 0, 'IDR')}
            </Text>

            {modalError ? (
              <Text style={styles.modalErrorText}>{modalError}</Text>
            ) : null}

            {/* Quick Shortcuts */}
            <View style={styles.shortcutsRow}>
              {[50000, 100000, 200000, 500000].map((amt) => (
                <Pressable
                  key={amt}
                  onPress={() => setAmount(String(amt))}
                  style={[
                    styles.shortcutChip,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#EFF6FF',
                      borderColor: isDark ? colors.border : '#BFDBFE',
                    },
                  ]}
                >
                  <Text
                    style={[styles.shortcutChipText, { color: colors.primary }]}
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
                onChangeText={setAmount}
                placeholder="100000"
                placeholderTextColor={colors.textSecondary}
                style={[styles.amountTextInput, { color: colors.textPrimary }]}
                value={amount}
              />
            </View>

            <TextInput
              onChangeText={setNote}
              placeholder="Catatan transaksi (opsional)"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.noteInput,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={note}
            />

            <View style={styles.modalActions}>
              <AppButton
                label={t.common.cancel}
                onPress={() => setModalType(null)}
                variant="ghost"
              />
              <AppButton
                disabled={submitting || !amount}
                label={
                  submitting
                    ? 'Memproses…'
                    : modalType === 'deposit'
                      ? 'Nabung Sekarang'
                      : 'Tarik Dana'
                }
                loading={submitting}
                onPress={() => void handleSubmitTransaction()}
                variant={modalType === 'deposit' ? 'primary' : 'destructive'}
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
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
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTransactionsText: {
    fontSize: 13,
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
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerSection: {
    gap: spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 2,
    gap: spacing.md,
    padding: spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  heroGoalName: {
    fontSize: 18,
    fontWeight: '800',
  },
  heroIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  heroPercentBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroPercentText: {
    fontSize: 14,
    fontWeight: '900',
  },
  heroProgressBar: {
    borderRadius: radius.pill,
    height: '100%',
  },
  heroProgressTrack: {
    borderRadius: radius.pill,
    height: 10,
    overflow: 'hidden',
    width: '100%',
  },
  heroStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroTargetText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  heroTitles: {
    flex: 1,
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  modalCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    gap: spacing.sm,
    padding: spacing.lg,
    width: '92%',
  },
  modalErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalSubtitle: {
    fontSize: 13,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  noteInput: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  shortcutChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  shortcutChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  shortcutsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  txDate: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  txIconBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  txItem: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  txLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  txNote: {
    fontSize: 14,
    fontWeight: '700',
  },
});
