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
          borderColor: colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={t.transactions.expense}
        accessibilityRole="tab"
        accessibilityState={{ selected: selectedType === 'expense' }}
        onPress={() => onChangeType('expense')}
        style={[
          styles.typeTab,
          selectedType === 'expense' ? styles.typeTabActiveExpense : null,
        ]}
      >
        <MaterialCommunityIcons
          color={selectedType === 'expense' ? '#FFFFFF' : '#64748B'}
          name="arrow-down-bold-circle-outline"
          size={18}
        />
        <Text
          style={[
            styles.typeTabText,
            selectedType === 'expense' ? styles.typeTabTextActive : null,
          ]}
        >
          {t.transactions.expense}
        </Text>
      </Pressable>

      <Pressable
        accessibilityLabel={t.transactions.income}
        accessibilityRole="tab"
        accessibilityState={{ selected: selectedType === 'income' }}
        onPress={() => onChangeType('income')}
        style={[
          styles.typeTab,
          selectedType === 'income' ? styles.typeTabActiveIncome : null,
        ]}
      >
        <MaterialCommunityIcons
          color={selectedType === 'income' ? '#FFFFFF' : '#64748B'}
          name="arrow-up-bold-circle-outline"
          size={18}
        />
        <Text
          style={[
            styles.typeTabText,
            selectedType === 'income' ? styles.typeTabTextActive : null,
          ]}
        >
          {t.transactions.income}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  typeTab: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
  },
  typeTabActiveExpense: {
    backgroundColor: '#EF4444',
    elevation: 3,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  typeTabActiveIncome: {
    backgroundColor: '#10B981',
    elevation: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  typeTabText: {
    ...typography.body,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  typeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  typeToggleTrack: {
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
});
