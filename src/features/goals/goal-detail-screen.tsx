import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import {
  GoalDetailHeroCard,
  GoalDetailModal,
  GoalDetailTransactionRow,
} from '@/features/goals/components/detail';
import {
  addGoalTransaction,
  deleteSavingsGoal,
  getSavingsGoal,
  type GoalTransaction,
  type SavingsGoal,
} from '@/features/goals/goals-repository';
import { useCurrency } from '@/lib/currency/currency-context';
import { isCodedError, mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { parseMoneyInput } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type GoalDetailScreenProps = {
  goalId: number;
};

export function GoalDetailScreen({ goalId }: GoalDetailScreenProps) {
  const database = useSQLiteContext();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { colors } = useTheme();
  const { currencyCode } = useCurrency();
  const deletingRef = useRef(false);
  const loadRequestRef = useRef(0);
  const submittingRef = useRef(false);

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
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getSavingsGoal(database, goalId);
      if (requestId !== loadRequestRef.current) return;
      if (!data) {
        setGoal(null);
        setTransactions([]);
        setError(t.goals.targetNotFound);
        return;
      }
      setGoal(data.goal);
      setTransactions(data.transactions);
    } catch (loadError) {
      if (requestId === loadRequestRef.current) {
        setError(mapError(loadError, 'DATABASE_WRITE_FAILED').message);
      }
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, [database, goalId, t.goals.targetNotFound]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        loadRequestRef.current += 1;
      };
    }, [load]),
  );

  const handleDeleteGoal = () => {
    if (deletingRef.current || submittingRef.current) return;
    Alert.alert(t.goals.deleteGoal, t.goals.deleteConfirm, [
      { style: 'cancel', text: t.common.cancel },
      {
        onPress: async () => {
          if (deletingRef.current || submittingRef.current) return;
          deletingRef.current = true;
          setDeleting(true);
          try {
            await deleteSavingsGoal(database, goalId);
            router.back();
          } catch (err) {
            Alert.alert(
              'Gagal',
              mapError(err, 'DATABASE_WRITE_FAILED').message,
            );
          } finally {
            deletingRef.current = false;
            setDeleting(false);
          }
        },
        style: 'destructive',
        text: t.common.delete,
      },
    ]);
  };

  const handleSubmitTransaction = async () => {
    if (!modalType || !goal || submittingRef.current || deletingRef.current) {
      return;
    }
    let amountMinor: number;
    try {
      amountMinor = parseMoneyInput(amount, currencyCode);
    } catch {
      setModalError(t.goals.errorAmountInvalid);
      return;
    }
    if (modalType === 'withdraw' && amountMinor > goal.currentAmountMinor) {
      setModalError(t.goals.errorDepositInvalid);
      return;
    }

    submittingRef.current = true;
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
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.centeredState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            {t.goals.loadingGoals}
          </Text>
        </View>
      </Screen>
    );
  }

  if (!goal) {
    return (
      <Screen>
        <View style={styles.centeredState}>
          <MaterialCommunityIcons
            color={colors.textMuted}
            name="bullseye"
            size={48}
          />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {t.goals.targetNotFound}
          </Text>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            {error || t.goals.targetNotFound}
          </Text>
          <View style={{ marginTop: spacing.md }}>
            {error !== t.goals.targetNotFound ? (
              <AppButton
                label={t.common.tryAgain}
                onPress={() => void load()}
              />
            ) : null}
            <AppButton
              label={t.common.back}
              onPress={() => router.back()}
              variant="secondary"
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          accessibilityLabel={t.common.back}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons
            color={colors.textPrimary}
            name="arrow-left"
            size={22}
          />
        </Pressable>

        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[styles.headerTitle, { color: colors.textPrimary }]}
        >
          {goal.name}
        </Text>

        <Pressable
          accessibilityLabel={t.goals.deleteGoal}
          accessibilityRole="button"
          disabled={deleting || submitting}
          hitSlop={8}
          onPress={handleDeleteGoal}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons
            color={colors.destructive}
            name="trash-can-outline"
            size={22}
          />
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={styles.scrollContent}
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <View style={styles.emptyTxContainer}>
            <Text style={[styles.emptyTxText, { color: colors.textMuted }]}>
              {language === 'id'
                ? 'Belum ada riwayat setoran'
                : 'No deposit history yet'}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            {/* Hero Progress Card */}
            <GoalDetailHeroCard
              currencyCode={currencyCode}
              goal={goal}
              language={language}
              t={t}
            />

            {error ? (
              <View style={styles.errorPanel}>
                <Text style={[styles.stateText, { color: colors.destructive }]}>
                  {error}
                </Text>
                <AppButton
                  label={t.common.tryAgain}
                  onPress={() => void load()}
                  variant="secondary"
                />
              </View>
            ) : null}

            {/* Quick Actions (Setor & Tarik) */}
            <View style={styles.actionButtonsRow}>
              <View style={{ flex: 1 }}>
                <AppButton
                  accessibilityLabel={t.goals.deposit}
                  label={t.goals.deposit || 'Setor Tabungan'}
                  onPress={() => {
                    setModalType('deposit');
                    setAmount('');
                    setNote('');
                    setModalError(null);
                  }}
                  variant="primary"
                />
              </View>

              <View style={{ flex: 1 }}>
                <AppButton
                  accessibilityLabel={t.goals.withdraw}
                  disabled={goal.currentAmountMinor <= 0}
                  label={t.goals.withdraw || 'Tarik Tabungan'}
                  onPress={() => {
                    setModalType('withdraw');
                    setAmount('');
                    setNote('');
                    setModalError(null);
                  }}
                  variant="secondary"
                />
              </View>
            </View>

            {/* Transaction History Section Header */}
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              {language === 'id' ? 'RIWAYAT TABUNGAN' : 'SAVINGS HISTORY'}
            </Text>
          </View>
        }
        renderItem={({ index, item }) => (
          <View
            style={[
              styles.txListContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <GoalDetailTransactionRow
              currencyCode={currencyCode}
              isLast={index === transactions.length - 1}
              item={item}
              language={language}
            />
          </View>
        )}
      />

      {/* Deposit / Withdraw Modal */}
      <GoalDetailModal
        amount={amount}
        modalError={modalError}
        modalType={modalType}
        note={note}
        onAmountChange={setAmount}
        onClose={() => setModalType(null)}
        onNoteChange={setNote}
        onSubmit={() => void handleSubmitTransaction()}
        submitting={submitting}
        t={t}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  centeredState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.sectionTitle,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyTxContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorPanel: {
    gap: spacing.sm,
  },
  emptyTxText: {
    ...typography.metadata,
    fontSize: 13,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  headerBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerComponent: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.sectionTitle,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  scrollContent: {
    gap: spacing.xs,
    padding: spacing.md,
    paddingBottom: spacing.xxl + 40,
  },
  sectionTitle: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },
  stateText: {
    ...typography.metadata,
    fontSize: 13,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  txListContainer: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
