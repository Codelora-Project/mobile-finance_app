import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type TransactionMonthPickerModalProps = {
  language: 'id' | 'en';
  onClose: () => void;
  onSelectMonth: (year: number, month: number) => void;
  selectedMonth: number;
  selectedYear: number;
  visible: boolean;
};

export const TransactionMonthPickerModal = memo(
  function TransactionMonthPickerModal({
    language,
    onClose,
    onSelectMonth,
    selectedMonth,
    selectedYear,
    visible,
  }: TransactionMonthPickerModalProps) {
    const { colors } = useTheme();
    const [displayYear, setDisplayYear] = useState(selectedYear);
    const locale = language === 'id' ? 'id-ID' : 'en-US';
    const months = useMemo(
      () =>
        Array.from({ length: 12 }, (_, month) => ({
          accessibilityLabel: new Intl.DateTimeFormat(locale, {
            month: 'long',
            year: 'numeric',
          }).format(new Date(displayYear, month, 1)),
          label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(
            new Date(displayYear, month, 1),
          ),
          value: month,
        })),
      [displayYear, locale],
    );

    useEffect(() => {
      if (visible) setDisplayYear(selectedYear);
    }, [selectedYear, visible]);

    return (
      <Modal
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
        transparent
        visible={visible}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel={
              language === 'id' ? 'Tutup pemilih bulan' : 'Close month picker'
            }
            accessibilityRole="button"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />

          <View
            accessibilityViewIsModal
            style={[
              styles.dialog,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View style={styles.yearRow}>
              <Pressable
                accessibilityLabel={
                  language === 'id' ? 'Tahun sebelumnya' : 'Previous year'
                }
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setDisplayYear((year) => year - 1)}
                style={({ pressed }) => [
                  styles.yearButton,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.textPrimary}
                  name="chevron-left"
                  size={28}
                />
              </Pressable>

              <Text style={[styles.yearLabel, { color: colors.textPrimary }]}>
                {displayYear}
              </Text>

              <Pressable
                accessibilityLabel={
                  language === 'id' ? 'Tahun berikutnya' : 'Next year'
                }
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setDisplayYear((year) => year + 1)}
                style={({ pressed }) => [
                  styles.yearButton,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.textPrimary}
                  name="chevron-right"
                  size={28}
                />
              </Pressable>
            </View>

            <View style={styles.monthGrid}>
              {months.map((month) => {
                const selected =
                  displayYear === selectedYear && month.value === selectedMonth;

                return (
                  <Pressable
                    accessibilityLabel={month.accessibilityLabel}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={month.value}
                    onPress={() => onSelectMonth(displayYear, month.value)}
                    style={({ pressed }) => [
                      styles.monthButton,
                      {
                        backgroundColor: selected
                          ? colors.primary
                          : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthLabel,
                        {
                          color: selected
                            ? colors.onPrimary
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {month.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  dialog: {
    borderRadius: radius.lg + 8,
    borderWidth: 1,
    elevation: 12,
    maxWidth: 360,
    padding: spacing.lg,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    width: '88%',
  },
  modalRoot: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    flex: 1,
    justifyContent: 'center',
  },
  monthButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '30%',
    flexGrow: 1,
    height: 48,
    justifyContent: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  monthLabel: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  pressed: {
    opacity: 0.68,
    transform: [{ scale: 0.98 }],
  },
  yearButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  yearLabel: {
    ...typography.sectionTitle,
    fontSize: 22,
    fontWeight: '800',
  },
  yearRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
