import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { Pressable, Text } from 'react-native';

import { LanguageProvider, useLanguage } from '@/lib/i18n/language-context';
import { ThemeProvider, useTheme } from '@/lib/theme/theme-context';

function LanguageProbe() {
  const { language, setLanguage } = useLanguage();
  return (
    <>
      <Text>{`language:${language}`}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void setLanguage('en').catch(() => undefined)}
      >
        <Text>change language</Text>
      </Pressable>
    </>
  );
}

function ThemeProbe() {
  const { setThemeSetting, themeSetting } = useTheme();
  return (
    <>
      <Text>{`theme:${themeSetting}`}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void setThemeSetting('dark').catch(() => undefined)}
      >
        <Text>change theme</Text>
      </Pressable>
    </>
  );
}

describe('persisted preference contexts', () => {
  it('does not change language when persistence fails', async () => {
    const persist = jest
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error('database unavailable'));
    await render(
      <LanguageProvider initialLanguage="id" onLanguageChange={persist}>
        <LanguageProbe />
      </LanguageProvider>,
    );

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'change language' }));
      await Promise.resolve();
    });
    await waitFor(() => expect(persist).toHaveBeenCalledWith('en'));
    expect(screen.getByText('language:id')).toBeOnTheScreen();
  });

  it('does not change theme when persistence fails', async () => {
    const persist = jest
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error('database unavailable'));
    await render(
      <ThemeProvider initialTheme="light" onThemeChange={persist}>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'change theme' }));
      await Promise.resolve();
    });
    await waitFor(() => expect(persist).toHaveBeenCalledWith('dark'));
    expect(screen.getByText('theme:light')).toBeOnTheScreen();
  });

  it('updates the visible preference after persistence succeeds', async () => {
    const persist = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    await render(
      <LanguageProvider initialLanguage="id" onLanguageChange={persist}>
        <LanguageProbe />
      </LanguageProvider>,
    );

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'change language' }));
      await Promise.resolve();
    });
    expect(await screen.findByText('language:en')).toBeOnTheScreen();
  });
});
