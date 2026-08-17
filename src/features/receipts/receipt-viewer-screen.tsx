import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
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
import {
  getReceiptFileUri,
  receiptFileExists,
} from '@/features/receipts/receipt-storage';
import {
  getTransaction,
  type TransactionReceipt,
} from '@/features/transactions/transaction-repository';
import { mapError } from '@/lib/errors';
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
  const router = useRouter();
  const [receipt, setReceipt] = useState<ViewableReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const transaction = await getTransaction(database, transactionId);
      if (!transaction?.receipt) {
        setReceipt(null);
        setError('This transaction has no receipt.');
        return;
      }
      if (!receiptFileExists(transaction.receipt.storageKey)) {
        setReceipt(null);
        setError('The stored receipt image is unavailable.');
        return;
      }
      setReceipt({
        ...transaction.receipt,
        uri: getReceiptFileUri(transaction.receipt.storageKey),
      });
    } catch (loadError) {
      setReceipt(null);
      setError(mapError(loadError, 'FILE_OPERATION_FAILED').message);
    } finally {
      setLoading(false);
    }
  }, [database, transactionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <AppButton label="Back" onPress={() => router.back()} variant="ghost" />
        <Text accessibilityRole="header" style={styles.title}>
          Receipt
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateText}>Loading receipt…</Text>
        </View>
      ) : receipt ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Image
            accessibilityLabel="Stored receipt image"
            resizeMode="contain"
            source={{ uri: receipt.uri }}
            style={styles.image}
          />
          <Text style={styles.metadata}>{receipt.mimeType}</Text>
          <AppButton
            label="Replace or remove receipt"
            onPress={() => router.push(`/transactions/${transactionId}/edit`)}
            variant="secondary"
          />
        </ScrollView>
      ) : (
        <View style={styles.state}>
          <Text accessibilityLiveRegion="assertive" style={styles.stateText}>
            {error ?? 'Receipt unavailable.'}
          </Text>
          <AppButton
            label="Edit transaction"
            onPress={() => router.push(`/transactions/${transactionId}/edit`)}
          />
          <AppButton
            label="Back"
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
