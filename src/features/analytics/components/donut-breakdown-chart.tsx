import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategoryBreakdownItem } from '@/features/analytics/analytics-repository';
import { getCategoryMeta } from '@/features/categories/category-meta';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

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
          shadowColor: colors.textPrimary,
        },
      ]}
    >
      {/* Hero Center Display */}
      <View style={styles.heroCenter}>
        <View
          style={[
            styles.selectedIconCircle,
            { backgroundColor: selectedMeta.backgroundColor },
          ]}
        >
          <MaterialCommunityIcons
            color={selectedMeta.color}
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
              backgroundColor: isDark ? colors.surfaceSecondary : '#EFF6FF',
              borderColor: isDark ? colors.border : '#DBEAFE',
            },
          ]}
        >
          <Text style={[styles.percentageText, { color: colors.primary }]}>
            {selectedItem.percentage}% dari Total
          </Text>
        </View>
      </View>

      {/* Proportional Segmented Bar */}
      <View
        style={[
          styles.segmentedBarTrack,
          {
            backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
          },
        ]}
      >
        {items.map((item) => {
          const meta = getCategoryMeta(item.categoryName, 'expense', isDark);
          const isSelected = item.categoryId === selectedCategoryId;
          const minPercent = Math.max(item.percentage, 3);

          return (
            <Pressable
              hitSlop={4}
              key={item.categoryId}
              onPress={() => setSelectedCategoryId(item.categoryId)}
              style={[
                styles.segmentSlice,
                {
                  backgroundColor: meta.color,
                  opacity: isSelected ? 1 : 0.65,
                  width: `${minPercent}%`,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Category Breakdown List */}
      <View style={styles.breakdownList}>
        {items.map((item) => {
          const meta = getCategoryMeta(item.categoryName, 'expense', isDark);
          const isSelected = item.categoryId === selectedCategoryId;

          return (
            <Pressable
              key={item.categoryId}
              onPress={() => setSelectedCategoryId(item.categoryId)}
              style={({ pressed }) => [
                styles.breakdownRow,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? colors.surfaceSecondary
                      : '#F8FAFC'
                    : 'transparent',
                  borderColor: isSelected ? colors.primary : 'transparent',
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.breakdownLeft}>
                <View
                  style={[styles.colorDot, { backgroundColor: meta.color }]}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.categoryRowName,
                    {
                      color: isSelected ? colors.primary : colors.textPrimary,
                      fontWeight: isSelected ? '800' : '600',
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
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#F1F5F9',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.percentBadgeText,
                      { color: colors.textSecondary },
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
  },
  breakdownList: {
    gap: 4,
    marginTop: spacing.sm,
  },
  breakdownRight: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 8,
  },
  breakdownRow: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 10,
  },
  categoryRowAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryRowName: {
    flexShrink: 1,
    fontSize: 13,
  },
  colorDot: {
    borderRadius: radius.pill,
    height: 10,
    width: 10,
  },
  container: {
    borderRadius: 24,
    borderWidth: 1.5,
    elevation: 2,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  heroCenter: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  percentBadge: {
    borderRadius: radius.pill,
    minWidth: 36,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  percentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
  segmentedBarTrack: {
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 2,
    height: 14,
    marginVertical: spacing.md,
    overflow: 'hidden',
    padding: 2,
    width: '100%',
  },
  segmentSlice: {
    borderRadius: radius.pill,
    height: '100%',
  },
  selectedAmount: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  selectedCategoryName: {
    fontSize: 15,
    fontWeight: '700',
  },
  selectedIconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 56,
    justifyContent: 'center',
    marginBottom: 2,
    width: 56,
  },
});
