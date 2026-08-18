import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

    const totalStorageBytes = storageStats
      ? storageStats.receiptsSizeBytes + storageStats.cacheSizeBytes
      : 0;

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
          {/* 1. Categories Row */}
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
              <View style={styles.navTextWrap}>
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
              size={20}
            />
          </Pressable>

          <View
            style={[
              styles.cardInnerDivider,
              { backgroundColor: colors.border },
            ]}
          />

          {/* 2. Payment Methods Row */}
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
              <View style={styles.navTextWrap}>
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
              size={20}
            />
          </Pressable>

          <View
            style={[
              styles.cardInnerDivider,
              { backgroundColor: colors.border },
            ]}
          />

          {/* 3. Backup & Restore Row */}
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
              <View style={styles.navTextWrap}>
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
              size={20}
            />
          </Pressable>

          <View
            style={[
              styles.cardInnerDivider,
              { backgroundColor: colors.border },
            ]}
          />

          {/* 4. Quick Export CSV Row */}
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
              <View style={styles.navTextWrap}>
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
                size={20}
              />
            )}
          </Pressable>

          <View
            style={[
              styles.cardInnerDivider,
              { backgroundColor: colors.border },
            ]}
          />

          {/* 5. Storage & Local Cache Section (Option A: Storage Bar + 3 Columns) */}
          <View style={styles.storageSectionContainer}>
            {/* Header with Title & Action Button */}
            <View style={styles.storageHeaderRow}>
              <View style={styles.storageHeaderLeft}>
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
                <View style={styles.navTextWrap}>
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
                      ? `Total: ${formatStorageSize(totalStorageBytes)} · ${storageStats.transactionsCount} transaksi`
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
                      : '#EFF6FF',
                    borderColor: isDark ? colors.border : '#BFDBFE',
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
                      size={13}
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

            {/* Storage Indicator Progress Bar */}
            {storageStats ? (
              <View
                style={[
                  styles.storageProgressBarTrack,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : '#E2E8F0',
                  },
                ]}
              >
                <View style={[styles.progressSegment, { backgroundColor: '#3B82F6', flex: 3 }]} />
                <View
                  style={[
                    styles.progressSegment,
                    {
                      backgroundColor: '#8B5CF6',
                      flex: storageStats.receiptsSizeBytes > 0 ? 5 : 1,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.progressSegment,
                    {
                      backgroundColor: '#F59E0B',
                      flex: storageStats.cacheSizeBytes > 0 ? 2 : 1,
                    },
                  ]}
                />
              </View>
            ) : null}

            {/* 3 Balanced Metric Columns */}
            {storageStats ? (
              <View style={styles.metricsGridRow}>
                {/* Column 1: Transaksi */}
                <View
                  style={[
                    styles.metricColumnCard,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#F8FAFC',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.metricCardHeader}>
                    <View
                      style={[styles.indicatorDot, { backgroundColor: '#3B82F6' }]}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.metricCardLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.settings.storageTransactions}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.metricCardValue,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {storageStats.transactionsCount} data
                  </Text>
                </View>

                {/* Column 2: Foto Struk */}
                <View
                  style={[
                    styles.metricColumnCard,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#F8FAFC',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.metricCardHeader}>
                    <View
                      style={[styles.indicatorDot, { backgroundColor: '#8B5CF6' }]}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.metricCardLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.settings.storageReceipts}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.metricCardValue,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {formatStorageSize(storageStats.receiptsSizeBytes)}
                  </Text>
                </View>

                {/* Column 3: Cache / PDF */}
                <View
                  style={[
                    styles.metricColumnCard,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#F8FAFC',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.metricCardHeader}>
                    <View
                      style={[styles.indicatorDot, { backgroundColor: '#F59E0B' }]}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.metricCardLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {t.settings.storageCache}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.metricCardValue,
                      {
                        color:
                          storageStats.cacheSizeBytes > 0
                            ? '#D97706'
                            : colors.textPrimary,
                      },
                    ]}
                  >
                    {formatStorageSize(storageStats.cacheSizeBytes)}
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
    borderWidth: 1,
    flexDirection: 'row',
    flexShrink: 0,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
  indicatorDot: {
    borderRadius: radius.pill,
    height: 6,
    width: 6,
  },
  itemIconBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  metricCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  metricCardLabel: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '600',
  },
  metricCardValue: {
    ...typography.body,
    fontSize: 12,
    fontWeight: '800',
  },
  metricColumnCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.xs + 2,
  },
  metricsGridRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
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
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginRight: spacing.xs,
  },
  navRowSubtitle: {
    ...typography.metadata,
    fontSize: 12,
  },
  navRowTitle: {
    ...typography.body,
    fontWeight: '700',
  },
  navTextWrap: {
    flex: 1,
  },
  progressSegment: {
    height: '100%',
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
  storageHeaderLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginRight: spacing.xs,
  },
  storageHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storageProgressBarTrack: {
    borderRadius: radius.pill,
    flexDirection: 'row',
    height: 6,
    marginTop: spacing.sm,
    overflow: 'hidden',
    width: '100%',
  },
  storageSectionContainer: {
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
