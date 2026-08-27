import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getCategoryMeta } from '@/features/categories/category-meta';
import type { Category } from '@/features/categories/category-repository';
import type { TransactionType } from '@/features/transactions/transaction-repository';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ManualCategoryGridProps = {
  categories: readonly Category[];
  error?: string;
  onOpenMoreCategories: () => void;
  onSelectCategory: (category: Category) => void;
  selectedCategoryId?: number | null;
  transactionType: TransactionType;
};

export const ManualCategoryGrid = memo(function ManualCategoryGrid({
  categories,
  error,
  onOpenMoreCategories,
  onSelectCategory,
  selectedCategoryId,
  transactionType,
}: ManualCategoryGridProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {language === 'id' ? 'PILIH KATEGORI' : 'SELECT CATEGORY'} *
        </Text>
        <Pressable
          accessibilityLabel="Category *"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onOpenMoreCategories}
          style={({ pressed }) => [
            styles.moreCategoriesBtn,
            pressed ? styles.btnPressed : null,
          ]}
        >
          <Text style={[styles.moreCategoriesText, { color: colors.primary }]}>
            {language === 'id' ? '+ Kategori Lain' : '+ More'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.categoryGrid}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {categories.slice(0, 10).map((cat) => {
          const meta = getCategoryMeta(cat.name, transactionType, isDark);
          const isSelected = selectedCategoryId === cat.id;

          const badgeBg = isSelected
            ? isDark
              ? 'rgba(59, 130, 246, 0.2)'
              : colors.primaryLight
            : isDark
              ? colors.surfaceSecondary
              : meta.backgroundColor;

          const badgeBorder = isSelected
            ? colors.primary
            : isDark
              ? '#27272A'
              : '#E2E8F0';

          const iconColor = isSelected
            ? colors.primary
            : isDark
              ? colors.textSecondary
              : meta.color;

          const textColor = isSelected ? colors.primary : colors.textPrimary;

          return (
            <Pressable
              accessibilityLabel={cat.name}
              accessibilityRole="button"
              key={cat.id}
              onPress={() => onSelectCategory(cat)}
              style={({ pressed }) => [
                styles.categoryCard,
                isSelected ? styles.categoryCardSelected : null,
                pressed ? styles.btnPressed : null,
              ]}
            >
              <View
                style={[
                  styles.categoryIconBadge,
                  {
                    backgroundColor: badgeBg,
                    borderColor: badgeBorder,
                  },
                  isSelected ? styles.categoryIconBadgeSelected : null,
                ]}
              >
                <MaterialCommunityIcons
                  color={iconColor}
                  name={meta.icon}
                  size={24}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.categoryNameText,
                  { color: textColor },
                  isSelected ? styles.categoryNameTextSelected : null,
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? (
        <View style={styles.errorRow}>
          <MaterialCommunityIcons
            color={colors.destructive}
            name="alert-circle-outline"
            size={14}
          />
          <Text style={[styles.errorBanner, { color: colors.destructive }]}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  btnPressed: {
    opacity: 0.75,
  },
  categoryCard: {
    alignItems: 'center',
    gap: 6,
    width: 68,
  },
  categoryCardSelected: {
    transform: [{ scale: 1.04 }],
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: spacing.xs,
  },
  categoryIconBadge: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  categoryIconBadgeSelected: {
    borderWidth: 2,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  categoryNameText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryNameTextSelected: {
    fontWeight: '800',
  },
  errorBanner: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '600',
  },
  errorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  moreCategoriesBtn: {
    paddingVertical: 2,
  },
  moreCategoriesText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionContainer: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
