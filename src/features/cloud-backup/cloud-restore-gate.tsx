import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Alert } from 'react-native';
import * as Network from 'expo-network';
import { useSQLiteContext } from 'expo-sqlite';

import { requestGoogleDriveAccess } from '@/features/auth/google-auth-service';
import { restoreBackupData } from '@/features/backup/restore-backup';
import {
  dismissCloudRestorePrompt,
  getCloudBackupState,
  hasLocalUserData,
  markCloudRestoreComplete,
  setCloudBackupEnabled,
} from '@/features/cloud-backup/cloud-backup-state-repository';
import {
  downloadLatestCloudBackup,
  queryLatestCloudBackup,
} from '@/features/cloud-backup/cloud-backup-service';
import { useReceiptStorage } from '@/features/receipts/receipt-storage-context';
import { translations } from '@/lib/i18n/translations';

export function CloudRestoreGate({
  accountId,
  children,
}: PropsWithChildren<{ accountId: string }>) {
  const database = useSQLiteContext();
  const receiptStorage = useReceiptStorage();
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let mounted = true;

    async function finish() {
      if (mounted) setReady(true);
    }

    async function check() {
      const languageRow = await database.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_settings WHERE key = 'language';",
      );
      const language = languageRow?.value === 'en' ? 'en' : 'id';
      const t = translations[language];
      const state = await getCloudBackupState(database);
      if (state.restorePromptDismissed) {
        await finish();
        return;
      }

      const network = await Network.getNetworkStateAsync().catch(() => null);
      if (
        network?.isConnected !== true ||
        network.isInternetReachable === false
      ) {
        await finish();
        return;
      }

      const authorization = await requestGoogleDriveAccess();
      if (authorization.kind !== 'granted') {
        await setCloudBackupEnabled(database, false);
        await dismissCloudRestorePrompt(database);
        await finish();
        return;
      }

      const localHasData = await hasLocalUserData(database);
      const backupFile = await queryLatestCloudBackup(accountId);
      if (!backupFile) {
        await dismissCloudRestorePrompt(database);
        await finish();
        return;
      }

      const exportedAt =
        backupFile.appProperties.exportedAt ?? backupFile.modifiedTime;
      const createdAt = new Intl.DateTimeFormat(
        language === 'id' ? 'id-ID' : 'en-US',
        { dateStyle: 'medium', timeStyle: 'short' },
      ).format(new Date(exportedAt));
      const transactionCount = Number(
        backupFile.appProperties.transactionCount ?? 0,
      );

      Alert.alert(
        localHasData ? t.backup.localAndBackupFound : t.backup.backupFound,
        localHasData
          ? t.backup.localAndBackupDescription.replace('{date}', createdAt)
          : t.backup.backupFoundDescription
              .replace('{date}', createdAt)
              .replace('{count}', String(transactionCount)),
        [
          {
            onPress: () => {
              void dismissCloudRestorePrompt(database).finally(finish);
            },
            text: localHasData ? t.backup.keepLocalData : t.backup.startFresh,
          },
          {
            onPress: () => {
              void downloadLatestCloudBackup(accountId)
                .then((backup) => {
                  if (!backup) {
                    throw new Error(t.backup.backupUnavailable);
                  }
                  return restoreBackupData(
                    database,
                    backup.payload,
                    receiptStorage,
                  );
                })
                .then(() => markCloudRestoreComplete(database))
                .then(() => {
                  Alert.alert(
                    t.backup.restoreCompleteTitle,
                    t.backup.restoreCompleteDescription,
                  );
                })
                .catch((error) => {
                  Alert.alert(
                    t.backup.restoreFailedTitle,
                    error instanceof Error
                      ? error.message
                      : t.backup.restoreGenericFailure,
                  );
                })
                .finally(finish);
            },
            text: t.backup.restoreData,
          },
        ],
        { cancelable: false },
      );
    }

    void check().catch((error) => {
      // A cloud failure must never prevent local-first startup.
      if (__DEV__) console.warn('Cloud restore detection failed:', error);
      void finish();
    });

    return () => {
      mounted = false;
    };
  }, [accountId, database, receiptStorage]);

  return ready ? children : null;
}
