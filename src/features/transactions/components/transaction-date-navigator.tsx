import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HistoryPeriod } from '@/features/transactions/components/transaction-period-segmented-control';
import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TransactionDateNavigatorProps = {
  isAllTime: boolean;
  language: 'id' | 'en';
  onNextPeriod: () => void;
  onPrevPeriod: () => void;
  onToggleAllTime: () => void;
  period: HistoryPeriod;
  primaryLabel: string;
  secondaryLabel: string;
};

export const TransactionDateNavigator = memo(function TransactionDateNavigator({
  isAllTime,
  language,
  onNextPeriod,
  onPrevPeriod,
  onToggleAllTime,
  period,
  primaryLabel,
  secondaryLabel,
}: TransactionDateNavigatorProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.cardRoot,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Previous Period Button */}
        <Pressable
          accessibilityLabel={
            language === 'id' ? 'Bulan Sebelumnya' : 'Previous Period'
          }
          accessibilityRole="button"
          hitSlop={8}
          onPress={onPrevPeriod}
          style={({ pressed }) => [
            styles.navBtn,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
            },
            pressed ? { opacity: 0.6 } : null,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.textSecondary}
            name="chevron-left"
            size={20}
          />
        </Pressable>

        {/* Period Title & Subtitle */}
        <Pressable
          accessibilityLabel={primaryLabel}
          accessibilityRole="button"
          onPress={onToggleAllTime}
          style={styles.centerCol}
        >
          <Text
            numberOfLines={1}
            style={[styles.primaryText, { color: colors.textPrimary }]}
          >
            {isAllTime
              ? language === 'id'
                ? 'Semua Waktu'
                : 'All Time'
              : primaryLabel}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.secondaryText, { color: colors.textMuted }]}
          >
            {isAllTime
              ? language === 'id'
                ? 'Sentuh untuk filter per periode'
                : 'Tap to view by period'
              : secondaryLabel ||
                (language === 'id' ? 'Semua waktu' : 'All time')}
          </Text>
        </Pressable>

        {/* Next Period Button */}
        <Pressable
          accessibilityLabel={
            language === 'id' ? 'Bulan Berikutnya' : 'Next Period'
          }
          accessibilityRole="button"
          hitSlop={8}
          onPress={onNextPeriod}
          style={({ pressed }) => [
            styles.navBtn,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
            },
            pressed ? { opacity: 0.6 } : null,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.textSecondary}
            name="chevron-right"
            size={20}
          />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cardRoot: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  centerCol: {
    alignItems: 'center',
    flex: 1,
    gap: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  container: {
    alignSelf: 'center',
    marginTop: spacing.xs,
    maxWidth: contentMaxWidth - spacing.md * 2,
    width: '92%',
  },
  navBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  primaryText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  secondaryText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '500',
  },
});
