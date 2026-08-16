import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseProvider } from '@/db/database-provider';
import {
  getSettingsOverview,
  setLanguageSetting,
} from '@/features/settings/settings-repository';
import { LanguageProvider } from '@/lib/i18n/language-context';
import type { Language } from '@/lib/i18n/translations';
import { colors } from '@/theme/colors';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function AppWithLanguage() {
  const database = useSQLiteContext();
  const [language, setLanguage] = useState<Language>('id');

  useEffect(() => {
    let mounted = true;
    async function loadLang() {
      try {
        const settings = await getSettingsOverview(database);
        if (mounted && settings.language) {
          setLanguage(settings.language);
        }
      } catch (err) {
        if (__DEV__) console.warn('Could not load language', err);
      }
    }
    void loadLang();
    return () => {
      mounted = false;
    };
  }, [database]);

  return (
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
    </LanguageProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <DatabaseProvider>
        <AppWithLanguage />
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
