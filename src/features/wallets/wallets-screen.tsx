import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useRef, useState } from 'react';
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
  WalletActionSheet,
  WalletArchivedSection,
  WalletEditorModal,
  WalletNetWorthCard,
  WalletReconcileModal,
  WalletRowItem,
} from '@/features/wallets/components';
import {
  archiveWallet,
  getWallets,
  getWalletSummary,
  unarchiveWallet,
} from '@/features/wallets/wallet-repository';
import type { Wallet, WalletSummary } from '@/features/wallets/wallet-types';
import { useCurrency } from '@/lib/currency/currency-context';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { useTheme } from '@/lib/theme/theme-context';
import { radius } from '@/theme/radius';
import { contentMaxWidth } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type WalletsScreenProps = {
  hideBackButton?: boolean;
};

export function WalletsScreen({
  hideBackButton = false,
}: WalletsScreenProps = {}) {
  const database = useSQLiteContext();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { currencyCode, currencySymbol } = useCurrency();
  const { language, t } = useLanguage();

  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(
    null,
  );
  const [archivedWallets, setArchivedWallets] = useState<readonly Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [hideBalance, setHideBalance] = useState(false);
  const loadRequestRef = useRef(0);

  // Modal States
  const [actionSheetTarget, setActionSheetTarget] = useState<Wallet | null>(
    null,
  );
  const [editorTarget, setEditorTarget] = useState<Wallet | 'new' | null>(null);
  const [reconcileTarget, setReconcileTarget] = useState<Wallet | null>(null);

  const loadData = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    try {
      const [summary, allWithArchived] = await Promise.all([
        getWalletSummary(database),
        getWallets(database, { includeArchived: true }),
      ]);
      if (requestId !== loadRequestRef.current) return;
      setWalletSummary(summary);
      setArchivedWallets(allWithArchived.filter((w) => w.isArchived));
      setScreenError(null);
    } catch (caughtError) {
      if (__DEV__) {
        console.error('Wallets load error:', caughtError);
      }
      if (requestId === loadRequestRef.current) {
        setScreenError(
          mapError(caughtError, 'DATABASE_WRITE_FAILED', t.appErrors).message,
        );
      }
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, [database, t.appErrors]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
      return () => {
        loadRequestRef.current += 1;
      };
    }, [loadData]),
  );

  function handleConfirmArchive(wallet: Wallet) {
    Alert.alert(
      t.wallets.archiveWallet,
      t.wallets.archiveConfirmDescription.replace('{name}', wallet.name),
      [
        {
          style: 'cancel',
          text: t.common.cancel,
        },
        {
          onPress: async () => {
            try {
              await archiveWallet(database, wallet.id);
              await loadData();
            } catch (err) {
              Alert.alert(
                t.common.error,
                mapError(err, 'DATABASE_WRITE_FAILED', t.appErrors).message,
              );
            }
          },
          style: 'destructive',
          text: t.wallets.archiveAction,
        },
      ],
    );
  }

  async function handleUnarchive(wallet: Wallet) {
    try {
      await unarchiveWallet(database, wallet.id);
      await loadData();
    } catch (err) {
      Alert.alert(
        t.common.error,
        mapError(err, 'DATABASE_WRITE_FAILED', t.appErrors).message,
      );
    }
  }

  function handleQuickTransfer(sourceWallet?: Wallet) {
    router.push({
      pathname: '/(app)/transactions/new',
      params: {
        type: 'transfer',
        ...(sourceWallet ? { sourceWalletId: String(sourceWallet.id) } : {}),
      },
    });
  }

  if (loading && !walletSummary) {
    return (
      <Screen>
        <View style={styles.centerLoading}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            {t.wallets.loading}
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
            backgroundColor: colors.background,
          },
        ]}
      >
        {!hideBackButton ? (
          <Pressable
            accessibilityLabel={t.common.back}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name="arrow-left"
              size={22}
            />
          </Pressable>
        ) : null}

        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[styles.headerTitle, { color: colors.textPrimary }]}
        >
          {t.wallets.title}
        </Text>

        <View style={styles.headerRightActions}>
          {/* Quick Transfer Button */}
          {activeWallets.length >= 2 ? (
            <Pressable
              accessibilityLabel={t.wallets.transferBetween}
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => handleQuickTransfer()}
              style={({ pressed }) => [
                styles.transferBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(59, 130, 246, 0.16)'
                    : colors.primaryLight,
                  borderColor: isDark
                    ? 'rgba(59, 130, 246, 0.3)'
                    : 'rgba(37, 99, 235, 0.2)',
                },
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={colors.primary}
                name="swap-horizontal"
                size={16}
              />
              <Text style={[styles.transferLabel, { color: colors.primary }]}>
                {t.wallets.transferAction}
              </Text>
            </Pressable>
          ) : null}

          {/* Add Wallet Button */}
          <Pressable
            accessibilityLabel={t.wallets.addWallet}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setEditorTarget('new')}
            style={({ pressed }) => [
              styles.addWalletBtn,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.onPrimary}
              name="plus"
              size={18}
            />
            <Text style={[styles.addWalletLabel, { color: colors.onPrimary }]}>
              {t.common.add}
            </Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        contentContainerStyle={styles.scrollContent}
        data={activeWallets}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              color={colors.textMuted}
              name="wallet-outline"
              size={48}
            />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {t.wallets.emptyTitle}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              {t.wallets.emptyDescription}
            </Text>
            <View style={{ marginTop: spacing.md }}>
              <AppButton
                label={t.wallets.addFirst}
                onPress={() => setEditorTarget('new')}
              />
            </View>
          </View>
        }
        ListFooterComponent={
          <WalletArchivedSection
            archivedWallets={archivedWallets}
            currencyCode={currencyCode}
            language={language}
            onUnarchive={(w) => void handleUnarchive(w)}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            {/* 1. Net Worth Summary Card with Privacy Eye Toggle */}
            <WalletNetWorthCard
              currencyCode={currencyCode}
              hideBalance={hideBalance}
              language={language}
              onToggleHideBalance={() => setHideBalance((prev) => !prev)}
              operationalCash={operationalCash}
              totalNetWorth={totalNetWorth}
              trackingAssets={trackingAssets}
            />

            {screenError ? (
              <View
                accessibilityLiveRegion="assertive"
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: colors.expenseBackground,
                    borderColor: colors.destructive,
                  },
                ]}
              >
                <Text style={[styles.errorText, { color: colors.destructive }]}>
                  {screenError}
                </Text>
                <AppButton
                  label={t.common.tryAgain}
                  onPress={() => void loadData()}
                  variant="secondary"
                />
              </View>
            ) : null}

            {/* 2. Section Header */}
            <View style={styles.sectionHeaderRow}>
              <Text
                style={[styles.sectionTitle, { color: colors.textSecondary }]}
              >
                {t.wallets.activeCount.replace(
                  '{count}',
                  String(activeWallets.length),
                )}
              </Text>
            </View>
          </View>
        }
        renderItem={({ index, item }) => (
          <WalletRowItem
            currencyCode={currencyCode}
            hideBalance={hideBalance}
            isLast={index === activeWallets.length - 1}
            language={language}
            onPress={(w) => setActionSheetTarget(w)}
            wallet={item}
          />
        )}
      />

      {/* Wallet Action Sheet (Tap on Card) */}
      <WalletActionSheet
        currencyCode={currencyCode}
        language={language}
        onArchive={(w) => {
          setActionSheetTarget(null);
          handleConfirmArchive(w);
        }}
        onClose={() => setActionSheetTarget(null)}
        onEdit={(w) => {
          setActionSheetTarget(null);
          setEditorTarget(w);
        }}
        onReconcile={(w) => {
          setActionSheetTarget(null);
          setReconcileTarget(w);
        }}
        onTransfer={(w) => {
          setActionSheetTarget(null);
          handleQuickTransfer(w);
        }}
        visible={Boolean(actionSheetTarget)}
        wallet={actionSheetTarget}
      />

      {/* Wallet Editor Modal (Create / Edit) */}
      <WalletEditorModal
        currencyCode={currencyCode}
        currencySymbol={currencySymbol}
        onClose={() => setEditorTarget(null)}
        onSuccess={() => {
          setEditorTarget(null);
          void loadData();
        }}
        visible={Boolean(editorTarget)}
        wallet={editorTarget}
      />

      {/* Wallet Reconcile Modal (Adjust balance) */}
      <WalletReconcileModal
        currencyCode={currencyCode}
        currencySymbol={currencySymbol}
        onClose={() => setReconcileTarget(null)}
        onSuccess={() => {
          setReconcileTarget(null);
          void loadData();
        }}
        visible={Boolean(reconcileTarget)}
        wallet={reconcileTarget}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  addWalletBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  addWalletLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '800',
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  centerLoading: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyDesc: {
    ...typography.metadata,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyTitle: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontWeight: '700',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  errorBanner: {
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  errorText: {
    ...typography.metadata,
    fontSize: 12,
    textAlign: 'center',
  },
  headerBar: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    maxWidth: contentMaxWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    width: '100%',
  },
  headerComponent: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerRightActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  headerTitle: {
    ...typography.pageTitle,
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  loadingText: {
    ...typography.metadata,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  scrollContent: {
    alignSelf: 'center',
    gap: spacing.md,
    maxWidth: contentMaxWidth,
    padding: spacing.md,
    paddingBottom: spacing.xxl + 40,
    width: '100%',
  },
  sectionHeaderRow: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.metadata,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    paddingHorizontal: spacing.xs,
    textTransform: 'uppercase',
  },
  transferBtn: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm + 2,
  },
  transferLabel: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '800',
  },
});
