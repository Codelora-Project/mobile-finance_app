import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TransactionHistoryHeaderProps = {
  activeFiltersCount: number;
  onClearSearch: () => void;
  onExport?: () => void;
  onOpenFilter: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  t: TranslationSchema;
};

export const TransactionHistoryHeader = memo(
  function TransactionHistoryHeader({
    activeFiltersCount,
    onClearSearch,
    onExport,
    onOpenFilter,
    onSearchChange,
    searchQuery,
    t,
  }: TransactionHistoryHeaderProps) {
    const { colors, isDark } = useTheme();
    const [isSearchExpanded, setIsSearchExpanded] = useState(
      Boolean(searchQuery),
    );

    function toggleSearch() {
      if (isSearchExpanded && searchQuery) {
        onClearSearch();
      }
      setIsSearchExpanded((prev) => !prev);
    }

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
        {/* Top Row: Title + Action Icons */}
        <View style={styles.topRow}>
          <Text
            numberOfLines={1}
            style={[styles.screenTitle, { color: colors.textPrimary }]}
          >
            {t.transactions.title || 'Riwayat'}
          </Text>

          <View style={styles.actionsRow}>
            {/* Search Icon Toggle */}
            <Pressable
              accessibilityLabel="Search"
              accessibilityRole="button"
              hitSlop={6}
              onPress={toggleSearch}
              style={({ pressed }) => [
                styles.iconActionBtn,
                {
                  backgroundColor:
                    isSearchExpanded || searchQuery
                      ? isDark
                        ? colors.surfaceSecondary
                        : '#E2E8F0'
                      : isDark
                        ? colors.surfaceSecondary
                        : '#F1F5F9',
                  borderColor: colors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={
                  isSearchExpanded || searchQuery
                    ? colors.primary
                    : colors.textSecondary
                }
                name="magnify"
                size={20}
              />
            </Pressable>

            {/* Filter Icon Button with Badge */}
            <Pressable
              accessibilityLabel="Filter"
              accessibilityRole="button"
              hitSlop={6}
              onPress={onOpenFilter}
              style={({ pressed }) => [
                styles.iconActionBtn,
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
                    : colors.textSecondary
                }
                name="tune-variant"
                size={19}
              />
              {activeFiltersCount > 0 ? (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {activeFiltersCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            {/* Export CSV Button */}
            {onExport ? (
              <Pressable
                accessibilityLabel="Ekspor CSV"
                accessibilityRole="button"
                hitSlop={6}
                onPress={onExport}
                style={({ pressed }) => [
                  styles.iconActionBtn,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                    borderColor: colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="export-variant"
                  size={19}
                />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Expandable Search Input Field */}
        {isSearchExpanded || searchQuery ? (
          <View style={styles.searchBarRow}>
            <View style={styles.searchBarWrap}>
              <MaterialCommunityIcons
                color="#94A3B8"
                name="magnify"
                size={18}
                style={styles.searchIcon}
              />
              <TextInput
                accessibilityLabel="Search"
                autoFocus={isSearchExpanded && !searchQuery}
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
                    size={16}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  clearSearchBtn: {
    padding: 6,
    position: 'absolute',
    right: 8,
  },
  filterBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    height: 16,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -3,
    top: -3,
  },
  filterBadgeText: {
    ...typography.metadata,
    color: '#2563EB',
    fontSize: 9,
    fontWeight: '800',
  },
  headerRoot: {
    borderBottomWidth: 1,
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconActionBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    position: 'relative',
    width: 38,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  screenTitle: {
    ...typography.pageTitle,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  searchBarRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  searchBarWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  searchIcon: {
    left: 10,
    position: 'absolute',
    zIndex: 1,
  },
  searchInput: {
    ...typography.body,
    borderRadius: radius.md,
    flex: 1,
    fontSize: 13,
    height: 40,
    paddingLeft: 34,
    paddingRight: 34,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
