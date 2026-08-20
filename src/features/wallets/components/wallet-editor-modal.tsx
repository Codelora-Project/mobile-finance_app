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
} from '@/features/wallets/wallet-repository';
import type { AccountType, Wallet } from '@/features/wallets/wallet-types';
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

const ACCOUNT_TYPES: { icon: string; key: AccountType; label: string }[] = [
  { icon: 'bank', key: 'bank', label: 'Bank' },
  { icon: 'cellphone', key: 'ewallet', label: 'E-Wallet' },
  { icon: 'cash', key: 'cash', label: 'Tunai' },
  { icon: 'trending-up', key: 'investment', label: 'Investasi' },
  { icon: 'credit-card', key: 'credit_card', label: 'Kartu Kredit' },
  { icon: 'dots-horizontal', key: 'other', label: 'Lainnya' },
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
  const { language } = useLanguage();

  const isEditing = wallet !== null && wallet !== 'new';

  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('bank');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState(PRESET_ICONS[0].icon);
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
      setColor(PRESET_COLORS[0]);
      setIcon(PRESET_ICONS[0].icon);
      setAccountType('bank');
      setExcludeNetWorth(false);
      setError(null);
    } else {
      setName(wallet.name);
      setAccountType(wallet.accountType);
      setAccountNumber(wallet.accountNumber || '');
      setColor(wallet.color || PRESET_COLORS[0]);
      setIcon(wallet.iconKey || PRESET_ICONS[0].icon);
      setInitialBalance(String(wallet.initialBalanceMinor));
      setExcludeNetWorth(!wallet.includeInCashflow);
      setError(null);
    }
  }, [visible, wallet]);

  if (!visible) return null;

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(
        language === 'id'
          ? 'Nama dompet harus diisi.'
          : 'Wallet name is required.',
      );
      return;
    }

    setSaving(true);
    setError(null);

    const balanceMinor = Number(initialBalance.replace(/[^0-9-]/g, '')) || 0;

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
              {isEditing
                ? language === 'id'
                  ? 'Ubah Dompet'
                  : 'Edit Wallet'
                : language === 'id'
                ? 'Tambah Dompet Baru'
                : 'Add New Wallet'}
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
            <View style={styles.inputSection}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {language === 'id'
                  ? 'Nama Dompet / Rekening *'
                  : 'Wallet / Account Name *'}
              </Text>
              <TextInput
                accessibilityLabel={
                  language === 'id'
                    ? 'Nama Dompet / Rekening *'
                    : 'Wallet / Account Name *'
                }
                onChangeText={setName}
                placeholder={
                  language === 'id'
                    ? 'Contoh: Bank BCA, GoPay, Tunai'
                    : 'e.g. Bank BCA, Cash, PayPal'
                }
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

            {/* 2. Account Type Selector */}
            <View style={styles.inputSection}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {language === 'id' ? 'Jenis Akun' : 'Account Type'}
              </Text>
              <View style={styles.typeGrid}>
                {ACCOUNT_TYPES.map((type) => {
                  const isSelected = accountType === type.key;
                  return (
                    <Pressable
                      key={type.key}
                      accessibilityLabel={type.label}
                      accessibilityRole="button"
                      onPress={() => {
                        setAccountType(type.key);
                        if (type.key === 'bank') setIcon('bank');
                        else if (type.key === 'ewallet') setIcon('cellphone');
                        else if (type.key === 'cash') setIcon('cash');
                        else if (type.key === 'investment') setIcon('trending-up');
                      }}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? `${colors.primary}30`
                              : '#EFF6FF'
                            : isDark
                            ? colors.surfaceSecondary
                            : '#F8FAFC',
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
                        name={
                          type.icon as React.ComponentProps<
                            typeof MaterialCommunityIcons
                          >['name']
                        }
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
                        {type.label}
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
                  {language === 'id' ? 'Saldo Awal' : 'Initial Balance'}
                </Text>
                <View
                  style={[
                    styles.inputRow,
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
                    accessibilityLabel={
                      language === 'id' ? 'Saldo Awal' : 'Initial Balance'
                    }
                    keyboardType="numeric"
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
                {language === 'id'
                  ? 'Nomor Rekening / Catatan (Opsional)'
                  : 'Account Number / Note (Optional)'}
              </Text>
              <TextInput
                accessibilityLabel="Nomor Rekening"
                onChangeText={setAccountNumber}
                placeholder={
                  language === 'id'
                    ? 'Contoh: 1234567890'
                    : 'e.g. 1234567890'
                }
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

            {/* 5. Color Theme Picker */}
            <View style={styles.inputSection}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                {language === 'id' ? 'Warna Tema' : 'Color Theme'}
              </Text>
              <View style={styles.colorPaletteRow}>
                {PRESET_COLORS.map((c) => {
                  const isSelected = color === c;
                  return (
                    <Pressable
                      key={c}
                      accessibilityLabel={`Pilih warna ${c}`}
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

            {/* 6. Exclusion Toggle */}
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
                  {language === 'id'
                    ? 'Kecualikan dari Arus Kas Operasional'
                    : 'Exclude from Liquid Cashflow'}
                </Text>
                <Text
                  style={[
                    styles.toggleSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {language === 'id'
                    ? 'Cocok untuk aset investasi atau piutang jangka panjang.'
                    : 'Ideal for investments or long-term assets.'}
                </Text>
              </View>
              <Switch
                onValueChange={setExcludeNetWorth}
                thumbColor={excludeNetWorth ? colors.primary : '#FFFFFF'}
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
                label={
                  isEditing
                    ? language === 'id'
                      ? 'Simpan Perubahan'
                      : 'Save Changes'
                    : language === 'id'
                    ? 'Simpan'
                    : 'Save'
                }
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
    borderColor: '#FFFFFF',
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
