import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TransactionHistoryHeaderProps = {
  activeFiltersCount: number;
  onClearSearch: () => void;
  onOpenFilter: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  t: TranslationSchema;
};

export const TransactionHistoryHeader = memo(
  function TransactionHistoryHeader({
    activeFiltersCount,
    onClearSearch,
    onOpenFilter,
    onSearchChange,
    searchQuery,
    t,
  }: TransactionHistoryHeaderProps) {
    const { colors, isDark } = useTheme();

    return (
      <View
        style={[
          styles.headerRoot,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.searchBarWrap}>
            <MaterialCommunityIcons
              color="#94A3B8"
              name="magnify"
              size={20}
              style={styles.searchIcon}
            />
            <TextInput
              accessibilityLabel="Search"
              onChangeText={onSearchChange}
              placeholder={t.transactions.searchPlaceholder}
              placeholderTextColor="#94A3B8"
              style={[
                styles.searchInput,
                {
                  backgroundColor: isDark
                    ? colors.surfaceSecondary
                    : '#F1F5F9',
                  color: colors.textPrimary,
                },
              ]}
              value={searchQuery}
            />
            {searchQuery ? (
              <Pressable
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onClearSearch}
                style={styles.clearSearchBtn}
              >
                <MaterialCommunityIcons
                  color="#94A3B8"
                  name="close-circle"
                  size={18}
                />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            accessibilityLabel="Filter"
            accessibilityRole="button"
            onPress={onOpenFilter}
            style={({ pressed }) => [
              styles.filterBtn,
              {
                backgroundColor:
                  activeFiltersCount > 0
                    ? colors.primary
                    : isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                borderColor:
                  activeFiltersCount > 0
                    ? colors.primary
                    : colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color={
                activeFiltersCount > 0
                  ? '#FFFFFF'
                  : isDark
                    ? colors.textSecondary
                    : '#64748B'
              }
              name="tune-variant"
              size={18}
            />
            <Text
              style={[
                styles.filterBtnText,
                {
                  color:
                    activeFiltersCount > 0
                      ? '#FFFFFF'
                      : isDark
                        ? colors.textSecondary
                        : '#64748B',
                },
              ]}
            >
              {t.transactions.filters}
            </Text>
            {activeFiltersCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {activeFiltersCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  clearSearchBtn: {
    padding: 6,
    position: 'absolute',
    right: 8,
  },
  filterBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    ...typography.metadata,
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '800',
  },
  filterBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  filterBtnText: {
    ...typography.metadata,
    fontSize: 13,
    fontWeight: '700',
  },
  headerRoot: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  searchBarWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  searchIcon: {
    left: 12,
    position: 'absolute',
    zIndex: 1,
  },
  searchInput: {
    ...typography.body,
    borderRadius: radius.md,
    flex: 1,
    fontSize: 13,
    height: 44,
    paddingLeft: 38,
    paddingRight: 36,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
