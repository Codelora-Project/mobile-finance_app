import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { TransactionFilters, TransactionType } from '@/features/transactions/transaction-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type QuickFilterKey =
  | 'all'
  | 'expense'
  | 'income'
  | 'transfer'
  | 'withReceipt'
  | 'reimbursable';

export type TransactionQuickFilterChipsProps = {
  filters: TransactionFilters;
  onFilterChange: (updatedFilters: TransactionFilters) => void;
  t: TranslationSchema;
};

export const TransactionQuickFilterChips = memo(
  function TransactionQuickFilterChips({
    filters,
    onFilterChange,
    t,
  }: TransactionQuickFilterChipsProps) {
    const { colors, isDark } = useTheme();

    // Determine current active quick filter key
    const activeKey: QuickFilterKey = filters.isReimbursable
      ? 'reimbursable'
      : filters.hasReceipt
      ? 'withReceipt'
      : filters.type === 'expense'
      ? 'expense'
      : filters.type === 'income'
      ? 'income'
      : filters.type === 'transfer'
      ? 'transfer'
      : 'all';

    const CHIPS: {
      icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
      key: QuickFilterKey;
      label: string;
    }[] = [
      {
        icon: 'format-list-bulleted',
        key: 'all',
        label: t.transactions.all || 'Semua',
      },
      {
        icon: 'arrow-up-right',
        key: 'expense',
        label: t.transactions.expense || 'Pengeluaran',
      },
      {
        icon: 'arrow-down-left',
        key: 'income',
        label: t.transactions.income || 'Pemasukan',
      },
      {
        icon: 'swap-horizontal',
        key: 'transfer',
        label: t.transactions.transfer || 'Transfer',
      },
      {
        icon: 'receipt-text-outline',
        key: 'withReceipt',
        label: t.transactions.withReceipt || 'Struk',
      },
      {
        icon: 'briefcase-outline',
        key: 'reimbursable',
        label: t.transactions.reimbursable || 'Klaim Kantor',
      },
    ];

    function handlePress(key: QuickFilterKey) {
      if (key === 'all') {
        const next = { ...filters };
        delete next.type;
        delete next.hasReceipt;
        delete next.isReimbursable;
        onFilterChange(next);
        return;
      }

      if (key === 'expense' || key === 'income' || key === 'transfer') {
        const next = { ...filters };
        delete next.hasReceipt;
        delete next.isReimbursable;
        if (filters.type === key) {
          delete next.type;
        } else {
          next.type = key as TransactionType;
        }
        onFilterChange(next);
        return;
      }

      if (key === 'withReceipt') {
        const next = { ...filters };
        delete next.type;
        delete next.isReimbursable;
        if (filters.hasReceipt) {
          delete next.hasReceipt;
        } else {
          next.hasReceipt = true;
        }
        onFilterChange(next);
        return;
      }

      if (key === 'reimbursable') {
        const next = { ...filters };
        delete next.type;
        delete next.hasReceipt;
        if (filters.isReimbursable) {
          delete next.isReimbursable;
        } else {
          next.isReimbursable = true;
        }
        onFilterChange(next);
        return;
      }
    }

    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {CHIPS.map((chip) => {
            const isSelected = activeKey === chip.key;

            return (
              <Pressable
                accessibilityLabel={chip.label}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                key={chip.key}
                onPress={() => handlePress(chip.key)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? '#F8FAFC'
                        : '#0F172A'
                      : isDark
                      ? '#1E293B'
                      : '#F1F5F9',
                    borderColor: isSelected
                      ? isDark
                        ? '#F8FAFC'
                        : '#0F172A'
                      : colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <MaterialCommunityIcons
                  color={
                    isSelected
                      ? isDark
                        ? '#0F172A'
                        : '#FFFFFF'
                      : colors.textSecondary
                  }
                  name={chip.icon}
                  size={15}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.chipText,
                    {
                      color: isSelected
                        ? isDark
                          ? '#0F172A'
                          : '#FFFFFF'
                        : colors.textSecondary,
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    flexShrink: 0,
    gap: 6,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 7,
  },
  chipText: {
    ...typography.metadata,
    fontSize: 12.5,
  },
  container: {
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  scrollContent: {
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
});
