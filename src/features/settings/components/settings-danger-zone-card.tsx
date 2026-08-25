import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Language, TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type SettingsDangerZoneCardProps = {
  language: Language;
  onRequestReset: () => void;
  resetting: boolean;
  t: TranslationSchema;
};

export const SettingsDangerZoneCard = memo(function SettingsDangerZoneCard({
  language,
  onRequestReset,
  resetting,
  t,
}: SettingsDangerZoneCardProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.sectionGroup}>
      <Text
        accessibilityRole="header"
        style={[styles.sectionHeaderLabel, { color: colors.textSecondary }]}
      >
        {t.settings.dataSection}
      </Text>

      <View
        style={[
          styles.groupedCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.destructive,
          },
        ]}
      >
        <Pressable
          accessibilityLabel={t.settings.deleteAllData}
          accessibilityRole="button"
          disabled={resetting}
          onPress={onRequestReset}
          style={({ pressed }) => [
            styles.navRowItem,
            pressed ? styles.rowPressed : null,
          ]}
        >
          <View style={styles.navRowLeft}>
            <View
              style={[
                styles.itemIconBadge,
                {
                  backgroundColor: colors.expenseBackground,
                },
              ]}
            >
              <MaterialCommunityIcons
                color={colors.destructive}
                name="trash-can-outline"
                size={19}
              />
            </View>
            <View>
              <Text
                style={[styles.dangerRowTitle, { color: colors.destructive }]}
              >
                {t.settings.deleteAllData}
              </Text>
              <Text
                style={[styles.navRowSubtitle, { color: colors.textSecondary }]}
              >
                {language === 'id'
                  ? 'Hapus seluruh riwayat transaksi & reset data'
                  : 'Delete all records & restore defaults'}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            color={colors.destructive}
            name="chevron-right"
            size={22}
          />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  dangerRowTitle: {
    ...typography.body,
    fontWeight: '700',
  },
  groupedCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemIconBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  navRowItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  navRowLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  navRowSubtitle: {
    ...typography.metadata,
    fontSize: 12,
  },
  rowPressed: {
    opacity: 0.75,
  },
  sectionGroup: {
    gap: spacing.xs,
  },
  sectionHeaderLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.xs,
  },
});
