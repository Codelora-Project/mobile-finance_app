import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return ({ name }: { name: string }) => (
    <ReactNative.Text testID={`icon-${name}`}>{name}</ReactNative.Text>
  );
});

jest.mock('@/features/auth/auth-context', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '@/features/auth/auth-context';
import { LoginScreen } from '@/features/auth/login-screen';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { ThemeProvider } from '@/lib/theme/theme-context';

async function renderLoginScreen(language: 'id' | 'en' = 'id') {
  return await render(
    <ThemeProvider>
      <LanguageProvider initialLanguage={language}>
        <LoginScreen />
      </LanguageProvider>
    </ThemeProvider>,
  );
}

describe('LoginScreen', () => {
  const mockClearError = jest.fn();
  const mockSignInWithGoogle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      clearError: mockClearError,
      error: null,
      isBusy: false,
      signInWithGoogle: mockSignInWithGoogle,
      status: 'signed_out',
    });
  });

  it('renders brand hero, floating dashboard preview, tags, and Google sign-in CTA in Indonesian', async () => {
    await renderLoginScreen('id');

    expect(
      screen.getByText('Gambaran keuangan harian yang lebih jelas'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Total Saldo Aktif')).toBeOnTheScreen();
    expect(screen.getByText('Rp 14.850.000')).toBeOnTheScreen();
    expect(screen.getByText('Kopi & Sarapan')).toBeOnTheScreen();
    expect(screen.getByText('Bonus Project')).toBeOnTheScreen();
    expect(screen.getByText('Offline-First')).toBeOnTheScreen();
    expect(screen.getByText('Bebas Iklan')).toBeOnTheScreen();
    expect(screen.getByText('Tersimpan Lokal')).toBeOnTheScreen();
    expect(screen.getByText('Lanjutkan dengan Google')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Data utama tersimpan lokal dan cadangan dapat dipulihkan melalui Google Drive.',
      ),
    ).toBeOnTheScreen();
  });

  it('renders content in English when configured', async () => {
    await renderLoginScreen('en');

    expect(
      screen.getByText('A clearer view of your everyday finances'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Active Total Balance')).toBeOnTheScreen();
    expect(screen.getByText('Coffee & Breakfast')).toBeOnTheScreen();
    expect(screen.getByText('Project Bonus')).toBeOnTheScreen();
    expect(screen.getByText('Continue with Google')).toBeOnTheScreen();
  });

  it('triggers signInWithGoogle when tapping the CTA button', async () => {
    await renderLoginScreen();

    const button = screen.getByRole('button', {
      name: 'Lanjutkan dengan Google',
    });
    await fireEvent.press(button);

    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('renders loading indicator and disabled state when isBusy is true', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      clearError: mockClearError,
      error: null,
      isBusy: true,
      signInWithGoogle: mockSignInWithGoogle,
      status: 'signed_out',
    });

    await renderLoginScreen();

    expect(screen.getByText('Menghubungkan ke Google...')).toBeOnTheScreen();
    const button = screen.getByRole('button', {
      name: 'Menghubungkan ke Google...',
    });
    expect(button.props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(button);
    expect(mockSignInWithGoogle).not.toHaveBeenCalled();
  });

  it('renders error message and dismisses when clicked', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      clearError: mockClearError,
      error: {
        code: 'OFFLINE',
        message: 'Internet connection required',
      },
      isBusy: false,
      signInWithGoogle: mockSignInWithGoogle,
      status: 'signed_out',
    });

    await renderLoginScreen();

    const errorAlert = screen.getByText(
      'Koneksi internet diperlukan untuk login Google pertama kali.',
    );
    expect(errorAlert).toBeOnTheScreen();

    const dismissButton = screen.getByRole('button', {
      name: 'Tutup pesan kesalahan',
    });
    await fireEvent.press(dismissButton);

    expect(mockClearError).toHaveBeenCalledTimes(1);
  });

  it('renders re-authentication banner when status is reauth_required', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      clearError: mockClearError,
      error: null,
      isBusy: false,
      signInWithGoogle: mockSignInWithGoogle,
      status: 'reauth_required',
    });

    await renderLoginScreen();

    expect(screen.getByText('Sesi Berakhir')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Sesi Google Anda telah berakhir. Silakan login kembali untuk mengakses data akun.',
      ),
    ).toBeOnTheScreen();
  });
});
