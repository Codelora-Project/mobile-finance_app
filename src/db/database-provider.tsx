import { SQLiteProvider } from 'expo-sqlite';
import { useCallback, useRef, useState, type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { initializeDatabase } from '@/db/database';
import { runSerializedDatabaseInitialization } from '@/db/database-initialization-coordinator';
import type { ReceiptStorage } from '@/features/receipts/receipt-storage';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type InitializationStatus = 'loading' | 'ready' | 'error';

type DatabaseProviderProps = PropsWithChildren<{
  databaseName: string;
  receiptStorage: ReceiptStorage;
}>;

export function DatabaseProvider({
  children,
  databaseName,
  receiptStorage,
}: DatabaseProviderProps) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<InitializationStatus>('loading');
  const lastInitializationError = useRef<Error | null>(null);

  const handleInitialize = useCallback(
    async (database: Parameters<typeof initializeDatabase>[0]) => {
      await runSerializedDatabaseInitialization(databaseName, () =>
        initializeDatabase(database, receiptStorage),
      );
      lastInitializationError.current = null;
      setStatus('ready');
    },
    [databaseName, receiptStorage],
  );

  const handleError = useCallback((error: Error) => {
    if (lastInitializationError.current === error) return;
    lastInitializationError.current = error;
    if (__DEV__) {
      console.error('Database initialization failed.', error);
    }
    setTimeout(() => setStatus('error'), 0);
  }, []);

  function retryInitialization() {
    lastInitializationError.current = null;
    setStatus('loading');
    setAttempt((currentAttempt) => currentAttempt + 1);
  }

  return (
    <View style={styles.container}>
      <SQLiteProvider
        key={attempt}
        databaseName={databaseName}
        onError={handleError}
        onInit={handleInitialize}
      >
        {children}
      </SQLiteProvider>

      {status === 'loading' ? (
        <View accessibilityLiveRegion="polite" style={styles.stateContainer}>
          <ActivityIndicator
            accessibilityLabel="Initializing local database"
            color={colors.primary}
            size="large"
          />
          <Text style={styles.message}>Preparing local data…</Text>
        </View>
      ) : null}

      {status === 'error' ? (
        <View accessibilityLiveRegion="assertive" style={styles.stateContainer}>
          <Text accessibilityRole="header" style={styles.title}>
            Database unavailable
          </Text>
          <Text style={styles.message}>
            We couldn’t initialize local data. Try again.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={retryInitialization}
            style={styles.retryButton}
          >
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  stateContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.pageTitle.fontSize,
    fontWeight: typography.pageTitle.fontWeight,
    lineHeight: typography.pageTitle.lineHeight,
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  retryLabel: {
    color: colors.surface,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    lineHeight: typography.body.lineHeight,
  },
});
