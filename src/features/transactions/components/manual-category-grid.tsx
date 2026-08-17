import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getCategoryMeta } from '@/features/categories/category-meta';
import type { Category } from '@/features/categories/category-repository';
import type { TransactionType } from '@/features/transactions/transaction-repository';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
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
          onPress={onOpenMoreCategories}
          style={styles.moreCategoriesBtn}
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
          return (
            <Pressable
              accessibilityLabel={cat.name}
              accessibilityRole="button"
              key={cat.id}
              onPress={() => onSelectCategory(cat)}
              style={[
                styles.categoryCard,
                isSelected
                  ? [
                      styles.categoryCardSelected,
                      { borderColor: colors.primary },
                    ]
                  : null,
              ]}
            >
              <View
                style={[
                  styles.categoryIconBadge,
                  { backgroundColor: meta.backgroundColor },
                  isSelected
                    ? [
                        styles.categoryIconBadgeSelected,
                        { borderColor: colors.primary },
                      ]
                    : null,
                ]}
              >
                <MaterialCommunityIcons
                  color={meta.color}
                  name={meta.icon}
                  size={26}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.categoryNameText,
                  { color: isSelected ? colors.primary : colors.textPrimary },
                  isSelected ? styles.categoryNameTextSelected : null,
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  categoryCard: {
    alignItems: 'center',
    gap: 6,
    width: 68,
  },
  categoryCardSelected: {
    transform: [{ scale: 1.05 }],
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: spacing.xs,
  },
  categoryIconBadge: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  categoryIconBadgeSelected: {
    borderWidth: 2,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
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
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
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
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
