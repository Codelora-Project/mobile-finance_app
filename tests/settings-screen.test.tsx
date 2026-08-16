import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert } from 'react-native';

import { SettingsScreen } from '@/features/settings/settings-screen';
import { LanguageProvider } from '@/lib/i18n/language-context';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
const mockDatabase = {};
const mockGetSettingsOverview = jest.fn<() => Promise<unknown>>();
const mockResetApplicationData = jest.fn<() => Promise<void>>();

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
  getSettingsOverview: () => mockGetSettingsOverview(),
  resetApplicationData: () => mockResetApplicationData(),
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
    });
    mockResetApplicationData.mockResolvedValue(undefined);
  });

  it('shows management links, read-only IDR, and local-only About details', async () => {
    await render(
      <LanguageProvider initialLanguage="en">
        <SettingsScreen />
      </LanguageProvider>,
    );

    expect(
      await screen.findByRole('header', { name: 'Settings' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Currency, Indonesian Rupiah, IDR, read only'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Read-only')).toBeOnTheScreen();
    expect(
      screen.getByText(/No account, cloud, or telemetry/),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Version 1.0.0/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Categories' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/categories');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Payment Methods' }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/payment-methods');
  });

  it('requires two deliberate confirmations before resetting', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(
      <LanguageProvider initialLanguage="en">
        <SettingsScreen />
      </LanguageProvider>,
    );
    await screen.findByText('Indonesian Rupiah');

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

  it('allows cancellation and shows a recoverable reset failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockResetApplicationData.mockRejectedValueOnce(
      Object.assign(
        new Error("We couldn't delete your data. Nothing was reset."),
        {
          code: 'DATABASE_WRITE_FAILED',
        },
      ),
    );
    await render(
      <LanguageProvider initialLanguage="en">
        <SettingsScreen />
      </LanguageProvider>,
    );
    await screen.findByText('Indonesian Rupiah');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Delete All Data' }),
    );
    alertSpy.mock.calls[0]?.[2]?.[0]?.onPress?.();
    expect(mockResetApplicationData).not.toHaveBeenCalled();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Delete All Data' }),
    );
    alertSpy.mock.calls[1]?.[2]?.[1]?.onPress?.();
    await act(async () => {
      alertSpy.mock.calls[2]?.[2]?.[1]?.onPress?.();
      await Promise.resolve();
    });

    expect(
      await screen.findByText(
        "We couldn't delete your data. Nothing was reset.",
      ),
    ).toBeOnTheScreen();
    alertSpy.mockRestore();
  });

  it('runs only one reset for rapid final confirmation taps', async () => {
    let resolveReset: (() => void) | undefined;
    mockResetApplicationData.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveReset = resolve;
        }),
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(
      <LanguageProvider initialLanguage="en">
        <SettingsScreen />
      </LanguageProvider>,
    );
    await screen.findByText('Indonesian Rupiah');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Delete All Data' }),
    );
    alertSpy.mock.calls[0]?.[2]?.[1]?.onPress?.();
    const confirmReset = alertSpy.mock.calls[1]?.[2]?.[1]?.onPress;
    await act(async () => {
      confirmReset?.();
      confirmReset?.();
      await Promise.resolve();
    });

    expect(mockResetApplicationData).toHaveBeenCalledTimes(1);
    await act(async () => resolveReset?.());
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(3));
    alertSpy.mockRestore();
  });

  it('switches between Indonesian and English language seamlessly', async () => {
    await render(
      <LanguageProvider initialLanguage="id">
        <SettingsScreen />
      </LanguageProvider>,
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
});
