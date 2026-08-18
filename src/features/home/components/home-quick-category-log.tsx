import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getCategoryMeta } from '@/features/categories/category-meta';
import type { Category } from '@/features/categories/category-repository';
import type { TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type HomeQuickCategoryLogProps = {
  categories: readonly Category[];
  onOpenCustomize: () => void;
  onSelectCategory: (category: Category) => void;
  t: TranslationSchema;
};

export const HomeQuickCategoryLog = memo(function HomeQuickCategoryLog({
  categories,
  onOpenCustomize,
  onSelectCategory,
  t,
}: HomeQuickCategoryLogProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.quickLogCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.textPrimary,
        },
      ]}
    >
      <View style={styles.quickLogHeader}>
        <View style={styles.quickLogTitleCol}>
          <View style={styles.quickLogTitleRow}>
            <MaterialCommunityIcons
              color={colors.primary}
              name="lightning-bolt"
              size={18}
            />
            <Text
              style={[styles.quickLogTitle, { color: colors.textPrimary }]}
            >
              {t.home.quickLogTitle}
            </Text>
          </View>
          <Text
            style={[styles.quickLogSubtitle, { color: colors.textSecondary }]}
          >
            {t.home.quickLogSubtitle}
          </Text>
        </View>

        {/* Customize / Atur Button */}
        <Pressable
          accessibilityLabel={t.home.quickLogCustomize}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onOpenCustomize}
          style={({ pressed }) => [
            styles.customizeQuickLogBtn,
            {
              backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
              borderColor: colors.border,
            },
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.primary}
            name="tune-variant"
            size={14}
          />
          <Text
            style={[
              styles.customizeQuickLogText,
              { color: colors.primary },
            ]}
          >
            {t.home.quickLogCustomize}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.quickLogList}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {categories.map((cat) => {
          const meta = getCategoryMeta(cat.name, 'expense', isDark);
          return (
            <Pressable
              accessibilityLabel={`Catat ${cat.name}`}
              accessibilityRole="button"
              key={cat.id}
              onPress={() => onSelectCategory(cat)}
              style={({ pressed }) => [
                styles.quickLogItem,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.quickLogIconCircle,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                    borderColor: isDark ? colors.border : '#E2E8F0',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={isDark ? '#94A3B8' : '#475569'}
                  name={meta.icon}
                  size={22}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.quickLogLabel,
                  { color: colors.textPrimary },
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          );
        })}

        {/* + Atur / Customize Chip */}
        <Pressable
          accessibilityLabel={t.home.quickLogCustomize}
          accessibilityRole="button"
          onPress={onOpenCustomize}
          style={({ pressed }) => [
            styles.quickLogItem,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.quickLogIconCircle,
              {
                backgroundColor: isDark
                  ? colors.surfaceSecondary
                  : '#F1F5F9',
                borderColor: isDark ? colors.border : '#CBD5E1',
                borderStyle: 'dashed',
                borderWidth: 1.5,
              },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.primary}
              name="cog-outline"
              size={20}
            />
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.quickLogLabel,
              { color: colors.primary, fontWeight: '700' },
            ]}
          >
            {t.home.quickLogCustomize}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  customizeQuickLogBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  customizeQuickLogText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  quickLogCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 2,
    gap: spacing.sm,
    paddingVertical: spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  quickLogHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  quickLogIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  quickLogItem: {
    alignItems: 'center',
    gap: 6,
    width: 64,
  },
  quickLogLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickLogList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  quickLogSubtitle: {
    ...typography.metadata,
    fontSize: 11,
  },
  quickLogTitle: {
    ...typography.sectionTitle,
    fontSize: 14,
    fontWeight: '800',
  },
  quickLogTitleCol: {
    flex: 1,
    gap: 2,
  },
  quickLogTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
});
