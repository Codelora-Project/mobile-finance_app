import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSQLiteContext } from 'expo-sqlite';
import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import {
  createWallet,
  updateWallet,
} from '@/features/wallets/wallet-repository';
import { getWalletIconName } from '@/features/wallets/wallet-icons';
import type { AccountType, Wallet } from '@/features/wallets/wallet-types';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import type { MaterialCommunityIconName } from '@/lib/material-community-icons';
import { formatMoneyInput, parseSignedMoneyInput } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { fixedSemanticColors, walletColorOptions } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type WalletEditorModalProps = {
  currencyCode: string;
  currencySymbol: string;
  onClose: () => void;
  onSuccess: () => void;
  visible: boolean;
  wallet: Wallet | 'new' | null;
};

const DEFAULT_WALLET_ICON: MaterialCommunityIconName = 'bank';

const ACCOUNT_TYPES: readonly {
  icon: MaterialCommunityIconName;
  key: AccountType;
  translationKey:
    | 'typeBank'
    | 'typeCash'
    | 'typeCreditCard'
    | 'typeEwallet'
    | 'typeInvestment'
    | 'typeOther';
}[] = [
  { icon: 'bank', key: 'bank', translationKey: 'typeBank' },
  { icon: 'cellphone', key: 'ewallet', translationKey: 'typeEwallet' },
  { icon: 'cash', key: 'cash', translationKey: 'typeCash' },
  {
    icon: 'trending-up',
    key: 'investment',
    translationKey: 'typeInvestment',
  },
  {
    icon: 'credit-card',
    key: 'credit_card',
    translationKey: 'typeCreditCard',
  },
  { icon: 'dots-horizontal', key: 'other', translationKey: 'typeOther' },
];

export const WalletEditorModal = memo(function WalletEditorModal({
  currencyCode,
  currencySymbol,
  onClose,
  onSuccess,
  visible,
  wallet,
}: WalletEditorModalProps) {
  const database = useSQLiteContext();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const savingRef = useRef(false);

  const isEditing = wallet !== null && wallet !== 'new';

  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('bank');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState<string>(walletColorOptions[0]);
  const [icon, setIcon] =
    useState<MaterialCommunityIconName>(DEFAULT_WALLET_ICON);
  const [initialBalance, setInitialBalance] = useState('');
  const [excludeNetWorth, setExcludeNetWorth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (wallet === 'new' || !wallet) {
      setName('');
      setInitialBalance('');
      setAccountNumber('');
      setColor(walletColorOptions[0]);
      setIcon(DEFAULT_WALLET_ICON);
      setAccountType('bank');
      setExcludeNetWorth(false);
      setError(null);
    } else {
      setName(wallet.name);
      setAccountType(wallet.accountType);
      setAccountNumber(wallet.accountNumber || '');
      setColor(wallet.color || walletColorOptions[0]);
      setIcon(getWalletIconName(wallet));
      setInitialBalance(
        formatMoneyInput(wallet.initialBalanceMinor, currencyCode),
      );
      setExcludeNetWorth(!wallet.includeInCashflow);
      setError(null);
    }
  }, [currencyCode, visible, wallet]);

  if (!visible) return null;

  async function handleSave() {
    if (savingRef.current) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t.wallets.nameRequired);
      return;
    }

    let balanceMinor = 0;
    if (!isEditing && initialBalance.trim()) {
      try {
        balanceMinor = parseSignedMoneyInput(initialBalance, currencyCode);
      } catch {
        setError(t.wallets.invalidInitialBalance);
        return;
      }
    }

    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      if (isEditing && typeof wallet === 'object' && wallet !== null) {
        await updateWallet(database, wallet.id, {
          accountNumber: accountNumber.trim() || null,
          accountType,
          color,
          iconKey: icon,
          includeInCashflow: !excludeNetWorth,
          name: trimmed,
        });
      } else {
        await createWallet(database, {
          accountNumber: accountNumber.trim() || null,
          accountType,
          color,
          iconKey: icon,
          includeInCashflow: !excludeNetWorth,
          initialBalanceMinor: balanceMinor,
          name: trimmed,
        });
      }
      onSuccess();
      onClose();
    } catch (caughtError) {
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
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              {isEditing ? t.wallets.editWallet : t.wallets.addWallet}
            </Text>
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
            {/* 1. Wallet Name Input */}
            <View style={styles.inputSection}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {t.wallets.walletNameLabel}
              </Text>
              <TextInput
                accessibilityLabel={t.wallets.walletNameLabel}
                onChangeText={setName}
                placeholder={t.wallets.walletNamePlaceholder}
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : colors.surfaceMuted,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={name}
              />
            </View>

            {/* 2. Account Type Selector */}
            <View style={styles.inputSection}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {t.wallets.accountTypeLabel}
              </Text>
              <View style={styles.typeGrid}>
                {ACCOUNT_TYPES.map((type) => {
                  const isSelected = accountType === type.key;
                  return (
                    <Pressable
                      key={type.key}
                      accessibilityLabel={t.wallets[type.translationKey]}
                      accessibilityRole="button"
                      onPress={() => {
                        setAccountType(type.key);
                        if (type.key === 'bank') setIcon('bank');
                        else if (type.key === 'ewallet') setIcon('cellphone');
                        else if (type.key === 'cash') setIcon('cash');
                        else if (type.key === 'investment')
                          setIcon('trending-up');
                      }}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? `${colors.primary}30`
                              : colors.primaryLight
                            : isDark
                              ? colors.surfaceSecondary
                              : colors.surfaceMuted,
                          borderColor: isSelected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={
                          isSelected ? colors.primary : colors.textSecondary
                        }
                        name={type.icon}
                        size={16}
                      />
                      <Text
                        style={[
                          styles.typeChipText,
                          {
                            color: isSelected
                              ? colors.primary
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {t.wallets[type.translationKey]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 3. Initial Balance (Only on Create) */}
            {!isEditing ? (
              <View style={styles.inputSection}>
                <Text
                  style={[styles.fieldLabel, { color: colors.textPrimary }]}
                >
                  {t.wallets.initialBalanceLabel}
                </Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : colors.surfaceMuted,
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
                    accessibilityLabel={t.wallets.initialBalanceLabel}
                    keyboardType="decimal-pad"
                    onChangeText={setInitialBalance}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.amountInput, { color: colors.textPrimary }]}
                    value={initialBalance}
                  />
                </View>
              </View>
            ) : null}

            {/* 4. Account Number / Note */}
            <View style={styles.inputSection}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {t.wallets.accountNumberLabel}
              </Text>
              <TextInput
                accessibilityLabel={t.wallets.accountNumberAccessibility}
                onChangeText={setAccountNumber}
                placeholder={t.wallets.accountNumberPlaceholder}
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : colors.surfaceMuted,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={accountNumber}
              />
            </View>

            {/* 5. Color Theme Picker */}
            <View style={styles.inputSection}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {t.wallets.colorThemeLabel}
              </Text>
              <View style={styles.colorPaletteRow}>
                {walletColorOptions.map((c) => {
                  const isSelected = color === c;
                  return (
                    <Pressable
                      key={c}
                      accessibilityLabel={t.wallets.selectColor.replace(
                        '{color}',
                        c,
                      )}
                      accessibilityRole="button"
                      onPress={() => setColor(c)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c },
                        isSelected && styles.colorCircleSelected,
                      ]}
                    >
                      {isSelected ? (
                        <MaterialCommunityIcons
                          color={fixedSemanticColors.contentOnStrong}
                          name="check"
                          size={16}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 6. Exclusion Toggle */}
            <View
              style={[
                styles.toggleCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.toggleTextWrap}>
                <Text
                  style={[styles.toggleTitle, { color: colors.textPrimary }]}
                >
                  {t.wallets.excludeCashflowTitle}
                </Text>
                <Text
                  style={[
                    styles.toggleSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.wallets.excludeCashflowDescription}
                </Text>
              </View>
              <Switch
                onValueChange={setExcludeNetWorth}
                thumbColor={excludeNetWorth ? colors.primary : colors.onPrimary}
                trackColor={{
                  false: colors.border,
                  true: `${colors.primary}60`,
                }}
                value={excludeNetWorth}
              />
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {error}
              </Text>
            ) : null}

            {/* Submit Button */}
            <View style={styles.actionRow}>
              <AppButton
                disabled={saving}
                label={isEditing ? t.wallets.saveChanges : t.common.save}
                loading={saving}
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
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: spacing.xs,
  },
  backdrop: {
    backgroundColor: fixedSemanticColors.modalBackdrop,
    flex: 1,
    justifyContent: 'flex-end',
  },
  closeBtn: {
    padding: spacing.xs,
  },
  colorCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  colorCircleSelected: {
    borderWidth: 2.5,
    borderColor: fixedSemanticColors.contentOnStrong,
    transform: [{ scale: 1.1 }],
  },
  colorPaletteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  currencyPrefix: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
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
  inputRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  inputSection: {
    gap: 2,
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
    borderColor: fixedSemanticColors.neutralHairline,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sheetTitle: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontWeight: '800',
  },
  textInput: {
    ...typography.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  toggleCard: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  toggleSubtitle: {
    ...typography.metadata,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
  },
  typeChip: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 8,
    width: '48%',
  },
  typeChipText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
});
