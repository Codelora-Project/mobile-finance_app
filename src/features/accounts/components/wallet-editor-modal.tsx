import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSQLiteContext } from 'expo-sqlite';
import React, { memo, useEffect, useState } from 'react';
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
} from '@/features/accounts/account-repository';
import type { AccountType, Wallet } from '@/features/accounts/account-types';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
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

const PRESET_COLORS = [
  '#2563EB', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#00AED6', // Cyan GoPay
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#4F46E5', // Indigo
  '#64748B', // Slate
];

const PRESET_ICONS = [
  { icon: 'bank', label: 'Bank' },
  { icon: 'cellphone', label: 'E-Wallet' },
  { icon: 'cash', label: 'Tunai' },
  { icon: 'trending-up', label: 'Investasi' },
  { icon: 'wallet', label: 'Dompet' },
  { icon: 'credit-card', label: 'Kartu' },
  { icon: 'safe', label: 'Brankas' },
];

const ACCOUNT_TYPES: { key: AccountType; label: string; icon: string }[] = [
  { key: 'bank', label: 'Bank', icon: 'bank' },
  { key: 'ewallet', label: 'E-Wallet', icon: 'cellphone' },
  { key: 'cash', label: 'Tunai', icon: 'cash' },
  { key: 'investment', label: 'Investasi', icon: 'trending-up' },
  { key: 'other', label: 'Lainnya', icon: 'wallet' },
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

  const isNew = wallet === 'new';

  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('bank');
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState('bank');
  const [includeInCashflow, setIncludeInCashflow] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (wallet && typeof wallet === 'object') {
        setName(wallet.name);
        setAccountType(wallet.accountType);
        setAccountNumber(wallet.accountNumber || '');
        setInitialBalance(String(wallet.initialBalanceMinor));
        setSelectedColor(wallet.color || PRESET_COLORS[0]);
        setSelectedIcon(wallet.iconKey || 'bank');
        setIncludeInCashflow(wallet.includeInCashflow);
      } else {
        setName('');
        setAccountType('bank');
        setAccountNumber('');
        setInitialBalance('0');
        setSelectedColor(PRESET_COLORS[0]);
        setSelectedIcon('bank');
        setIncludeInCashflow(true);
      }
      setError(null);
    }
  }, [visible, wallet]);

  if (!visible || !wallet) return null;

  async function handleSave() {
    if (saving) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t.wallets.walletNameLabel);
      return;
    }

    setSaving(true);
    setError(null);

    const parsedInitial =
      Number(initialBalance.replace(/[^0-9]/g, '')) || 0;

    try {
      if (isNew) {
        await createWallet(database, {
          accountNumber: accountNumber.trim() || undefined,
          accountType,
          color: selectedColor,
          iconKey: selectedIcon,
          includeInCashflow,
          initialBalanceMinor: parsedInitial,
          name: trimmedName,
        });
      } else {
        await updateWallet(database, (wallet as Wallet).id, {
          accountNumber: accountNumber.trim() || undefined,
          accountType,
          color: selectedColor,
          iconKey: selectedIcon,
          includeInCashflow,
          name: trimmedName,
        });
      }
      onSuccess();
      onClose();
    } catch (caughtError) {
      const mapped = mapError(caughtError, 'DATABASE_WRITE_FAILED');
      setError(mapped.message);
    } finally {
      setSaving(false);
    }
  }

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
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              {isNew ? t.wallets.addWallet : t.wallets.editWallet}
            </Text>

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
            {/* 1. Wallet Name Input */}
            <View style={styles.inputGroup}>
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
                      : '#F8FAFC',
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={name}
              />
            </View>

            {/* 2. Account Type Selector Chips */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {t.wallets.accountTypeLabel}
              </Text>
              <View style={styles.chipsRow}>
                {ACCOUNT_TYPES.map((type) => {
                  const isSelected = accountType === type.key;
                  return (
                    <Pressable
                      key={type.key}
                      onPress={() => setAccountType(type.key)}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isDark
                            ? colors.surfaceSecondary
                            : '#F1F5F9',
                          borderColor: isSelected
                            ? colors.primary
                            : colors.border,
                        },
                        pressed ? { opacity: 0.75 } : null,
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={isSelected ? '#FFFFFF' : colors.textPrimary}
                        name={type.icon as any}
                        size={16}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected
                              ? '#FFFFFF'
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {type.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 3. Initial Balance (Only for new wallets) */}
            {isNew ? (
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                  {t.wallets.initialBalanceLabel}
                </Text>
                <View
                  style={[
                    styles.amountInputRow,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#F8FAFC',
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
                    keyboardType="numeric"
                    onChangeText={setInitialBalance}
                    placeholder={t.wallets.initialBalancePlaceholder}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.amountTextInput, { color: colors.textPrimary }]}
                    value={initialBalance}
                  />
                </View>
              </View>
            ) : null}

            {/* 4. Account Number Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {t.wallets.accountNumberLabel}
              </Text>
              <TextInput
                accessibilityLabel={t.wallets.accountNumberLabel}
                keyboardType="numeric"
                onChangeText={setAccountNumber}
                placeholder={t.wallets.accountNumberPlaceholder}
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#F8FAFC',
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={accountNumber}
              />
            </View>

            {/* 5. Theme Color Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {t.wallets.colorThemeLabel}
              </Text>
              <View style={styles.colorPaletteRow}>
                {PRESET_COLORS.map((color) => {
                  const isSelected = selectedColor === color;
                  return (
                    <Pressable
                      key={color}
                      onPress={() => setSelectedColor(color)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color },
                        isSelected ? styles.colorCircleSelected : null,
                      ]}
                    >
                      {isSelected ? (
                        <MaterialCommunityIcons
                          color="#FFFFFF"
                          name="check"
                          size={16}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 6. Icon Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {t.wallets.iconLabel}
              </Text>
              <View style={styles.iconPickerRow}>
                {PRESET_ICONS.map((item) => {
                  const isSelected = selectedIcon === item.icon;
                  return (
                    <Pressable
                      key={item.icon}
                      onPress={() => setSelectedIcon(item.icon)}
                      style={({ pressed }) => [
                        styles.iconButton,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? `${selectedColor}30`
                              : `${selectedColor}15`
                            : isDark
                            ? colors.surfaceSecondary
                            : '#F1F5F9',
                          borderColor: isSelected
                            ? selectedColor
                            : 'transparent',
                        },
                        pressed ? { opacity: 0.7 } : null,
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={isSelected ? selectedColor : colors.textMuted}
                        name={item.icon as any}
                        size={22}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 7. Include in Cashflow Switch */}
            <View
              style={[
                styles.toggleCard,
                {
                  backgroundColor: isDark
                    ? colors.surfaceSecondary
                    : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.toggleTextWrap}>
                <Text
                  style={[styles.toggleTitle, { color: colors.textPrimary }]}
                >
                  {t.wallets.includeCashflowTitle}
                </Text>
                <Text
                  style={[
                    styles.toggleSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.wallets.includeCashflowDesc}
                </Text>
              </View>
              <Switch
                accessibilityLabel={t.wallets.includeCashflowTitle}
                onValueChange={setIncludeInCashflow}
                thumbColor={includeInCashflow ? '#FFFFFF' : '#F1F5F9'}
                trackColor={{ false: '#CBD5E1', true: colors.primary }}
                value={includeInCashflow}
              />
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {error}
              </Text>
            ) : null}

            {/* Save Button */}
            <View style={styles.actionRow}>
              <AppButton
                disabled={saving}
                label={t.common.save}
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
  amountInputRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  amountTextInput: {
    ...typography.body,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: spacing.xs,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  chip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chipText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
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
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  iconPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  inputGroup: {
    gap: 4,
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
});
