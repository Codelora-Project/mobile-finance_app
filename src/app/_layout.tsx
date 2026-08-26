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
import { TransactionMutationProvider } from '@/features/transactions/transaction-mutation-context';
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
        await setBrandThemeSetting(database, nextBrand);
        setBrandTheme(nextBrand);
      }}
      onThemeChange={async (nextTheme) => {
        await setThemeSetting(database, nextTheme);
        setTheme(nextTheme);
      }}
    >
      <LanguageProvider
        initialLanguage={language}
        onLanguageChange={async (nextLang) => {
          await setLanguageSetting(database, nextLang);
          setLanguage(nextLang);
        }}
      >
        <CurrencyProvider
          initialCurrency={currency}
          onCurrencyChange={async (nextCurrency) => {
            await setCurrencySetting(database, nextCurrency);
            setCurrency(nextCurrency);
          }}
        >
          <AppErrorBoundary>
            <TransactionMutationProvider>
              <AppNavigation />
            </TransactionMutationProvider>
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
