import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Screen } from '@/components/ui/screen';
import { useReceiptStorage } from '@/features/receipts/receipt-storage-context';
import {
  getTransaction,
  type TransactionReceipt,
} from '@/features/transactions/transaction-repository';
import { mapError } from '@/lib/errors';
import { useLanguage } from '@/lib/i18n/language-context';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type ViewableReceipt = TransactionReceipt & { uri: string };

export function ReceiptViewerScreen({
  transactionId,
}: {
  transactionId: number;
}) {
  const database = useSQLiteContext();
  const receiptStorage = useReceiptStorage();
  const router = useRouter();
  const { t } = useLanguage();
  const [receipt, setReceipt] = useState<ViewableReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const transaction = await getTransaction(database, transactionId);
      if (requestId !== loadRequestRef.current) return;
      if (!transaction?.receipt) {
        setReceipt(null);
        setError(t.receipts.missingForTransaction);
        return;
      }
      if (!receiptStorage.exists(transaction.receipt.storageKey)) {
        setReceipt(null);
        setError(t.receipts.missingStoredImage);
        return;
      }
      setReceipt({
        ...transaction.receipt,
        uri: receiptStorage.getUri(transaction.receipt.storageKey),
      });
    } catch (loadError) {
      if (requestId === loadRequestRef.current) {
        setReceipt(null);
        setError(
          mapError(loadError, 'FILE_OPERATION_FAILED', t.appErrors).message,
        );
      }
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, [database, receiptStorage, t, transactionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        loadRequestRef.current += 1;
      };
    }, [load]),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <AppButton
          label={t.common.back}
          onPress={() => router.back()}
          variant="ghost"
        />
        <Text accessibilityRole="header" style={styles.title}>
          {t.receipts.title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateText}>{t.receipts.loading}</Text>
        </View>
      ) : receipt ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Image
            accessibilityLabel={t.receipts.imageLabel}
            resizeMode="contain"
            source={{ uri: receipt.uri }}
            style={styles.image}
          />
          <Text style={styles.metadata}>{receipt.mimeType}</Text>
          <AppButton
            label={t.receipts.replaceOrRemove}
            onPress={() => router.push(`/transactions/${transactionId}/edit`)}
            variant="secondary"
          />
        </ScrollView>
      ) : (
        <View style={styles.state}>
          <Text accessibilityLiveRegion="assertive" style={styles.stateText}>
            {error ?? t.receipts.unavailable}
          </Text>
          <AppButton
            label={t.transactions.editTransaction}
            onPress={() => router.push(`/transactions/${transactionId}/edit`)}
          />
          <AppButton label={t.common.tryAgain} onPress={() => void load()} />
          <AppButton
            label={t.common.back}
            onPress={() => router.back()}
            variant="secondary"
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerSpacer: { width: 72 },
  image: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 640,
    width: '100%',
  },
  metadata: {
    color: colors.textSecondary,
    fontSize: typography.metadata.fontSize,
    textAlign: 'center',
  },
  state: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    textAlign: 'center',
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: typography.sectionTitle.fontWeight,
    textAlign: 'center',
  },
});
