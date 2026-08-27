import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactNative = require('react-native');
  return ({ name }: { name: string }) => (
    <ReactNative.Text>{name}</ReactNative.Text>
  );
});

import { OnboardingScreen } from '@/features/onboarding/onboarding-screen';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { ThemeProvider } from '@/lib/theme/theme-context';

function renderOnboarding(
  onFinish: () => Promise<void> | void,
  mode: 'first_run' | 'replay' = 'first_run',
  language: 'id' | 'en' = 'id',
) {
  return render(
    <ThemeProvider initialTheme="light">
      <LanguageProvider initialLanguage={language}>
        <OnboardingScreen mode={mode} onFinish={onFinish} />
      </LanguageProvider>
    </ThemeProvider>,
  );
}

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the 3-step record-impact-wallets story and completes on finish', async () => {
    const onFinish = jest
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined);
    await renderOnboarding(onFinish);

    expect(screen.getByText('Catat dalam hitungan detik')).toBeOnTheScreen();
    expect(screen.getAllByText('Rp 25.000')).not.toHaveLength(0);
    expect(screen.getByLabelText('Langkah 1 dari 3')).toBeOnTheScreen();

    // Step 1 -> Step 2
    await fireEvent.press(screen.getByRole('button', { name: 'Lanjut' }));

    expect(screen.getByLabelText('Langkah 2 dari 3')).toBeOnTheScreen();
    expect(
      screen.getByText('Satu catatan, gambaran lebih jelas'),
    ).toBeOnTheScreen();

    // Step 2 -> Step 3
    await fireEvent.press(screen.getByRole('button', { name: 'Lanjut' }));

    expect(screen.getByLabelText('Langkah 3 dari 3')).toBeOnTheScreen();
    expect(
      screen.getByText('Multi-Rekening & 100% Privat'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Mulai' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('allows first-run onboarding to be skipped', async () => {
    const onFinish = jest.fn<() => void>();
    await renderOnboarding(onFinish);

    await fireEvent.press(screen.getByRole('button', { name: 'Lewati' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('renders English copy and closes replay without changing the flow', async () => {
    const onFinish = jest.fn<() => void>();
    await renderOnboarding(onFinish, 'replay', 'en');

    expect(screen.getByText('Record in seconds')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
