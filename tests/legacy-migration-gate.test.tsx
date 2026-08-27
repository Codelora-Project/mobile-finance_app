import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert } from 'react-native';

import { LegacyMigrationGate } from '@/features/auth/legacy-migration-gate';

const mockArchive = jest.fn<() => Promise<void>>();
const mockClaim = jest.fn<() => Promise<void>>();
const mockExportBackup = jest.fn<() => Promise<{ uri: string }>>();
const mockRefresh = jest.fn<() => Promise<void>>();
const mockShareFile = jest.fn<() => Promise<void>>();
const mockDatabase = {};
const mockReceiptStorage = {};

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDatabase,
}));
jest.mock('@/features/receipts/receipt-storage-context', () => ({
  useReceiptStorage: () => mockReceiptStorage,
}));
jest.mock('@/features/auth/legacy-data-context', () => ({
  useLegacyData: () => ({
    archive: mockArchive,
    claim: mockClaim,
    error: null,
    refresh: mockRefresh,
    status: 'pending',
    summary: null,
  }),
}));
jest.mock('@/features/backup/backup-service', () => ({
  exportBackupToJsonFile: () => mockExportBackup(),
  shareFile: () => mockShareFile(),
}));
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return (props: { name: string }) => (
    <ReactNative.Text>{props.name}</ReactNative.Text>
  );
});

type AlertButton = Readonly<{
  onPress?: () => void;
  style?: string;
  text?: string;
}>;

function alertButtons(alertSpy: jest.SpiedFunction<typeof Alert.alert>) {
  return (alertSpy.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
}

describe('legacy migration gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockArchive.mockResolvedValue(undefined);
    mockClaim.mockResolvedValue(undefined);
    mockExportBackup.mockResolvedValue({
      uri: 'file:///cache/backups/account-before-legacy.json',
    });
    mockRefresh.mockResolvedValue(undefined);
    mockShareFile.mockResolvedValue(undefined);
  });

  it('requires a shared active-account backup and a second confirmation', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    await render(
      <LegacyMigrationGate>
        <>App content</>
      </LegacyMigrationGate>,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: /Connect data|Hubungkan data/ }),
    );
    expect(mockExportBackup).not.toHaveBeenCalled();
    expect(mockClaim).not.toHaveBeenCalled();

    const createBackup = alertButtons(alertSpy).find(
      (button) => button.style !== 'cancel',
    );
    await act(async () => {
      createBackup?.onPress?.();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockExportBackup).toHaveBeenCalledTimes(1);
    expect(mockShareFile).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(mockClaim).not.toHaveBeenCalled();

    const replace = alertButtons(alertSpy).find(
      (button) => button.style === 'destructive',
    );
    await act(async () => {
      replace?.onPress?.();
      await Promise.resolve();
    });
    expect(mockClaim).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });

  it('does not offer replacement when backup sharing fails', async () => {
    mockShareFile.mockRejectedValueOnce(new Error('share unavailable'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    await render(
      <LegacyMigrationGate>
        <>App content</>
      </LegacyMigrationGate>,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: /Connect data|Hubungkan data/ }),
    );
    const createBackup = alertButtons(alertSpy).find(
      (button) => button.style !== 'cancel',
    );
    await act(async () => {
      createBackup?.onPress?.();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(alertSpy.mock.calls.at(-1)?.[1]).toBe('share unavailable');
    expect(mockClaim).not.toHaveBeenCalled();
    expect(
      alertButtons(alertSpy).some((button) => button.style === 'destructive'),
    ).toBe(false);
    alertSpy.mockRestore();
  });
});
