import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
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
import { Screen } from '@/components/ui/screen';
import { GOAL_ICONS } from '@/features/goals/goal-icons';
import { useCurrency } from '@/lib/currency/currency-context';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

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

export type CreateGoalModalProps = {
  formError?: string | null;
  initialDeposit: string;
  name: string;
  onChangeInitialDeposit: (val: string) => void;
  onChangeName: (val: string) => void;
  onChangeSelectedColor: (color: string) => void;
  onChangeSelectedIcon: (icon: string) => void;
  onChangeTargetAmount: (val: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  selectedColor: string;
  selectedIcon: string;
  t: TranslationSchema;
  targetAmount: string;
  visible: boolean;
};

export const CreateGoalModal = memo(function CreateGoalModal({
  formError,
  initialDeposit,
  name,
  onChangeInitialDeposit,
  onChangeName,
  onChangeSelectedColor,
  onChangeSelectedIcon,
  onChangeTargetAmount,
  onClose,
  onSubmit,
  saving,
  selectedColor,
  selectedIcon,
  t,
  targetAmount,
  visible,
}: CreateGoalModalProps) {
  const { colors } = useTheme();
  const { currencyCode, currencySymbol } = useCurrency();
  const amountPlaceholder = currencyCode === 'IDR' ? '5000000' : '50000.00';
  const namePlaceholder = t.goals.namePlaceholder;

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!saving) onClose();
      }}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <Screen>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <AppButton
            disabled={saving}
            label={t.common.cancel}
            onPress={onClose}
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
              onChangeText={onChangeName}
              placeholder={namePlaceholder}
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
              <Text style={styles.amountPrefix}>{currencySymbol}</Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={onChangeTargetAmount}
                placeholder={amountPlaceholder}
                placeholderTextColor={colors.textSecondary}
                style={[styles.amountTextInput, { color: colors.textPrimary }]}
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
              <Text style={styles.amountPrefix}>{currencySymbol}</Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={onChangeInitialDeposit}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                style={[styles.amountTextInput, { color: colors.textPrimary }]}
                value={initialDeposit}
              />
            </View>
          </View>

          {/* Icon Picker */}
          <View style={styles.formFieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              {t.goals.chooseIcon}
            </Text>
            <View style={styles.iconsGrid}>
              {ICON_KEYS.map((key) => {
                const isSelected = selectedIcon === key;
                const iconName = GOAL_ICONS[key] || 'target';
                return (
                  <Pressable
                    accessibilityLabel={t.goals.iconAccessibility.replace(
                      '{icon}',
                      key,
                    )}
                    accessibilityRole="button"
                    key={key}
                    onPress={() => onChangeSelectedIcon(key)}
                    style={[
                      styles.iconOptionBtn,
                      {
                        backgroundColor: isSelected
                          ? selectedColor
                          : colors.surface,
                        borderColor: isSelected ? selectedColor : colors.border,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={isSelected ? '#FFFFFF' : colors.textPrimary}
                      name={iconName}
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
              {t.goals.chooseThemeColor}
            </Text>
            <View style={styles.colorsRow}>
              {COLOR_OPTIONS.map((c) => {
                const isSelected = selectedColor === c;
                return (
                  <Pressable
                    accessibilityLabel={t.goals.colorAccessibility.replace(
                      '{color}',
                      c,
                    )}
                    accessibilityRole="button"
                    key={c}
                    onPress={() => onChangeSelectedColor(c)}
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
              label={saving ? t.goals.saving : t.goals.saveGoal}
              loading={saving}
              onPress={onSubmit}
              variant="primary"
            />
          </View>
        </ScrollView>
      </Screen>
    </Modal>
  );
});

const styles = StyleSheet.create({
  amountInputRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  amountPrefix: {
    ...typography.body,
    color: '#64748B',
    fontSize: 16,
    fontWeight: '700',
  },
  amountTextInput: {
    ...typography.displayAmount,
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    paddingVertical: spacing.sm,
  },
  colorOptionBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  colorOptionSelected: {
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    transform: [{ scale: 1.15 }],
  },
  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  errorPanel: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: {
    ...typography.metadata,
    color: '#EF4444',
    fontWeight: '600',
  },
  fieldLabel: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
  },
  formFieldGroup: {
    gap: spacing.xs,
  },
  formTextInput: {
    ...typography.body,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '800',
  },
  iconOptionBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  modalFormContent: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl + 24,
  },
  modalSubmitWrap: {
    marginTop: spacing.md,
  },
});
