import * as BackgroundTask from 'expo-background-task';
import * as Network from 'expo-network';
import { openDatabaseAsync, useSQLiteContext } from 'expo-sqlite';
import * as TaskManager from 'expo-task-manager';
import { useCallback, useEffect, useRef, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { initializeDatabase } from '@/db/database';
import { createAccountScope } from '@/features/auth/account-scope';
import { readAuthSession } from '@/features/auth/auth-storage';
import {
  createCloudBackup,
  shouldRunAutomaticCloudBackup,
} from '@/features/cloud-backup/cloud-backup-service';
import { useReceiptStorage } from '@/features/receipts/receipt-storage-context';
import { createReceiptStorage } from '@/features/receipts/receipt-storage';

const CLOUD_BACKUP_TASK = 'keuanganku-cloud-backup';
const FOREGROUND_CHECK_INTERVAL_MS = 60_000;

async function isInternetReachable() {
  const state = await Network.getNetworkStateAsync().catch(() => null);
  return Boolean(
    state?.isConnected === true && state.isInternetReachable !== false,
  );
}

if (!TaskManager.isTaskDefined(CLOUD_BACKUP_TASK)) {
  TaskManager.defineTask(CLOUD_BACKUP_TASK, async () => {
    let database: Awaited<ReturnType<typeof openDatabaseAsync>> | null = null;
    try {
      if (!(await isInternetReachable())) {
        return BackgroundTask.BackgroundTaskResult.Success;
      }
      const session = await readAuthSession();
      if (!session) return BackgroundTask.BackgroundTaskResult.Success;

      const scope = createAccountScope(session.user);
      const receiptStorage = createReceiptStorage(scope.receiptDirectory);
      database = await openDatabaseAsync(scope.databaseName, {
        useNewConnection: true,
      });
      await initializeDatabase(database, receiptStorage, {
        runReceiptMaintenance: false,
      });
      if (await shouldRunAutomaticCloudBackup(database)) {
        await createCloudBackup(database, receiptStorage, scope.accountId);
      }
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
      if (__DEV__) console.warn('Background cloud backup failed:', error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    } finally {
      await database?.closeAsync().catch(() => undefined);
    }
  });
}

export function CloudBackupCoordinator({
  accountId,
  children,
}: PropsWithChildren<{ accountId: string }>) {
  const database = useSQLiteContext();
  const receiptStorage = useReceiptStorage();
  const inFlight = useRef(false);
  const lastAttemptAt = useRef(0);

  const runIfNeeded = useCallback(
    async (ignoreDebounce = false) => {
      const now = Date.now();
      if (
        inFlight.current ||
        (!ignoreDebounce &&
          now - lastAttemptAt.current < FOREGROUND_CHECK_INTERVAL_MS)
      ) {
        return;
      }
      lastAttemptAt.current = now;
      if (!(await isInternetReachable())) return;
      if (!(await shouldRunAutomaticCloudBackup(database))) return;

      inFlight.current = true;
      try {
        await createCloudBackup(database, receiptStorage, accountId);
      } catch (error) {
        // Automatic backup is best effort and must never interrupt local usage.
        if (__DEV__) console.warn('Automatic cloud backup failed:', error);
      } finally {
        inFlight.current = false;
      }
    },
    [accountId, database, receiptStorage],
  );

  useEffect(() => {
    void BackgroundTask.registerTaskAsync(CLOUD_BACKUP_TASK, {
      minimumInterval: 15,
    }).catch((error) => {
      if (__DEV__) console.warn('Could not register cloud backup task:', error);
    });

    void runIfNeeded(true);
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void runIfNeeded();
    }, FOREGROUND_CHECK_INTERVAL_MS);
    const appStateSubscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active' || state === 'background') {
          void runIfNeeded(true);
        }
      },
    );

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [runIfNeeded]);

  return children;
}
