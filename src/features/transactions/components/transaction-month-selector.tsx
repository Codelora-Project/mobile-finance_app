import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TransactionMonthSelectorProps = {
  isAllTime: boolean;
  language: 'id' | 'en';
  month: number; // 1 - 12
  onChangeMonth: (year: number, month: number) => void;
  onToggleAllTime: () => void;
  year: number;
};

export const TransactionMonthSelector = memo(function TransactionMonthSelector({
  isAllTime,
  language,
  month,
  onChangeMonth,
  onToggleAllTime,
  year,
}: TransactionMonthSelectorProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const dateObj = new Date(year, month - 1, 1);
  const monthLabel = new Intl.DateTimeFormat(
    language === 'id' ? 'id-ID' : 'en-US',
    {
      month: 'long',
      year: 'numeric',
    },
  ).format(dateObj);

  function handlePrevMonth() {
    if (isAllTime) {
      onToggleAllTime();
      return;
    }
    if (month === 1) {
      onChangeMonth(year - 1, 12);
    } else {
      onChangeMonth(year, month - 1);
    }
  }

  function handleNextMonth() {
    if (isAllTime) {
      onToggleAllTime();
      return;
    }
    if (month === 12) {
      onChangeMonth(year + 1, 1);
    } else {
      onChangeMonth(year, month + 1);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        {/* Previous Month Button */}
        <Pressable
          accessibilityLabel={t.common.previousMonth}
          accessibilityRole="button"
          hitSlop={12}
          onPress={handlePrevMonth}
          style={({ pressed }) => [
            styles.navBtn,
            pressed ? { opacity: 0.5 } : null,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.textSecondary}
            name="chevron-left"
            size={22}
          />
        </Pressable>

        {/* Month / Period Label & Toggle */}
        <Pressable
          accessibilityLabel={isAllTime ? t.transactions.allTime : monthLabel}
          accessibilityRole="button"
          onPress={onToggleAllTime}
          style={styles.labelWrapper}
        >
          <Text
            numberOfLines={1}
            style={[styles.monthText, { color: colors.textPrimary }]}
          >
            {isAllTime ? t.transactions.allTime : monthLabel}
          </Text>
          <View
            style={[
              styles.modePill,
              {
                backgroundColor: colors.subtleOverlay,
              },
            ]}
          >
            <Text
              style={[styles.subToggleText, { color: colors.textSecondary }]}
            >
              {isAllTime ? t.transactions.viewByMonth : t.transactions.allTime}
            </Text>
          </View>
        </Pressable>

        {/* Next Month Button */}
        <Pressable
          accessibilityLabel={t.common.nextMonth}
          accessibilityRole="button"
          hitSlop={12}
          onPress={handleNextMonth}
          style={({ pressed }) => [
            styles.navBtn,
            pressed ? { opacity: 0.5 } : null,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.textSecondary}
            name="chevron-right"
            size={22}
          />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  labelWrapper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
    justifyContent: 'center',
  },
  modePill: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  monthText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  navBtn: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  navRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subToggleText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '500',
  },
});
