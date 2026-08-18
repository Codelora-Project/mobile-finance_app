import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppErrorBoundary } from '@/components/ui/app-error-boundary';
import { DatabaseProvider } from '@/db/database-provider';
import {
  getSettingsOverview,
  setBrandThemeSetting,
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
import type { BrandTheme } from '@/theme/colors';

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
  const [brandTheme, setBrandTheme] = useState<BrandTheme>('blue');

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      try {
        const settings = await getSettingsOverview(database);
        if (!mounted) return;
        if (settings.currencyCode) {
          setCurrency(settings.currencyCode);
          try {
            await database.runAsync(
              `UPDATE transactions SET currency_code = ? WHERE currency_code != ?`,
              settings.currencyCode,
              settings.currencyCode,
            );
          } catch {
            // Ignore transaction currency update if database is closing/closed
          }
        }
        if (!mounted) return;
        if (settings.language) setLanguage(settings.language);
        if (settings.theme) setTheme(settings.theme);
        if (settings.brandTheme) setBrandTheme(settings.brandTheme);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const isClosedResource =
          errorMsg.includes('closed resource') ||
          errorMsg.includes('closed database') ||
          errorMsg.includes('NativeDatabase');
        if (__DEV__ && !isClosedResource) {
          console.warn('Could not load settings', err);
        }
      }
    }
    void loadSettings();
    return () => {
      mounted = false;
    };
  }, [database]);

  return (
    <ThemeProvider
      initialBrandTheme={brandTheme}
      initialTheme={theme}
      onBrandThemeChange={async (nextBrand) => {
        setBrandTheme(nextBrand);
        try {
          await setBrandThemeSetting(database, nextBrand);
        } catch (err) {
          if (__DEV__) console.warn('Could not persist brand theme', err);
        }
      }}
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
