import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert } from 'react-native';

import { SettingsScreen } from '@/features/settings/settings-screen';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { ThemeProvider } from '@/lib/theme/theme-context';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
const mockDatabase = {};
const mockGetSettingsOverview = jest.fn<() => Promise<unknown>>();
const mockResetApplicationData = jest.fn<() => Promise<void>>();
const mockSetQuickShortcutsSetting =
  jest.fn<(...args: unknown[]) => Promise<void>>();

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
    useRouter: () => mockRouter,
  };
});
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDatabase,
}));
jest.mock('@/features/settings/settings-repository', () => ({
  DEFAULT_QUICK_SHORTCUTS: [2000, 5000, 10000, 20000, 50000, 100000],
  SUPPORTED_CURRENCIES: [
    { code: 'IDR', country: 'Indonesia', flag: '🇮🇩', name: 'Indonesian Rupiah', symbol: 'Rp' },
    { code: 'USD', country: 'United States', flag: '🇺🇸', name: 'US Dollar', symbol: '$' },
  ],
  clearTemporaryCache: jest.fn<() => Promise<{ freedBytes: number }>>().mockResolvedValue({ freedBytes: 1024 }),
  formatStorageSize: (bytes: number) => `${bytes} B`,
  getRecommendedShortcuts: (code: string) =>
    code === 'USD' ? [1, 2, 5, 10, 20, 50] : [2000, 5000, 10000, 20000, 50000, 100000],
  getSettingsOverview: () => mockGetSettingsOverview(),
  getStorageStats: jest.fn<() => Promise<unknown>>().mockResolvedValue({
    cacheSizeBytes: 1024,
    claimsCount: 1,
    receiptsCount: 2,
    receiptsSizeBytes: 2048,
    transactionsCount: 10,
  }),
  resetApplicationData: () => mockResetApplicationData(),
  setCurrencySetting: jest.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined),
  setQuickShortcutsSetting: (database: unknown, shortcuts: number[]) =>
    mockSetQuickShortcutsSetting(database, shortcuts),
  setThemeSetting: jest
    .fn<(...args: unknown[]) => Promise<void>>()
    .mockResolvedValue(undefined),
}));
jest.mock('@/features/backup/backup-service', () => ({
  exportTransactionsCsvFile: jest.fn<() => Promise<unknown>>().mockResolvedValue({
    count: 5,
    fileName: 'laporan_transaksi_2026_08.csv',
    uri: 'file:///cache/exports/laporan_transaksi_2026_08.csv',
  }),
  shareFile: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return (props: { name: string }) => (
    <ReactNative.Text>{props.name}</ReactNative.Text>
  );
});

describe('settings screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSettingsOverview.mockResolvedValue({
      currencyCode: 'IDR',
      currencyName: 'Indonesian Rupiah',
      language: 'en',
      quickShortcuts: [2000, 5000, 10000, 20000, 50000, 100000],
      theme: 'system',
    });
    mockResetApplicationData.mockResolvedValue(undefined);
    mockSetQuickShortcutsSetting.mockResolvedValue(undefined);
  });

  it('shows management links, storage stats, base currency, and local-only About details', async () => {
    await render(
      <ThemeProvider>
        <LanguageProvider initialLanguage="en">
          <SettingsScreen />
        </LanguageProvider>
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole('header', { name: 'Settings' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Base Currency')).toBeOnTheScreen();
    expect(screen.getByText('Local Storage & Cache')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Clear Cache' })).toBeOnTheScreen();
    expect(
      screen.getByText(/All information stays on this device/),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Version 1.0.0/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Categories' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/categories');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Payment Methods' }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/payment-methods');
  });

  it('allows customizing quick shortcuts', async () => {
    await render(
      <ThemeProvider>
        <LanguageProvider initialLanguage="en">
          <SettingsScreen />
        </LanguageProvider>
      </ThemeProvider>,
    );

    // Look for Quick Amount Shortcuts row button
    const shortcutsBtn = await screen.findByLabelText('Quick Amount Shortcuts');
    expect(shortcutsBtn).toBeOnTheScreen();

    // Open Shortcuts Modal
    await fireEvent.press(shortcutsBtn);

    // Verify Live Preview is displayed inside modal
    expect(screen.getByText('Transaction Screen Live Preview')).toBeOnTheScreen();
    expect(screen.getByText('Reset to IDR Recommended')).toBeOnTheScreen();

    // Remove one shortcut
    const deleteBtn = screen.getByLabelText('Hapus shortcut 2000');
    await fireEvent.press(deleteBtn);
    expect(mockSetQuickShortcutsSetting).toHaveBeenCalled();

    // Press Reset to Recommended
    await fireEvent.press(screen.getByText('Reset to IDR Recommended'));
    expect(mockSetQuickShortcutsSetting).toHaveBeenCalledWith(
      expect.anything(),
      [2000, 5000, 10000, 20000, 50000, 100000],
    );
  });

  it('requires two deliberate confirmations before resetting', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(
      <ThemeProvider>
        <LanguageProvider initialLanguage="en">
          <SettingsScreen />
        </LanguageProvider>
      </ThemeProvider>,
    );
    await screen.findByText('Local Storage & Cache');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Delete All Data' }),
    );
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(mockResetApplicationData).not.toHaveBeenCalled();

    const firstButtons = alertSpy.mock.calls[0]?.[2];
    firstButtons?.[1]?.onPress?.();
    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(mockResetApplicationData).not.toHaveBeenCalled();

    const secondButtons = alertSpy.mock.calls[1]?.[2];
    await act(async () => {
      secondButtons?.[1]?.onPress?.();
      await Promise.resolve();
    });
    await waitFor(() => expect(mockResetApplicationData).toHaveBeenCalled());
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(3));

    const successButtons = alertSpy.mock.calls[2]?.[2];
    successButtons?.[0]?.onPress?.();
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
    alertSpy.mockRestore();
  });

  it('switches between Indonesian and English language seamlessly', async () => {
    await render(
      <ThemeProvider>
        <LanguageProvider initialLanguage="id">
          <SettingsScreen />
        </LanguageProvider>
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole('header', { name: 'Pengaturan' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Bahasa / Language')).toBeOnTheScreen();
    expect(screen.getByText('Bahasa Indonesia')).toBeOnTheScreen();
    expect(screen.getByText('English')).toBeOnTheScreen();
    expect(screen.getByText('Kelola')).toBeOnTheScreen();
    expect(screen.getByText('Kategori')).toBeOnTheScreen();
    expect(screen.getByText('Metode Pembayaran')).toBeOnTheScreen();
    expect(screen.getByText('Hapus Semua Data')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Select English language' }),
    );
    expect(screen.getByText('Manage')).toBeOnTheScreen();
    expect(screen.getByText('Categories')).toBeOnTheScreen();
    expect(screen.getByText('Delete All Data')).toBeOnTheScreen();
  });

  it('triggers clear cache and displays feedback alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(
      <ThemeProvider>
        <LanguageProvider initialLanguage="en">
          <SettingsScreen />
        </LanguageProvider>
      </ThemeProvider>,
    );

    const clearBtn = await screen.findByRole('button', { name: 'Clear Cache' });
    await fireEvent.press(clearBtn);

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(
      'Local Storage & Cache',
      expect.stringContaining('Cache cleared successfully'),
    ));
    alertSpy.mockRestore();
  });

  it('triggers quick CSV export dialog and executes export for this month', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(
      <ThemeProvider>
        <LanguageProvider initialLanguage="en">
          <SettingsScreen />
        </LanguageProvider>
      </ThemeProvider>,
    );

    const exportBtn = await screen.findByRole('button', {
      name: 'Quick Report Export (CSV)',
    });
    await fireEvent.press(exportBtn);

    expect(alertSpy).toHaveBeenCalledWith(
      'Select Export Period',
      'Choose which transaction data you want to export to a CSV file.',
      expect.any(Array),
      { cancelable: true },
    );

    const buttons = alertSpy.mock.calls[0]?.[2];
    await act(async () => {
      buttons?.[0]?.onPress?.();
      await Promise.resolve();
    });

    alertSpy.mockRestore();
  });

  it('opens currency picker modal, searches for currency, and selects it', async () => {
    await render(
      <ThemeProvider>
        <LanguageProvider initialLanguage="en">
          <SettingsScreen />
        </LanguageProvider>
      </ThemeProvider>,
    );

    // Look for Base Currency button & badge
    const currencyBtn = await screen.findByLabelText('Pilih Mata Uang Utama');
    expect(currencyBtn).toBeOnTheScreen();
    expect(within(currencyBtn).getByText('🇮🇩')).toBeOnTheScreen();

    // Open Currency Modal
    await fireEvent.press(currencyBtn);
    expect(screen.getByText('Select Base Currency')).toBeOnTheScreen();

    // Search for USD
    const searchInput = screen.getByPlaceholderText(
      'Search currency, country, or code (e.g. USD, Yen, SGD)...',
    );
    await fireEvent.changeText(searchInput, 'USD');

    // USD should be visible
    expect(screen.getByText('US Dollar')).toBeOnTheScreen();

    // Select USD
    await fireEvent.press(screen.getByText('US Dollar'));
  });
});
