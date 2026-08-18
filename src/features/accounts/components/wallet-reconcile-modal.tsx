import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSQLiteContext } from 'expo-sqlite';
import React, { memo, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { reconcileWalletBalance } from '@/features/accounts/account-repository';
import type { Wallet } from '@/features/accounts/account-types';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
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

  const [actualBalanceInput, setActualBalanceInput] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && wallet) {
      setActualBalanceInput(String(wallet.currentBalanceMinor));
      setNote('');
      setError(null);
    }
  }, [visible, wallet]);

  if (!wallet) return null;

  const currentBalance = wallet.currentBalanceMinor;
  const parsedActual = Number(actualBalanceInput.replace(/[^0-9]/g, '')) || 0;
  const difference = parsedActual - currentBalance;

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      await reconcileWalletBalance(
        database,
        wallet!.id,
        parsedActual,
        currencyCode,
        note.trim() || undefined,
      );
      onSuccess();
      onClose();
    } catch (caughtError) {
      const mapped = mapError(caughtError, 'DATABASE_WRITE_FAILED');
      setError(mapped.message);
    } finally {
      setSaving(false);
    }
  }

  const walletColor = wallet.color || colors.primary;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
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
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: isDark
                      ? `${walletColor}25`
                      : `${walletColor}15`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={walletColor}
                  name="scale-balance"
                  size={22}
                />
              </View>
              <View>
                <Text
                  style={[styles.sheetTitle, { color: colors.textPrimary }]}
                >
                  {t.wallets.reconcileTitle}
                </Text>
                <Text
                  style={[styles.sheetSubtitle, { color: colors.textMuted }]}
                >
                  {wallet.name}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityLabel="Tutup"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <MaterialCommunityIcons
                color={colors.textMuted}
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
                  backgroundColor: isDark
                    ? colors.surfaceSecondary
                    : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.balanceCardLabel, { color: colors.textMuted }]}>
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
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {t.wallets.actualBalanceLabel}
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.currencyPrefix, { color: colors.textMuted }]}
                >
                  {currencySymbol}
                </Text>
                <TextInput
                  accessibilityLabel={t.wallets.actualBalanceLabel}
                  keyboardType="numeric"
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
                        ? 'rgba(16, 185, 129, 0.15)'
                        : '#DCFCE7'
                      : difference < 0
                      ? isDark
                        ? 'rgba(239, 68, 68, 0.15)'
                        : '#FEE2E2'
                      : isDark
                      ? colors.surfaceSecondary
                      : '#EFF6FF',
                  borderColor:
                    difference > 0
                      ? '#10B981'
                      : difference < 0
                      ? '#EF4444'
                      : colors.primary,
                },
              ]}
            >
              <View style={styles.diffHeaderRow}>
                <MaterialCommunityIcons
                  color={
                    difference > 0
                      ? '#10B981'
                      : difference < 0
                      ? '#EF4444'
                      : colors.primary
                  }
                  name={
                    difference > 0
                      ? 'arrow-up-circle-outline'
                      : difference < 0
                      ? 'arrow-down-circle-outline'
                      : 'check-circle-outline'
                  }
                  size={20}
                />
                <Text
                  style={[
                    styles.diffTitle,
                    {
                      color:
                        difference > 0
                          ? '#10B981'
                          : difference < 0
                          ? '#EF4444'
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
                        ? '#10B981'
                        : difference < 0
                        ? '#EF4444'
                        : colors.primary,
                  },
                ]}
              >
                {difference > 0 ? '+ ' : difference < 0 ? '− ' : ''}
                {formatMoney(Math.abs(difference), currencyCode)}
                {difference > 0
                  ? ' (Pemasukan Penyesuaian)'
                  : difference < 0
                  ? ' (Pengeluaran Penyesuaian)'
                  : ' (Saldo Pas)'}
              </Text>
            </View>

            {/* 4. Note Input */}
            <View style={styles.inputSection}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
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
                      : '#F8FAFC',
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={note}
              />
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {error}
              </Text>
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
    marginTop: spacing.sm,
  },
  amountInput: {
    ...typography.body,
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    paddingVertical: spacing.xs,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  balanceCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  balanceCardLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  balanceCardValue: {
    ...typography.sectionTitle,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  currencyPrefix: {
    ...typography.body,
    fontSize: 18,
    fontWeight: '700',
  },
  descBanner: {
    ...typography.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  diffCard: {
    borderRadius: radius.md,
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
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  diffValue: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '800',
  },
  errorText: {
    ...typography.metadata,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  fieldLabel: {
    ...typography.secondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  inputRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  inputSection: {
    marginTop: spacing.xs,
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
    borderTopLeftRadius: radius.lg + 4,
    borderTopRightRadius: radius.lg + 4,
    borderTopWidth: 1,
    maxHeight: '90%',
  },
  sheetHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.15)',
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
});
