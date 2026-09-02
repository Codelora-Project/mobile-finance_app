import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  MonthPickerModal,
  type MonthPickerValue,
} from '@/components/ui/month-picker-modal';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { contentMaxWidth } from '@/theme/layout';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type AnalyticsHeaderProps = {
  backLabel: string;
  exporting?: boolean;
  language: 'id' | 'en';
  maximumValue: MonthPickerValue;
  monthLabel: string;
  nextMonthDisabled?: boolean;
  onBack?: () => void;
  onExport?: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onSelectMonth: (year: number, month: number) => void;
  selectedMonth: number;
  selectedYear: number;
};

export const AnalyticsHeader = memo(function AnalyticsHeader({
  backLabel,
  exporting = false,
  language,
  maximumValue,
  monthLabel,
  nextMonthDisabled = false,
  onBack,
  onExport,
  onNextMonth,
  onPreviousMonth,
  onSelectMonth,
  selectedMonth,
  selectedYear,
}: AnalyticsHeaderProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

  function handleSelectMonth(year: number, month: number) {
    onSelectMonth(year, month);
    setMonthPickerVisible(false);
  }

  return (
    <>
      <View style={styles.header}>
        {onBack ? (
          <Pressable
            accessibilityLabel={backLabel}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name="chevron-left"
              size={27}
            />
          </Pressable>
        ) : null}

        <View style={[styles.monthNavigator, onBack && styles.withBack]}>
          <Pressable
            accessibilityLabel={t.common.previousMonth}
            accessibilityRole="button"
            hitSlop={6}
            onPress={onPreviousMonth}
            style={({ pressed }) => [
              styles.chevronButton,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="chevron-left"
              size={25}
            />
          </Pressable>

          <Pressable
            accessibilityLabel={`${t.common.chooseMonth}, ${monthLabel}`}
            accessibilityRole="button"
            onPress={() => setMonthPickerVisible(true)}
            style={({ pressed }) => [
              styles.monthButton,
              pressed && styles.pressed,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.monthLabel, { color: colors.textPrimary }]}
            >
              {monthLabel}
            </Text>
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="menu-down"
              size={18}
            />
          </Pressable>

          <Pressable
            accessibilityLabel={t.common.nextMonth}
            accessibilityRole="button"
            accessibilityState={{ disabled: nextMonthDisabled }}
            disabled={nextMonthDisabled}
            hitSlop={6}
            onPress={onNextMonth}
            style={({ pressed }) => [
              styles.chevronButton,
              nextMonthDisabled && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="chevron-right"
              size={25}
            />
          </Pressable>
        </View>

        {onExport ? (
          <Pressable
            accessibilityLabel={t.common.exportCsv}
            accessibilityRole="button"
            accessibilityState={{ busy: exporting, disabled: exporting }}
            disabled={exporting}
            hitSlop={6}
            onPress={onExport}
            style={({ pressed }) => [
              styles.actionButton,
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
                size={20}
              />
            )}
          </Pressable>
        ) : (
          <View style={styles.actionSpacer} />
        )}
      </View>

      <MonthPickerModal
        language={language}
        maximumValue={maximumValue}
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
  actionButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  actionSpacer: {
    width: 40,
  },
  chevronButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 34,
  },
  disabled: {
    opacity: 0.3,
  },
  header: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: contentMaxWidth,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    width: '100%',
  },
  monthButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 2,
  },
  monthLabel: {
    ...typography.body,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.25,
    minWidth: 112,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  monthNavigator: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.65,
    transform: [{ scale: 0.98 }],
  },
  withBack: {
    flex: 1,
    justifyContent: 'center',
  },
});
