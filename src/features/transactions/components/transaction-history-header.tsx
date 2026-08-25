import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TransactionMonthPickerModal } from '@/features/transactions/components/transaction-month-picker-modal';
import {
  TransactionPeriodSegmentedControl,
  type HistoryPeriod,
} from '@/features/transactions/components/transaction-period-segmented-control';
import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TransactionHistoryHeaderProps = {
  activePeriod: HistoryPeriod;
  exporting?: boolean;
  language: 'id' | 'en';
  monthLabel: string;
  onChangePeriod: (period: HistoryPeriod) => void;
  onExport?: () => void;
  onNextMonth: () => void;
  onPrevMonth: () => void;
  onSelectMonth: (year: number, month: number) => void;
  selectedMonth: number;
  selectedYear: number;
};

export const TransactionHistoryHeader = memo(function TransactionHistoryHeader({
  activePeriod,
  exporting = false,
  language,
  monthLabel,
  onChangePeriod,
  onExport,
  onNextMonth,
  onPrevMonth,
  onSelectMonth,
  selectedMonth,
  selectedYear,
}: TransactionHistoryHeaderProps) {
  const { colors } = useTheme();
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const selectMonthLabel =
    language === 'id'
      ? `Pilih bulan, ${monthLabel}`
      : `Choose month, ${monthLabel}`;

  function handleSelectMonth(year: number, month: number) {
    onSelectMonth(year, month);
    setMonthPickerVisible(false);
  }

  return (
    <>
      <View style={[styles.headerRoot, { backgroundColor: colors.background }]}>
        <View style={styles.topRow}>
          <View style={styles.monthNavigator}>
            <Pressable
              accessibilityLabel={
                language === 'id' ? 'Bulan sebelumnya' : 'Previous month'
              }
              accessibilityRole="button"
              hitSlop={6}
              onPress={onPrevMonth}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="chevron-left"
                size={26}
              />
            </Pressable>

            <Pressable
              accessibilityLabel={selectMonthLabel}
              accessibilityRole="button"
              onPress={() => setMonthPickerVisible(true)}
              style={({ pressed }) => [
                styles.monthButton,
                pressed && styles.pressed,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.monthText, { color: colors.textPrimary }]}
              >
                {monthLabel}
              </Text>
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="menu-down"
                size={19}
              />
            </Pressable>

            <Pressable
              accessibilityLabel={
                language === 'id' ? 'Bulan berikutnya' : 'Next month'
              }
              accessibilityRole="button"
              hitSlop={6}
              onPress={onNextMonth}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="chevron-right"
                size={26}
              />
            </Pressable>
          </View>

          {onExport ? (
            <Pressable
              accessibilityLabel={
                language === 'id' ? 'Ekspor CSV' : 'Export CSV'
              }
              accessibilityRole="button"
              accessibilityState={{ busy: exporting, disabled: exporting }}
              disabled={exporting}
              hitSlop={6}
              onPress={onExport}
              style={({ pressed }) => [
                styles.exportButton,
                { backgroundColor: colors.surface },
                pressed && styles.pressed,
              ]}
            >
              {exporting ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="export-variant"
                  size={21}
                />
              )}
            </Pressable>
          ) : null}
        </View>

        <TransactionPeriodSegmentedControl
          activePeriod={activePeriod}
          embedded
          language={language}
          onChangePeriod={onChangePeriod}
        />
      </View>

      <TransactionMonthPickerModal
        language={language}
        onClose={() => setMonthPickerVisible(false)}
        onSelectMonth={handleSelectMonth}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        visible={monthPickerVisible}
      />
    </>
  );
});

const styles = StyleSheet.create({
  exportButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerRoot: {
    alignSelf: 'center',
    gap: spacing.sm,
    maxWidth: contentMaxWidth,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    width: '100%',
  },
  iconButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 36,
  },
  monthButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.xs,
  },
  monthNavigator: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  monthText: {
    ...typography.body,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.25,
    minWidth: 90,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  pressed: {
    opacity: 0.65,
    transform: [{ scale: 0.98 }],
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
