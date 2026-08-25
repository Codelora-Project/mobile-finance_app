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
  const { colors, isDark } = useTheme();

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
            borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
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
                  backgroundColor: isDark ? '#450A0A' : '#FEE2E2',
                },
              ]}
            >
              <MaterialCommunityIcons
                color="#EF4444"
                name="trash-can-outline"
                size={19}
              />
            </View>
            <View>
              <Text style={styles.dangerRowTitle}>
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
            color="#EF4444"
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
    color: '#EF4444',
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
