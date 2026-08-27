import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/auth-context';
import { LoginScreen } from '@/features/auth/login-screen';
import { useOnboarding } from '@/features/onboarding/onboarding-context';

export default function LoginRoute() {
  const { status } = useAuth();
  const { status: onboardingStatus } = useOnboarding();

  if (status !== 'reauth_required' && onboardingStatus === 'pending') {
    return <Redirect href="/welcome" />;
  }

  return <LoginScreen />;
}
