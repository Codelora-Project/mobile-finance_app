import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Language, TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type SettingsDataManagementCardProps = {
  currencyCode: string;
  currencyName: string;
  language: Language;
  onNavigateBackup: () => void;
  onNavigateCategories: () => void;
  onNavigatePaymentMethods: () => void;
  t: TranslationSchema;
};

export const SettingsDataManagementCard = memo(
  function SettingsDataManagementCard({
    currencyCode,
    currencyName,
    language,
    onNavigateBackup,
    onNavigateCategories,
    onNavigatePaymentMethods,
    t,
  }: SettingsDataManagementCardProps) {
    const { colors, isDark } = useTheme();

    return (
      <View style={styles.sectionGroup}>
        <Text
          accessibilityRole="header"
          style={[
            styles.sectionHeaderLabel,
            { color: colors.textSecondary },
          ]}
        >
          {t.settings.manageSection}
        </Text>

        <View
          style={[
            styles.groupedCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Categories Row */}
          <Pressable
            accessibilityLabel={t.settings.categories}
            accessibilityRole="button"
            onPress={onNavigateCategories}
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
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#FFEDD5',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color="#EA580C"
                  name="tag-multiple-outline"
                  size={19}
                />
              </View>
              <View>
                <Text
                  style={[
                    styles.navRowTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t.settings.categories}
                </Text>
                <Text
                  style={[
                    styles.navRowSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {language === 'id'
                    ? 'Kelola kategori pemasukan & pengeluaran'
                    : 'Manage income & expense categories'}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="chevron-right"
              size={22}
            />
          </Pressable>

          <View
            style={[
              styles.cardInnerDivider,
              { backgroundColor: colors.border },
            ]}
          />

          {/* Payment Methods Row */}
          <Pressable
            accessibilityLabel={t.settings.paymentMethods}
            accessibilityRole="button"
            onPress={onNavigatePaymentMethods}
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
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#EDE9FE',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color="#7C3AED"
                  name="credit-card-outline"
                  size={19}
                />
              </View>
              <View>
                <Text
                  style={[
                    styles.navRowTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t.settings.paymentMethods}
                </Text>
                <Text
                  style={[
                    styles.navRowSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {language === 'id'
                    ? 'Tunai, rekening bank, & e-wallet'
                    : 'Cash, bank accounts, & e-wallets'}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="chevron-right"
              size={22}
            />
          </Pressable>

          <View
            style={[
              styles.cardInnerDivider,
              { backgroundColor: colors.border },
            ]}
          />

          {/* Backup & Restore Row */}
          <Pressable
            accessibilityLabel={t.backup.title}
            accessibilityRole="button"
            onPress={onNavigateBackup}
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
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#DBEAFE',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color="#2563EB"
                  name="database-sync-outline"
                  size={19}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.navRowTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t.backup.title}
                </Text>
                <Text
                  style={[
                    styles.navRowSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.backup.subtitle}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              color={colors.textSecondary}
              name="chevron-right"
              size={22}
            />
          </Pressable>

          <View
            style={[
              styles.cardInnerDivider,
              { backgroundColor: colors.border },
            ]}
          />

          {/* Currency Row (Read Only) */}
          <View
            accessibilityLabel="Currency, Indonesian Rupiah, IDR, read only"
            style={styles.navRowItem}
          >
            <View style={styles.navRowLeft}>
              <View
                style={[
                  styles.itemIconBadge,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#DCFCE7',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color="#16A34A"
                  name="cash"
                  size={19}
                />
              </View>
              <View>
                <Text
                  style={[
                    styles.navRowTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {currencyName}
                </Text>
                <Text
                  style={[
                    styles.navRowSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {currencyCode}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.readOnlyPillBadge,
                {
                  backgroundColor: isDark
                    ? colors.surfaceSecondary
                    : '#F1F5F9',
                },
              ]}
            >
              <Text
                style={[
                  styles.readOnlyPillText,
                  { color: colors.textSecondary },
                ]}
              >
                {t.settings.readOnly}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  cardInnerDivider: {
    height: 1,
    width: '100%',
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
  navRowTitle: {
    ...typography.body,
    fontWeight: '700',
  },
  readOnlyPillBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  readOnlyPillText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
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
