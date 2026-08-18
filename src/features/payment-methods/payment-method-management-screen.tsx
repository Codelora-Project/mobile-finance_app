import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import {
  archiveWallet,
  getWallets,
  getWalletSummary,
  unarchiveWallet,
} from '@/features/accounts/account-repository';
import type { Wallet, WalletSummary } from '@/features/accounts/account-types';
import { WalletEditorModal } from '@/features/accounts/components/wallet-editor-modal';
import { WalletReconcileModal } from '@/features/accounts/components/wallet-reconcile-modal';
import { useCurrency } from '@/lib/currency/currency-context';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function PaymentMethodManagementScreen() {
  const database = useSQLiteContext();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { currencyCode, currencySymbol } = useCurrency();
  const { language, t } = useLanguage();

  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [archivedWallets, setArchivedWallets] = useState<readonly Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);

  // Modal States
  const [editorTarget, setEditorTarget] = useState<Wallet | 'new' | null>(null);
  const [reconcileTarget, setReconcileTarget] = useState<Wallet | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [summary, allWithArchived] = await Promise.all([
        getWalletSummary(database),
        getWallets(database, { includeArchived: true }),
      ]);
      setWalletSummary(summary);
      setArchivedWallets(allWithArchived.filter((w) => w.isArchived));
      setScreenError(null);
    } catch (caughtError) {
      if (__DEV__) {
        console.error('Wallet management load error:', caughtError);
      }
      setScreenError(mapError(caughtError, 'DATABASE_WRITE_FAILED').message);
    } finally {
      setLoading(false);
    }
  }, [database]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  function handleConfirmArchive(wallet: Wallet) {
    Alert.alert(
      t.wallets.archiveWallet,
      t.wallets.archiveWalletConfirm,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.wallets.archiveWallet,
          style: 'destructive',
          onPress: async () => {
            try {
              await archiveWallet(database, wallet.id);
              await loadData();
            } catch (err) {
              Alert.alert('Error', mapError(err, 'DATABASE_WRITE_FAILED').message);
            }
          },
        },
      ],
    );
  }

  async function handleUnarchive(wallet: Wallet) {
    try {
      await unarchiveWallet(database, wallet.id);
      await loadData();
    } catch (err) {
      Alert.alert('Error', mapError(err, 'DATABASE_WRITE_FAILED').message);
    }
  }

  if (loading && !walletSummary) {
    return (
      <Screen>
        <View style={styles.centerLoading}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            {language === 'id' ? 'Memuat data dompet…' : 'Loading wallets…'}
          </Text>
        </View>
      </Screen>
    );
  }

  const activeWallets = walletSummary?.wallets ?? [];
  const totalNetWorth = walletSummary?.totalNetWorthMinor ?? 0;
  const operationalCash = walletSummary?.operationalCashMinor ?? 0;
  const trackingAssets = walletSummary?.trackingAssetsMinor ?? 0;

  return (
    <Screen>
      {/* Top Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          accessibilityLabel={t.common.back}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons
            color={colors.textPrimary}
            name="arrow-left"
            size={22}
          />
        </Pressable>

        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: colors.textPrimary }]}
        >
          {t.wallets.title}
        </Text>

        <Pressable
          accessibilityLabel={t.wallets.addWallet}
          accessibilityRole="button"
          onPress={() => setEditorTarget('new')}
          style={({ pressed }) => [
            styles.addHeaderBtn,
            { backgroundColor: colors.primary },
            pressed ? { opacity: 0.8 } : null,
          ]}
        >
          <MaterialCommunityIcons color="#FFFFFF" name="plus" size={18} />
          <Text style={styles.addHeaderBtnText}>
            {language === 'id' ? 'Tambah' : 'Add'}
          </Text>
        </Pressable>
      </View>

      {/* Main List Body */}
      <FlatList
        contentContainerStyle={styles.listContainer}
        data={activeWallets}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              color={colors.textMuted}
              name="wallet-outline"
              size={44}
            />
            <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
              {language === 'id'
                ? 'Belum ada dompet terdaftar.'
                : 'No wallets registered.'}
            </Text>
            <AppButton
              label={t.wallets.addWallet}
              onPress={() => setEditorTarget('new')}
              variant="primary"
            />
          </View>
        }
        ListFooterComponent={
          archivedWallets.length > 0 ? (
            <View style={styles.archivedSection}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons
                  color={colors.textMuted}
                  name="archive-outline"
                  size={18}
                />
                <Text
                  style={[styles.sectionTitle, { color: colors.textMuted }]}
                >
                  {t.wallets.archivedWallets} ({archivedWallets.length})
                </Text>
              </View>

              {archivedWallets.map((wallet) => (
                <View
                  key={wallet.id}
                  style={[
                    styles.walletCard,
                    styles.archivedCard,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#F1F5F9',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View
                        style={[
                          styles.walletIconBadge,
                          { backgroundColor: isDark ? '#334155' : '#CBD5E1' },
                        ]}
                      >
                        <MaterialCommunityIcons
                          color={colors.textMuted}
                          name="archive"
                          size={20}
                        />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.walletName,
                            { color: colors.textMuted },
                          ]}
                        >
                          {wallet.name}
                        </Text>
                        <Text
                          style={[
                            styles.balanceText,
                            { color: colors.textMuted },
                          ]}
                        >
                          {formatMoney(
                            wallet.currentBalanceMinor,
                            currencyCode,
                          )}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => void handleUnarchive(wallet)}
                      style={({ pressed }) => [
                        styles.unarchiveBtn,
                        { borderColor: colors.primary },
                        pressed ? { opacity: 0.7 } : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.unarchiveBtnText,
                          { color: colors.primary },
                        ]}
                      >
                        {t.wallets.unarchiveWallet}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
        ListHeaderComponent={
          <>
            {/* 🌟 Overview Net Worth Card */}
            <View
              style={[
                styles.overviewCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#1E3A8A',
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text style={styles.overviewLabel}>{t.wallets.title}</Text>
              <Text style={styles.overviewBalance}>
                {formatMoney(totalNetWorth, currencyCode)}
              </Text>
              <View
                style={[
                  styles.overviewDivider,
                  { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
                ]}
              />
              <View style={styles.overviewBreakdownRow}>
                <View style={styles.breakdownCol}>
                  <Text style={styles.breakdownLabel}>
                    💵 {language === 'id' ? 'Kas Operasional' : 'Cashflow'}
                  </Text>
                  <Text style={styles.breakdownVal}>
                    {formatMoney(operationalCash, currencyCode)}
                  </Text>
                </View>
                <View style={styles.breakdownCol}>
                  <Text style={styles.breakdownLabel}>
                    📈 {language === 'id' ? 'Pantau Aset' : 'Tracking Assets'}
                  </Text>
                  <Text style={styles.breakdownVal}>
                    {formatMoney(trackingAssets, currencyCode)}
                  </Text>
                </View>
              </View>
            </View>

            {screenError ? (
              <Text style={[styles.errorBanner, { color: colors.destructive }]}>
                {screenError}
              </Text>
            ) : null}

            {/* Active Wallets Title */}
            <View style={styles.sectionHeaderRow}>
              <MaterialCommunityIcons
                color={colors.primary}
                name="wallet"
                size={18}
              />
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                {t.wallets.activeWallets} ({activeWallets.length})
              </Text>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const walletColor = item.color || colors.primary;

          return (
            <View
              style={[
                styles.walletCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Card Header (Icon, Name, Balance, Badges) */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View
                    style={[
                      styles.walletIconBadge,
                      {
                        backgroundColor: isDark
                          ? `${walletColor}25`
                          : `${walletColor}15`,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={walletColor}
                      name={
                        (item.iconKey as any) ||
                        (item.accountType === 'bank'
                          ? 'bank'
                          : item.accountType === 'ewallet'
                          ? 'cellphone'
                          : item.accountType === 'investment'
                          ? 'trending-up'
                          : 'wallet')
                      }
                      size={22}
                    />
                  </View>

                  <View style={styles.nameAndMeta}>
                    <View style={styles.nameRow}>
                      <Text
                        style={[
                          styles.walletName,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {item.name}
                      </Text>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: item.includeInCashflow
                              ? isDark
                                ? 'rgba(16, 185, 129, 0.2)'
                                : '#DCFCE7'
                              : isDark
                              ? '#334155'
                              : '#E2E8F0',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color: item.includeInCashflow
                                ? '#10B981'
                                : colors.textMuted,
                            },
                          ]}
                        >
                          {item.includeInCashflow
                            ? language === 'id'
                              ? 'Kas'
                              : 'Cash'
                            : language === 'id'
                            ? 'Aset'
                            : 'Asset'}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.accountNumberText,
                        { color: colors.textMuted },
                      ]}
                    >
                      {item.accountNumber
                        ? `•••• ${item.accountNumber.slice(-4)} · ${item.accountType.toUpperCase()}`
                        : item.accountType.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Live Balance */}
                <View style={styles.balanceRight}>
                  <Text
                    style={[styles.balanceText, { color: colors.textPrimary }]}
                  >
                    {formatMoney(item.currentBalanceMinor, currencyCode)}
                  </Text>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View
                style={[
                  styles.cardActionsRow,
                  { borderTopColor: colors.border },
                ]}
              >
                {/* Reconcile Button */}
                <Pressable
                  accessibilityLabel={`Rekonsiliasi saldo ${item.name}`}
                  accessibilityRole="button"
                  onPress={() => setReconcileTarget(item)}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    {
                      backgroundColor: isDark
                        ? 'rgba(37, 99, 235, 0.15)'
                        : '#EFF6FF',
                      borderColor: colors.primary,
                    },
                    pressed ? { opacity: 0.75 } : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.primary}
                    name="scale-balance"
                    size={16}
                  />
                  <Text
                    style={[styles.actionBtnText, { color: colors.primary }]}
                  >
                    {language === 'id' ? 'Sesuaikan Saldo' : 'Reconcile'}
                  </Text>
                </Pressable>

                {/* Edit Button */}
                <Pressable
                  accessibilityLabel={`Ubah dompet ${item.name}`}
                  accessibilityRole="button"
                  onPress={() => setEditorTarget(item)}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSecondary
                        : '#F1F5F9',
                      borderColor: colors.border,
                    },
                    pressed ? { opacity: 0.75 } : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.textPrimary}
                    name="pencil-outline"
                    size={16}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {t.common.edit}
                  </Text>
                </Pressable>

                {/* Archive Button */}
                {!item.isDefault ? (
                  <Pressable
                    accessibilityLabel={`Arsipkan ${item.name}`}
                    accessibilityRole="button"
                    onPress={() => handleConfirmArchive(item)}
                    style={({ pressed }) => [
                      styles.iconOnlyBtn,
                      {
                        backgroundColor: isDark
                          ? 'rgba(239, 68, 68, 0.12)'
                          : '#FEE2E2',
                      },
                      pressed ? { opacity: 0.75 } : null,
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={colors.destructive}
                      name="archive-arrow-down-outline"
                      size={18}
                    />
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
      />

      {/* Editor Modal */}
      <WalletEditorModal
        currencyCode={currencyCode}
        currencySymbol={currencySymbol}
        onClose={() => setEditorTarget(null)}
        onSuccess={() => void loadData()}
        visible={editorTarget !== null}
        wallet={editorTarget}
      />

      {/* Reconcile Modal */}
      <WalletReconcileModal
        currencyCode={currencyCode}
        currencySymbol={currencySymbol}
        onClose={() => setReconcileTarget(null)}
        onSuccess={() => void loadData()}
        visible={reconcileTarget !== null}
        wallet={reconcileTarget}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  accountNumberText: {
    ...typography.metadata,
    fontSize: 12,
  },
  actionBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
  },
  actionBtnText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  addHeaderBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
  },
  addHeaderBtnText: {
    ...typography.metadata,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  archivedCard: {
    opacity: 0.8,
  },
  archivedSection: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  backBtn: {
    padding: spacing.xs,
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.metadata,
    fontSize: 10,
    fontWeight: '700',
  },
  balanceRight: {
    alignItems: 'flex-end',
  },
  balanceText: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '800',
  },
  breakdownCol: {
    flex: 1,
    gap: 2,
  },
  breakdownLabel: {
    ...typography.metadata,
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '600',
  },
  breakdownVal: {
    ...typography.body,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cardActionsRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  cardHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  centerLoading: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    ...typography.body,
    fontSize: 15,
  },
  errorBanner: {
    ...typography.metadata,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerBar: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  headerTitle: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontWeight: '800',
  },
  iconOnlyBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  listContainer: {
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.xxl + 24,
  },
  loadingText: {
    ...typography.body,
    fontSize: 14,
  },
  nameAndMeta: {
    gap: 2,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  overviewBalance: {
    ...typography.displayAmount,
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  overviewBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  overviewCard: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    elevation: 4,
    gap: spacing.xs,
    marginBottom: spacing.xs,
    padding: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  overviewDivider: {
    height: 1,
    marginVertical: spacing.xs + 2,
    width: '100%',
  },
  overviewLabel: {
    ...typography.metadata,
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.metadata,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  unarchiveBtn: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
  },
  unarchiveBtnText: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
  },
  walletCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  walletIconBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  walletName: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
  },
});
