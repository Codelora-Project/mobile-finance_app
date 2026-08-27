import { Stack } from 'expo-router';

import { LanguageProvider } from '@/lib/i18n/language-context';
import { ThemeProvider } from '@/lib/theme/theme-context';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function AuthLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Stack
          initialRouteName="index"
          screenOptions={{ animation: 'fade', headerShown: false }}
        />
      </LanguageProvider>
    </ThemeProvider>
  );
}
