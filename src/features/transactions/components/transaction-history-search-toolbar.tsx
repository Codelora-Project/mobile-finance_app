import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TransactionHistorySearchToolbarProps = {
  activeFiltersCount: number;
  language: 'id' | 'en';
  onClearSearch: () => void;
  onOpenFilter: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  t: TranslationSchema;
};

export const TransactionHistorySearchToolbar = memo(
  function TransactionHistorySearchToolbar({
    activeFiltersCount,
    language,
    onClearSearch,
    onOpenFilter,
    onSearchChange,
    searchQuery,
    t,
  }: TransactionHistorySearchToolbarProps) {
    const { colors, isDark } = useTheme();

    return (
      <View style={styles.container}>
        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: isDark
                ? colors.surfaceSecondary
                : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <MaterialCommunityIcons
            color={colors.textMuted}
            name="magnify"
            size={19}
          />
          <TextInput
            accessibilityLabel={
              language === 'id' ? 'Cari transaksi' : 'Search transactions'
            }
            onChangeText={onSearchChange}
            placeholder={t.transactions.searchPlaceholder}
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={searchQuery}
          />
          {searchQuery ? (
            <Pressable
              accessibilityLabel={
                language === 'id' ? 'Hapus pencarian' : 'Clear search'
              }
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClearSearch}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <MaterialCommunityIcons
                color={colors.textMuted}
                name="close-circle"
                size={18}
              />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityHint={
            language === 'id'
              ? `${activeFiltersCount} filter aktif`
              : `${activeFiltersCount} active filters`
          }
          accessibilityLabel="Filter"
          accessibilityRole="button"
          accessibilityState={{ selected: activeFiltersCount > 0 }}
          onPress={onOpenFilter}
          style={({ pressed }) => [
            styles.filterButton,
            {
              backgroundColor:
                activeFiltersCount > 0 ? colors.primary : colors.surface,
              borderColor:
                activeFiltersCount > 0 ? colors.primary : colors.border,
            },
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            color={
              activeFiltersCount > 0 ? colors.onPrimary : colors.textSecondary
            }
            name="tune-variant"
            size={19}
          />
          <Text
            style={[
              styles.filterText,
              {
                color:
                  activeFiltersCount > 0
                    ? colors.onPrimary
                    : colors.textSecondary,
              },
            ]}
          >
            {language === 'id' ? 'Filter' : 'Filter'}
            {activeFiltersCount > 0 ? ` · ${activeFiltersCount}` : ''}
          </Text>
        </Pressable>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    maxWidth: contentMaxWidth - spacing.md * 2,
    paddingTop: spacing.xs,
    width: '92%',
  },
  filterButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm + 2,
  },
  filterText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  searchWrap: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.sm + 2,
  },
});
