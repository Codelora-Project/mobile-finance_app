import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseProvider } from '@/db/database-provider';
import {
  getSettingsOverview,
  setLanguageSetting,
  setThemeSetting,
} from '@/features/settings/settings-repository';
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
  const [language, setLanguage] = useState<Language>('id');
  const [theme, setTheme] = useState<ThemeSetting>('system');

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      try {
        const settings = await getSettingsOverview(database);
        if (mounted) {
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
        <AppNavigation />
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
