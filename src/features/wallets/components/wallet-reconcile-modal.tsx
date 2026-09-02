import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSQLiteContext } from 'expo-sqlite';
import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { reconcileWalletBalance } from '@/features/wallets/wallet-repository';
import type { Wallet } from '@/features/wallets/wallet-types';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  formatMoney,
  formatMoneyInput,
  parseSignedMoneyInput,
} from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { fixedSemanticColors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type WalletReconcileModalProps = {
  currencyCode: string;
  currencySymbol: string;
  onClose: () => void;
  onSuccess: () => void;
  visible: boolean;
  wallet: Wallet | null;
};

export const WalletReconcileModal = memo(function WalletReconcileModal({
  currencyCode,
  currencySymbol,
  onClose,
  onSuccess,
  visible,
  wallet,
}: WalletReconcileModalProps) {
  const database = useSQLiteContext();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const savingRef = useRef(false);

  const [actualBalanceInput, setActualBalanceInput] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && wallet) {
      setActualBalanceInput(
        formatMoneyInput(wallet.currentBalanceMinor, currencyCode),
      );
      setNote('');
      setError(null);
    }
  }, [currencyCode, visible, wallet]);

  if (!wallet) return null;

  const walletId = wallet.id;
  const currentBalance = wallet.currentBalanceMinor;
  let parsedActual: number | null = null;
  try {
    parsedActual = parseSignedMoneyInput(actualBalanceInput, currencyCode);
  } catch {
    // The field-level error is shown when the user submits the form.
  }
  const difference = parsedActual === null ? 0 : parsedActual - currentBalance;

  async function handleSave() {
    if (savingRef.current) return;
    if (parsedActual === null) {
      setError(t.wallets.invalidActualBalance);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);

    try {
      await reconcileWalletBalance(
        database,
        walletId,
        parsedActual,
        currencyCode,
        note.trim() || undefined,
      );
      onSuccess();
      onClose();
    } catch (caughtError) {
      if (__DEV__) {
        console.error('Reconciliation save error:', caughtError);
      }
      const mapped = mapError(
        caughtError,
        'DATABASE_WRITE_FAILED',
        t.appErrors,
      );
      setError(mapped.message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const walletColor = wallet.color || colors.primary;

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!savingRef.current) onClose();
      }}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.sheetHeader,
              { borderBottomColor: colors.surfaceSecondary },
            ]}
          >
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: isDark
                      ? `${walletColor}25`
                      : `${walletColor}15`,
                    borderColor: isDark
                      ? `${walletColor}44`
                      : `${walletColor}33`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={walletColor}
                  name="scale-balance"
                  size={20}
                />
              </View>
              <View style={styles.titleCol}>
                <Text
                  style={[styles.sheetTitle, { color: colors.textPrimary }]}
                >
                  {t.wallets.reconcileTitle}
                </Text>
                <Text
                  style={[
                    styles.sheetSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {wallet.name}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityLabel={t.common.close}
              accessibilityRole="button"
              disabled={saving}
              hitSlop={8}
              onPress={() => {
                if (!savingRef.current) onClose();
              }}
              style={styles.closeBtn}
            >
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="close"
                size={22}
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Description Banner */}
            <Text style={[styles.descBanner, { color: colors.textSecondary }]}>
              {t.wallets.reconcileSubtitle}
            </Text>

            {/* 1. Recorded Balance Box */}
            <View
              style={[
                styles.balanceCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.balanceCardLabel,
                  { color: colors.textSecondary },
                ]}
              >
                {t.wallets.recordedBalance}
              </Text>
              <Text
                style={[styles.balanceCardValue, { color: colors.textPrimary }]}
              >
                {formatMoney(currentBalance, currencyCode)}
              </Text>
            </View>

            {/* 2. Actual Balance Input */}
            <View style={styles.inputSection}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                {t.wallets.actualBalanceLabel}
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderStrong,
                  },
                ]}
              >
                <Text
                  style={[styles.currencyPrefix, { color: colors.primary }]}
                >
                  {currencySymbol}
                </Text>
                <TextInput
                  accessibilityLabel={t.wallets.actualBalanceLabel}
                  keyboardType="decimal-pad"
                  onChangeText={setActualBalanceInput}
                  placeholder={t.wallets.actualBalancePlaceholder}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.amountInput, { color: colors.textPrimary }]}
                  value={actualBalanceInput}
                />
              </View>
            </View>

            {/* 3. Live Difference Preview Card */}
            <View
              style={[
                styles.diffCard,
                {
                  backgroundColor:
                    difference > 0
                      ? isDark
                        ? colors.positiveOverlay
                        : colors.incomeBackground
                      : difference < 0
                        ? isDark
                          ? colors.destructiveOverlay
                          : colors.expenseBackground
                        : isDark
                          ? colors.surfaceSecondary
                          : colors.primaryLight,
                  borderColor:
                    difference > 0
                      ? colors.positiveBorder
                      : difference < 0
                        ? colors.destructiveBorder
                        : colors.primary,
                },
              ]}
            >
              <View style={styles.diffHeaderRow}>
                <MaterialCommunityIcons
                  color={
                    difference > 0
                      ? colors.positive
                      : difference < 0
                        ? colors.destructive
                        : colors.primary
                  }
                  name={
                    difference > 0
                      ? 'arrow-up-circle-outline'
                      : difference < 0
                        ? 'arrow-down-circle-outline'
                        : 'check-circle-outline'
                  }
                  size={18}
                />
                <Text
                  style={[
                    styles.diffTitle,
                    {
                      color:
                        difference > 0
                          ? colors.positive
                          : difference < 0
                            ? colors.destructive
                            : colors.primary,
                    },
                  ]}
                >
                  {t.wallets.differenceLabel}
                </Text>
              </View>
              <Text
                style={[
                  styles.diffValue,
                  {
                    color:
                      difference > 0
                        ? colors.positive
                        : difference < 0
                          ? colors.destructive
                          : colors.primary,
                  },
                ]}
              >
                {difference > 0 ? '+ ' : difference < 0 ? '− ' : ''}
                {formatMoney(Math.abs(difference), currencyCode)}
                {difference > 0
                  ? t.wallets.adjustmentIncome
                  : difference < 0
                    ? t.wallets.adjustmentExpense
                    : t.wallets.adjustmentBalanced}
              </Text>
            </View>

            {/* 4. Note Input */}
            <View style={styles.inputSection}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                {t.wallets.reconcileNoteLabel}
              </Text>
              <TextInput
                accessibilityLabel={t.wallets.reconcileNoteLabel}
                onChangeText={setNote}
                placeholder={t.wallets.reconcileNotePlaceholder}
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : colors.surfaceMuted,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={note}
              />
            </View>

            {error ? (
              <View style={styles.errorRow}>
                <MaterialCommunityIcons
                  color={colors.destructive}
                  name="alert-circle-outline"
                  size={16}
                />
                <Text style={[styles.errorText, { color: colors.destructive }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Submit Action */}
            <View style={styles.actionRow}>
              <AppButton
                disabled={saving}
                label={t.wallets.saveReconciliation}
                onPress={() => void handleSave()}
                variant="primary"
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  actionRow: {
    marginTop: spacing.xs,
  },
  amountInput: {
    ...typography.body,
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    paddingVertical: spacing.xs,
  },
  backdrop: {
    backgroundColor: fixedSemanticColors.modalBackdrop,
    flex: 1,
    justifyContent: 'flex-end',
  },
  balanceCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 2,
    padding: spacing.md,
  },
  balanceCardLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  balanceCardValue: {
    ...typography.sectionTitle,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  currencyPrefix: {
    ...typography.body,
    fontSize: 18,
    fontWeight: '800',
  },
  descBanner: {
    ...typography.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  diffCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  diffHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  diffTitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  diffValue: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '800',
  },
  errorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  errorText: {
    ...typography.metadata,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  fieldLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  headerLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  inputRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  inputSection: {
    marginTop: 2,
  },
  noteInput: {
    ...typography.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  scrollContent: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetContainer: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    maxHeight: '90%',
  },
  sheetHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sheetSubtitle: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  sheetTitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '800',
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
});
