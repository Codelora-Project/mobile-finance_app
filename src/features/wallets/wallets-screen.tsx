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
  const { colors } = useTheme();
  const { currencyCode, currencySymbol } = useCurrency();
  const { language, t } = useLanguage();

  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(
    null,
  );
  const [archivedWallets, setArchivedWallets] = useState<readonly Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);
  const loadRequestRef = useRef(0);

  // Modal States
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
        setScreenError(mapError(caughtError, 'DATABASE_WRITE_FAILED').message);
      }
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, [database]);

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
      language === 'id' ? 'Arsipkan Dompet' : 'Archive Wallet',
      language === 'id'
        ? `Apakah Anda yakin ingin mengarsipkan "${wallet.name}"? Dompet ini akan disembunyikan dari daftar aktif.`
        : `Are you sure you want to archive "${wallet.name}"? It will be hidden from active lists.`,
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
                'Error',
                mapError(err, 'DATABASE_WRITE_FAILED').message,
              );
            }
          },
          style: 'destructive',
          text: language === 'id' ? 'Arsipkan' : 'Archive',
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
        ) : (
          <View style={styles.headerSpacer} />
        )}

        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[styles.headerTitle, { color: colors.textPrimary }]}
        >
          {language === 'id' ? 'Dompet & Rekening' : 'Wallets & Accounts'}
        </Text>

        <Pressable
          accessibilityLabel={
            language === 'id' ? 'Tambah Dompet Baru' : 'Add New Wallet'
          }
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setEditorTarget('new')}
          style={({ pressed }) => [
            styles.addWalletBtn,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons color="#FFFFFF" name="plus" size={20} />
        </Pressable>
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
              {language === 'id' ? 'Belum Ada Dompet' : 'No Wallets Yet'}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              {language === 'id'
                ? 'Tambahkan dompet tunai atau rekening bank untuk mulai mencatat keuangan Anda.'
                : 'Add a cash wallet or bank account to start tracking your finances.'}
            </Text>
            <View style={{ marginTop: spacing.md }}>
              <AppButton
                label={
                  language === 'id'
                    ? '+ Tambah Dompet Pertama'
                    : '+ Add First Wallet'
                }
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
            {/* 1. Net Worth Summary Card */}
            <WalletNetWorthCard
              currencyCode={currencyCode}
              language={language}
              operationalCash={operationalCash}
              totalNetWorth={totalNetWorth}
              trackingAssets={trackingAssets}
            />

            {screenError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{screenError}</Text>
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
                {language === 'id'
                  ? `DOMPET AKTIF (${activeWallets.length})`
                  : `ACTIVE WALLETS (${activeWallets.length})`}
              </Text>
            </View>
          </View>
        }
        renderItem={({ index, item }) => (
          <WalletRowItem
            currencyCode={currencyCode}
            isLast={index === activeWallets.length - 1}
            language={language}
            onArchive={handleConfirmArchive}
            onEdit={(w) => setEditorTarget(w)}
            onReconcile={(w) => setReconcileTarget(w)}
            wallet={item}
          />
        )}
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
    height: 36,
    justifyContent: 'center',
    width: 36,
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
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  errorText: {
    ...typography.metadata,
    color: '#DC2626',
    fontSize: 12,
    textAlign: 'center',
  },
  headerBar: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  headerComponent: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    ...typography.sectionTitle,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
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
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.xxl + 40,
  },
  sectionHeaderRow: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.metadata,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.xs,
    textTransform: 'uppercase',
  },
});
