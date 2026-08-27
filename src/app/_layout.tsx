import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import {
  OnboardingProvider,
  useOnboarding,
} from '@/features/onboarding/onboarding-context';

void SplashScreen.preventAutoHideAsync();

function AuthenticatedNavigation() {
  const { status, user } = useAuth();
  const { completeOnboarding, status: onboardingStatus } = useOnboarding();

  const isRestoring =
    status === 'restoring' || onboardingStatus === 'restoring';

  useEffect(() => {
    if (
      onboardingStatus === 'pending' &&
      (status === 'signed_in' || status === 'reauth_required')
    ) {
      void completeOnboarding();
    }
  }, [completeOnboarding, onboardingStatus, status]);

  useEffect(() => {
    if (!isRestoring) {
      void SplashScreen.hideAsync();
    }
  }, [isRestoring]);

  if (isRestoring) return null;

  const isSignedIn = status === 'signed_in' && user !== null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <OnboardingProvider>
        <AuthProvider>
          <AuthenticatedNavigation />
        </AuthProvider>
      </OnboardingProvider>
    </SafeAreaProvider>
  );
}
