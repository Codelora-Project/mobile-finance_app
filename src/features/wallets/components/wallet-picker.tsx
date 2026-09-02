import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { getWallets } from '@/features/wallets/wallet-repository';
import { getWalletIconName } from '@/features/wallets/wallet-icons';
import type { Wallet } from '@/features/wallets/wallet-types';
import { useCurrency } from '@/lib/currency/currency-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { usePickerData } from '@/lib/use-picker-data';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type WalletPickerProps = {
  allowNone?: boolean;
  excludeWalletId?: number | null;
  onSelect: (wallet: Wallet | null) => void;
  selectedId?: number | null;
  title?: string;
};

export function WalletPicker({
  allowNone = false,
  excludeWalletId,
  onSelect,
  selectedId,
  title,
}: WalletPickerProps) {
  const database = useSQLiteContext();
  const { colors, isDark } = useTheme();
  const { currencyCode } = useCurrency();
  const { t } = useLanguage();

  const loadWallets = useCallback(
    () => getWallets(database, { includeArchived: false }),
    [database],
  );
  const {
    error,
    items: wallets,
    loading,
    reload,
  } = usePickerData({
    diagnosticLabel: 'Wallet picker',
    load: loadWallets,
    resourceKey: 'wallets',
  });

  const filteredWallets = excludeWalletId
    ? wallets.filter((w) => w.id !== excludeWalletId)
    : wallets;

  if (loading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.stateText, { color: colors.textMuted }]}>
          {t.wallets.loading}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateContainer}>
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {error}
        </Text>
        <AppButton
          label={t.common.tryAgain}
          onPress={() => void reload()}
          variant="secondary"
        />
      </View>
    );
  }

  const noneSelected = selectedId == null;

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={filteredWallets}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <>
          {title ? (
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              {title}
            </Text>
          ) : null}
          {allowNone ? (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: noneSelected }}
              onPress={() => onSelect(null)}
              style={({ pressed }) => [
                styles.walletRow,
                {
                  backgroundColor: noneSelected
                    ? isDark
                      ? colors.primaryOverlay
                      : colors.primaryLight
                    : colors.surface,
                  borderColor: noneSelected ? colors.primary : colors.border,
                },
                pressed ? { opacity: 0.7 } : null,
              ]}
            >
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSecondary
                      : colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.textMuted}
                  name="wallet-outline"
                  size={20}
                />
              </View>
              <View style={styles.rowInfo}>
                <Text
                  style={[styles.walletName, { color: colors.textPrimary }]}
                >
                  {t.wallets.noWalletSelected}
                </Text>
                <Text style={[styles.walletMeta, { color: colors.textMuted }]}>
                  {t.common.optional}
                </Text>
              </View>
              <MaterialCommunityIcons
                color={noneSelected ? colors.primary : 'transparent'}
                name={
                  noneSelected
                    ? 'checkbox-marked-circle'
                    : 'checkbox-blank-circle-outline'
                }
                size={22}
              />
            </Pressable>
          ) : null}
        </>
      }
      renderItem={({ item }) => {
        const isSelected = item.id === selectedId;
        const iconColor = item.color || colors.primary;

        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            onPress={() => onSelect(item)}
            style={({ pressed }) => [
              styles.walletRow,
              {
                backgroundColor: isSelected
                  ? isDark
                    ? colors.primaryOverlay
                    : colors.primaryLight
                  : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
              },
              pressed ? { opacity: 0.7 } : null,
            ]}
          >
            {/* Wallet Icon Badge */}
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: isDark ? `${iconColor}25` : `${iconColor}15`,
                },
              ]}
            >
              <MaterialCommunityIcons
                color={iconColor}
                name={getWalletIconName(item)}
                size={22}
              />
            </View>

            {/* Wallet Info */}
            <View style={styles.rowInfo}>
              <View style={styles.nameRow}>
                <Text
                  style={[styles.walletName, { color: colors.textPrimary }]}
                >
                  {item.name}
                </Text>
                {!item.includeInCashflow ? (
                  <View
                    style={[
                      styles.trackingPill,
                      {
                        backgroundColor: isDark
                          ? colors.surfaceSecondary
                          : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.trackingPillText,
                        { color: colors.textMuted },
                      ]}
                    >
                      {t.wallets.assetBadge}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.balanceText, { color: colors.primary }]}>
                {formatMoney(item.currentBalanceMinor, currencyCode)}
              </Text>
            </View>

            {/* Checkmark indicator */}
            <MaterialCommunityIcons
              color={isSelected ? colors.primary : colors.borderStrong}
              name={
                isSelected
                  ? 'checkbox-marked-circle'
                  : 'checkbox-blank-circle-outline'
              }
              size={22}
            />
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  balanceText: {
    ...typography.metadata,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  listContent: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rowInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  stateContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 180,
    padding: spacing.lg,
  },
  stateText: {
    ...typography.body,
    fontSize: 14,
  },
  errorText: {
    ...typography.body,
    fontSize: 14,
    textAlign: 'center',
  },
  trackingPill: {
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  trackingPillText: {
    ...typography.metadata,
    fontSize: 10,
    fontWeight: '700',
  },
  walletMeta: {
    ...typography.metadata,
    fontSize: 12,
  },
  walletName: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
  },
  walletRow: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
});
