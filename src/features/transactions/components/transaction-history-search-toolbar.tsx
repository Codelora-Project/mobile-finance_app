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
              backgroundColor: colors.surface,
              borderColor: isDark ? '#27272A' : '#E2E8F0',
              shadowColor: colors.shadow,
            },
          ]}
        >
          <MaterialCommunityIcons
            color={colors.textSecondary}
            name="magnify"
            size={20}
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
                color={colors.textSecondary}
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
                activeFiltersCount > 0
                  ? colors.primary
                  : colors.surface,
              borderColor:
                activeFiltersCount > 0
                  ? colors.primary
                  : isDark
                    ? '#27272A'
                    : '#E2E8F0',
              shadowColor: colors.shadow,
            },
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            color={
              activeFiltersCount > 0 ? colors.onPrimary : colors.textSecondary
            }
            name="tune-variant"
            size={18}
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
    maxWidth: contentMaxWidth,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  filterButton: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  filterText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 0,
  },
  searchWrap: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
});
