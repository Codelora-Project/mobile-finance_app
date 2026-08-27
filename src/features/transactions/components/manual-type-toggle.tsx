import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TransactionType } from '@/features/transactions/transaction-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ManualTypeToggleProps = {
  onChangeType: (type: TransactionType) => void;
  selectedType: TransactionType;
  t: TranslationSchema;
};

export const ManualTypeToggle = memo(function ManualTypeToggle({
  onChangeType,
  selectedType,
  t,
}: ManualTypeToggleProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.typeToggleTrack,
        {
          backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
          borderColor: isDark ? '#27272A' : '#E2E8F0',
        },
      ]}
    >
      {/* 1. Expense Tab */}
      <Pressable
        accessibilityLabel={t.transactions.expense}
        accessibilityRole="tab"
        accessibilityState={{ selected: selectedType === 'expense' }}
        onPress={() => onChangeType('expense')}
        style={({ pressed }) => [
          styles.typeTab,
          selectedType === 'expense'
            ? [
                styles.typeTabActiveExpense,
                {
                  backgroundColor: colors.destructive,
                  shadowColor: colors.destructive,
                },
              ]
            : null,
          pressed ? styles.tabPressed : null,
        ]}
      >
        <MaterialCommunityIcons
          color={
            selectedType === 'expense'
              ? '#FFFFFF'
              : isDark
                ? colors.textSecondary
                : '#64748B'
          }
          name="arrow-down-bold-circle-outline"
          size={16}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.typeTabText,
            {
              color:
                selectedType === 'expense'
                  ? '#FFFFFF'
                  : isDark
                    ? colors.textSecondary
                    : '#64748B',
            },
            selectedType === 'expense' ? styles.typeTabTextActive : null,
          ]}
        >
          {t.transactions.expense}
        </Text>
      </Pressable>

      {/* 2. Income Tab */}
      <Pressable
        accessibilityLabel={t.transactions.income}
        accessibilityRole="tab"
        accessibilityState={{ selected: selectedType === 'income' }}
        onPress={() => onChangeType('income')}
        style={({ pressed }) => [
          styles.typeTab,
          selectedType === 'income'
            ? [
                styles.typeTabActiveIncome,
                {
                  backgroundColor: colors.positive,
                  shadowColor: colors.positive,
                },
              ]
            : null,
          pressed ? styles.tabPressed : null,
        ]}
      >
        <MaterialCommunityIcons
          color={
            selectedType === 'income'
              ? '#FFFFFF'
              : isDark
                ? colors.textSecondary
                : '#64748B'
          }
          name="arrow-up-bold-circle-outline"
          size={16}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.typeTabText,
            {
              color:
                selectedType === 'income'
                  ? '#FFFFFF'
                  : isDark
                    ? colors.textSecondary
                    : '#64748B',
            },
            selectedType === 'income' ? styles.typeTabTextActive : null,
          ]}
        >
          {t.transactions.income}
        </Text>
      </Pressable>

      {/* 3. Transfer Tab */}
      <Pressable
        accessibilityLabel={t.transactions.transfer}
        accessibilityRole="tab"
        accessibilityState={{ selected: selectedType === 'transfer' }}
        onPress={() => onChangeType('transfer')}
        style={({ pressed }) => [
          styles.typeTab,
          selectedType === 'transfer'
            ? [
                styles.typeTabActiveTransfer,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                },
              ]
            : null,
          pressed ? styles.tabPressed : null,
        ]}
      >
        <MaterialCommunityIcons
          color={
            selectedType === 'transfer'
              ? '#FFFFFF'
              : isDark
                ? colors.textSecondary
                : '#64748B'
          }
          name="swap-horizontal"
          size={17}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.typeTabText,
            {
              color:
                selectedType === 'transfer'
                  ? '#FFFFFF'
                  : isDark
                    ? colors.textSecondary
                    : '#64748B',
            },
            selectedType === 'transfer' ? styles.typeTabTextActive : null,
          ]}
        >
          {t.transactions.transfer}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  tabPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  typeTab: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs + 2,
  },
  typeTabActiveExpense: {
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  typeTabActiveIncome: {
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  typeTabActiveTransfer: {
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  typeTabText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
  },
  typeTabTextActive: {
    fontWeight: '800',
  },
  typeToggleTrack: {
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    padding: 3,
  },
});
