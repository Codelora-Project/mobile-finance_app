import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategoryBreakdownItem } from '@/features/analytics/analytics-repository';
import { getCategoryMeta } from '@/features/categories/category-meta';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type DonutBreakdownChartProps = {
  items: readonly CategoryBreakdownItem[];
  totalExpenseMinor: number;
  currencyCode: string;
};

export function DonutBreakdownChart({
  items,
  totalExpenseMinor,
  currencyCode,
}: DonutBreakdownChartProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    items[0]?.categoryId ?? null,
  );

  if (items.length === 0 || totalExpenseMinor <= 0) {
    return null;
  }

  const selectedItem =
    items.find((item) => item.categoryId === selectedCategoryId) ?? items[0]!;
  const selectedMeta = getCategoryMeta(
    selectedItem.categoryName,
    'expense',
    isDark,
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      {/* 1. Hero Center Focus Card */}
      <View style={styles.heroCenter}>
        <View
          style={[
            styles.selectedIconCircle,
            {
              backgroundColor: isDark
                ? colors.primaryOverlay
                : selectedMeta.backgroundColor,
              borderColor: colors.border,
            },
          ]}
        >
          <MaterialCommunityIcons
            color={isDark ? colors.primary : selectedMeta.color}
            name={selectedMeta.icon}
            size={28}
          />
        </View>

        <Text
          numberOfLines={1}
          style={[styles.selectedCategoryName, { color: colors.textPrimary }]}
        >
          {selectedItem.categoryName}
        </Text>

        <Text style={[styles.selectedAmount, { color: colors.textPrimary }]}>
          {formatMoney(selectedItem.amountMinor, currencyCode)}
        </Text>

        <View
          style={[
            styles.percentagePill,
            {
              backgroundColor: isDark
                ? colors.primaryOverlay
                : colors.primaryLight,
              borderColor: isDark
                ? colors.primaryOverlayStrong
                : colors.primaryOverlay,
            },
          ]}
        >
          <Text style={[styles.percentageText, { color: colors.primary }]}>
            {selectedItem.percentage}% {t.analytics.ofTotal}
          </Text>
        </View>
      </View>

      {/* 2. Proportional Multi-Segmented Bar */}
      <View
        style={[
          styles.segmentedBarTrack,
          {
            backgroundColor: colors.surfaceSecondary,
          },
        ]}
      >
        {items.map((item) => {
          const meta = getCategoryMeta(item.categoryName, 'expense', isDark);
          const isSelected = item.categoryId === selectedCategoryId;
          const minPercent = Math.max(item.percentage, 4);

          return (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              key={item.categoryId}
              style={[
                styles.segmentSlice,
                {
                  backgroundColor: meta.color,
                  opacity: isSelected ? 1 : 0.45,
                  width: `${minPercent}%`,
                },
              ]}
            />
          );
        })}
      </View>

      {/* 3. Category Breakdown List */}
      <View style={styles.breakdownList}>
        {items.map((item) => {
          const meta = getCategoryMeta(item.categoryName, 'expense', isDark);
          const isSelected = item.categoryId === selectedCategoryId;

          return (
            <Pressable
              accessibilityLabel={`${item.categoryName}, ${formatMoney(
                item.amountMinor,
                currencyCode,
              )}, ${item.percentage}%`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={item.categoryId}
              onPress={() => setSelectedCategoryId(item.categoryId)}
              style={({ pressed }) => [
                styles.breakdownRow,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? colors.primaryOverlay
                      : colors.primaryLight
                    : isDark
                      ? colors.surfaceSecondary
                      : colors.surfaceMuted,
                  borderColor: isSelected
                    ? colors.primary
                    : colors.surfaceSecondary,
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.breakdownLeft}>
                <View
                  style={[
                    styles.rowIconBadge,
                    {
                      backgroundColor: isDark
                        ? colors.pressedOverlay
                        : meta.backgroundColor,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={meta.color}
                    name={meta.icon}
                    size={16}
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.categoryRowName,
                    {
                      color: isSelected ? colors.primary : colors.textPrimary,
                      fontWeight: isSelected ? '800' : '700',
                    },
                  ]}
                >
                  {item.categoryName}
                </Text>
              </View>

              <View style={styles.breakdownRight}>
                <Text
                  style={[
                    styles.categoryRowAmount,
                    { color: colors.textPrimary },
                  ]}
                >
                  {formatMoney(item.amountMinor, currencyCode)}
                </Text>
                <View
                  style={[
                    styles.percentBadge,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? colors.primaryOverlay
                          : colors.primaryLight
                        : isDark
                          ? colors.surface
                          : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.percentBadgeText,
                      {
                        color: isSelected
                          ? colors.primary
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {item.percentage}%
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  breakdownLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0,
    paddingRight: 8,
  },
  breakdownList: {
    gap: 6,
    marginTop: spacing.xs,
  },
  breakdownRight: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 8,
  },
  breakdownRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 8,
  },
  categoryRowAmount: {
    ...typography.metadata,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  categoryRowName: {
    ...typography.body,
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
  },
  container: {
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    padding: spacing.md + 2,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  heroCenter: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  percentBadge: {
    borderRadius: radius.pill,
    minWidth: 38,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  percentBadgeText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  percentagePill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  percentageText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
  rowIconBadge: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  segmentedBarTrack: {
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 2,
    height: 12,
    marginVertical: spacing.sm + 2,
    overflow: 'hidden',
    padding: 2,
    width: '100%',
  },
  segmentSlice: {
    borderRadius: radius.pill,
    height: '100%',
  },
  selectedAmount: {
    ...typography.displayAmount,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  selectedCategoryName: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '700',
  },
  selectedIconCircle: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    marginBottom: 4,
    width: 54,
  },
});
