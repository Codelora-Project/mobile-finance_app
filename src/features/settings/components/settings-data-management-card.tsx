import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { StorageStats } from '@/features/settings/settings-repository';
import { formatStorageSize } from '@/features/settings/settings-repository';
import type { Language, TranslationSchema } from '@/lib/i18n/translations';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type SettingsDataManagementCardProps = {
  clearingCache?: boolean;
  currencyCode: string;
  currencyName: string;
  exportingCsv?: boolean;
  language: Language;
  onClearCache?: () => void;
  onNavigateBackup: () => void;
  onNavigateCategories: () => void;
  onNavigatePaymentMethods: () => void;
  onQuickExport?: () => void;
  storageStats?: StorageStats | null;
  t: TranslationSchema;
};

export const SettingsDataManagementCard = memo(
  function SettingsDataManagementCard({
    clearingCache = false,
    currencyCode,
    currencyName,
    exportingCsv = false,
    language,
    onClearCache,
    onNavigateBackup,
    onNavigateCategories,
    onNavigatePaymentMethods,
    onQuickExport,
    storageStats,
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

          {/* Quick Export CSV Row */}
          <Pressable
            accessibilityLabel={t.settings.quickExportTitle}
            accessibilityRole="button"
            disabled={exportingCsv}
            onPress={onQuickExport}
            style={({ pressed }) => [
              styles.navRowItem,
              pressed ? styles.rowPressed : null,
              exportingCsv && { opacity: 0.6 },
            ]}
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
                  name="file-delimited-outline"
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
                  {t.settings.quickExportTitle}
                </Text>
                <Text
                  style={[
                    styles.navRowSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.settings.quickExportSubtitle}
                </Text>
              </View>
            </View>
            {exportingCsv ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <MaterialCommunityIcons
                color={colors.textSecondary}
                name="chevron-right"
                size={22}
              />
            )}
          </Pressable>

          <View
            style={[
              styles.cardInnerDivider,
              { backgroundColor: colors.border },
            ]}
          />

          {/* Storage & Local Cache Section */}
          <View style={styles.storageSectionContainer}>
            <View style={styles.storageHeaderRow}>
              <View style={styles.navRowLeft}>
                <View
                  style={[
                    styles.itemIconBadge,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#FEF3C7',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color="#D97706"
                    name="folder-sync-outline"
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
                    {t.settings.storageSection}
                  </Text>
                  <Text
                    style={[
                      styles.navRowSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {storageStats
                      ? `${storageStats.transactionsCount} ${t.backup.transactions.toLowerCase()} · ${formatStorageSize(
                          storageStats.receiptsSizeBytes +
                            storageStats.cacheSizeBytes,
                        )}`
                      : language === 'id'
                        ? 'Memuat rincian...'
                        : 'Loading details...'}
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityLabel={t.settings.clearCacheBtn}
                accessibilityRole="button"
                disabled={clearingCache}
                hitSlop={8}
                onPress={onClearCache}
                style={({ pressed }) => [
                  styles.clearCacheButton,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#F1F5F9',
                  },
                  pressed && styles.rowPressed,
                  clearingCache && { opacity: 0.6 },
                ]}
              >
                {clearingCache ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      color={colors.primary}
                      name="broom"
                      size={14}
                    />
                    <Text
                      style={[
                        styles.clearCacheButtonText,
                        { color: colors.primary },
                      ]}
                    >
                      {t.settings.clearCacheBtn}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Breakdown Mini Chips */}
            {storageStats ? (
              <View style={styles.storageChipsRow}>
                <View
                  style={[
                    styles.storageChip,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#F8FAFC',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.textSecondary}
                    name="swap-horizontal"
                    size={13}
                  />
                  <Text
                    style={[
                      styles.storageChipText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {storageStats.transactionsCount}{' '}
                    {t.settings.storageTransactions}
                  </Text>
                </View>

                <View
                  style={[
                    styles.storageChip,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#F8FAFC',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.textSecondary}
                    name="image-outline"
                    size={13}
                  />
                  <Text
                    style={[
                      styles.storageChipText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {storageStats.receiptsCount}{' '}
                    {t.settings.storageReceipts} (
                    {formatStorageSize(storageStats.receiptsSizeBytes)})
                  </Text>
                </View>

                <View
                  style={[
                    styles.storageChip,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#F8FAFC',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.textSecondary}
                    name="cached"
                    size={13}
                  />
                  <Text
                    style={[
                      styles.storageChipText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {t.settings.storageCache} (
                    {formatStorageSize(storageStats.cacheSizeBytes)})
                  </Text>
                </View>
              </View>
            ) : null}
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
  clearCacheButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearCacheButtonText: {
    ...typography.metadata,
    fontSize: 11,
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
  navRowTitle: {
    ...typography.body,
    fontWeight: '700',
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
  storageChip: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  storageChipText: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  storageChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  storageHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storageSectionContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
