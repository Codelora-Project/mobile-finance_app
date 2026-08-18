import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppErrorBoundary } from '@/components/ui/app-error-boundary';
import { DatabaseProvider } from '@/db/database-provider';
import {
  getSettingsOverview,
  setCurrencySetting,
  setLanguageSetting,
  setThemeSetting,
  type SupportedCurrencyCode,
} from '@/features/settings/settings-repository';
import { CurrencyProvider } from '@/lib/currency/currency-context';
import { LanguageProvider } from '@/lib/i18n/language-context';
import type { Language } from '@/lib/i18n/translations';
import {
  ThemeProvider,
  useTheme,
  type ThemeSetting,
} from '@/lib/theme/theme-context';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function AppNavigation() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="transactions/new"
          options={{
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
            presentation: 'transparentModal',
          }}
        />
        <Stack.Screen
          name="transactions/[id]/edit"
          options={{
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
            presentation: 'transparentModal',
          }}
        />
      </Stack>
    </>
  );
}

function AppWithProviders() {
  const database = useSQLiteContext();
  const [currency, setCurrency] = useState<SupportedCurrencyCode>('IDR');
  const [language, setLanguage] = useState<Language>('id');
  const [theme, setTheme] = useState<ThemeSetting>('system');

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      try {
        const settings = await getSettingsOverview(database);
        if (mounted) {
          if (settings.currencyCode) {
            setCurrency(settings.currencyCode);
            await database.runAsync(
              `UPDATE transactions SET currency_code = ? WHERE currency_code != ?`,
              settings.currencyCode,
              settings.currencyCode,
            );
          }
          if (settings.language) setLanguage(settings.language);
          if (settings.theme) setTheme(settings.theme);
        }
      } catch (err) {
        if (__DEV__) console.warn('Could not load settings', err);
      }
    }
    void loadSettings();
    return () => {
      mounted = false;
    };
  }, [database]);

  return (
    <ThemeProvider
      initialTheme={theme}
      onThemeChange={async (nextTheme) => {
        setTheme(nextTheme);
        try {
          await setThemeSetting(database, nextTheme);
        } catch (err) {
          if (__DEV__) console.warn('Could not persist theme', err);
        }
      }}
    >
      <LanguageProvider
        initialLanguage={language}
        onLanguageChange={async (nextLang) => {
          setLanguage(nextLang);
          try {
            await setLanguageSetting(database, nextLang);
          } catch (err) {
            if (__DEV__) console.warn('Could not persist language', err);
          }
        }}
      >
        <CurrencyProvider
          initialCurrency={currency}
          onCurrencyChange={async (nextCurrency) => {
            setCurrency(nextCurrency);
            try {
              await setCurrencySetting(database, nextCurrency);
            } catch (err) {
              if (__DEV__) console.warn('Could not persist currency', err);
            }
          }}
        >
          <AppErrorBoundary>
            <AppNavigation />
          </AppErrorBoundary>
        </CurrencyProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <AppWithProviders />
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
