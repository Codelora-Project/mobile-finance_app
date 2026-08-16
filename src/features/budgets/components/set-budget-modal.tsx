import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import type { CategoryBudget } from '@/features/budgets/budget-repository';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

type SetBudgetModalProps = {
  visible: boolean;
  budget: CategoryBudget | null;
  currencyCode: string;
  onClose: () => void;
  onSave: (categoryId: number, monthlyLimitMinor: number) => Promise<void>;
  onDelete?: (categoryId: number) => Promise<void>;
};

const SHORTCUT_LIMITS = [500_000, 1_000_000, 2_000_000, 5_000_000];

export function SetBudgetModal({
  visible,
  budget,
  currencyCode,
  onClose,
  onSave,
  onDelete,
}: SetBudgetModalProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const [amountStr, setAmountStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial value when opened
  const handleShow = () => {
    setError(null);
    if (budget?.monthlyLimitMinor) {
      setAmountStr(String(budget.monthlyLimitMinor));
    } else {
      setAmountStr('');
    }
  };

  const handleSave = async () => {
    if (!budget) return;
    const parsed = Number(amountStr.replace(/\D/g, ''));
    if (!parsed || parsed <= 0) {
      setError(t.budgets.invalidAmountError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(budget.categoryId, parsed);
      onClose();
    } catch (err) {
      setError((err as Error).message || t.budgets.saveBudgetSuccess);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!budget || !onDelete) return;
    setSaving(true);
    try {
      await onDelete(budget.categoryId);
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (!budget) return null;

  return (
    <Modal
      animationType="slide"
      onShow={handleShow}
      transparent
      visible={visible}
    >
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.textPrimary,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitles}>
              <Text
                accessibilityRole="header"
                style={[styles.title, { color: colors.textPrimary }]}
              >
                {budget.hasBudget ? t.budgets.editBudget : t.budgets.setBudget}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t.budgets.categoryLabel} {budget.categoryName}
              </Text>
            </View>
            <Pressable hitSlop={8} onPress={onClose}>
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="close"
                size={24}
              />
            </Pressable>
          </View>

          {/* Current Spent Info */}
          <View
            style={[
              styles.infoBanner,
              {
                backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {t.budgets.currentMonthSpent}
            </Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {formatMoney(budget.spentMinor, currencyCode)}
            </Text>
          </View>

          {/* Input Nominal */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t.budgets.budgetLimit}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : '#FFFFFF',
                  borderColor: error ? '#EF4444' : colors.border,
                },
              ]}
            >
              <Text
                style={[styles.currencyPrefix, { color: colors.textSecondary }]}
              >
                Rp
              </Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(val) => {
                  setError(null);
                  setAmountStr(val.replace(/\D/g, ''));
                }}
                placeholder="1000000"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.textPrimary }]}
                value={amountStr}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          {/* Shortcut Chips */}
          <View style={styles.shortcutRow}>
            {SHORTCUT_LIMITS.map((amount) => (
              <Pressable
                key={amount}
                onPress={() => setAmountStr(String(amount))}
                style={({ pressed }) => [
                  styles.shortcutChip,
                  {
                    backgroundColor:
                      amountStr === String(amount)
                        ? colors.primary
                        : isDark
                          ? colors.surfaceSecondary
                          : '#F1F5F9',
                    borderColor:
                      amountStr === String(amount)
                        ? colors.primary
                        : colors.border,
                  },
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.shortcutChipText,
                    {
                      color:
                        amountStr === String(amount)
                          ? '#FFFFFF'
                          : colors.textPrimary,
                    },
                  ]}
                >
                  {amount >= 1_000_000
                    ? `${amount / 1_000_000} Jt`
                    : `${amount / 1_000} Rb`}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <AppButton
              disabled={saving}
              label={t.budgets.saveBudgetLimit}
              loading={saving}
              onPress={() => void handleSave()}
            />

            {budget.hasBudget && onDelete ? (
              <AppButton
                disabled={saving}
                label={t.budgets.deleteBudgetBtn}
                onPress={() => void handleDelete()}
                variant="destructive"
              />
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitles: {
    flex: 1,
    gap: 2,
  },
  infoBanner: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    paddingVertical: 10,
  },
  inputGroup: {
    gap: 6,
    marginTop: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputWrapper: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    elevation: 8,
    maxHeight: '90%',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    shadowOffset: { height: -3, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  shortcutChip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 8,
  },
  shortcutChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
